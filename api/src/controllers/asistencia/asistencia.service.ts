import { BadRequestException, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../database/database.service';

export interface SocioAcceso {
  id: number;
  socio: number;
  nombre: string;
  tipoMembresia?: string;
  fechaVencimiento?: Date | null;
  clase?: string;
  visitasPeriodo: number;
  becado?: boolean;
}

export interface AccesoDto {
  acceso: boolean;
  motivo?: string;
  /** Se dejó pasar, pero hay algo que recepción debería saber (por ahora, adeudo pendiente). */
  advertencia?: string;
  socio?: SocioAcceso;
  fecha?: Date;
}

/**
 * Lo que el acceso-service del kiosco recibe al pedir huellas, completas o sólo los cambios.
 */
export interface HuellasDto {
  /**
   * Hasta dónde llega este cuerpo. Es texto opaco para el kiosco: lo genera y lo interpreta
   * sólo este servicio (`<max id>-<ms de la última fecnvo/fecmod>`), y el kiosco lo devuelve
   * tal cual en el siguiente sondeo de cambios.
   */
  marca: string;
  /** Una línea por huella: `socio,base64`. Vacío si no hay nada. */
  cuerpo: string;
}

interface FilaHuella {
  socio: number;
  huella: Buffer | string | null;
}

const MARCA = /^(\d+)-(\d+)$/;

/**
 * BDK escribe `fecnvo` y `fecmod` con la hora de la PC de recepción, no la del servidor. Dos PCs
 * con el reloj desfasado pueden escribir un reenrolamiento "más viejo" que la marca, y el sondeo
 * no lo vería hasta la recarga completa. El margen retrocede la fecha de corte ese tanto; lo que
 * cuesta es reenviar las filas de esos dos minutos en cada sondeo, y el kiosco lo absorbe porque
 * el reemplazo por socio es idempotente.
 */
const MARGEN_RELOJ_MS = 2 * 60 * 1000;

/** Milisegundos de una fecha del driver; 0 para null o para un `0000-00-00` que no parsea. */
function aMs(fecha: Date | string | null | undefined): number {
  if (!fecha) {
    return 0;
  }
  const ms = new Date(fecha).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

@Injectable()
export class AsistenciaService {
  constructor(private readonly db: DatabaseService) {}

  async registrarAcceso(socioId: number): Promise<AccesoDto> {
    const socio = await this.getSocio(socioId);

    if (!socio) {
      return { acceso: false, motivo: `Socio ${socioId} no encontrado` };
    }

    if (!socio.activo) {
      return { acceso: false, motivo: 'Socio inactivo' };
    }

    const now = new Date();

    // Al becado no se le revisa ni vigencia ni adeudo: es la misma rama que aplica BDK.
    let adeudo: string | null = null;

    if (!socio.becado) {
      const membresiaVigente =
        socio.diapago && new Date(socio.diapago).getTime() > now.getTime();

      if (!membresiaVigente) {
        return { acceso: false, motivo: 'Membresía vencida' };
      }

      adeudo = await this.consultarAdeudo(socio.socio, now);
    }

    const claseId = this.parseClaseId(socio.clases);
    await this.insertarAsistencia(socio.socio, claseId, now);

    const { tipoMembresia, claseNombre, visitasPeriodo } =
      await this.consultarInfoAcceso(socio, claseId, now);

    return {
      acceso: true,
      advertencia: adeudo ?? undefined,
      socio: {
        id: socio.id,
        socio: socio.socio,
        nombre: socio.nomsocio,
        tipoMembresia,
        fechaVencimiento: socio.diapago,
        clase: claseNombre,
        visitasPeriodo,
        becado: !!socio.becado,
      },
      fecha: now,
    };
  }

  /**
   * Adeudo pendiente: la misma consulta que corre BDK en el torniquete — mensualidades no
   * canceladas con saldo cuya fecha ya llegó. El límite es el **inicio del día siguiente**, tal
   * cual está en el log general (`Fecha<'2026-05-24 00:00:00'` para un acceso del 23 de mayo),
   * o sea "hasta hoy inclusive".
   *
   * <p><b>BDK no niega por esto.</b> Pide `Descrip, Fecha, Saldo` para desplegarlo, no para
   * evaluar: sobre el subconjunto verificable contra `backup5` (adeudo con certeza vigente en
   * mayo), dejó pasar 36 accesos de 7 socios con adeudo vencido —el 2002 con 15,290 de 10
   * mensualidades sin pagar— contra 1 solo negado. Por eso el resultado de aquí nunca bloquea en
   * {@link registrarAcceso}: sólo viaja como `advertencia` para que recepción lo vea.
   *
   * <p><b>A quién no se le revisa.</b> BDK corre esta consulta 980 de 1346 veces; las 366 que
   * salta son de becados. Comprobado contra la base: de los 65 socios que la saltan los 65 son
   * `becado=1`, y de los 574 que la corren los 574 son `becado=0` — separación perfecta, y
   * ningún socio cae en ambos grupos. Coherente con el dato de fondo: 51 de esos 65 becados no
   * tienen ni una fila en `tbmensualidades`. Por eso la llamada vive dentro de la rama
   * `!becado` de {@link registrarAcceso}, la misma que ya se salta la vigencia.
   *
   * <p>La consulta de `tbtickets` que BDK hace en el mismo punto no se replica: en los cuatro
   * días del log no negó a nadie, así que no hay ni un caso del que sacar su regla y adivinarla
   * sería dejar gente fuera sin razón.
   *
   * @return el motivo si hay adeudo, o `null`
   */
  private async consultarAdeudo(
    socio: number,
    now: Date,
  ): Promise<string | null> {
    const limite = new Date(now);
    limite.setHours(0, 0, 0, 0);
    limite.setDate(limite.getDate() + 1);

    const result = await sql<{ saldo: string }>`
      SELECT saldo
      FROM tbmensualidades
      WHERE socio = ${socio}
        AND saldo > 0
        AND cancelado = 0
        AND fecha < ${limite}
    `.execute(this.db.getKysely());

    if (result.rows.length === 0) {
      return null;
    }

    const total = result.rows.reduce((suma, row) => suma + Number(row.saldo), 0);
    return `Adeudo pendiente de ${total.toFixed(2)}`;
  }

  /**
   * Templates de huella para el acceso-service del kiosco, como texto plano: una línea por
   * huella, `socio,base64`. La coma es separador seguro porque el alfabeto base64 no la
   * contiene.
   *
   * Es texto y no JSON porque el único consumidor es el servicio Java, y así no necesita
   * parsear JSON para nada. Con ~1000 templates también es un payload bastante más chico.
   *
   * El CAST a BINARY es obligatorio: `huella` es una columna de texto y, si se deja que
   * MySQL la convierta al charset de la conexión, los bytes del template se corrompen y el
   * SDK ya no puede importarlos. Con el CAST, mysql2 devuelve un Buffer con los bytes tal
   * como están almacenados.
   *
   * **Sólo socios activos**, igual que BDK: `... left join tbsocios b on a.socio=b.socio
   * WHERE b.Activo=1`, la consulta con la que su kiosco cargaba las plantillas (4607 veces en el
   * `general.log` de junio).
   *
   * <p>Aquí vivía la divergencia contraria —cargarlas todas para poder responder `Socio inactivo`
   * en vez de "no reconocida"— justificada en que "no cambia quién entra, el inactivo se rechaza
   * igual". <b>Esa premisa era falsa.</b> `Engine.Identify` rankea por score sobre *todo* el pool,
   * así que las plantillas de los dados de baja compiten contra las de los activos: un socio al
   * corriente que además tiene un expediente viejo con huella es identificado por el expediente
   * viejo y rechazado por inactivo. De 4038 plantillas cargadas, 2963 (73%) eran de socios de
   * baja; BDK matcheaba contra 1075.
   *
   * <p>Casos comprobados en el log del 8-sep-2026: Bárbara Rocha Lara (3861 de baja gana sobre
   * 3870 activa, `score=0x0` ×3) y Sofia Licona (1952 de baja, `score=0x0` ×4). Ver
   * `BITACORA-ACCESO.md`.
   *
   * <p>El filtro no le puede quitar el acceso a nadie: un match contra un inactivo termina
   * siempre en `acceso: false` en {@link AsistenciaService.registrarAcceso}, así que quitar esas
   * plantillas sólo convierte rechazos en entradas. De paso baja el riesgo de falso positivo, con
   * 1075 candidatos en vez de 4038 al mismo umbral.
   *
   * <p>Lo que costaba el filtro —que un dado de baja de verdad viera "huella no reconocida" en
   * vez de `Socio inactivo`— se recuperó sin reabrir el pool: ver {@link listarHuellasInactivas}
   * y la segunda pasada de `Identify` en `MatcherService` del acceso-service.
   */
  async listarHuellas(): Promise<HuellasDto> {
    const db = this.db.getKysely();

    // La marca va ANTES del cuerpo. Si una fila entra entre las dos consultas, la marca queda
    // vieja y el siguiente sondeo la vuelve a traer: inofensivo. Al revés, la marca "sabría" de
    // una fila que el cuerpo no trae, y esa huella se perdería hasta la recarga completa.
    const marca = await this.marcaHuellas();

    const result = await sql<FilaHuella>`
      SELECT h.socio, CAST(h.huella AS BINARY) AS huella
      FROM tbhuellas h
      JOIN tbsocios s ON s.socio = h.socio
      WHERE h.huella IS NOT NULL AND h.huella <> '' AND s.activo = 1
    `.execute(db);

    return { marca, cuerpo: this.aLineas(result.rows) };
  }

  /**
   * Sólo lo que cambió desde una marca de {@link listarHuellas} o de una llamada anterior.
   *
   * Un alta en BDK es un `INSERT` (mueve `id` y `fecnvo`); un reenrolamiento es un
   * `UPDATE ... WHERE Socio=X` que reescribe **todos los dedos** del socio y mueve `fecmod`.
   * Nunca se ha visto un `DELETE`: de los borrados se encarga la recarga completa del kiosco.
   *
   * **Se entrega el socio completo**, no la fila: se buscan los socios con alguna fila cambiada
   * y se devuelven todas sus huellas. Así el kiosco reemplaza al socio entero —lo mismo que hace
   * BDK al reenrolar—, el formato de línea no cambia y no hacen falta ids del lado del kiosco.
   *
   * El primer `SELECT` es un scan de la tabla (no hay índice en `fecnvo` ni `fecmod`), ~3-4 MB
   * de buffer pool ya caliente; en estado estable devuelve vacío y no se corre el segundo. Un
   * índice en `fecmod` lo haría gratis, pero es tocar el esquema de la base compartida con BDK.
   */
  async listarCambiosHuellas(marca: string): Promise<HuellasDto> {
    const partes = MARCA.exec(marca ?? '');
    if (!partes) {
      throw new BadRequestException('marca inválida');
    }
    const desdeId = Number(partes[1]);
    const desde = new Date(Number(partes[2]) - MARGEN_RELOJ_MS);

    const db = this.db.getKysely();
    // Antes del cuerpo, por la misma razón que en listarHuellas.
    const nueva = await this.marcaHuellas();

    const cambiados = await sql<{ socio: number }>`
      SELECT DISTINCT socio
      FROM tbhuellas
      WHERE id > ${desdeId} OR fecnvo > ${desde} OR fecmod > ${desde}
    `.execute(db);

    if (cambiados.rows.length === 0) {
      return { marca: nueva, cuerpo: '' };
    }

    const socios = cambiados.rows.map((row) => row.socio);
    const result = await sql<FilaHuella>`
      SELECT h.socio, CAST(h.huella AS BINARY) AS huella
      FROM tbhuellas h
      JOIN tbsocios s ON s.socio = h.socio
      WHERE h.socio IN (${sql.join(socios)})
        AND h.huella IS NOT NULL AND h.huella <> '' AND s.activo = 1
    `.execute(db);

    return { marca: nueva, cuerpo: this.aLineas(result.rows) };
  }

  /**
   * `<max id>-<ms>`: las tres columnas que BDK mueve al escribir, en una sola consulta. La fecha
   * se convierte a milisegundos aquí y se vuelve a convertir aquí, en el mismo proceso y con el
   * mismo driver, así que el huso horario de la conexión no importa.
   */
  private async marcaHuellas(): Promise<string> {
    const result = await sql<{
      maxId: number | null;
      fecnvo: Date | null;
      fecmod: Date | null;
    }>`
      SELECT MAX(id) AS maxId, MAX(fecnvo) AS fecnvo, MAX(fecmod) AS fecmod
      FROM tbhuellas
    `.execute(this.db.getKysely());

    const fila = result.rows[0];
    const ms = Math.max(aMs(fila?.fecnvo), aMs(fila?.fecmod));
    return `${fila?.maxId ?? 0}-${ms}`;
  }

  /**
   * El "casi-nunca" de {@link listarHuellas}: sólo socios dados de baja. `MatcherService` en el
   * acceso-service la carga aparte y sólo la consulta cuando `Identify` contra los activos no
   * encontró nada — así un socio de baja no compite con uno al corriente, pero recepción sigue
   * viendo `Socio inactivo` en vez de "huella no reconocida".
   *
   * Sin `marca`: quién está dado de baja cambia poco, y no vale la pena el sondeo de cambios para
   * un mensaje que no afecta a quién entra. Se recarga completa junto con {@link listarHuellas}.
   */
  async listarHuellasInactivas(): Promise<string> {
    const db = this.db.getKysely();

    const result = await sql<FilaHuella>`
      SELECT h.socio, CAST(h.huella AS BINARY) AS huella
      FROM tbhuellas h
      JOIN tbsocios s ON s.socio = h.socio
      WHERE h.huella IS NOT NULL AND h.huella <> '' AND s.activo = 0
    `.execute(db);

    return this.aLineas(result.rows);
  }

  private aLineas(rows: FilaHuella[]): string {
    const lineas: string[] = [];

    for (const row of rows) {
      if (!row.huella || row.huella.length === 0) {
        continue;
      }

      // 'binary' (latin1) preserva byte a byte si el driver entregara texto en vez de Buffer.
      const bytes = Buffer.isBuffer(row.huella)
        ? row.huella
        : Buffer.from(row.huella, 'binary');

      lineas.push(`${row.socio},${bytes.toString('base64')}`);
    }

    return lineas.join('\n');
  }

  private async getSocio(socioId: number) {
    const db = this.db.getKysely();
    return db
      .selectFrom('tbsocios')
      .select([
        'id',
        'socio',
        'nomsocio',
        'activo',
        'becado',
        'modopago',
        'diapago',
        'clases',
      ])
      .where('socio', '=', socioId)
      .executeTakeFirst();
  }

  /**
   * `tbsocios.clases` viene como lo escribe BDK: cada clase con la coma **al frente** y a tres
   * dígitos (`,029`), en una columna de ancho fijo rellenada con espacios. El primer elemento del
   * split es la cadena vacía que deja esa coma inicial, así que hay que saltarla — si no, todas
   * las asistencias quedan con clase 0. De ahí el `find` en vez de `[0]`, el radix 10 por el cero
   * a la izquierda y el `trim()` por el relleno.
   *
   * <p>Cada socio tiene una sola clase, así que la primera entrada basta.
   *
   * <p><b>Por qué no se consulta `tbhorariossocio`.</b> BDK sí lo hace, pero esta columna es su
   * propia copia denormalizada: al guardar borra las filas del socio, las reinserta y acto
   * seguido actualiza `clases`. Verificado contra el log general de MySQL — en los 51 ciclos de
   * guardado `clases` coincide exactamente con las filas de la tabla hija, y en las 42
   * asistencias donde el log permite reconstruir el `clases` del socio la clase que escribió BDK
   * es siempre la primera de esta lista. Y `horario` vale 0 en las 51 filas de `tbhorariossocio`
   * y en las 1302 asistencias, así que el acceso escribe lo mismo que BDK sin necesidad de
   * `tbhorariossocio` ni `tbhorarios`.
   */
  private parseClaseId(clases: string): number {
    const primera = (clases ?? '').split(',').find((c) => c.trim() !== '');
    const id = parseInt(primera ?? '', 10);
    return isNaN(id) ? 0 : id;
  }

  /**
   * Las constantes de aquí no son arbitrarias: son las mismas que escribe BDK en las 1302
   * asistencias del log general (`horario=0, retardo=0, autorizo=0, motivo='', instructor=0,
   * usunvo=1, usumod=0, fecmod=1900-01-01`). `envia=1` es lo que hace que el sincronizador
   * externo levante la fila, igual que las de BDK; sin eso la asistencia se queda sin replicar.
   *
   * `new Date('1900-01-01T00:00:00')` lleva la `T` a propósito: sin ella el estándar lo
   * interpreta como UTC y el centinela se guardaría como 1899-12-31.
   */
  private async insertarAsistencia(
    socio: number,
    clase: number,
    fecha: Date,
  ): Promise<void> {
    const db = this.db.getKysely();
    await db
      .insertInto('tbasistencia')
      .values({
        socio,
        fecha,
        clase,
        horario: 0,
        retardo: 0,
        autorizo: 0,
        motivo: '',
        instructor: 0,
        usunvo: 1,
        fecnvo: fecha,
        usumod: 0,
        fecmod: new Date('1900-01-01T00:00:00'),
        envia: 1,
      })
      .execute();
  }

  private async consultarInfoAcceso(
    socio: { socio: number; modopago: number },
    claseId: number,
    now: Date,
  ) {
    const db = this.db.getKysely();

    const [modo, inicioPeriodo, claseRow] = await Promise.all([
      db
        .selectFrom('tbmodospago')
        .select(['nommodopago'])
        .where('modopago', '=', socio.modopago)
        .executeTakeFirst(),
      db
        .selectFrom('tbmensualidades')
        .select('fecha')
        .where('socio', '=', socio.socio)
        .where('cancelado', '=', 0)
        .where('fecha', '<=', now)
        .orderBy('fecha', 'desc')
        .limit(1)
        .executeTakeFirst(),
      claseId > 0
        ? db
            .selectFrom('tbclases')
            .select(['nomclase'])
            .where('clase', '=', claseId)
            .executeTakeFirst()
        : Promise.resolve(undefined),
    ]);

    // Un becado no tiene mensualidades — no hay período de pago del que contar. En vez de
    // mostrar 0 (parecería que nunca ha venido), se cuenta su histórico completo.
    let consultaVisitas = db
      .selectFrom('tbasistencia')
      .select((eb) => eb.fn.countAll<number>().as('total'))
      .where('socio', '=', socio.socio);

    if (inicioPeriodo) {
      consultaVisitas = consultaVisitas.where('fecha', '>=', inicioPeriodo.fecha);
    }

    const visitasResult = await consultaVisitas.executeTakeFirst();

    return {
      tipoMembresia: modo?.nommodopago,
      claseNombre: claseRow?.nomclase,
      visitasPeriodo: Number(visitasResult?.total ?? 0),
    };
  }
}
