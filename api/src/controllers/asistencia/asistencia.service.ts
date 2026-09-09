import { Injectable } from '@nestjs/common';
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
 * Interruptor de emergencia para la negación por adeudo: viene prendida, y sólo un
 * `ASISTENCIA_DENEGAR_ADEUDO=false` explícito la baja a modo aviso. Ver
 * {@link AsistenciaService.consultarAdeudo}.
 *
 * Se lee en cada llamada y no en una constante de módulo: los `import` se evalúan antes del
 * `dotenv.config()` de `main.ts`, así que a nivel de módulo el `.env` todavía no está cargado.
 */
function denegarAdeudo(): boolean {
  return process.env.ASISTENCIA_DENEGAR_ADEUDO !== 'false';
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

      if (adeudo && denegarAdeudo()) {
        return { acceso: false, motivo: adeudo };
      }
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
   * Adeudo pendiente: la misma consulta que corre BDK antes de dejar pasar a alguien —
   * mensualidades no canceladas con saldo cuya fecha ya llegó. El límite es el **inicio del día
   * siguiente**, tal cual está en el log general (`Fecha<'2026-05-24 00:00:00'` para un acceso
   * del 23 de mayo), o sea "hasta hoy inclusive".
   *
   * Es el filtro que le faltaba al kiosco nuevo. En el log, de 1359 huellas reconocidas (las 82
   * del socio 9999999 son el centinela de "sin match", no cuentan) BDK negó 56: 12 por membresía
   * —que ya cubrimos arriba— y 44 exactamente aquí.
   *
   * <p><b>A quién no se le revisa.</b> BDK corre esta consulta 980 de 1346 veces; las 366 que
   * salta son de becados. Comprobado contra la base: de los 65 socios que la saltan los 65 son
   * `becado=1`, y de los 574 que la corren los 574 son `becado=0` — separación perfecta, y
   * ningún socio cae en ambos grupos. Coherente con el dato de fondo: 51 de esos 65 becados no
   * tienen ni una fila en `tbmensualidades`. Por eso la llamada vive dentro de la rama
   * `!becado` de {@link registrarAcceso}, la misma que ya se salta la vigencia.
   *
   * <p>`ASISTENCIA_DENEGAR_ADEUDO=false` desactiva la negación y deja el motivo como
   * `advertencia`, registrando la asistencia igual. Es interruptor de emergencia, no el modo
   * normal: la regla está confirmada y viene prendida.
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
   * <p><b>Lo que se pierde:</b> para un socio dado de baja de verdad, recepción ve ahora "huella
   * no reconocida" y ya no `Socio inactivo` — exactamente lo que veía con BDK. Recuperar ese
   * mensaje sin volver a meter las plantillas al pool requiere una segunda pasada de `Identify`
   * contra sólo los inactivos, en el camino de "no hubo match"; queda pendiente.
   */
  async listarHuellas(): Promise<string> {
    const db = this.db.getKysely();

    const result = await sql<{
      socio: number;
      huella: Buffer | string | null;
    }>`
      SELECT h.socio, CAST(h.huella AS BINARY) AS huella
      FROM tbhuellas h
      JOIN tbsocios s ON s.socio = h.socio
      WHERE h.huella IS NOT NULL AND h.huella <> '' AND s.activo = 1
    `.execute(db);

    const lineas: string[] = [];

    for (const row of result.rows) {
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

    const visitasResult = inicioPeriodo
      ? await db
          .selectFrom('tbasistencia')
          .select((eb) => eb.fn.countAll<number>().as('total'))
          .where('socio', '=', socio.socio)
          .where('fecha', '>=', inicioPeriodo.fecha)
          .executeTakeFirst()
      : null;

    return {
      tipoMembresia: modo?.nommodopago,
      claseNombre: claseRow?.nomclase,
      visitasPeriodo: Number(visitasResult?.total ?? 0),
    };
  }
}
