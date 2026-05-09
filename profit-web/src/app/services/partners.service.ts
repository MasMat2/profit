import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Partner, PartnerFilter, PartnerStatus, PaymentPeriod, ClassCategory, AvailableClass, SocioAPI, PartnerClass } from '../models/partner.model';

@Injectable({
  providedIn: 'root'
})
export class PartnersService {
  private apiUrl = '/socios';

  constructor(private http: HttpClient) { }

  // Mapeo de datos de API a modelo Partner
  private mapSocioToPartner(socio: SocioAPI): Partner {
    return {
      id: socio.id,
      nombre: socio.nomsocio,
      telefono: socio.tel1,
      correo: socio.correo,
      sexo: socio.sexo === 1 ? 'M' : 'F',
      fechaNacimiento: new Date(socio.cumpleaños),
      foto: socio.fotostr || socio.foto || undefined,
      comentarios: socio.obs || undefined,
      estatus: this.mapActivoToStatus(socio.activo, socio.becado),
      saldo: socio.importepago - socio.descpo,
      becado: socio.becado === 1,
      fechaRegistro: new Date(socio.fecnvo),
      periodicidad: this.mapModoPagoToPeriod(socio.modopago),
      clases: this.mapClasesString(socio.clases),
      suscripciones: [],
      ventas: []
    };
  }

  private mapActivoToStatus(activo: number, becado: number): PartnerStatus {
    if (becado === 1) return PartnerStatus.BECADO;
    if (activo === 1) return PartnerStatus.ACTIVO;
    if (activo === 0) return PartnerStatus.INACTIVO;
    return PartnerStatus.SUSPENDIDO;
  }

  private mapModoPagoToPeriod(modopago: number): PaymentPeriod {
    switch (modopago) {
      case 1: return PaymentPeriod.SEMANAL;
      case 2: return PaymentPeriod.QUINCENAL;
      case 3: return PaymentPeriod.MENSUAL;
      case 4: return PaymentPeriod.TRIMESTRAL;
      case 5: return PaymentPeriod.SEMESTRAL;
      case 6: return PaymentPeriod.ANUAL;
      default: return PaymentPeriod.MENSUAL;
    }
  }

  private mapClasesString(clasesStr: string): PartnerClass[] {
    // El campo clases contiene el ID de la clase asignada
    if (!clasesStr || clasesStr.trim() === '') return [];
    
    // Por ahora retornamos vacío, se cargará mediante getClaseDetails
    return [];
  }

  getClaseDetails(claseId: number): Observable<any> {
    return this.http.get(`http://localhost:3000/api/classes/${claseId}`);
  }

  private mapPartnerToSocioAPI(partner: Partial<Partner>): any {
    const fechaNac = partner.fechaNacimiento ? new Date(partner.fechaNacimiento) : new Date();
    const fechaReg = partner.fechaRegistro ? new Date(partner.fechaRegistro) : new Date();
    
    return {
      nomsocio: partner.nombre || '',
      tel1: partner.telefono || '',
      tel2: '',
      correo: partner.correo || '',
      sexo: partner.sexo === 'M' ? 1 : 0,
      cumpleaños: fechaNac.toISOString().split('T')[0],
      obs: partner.comentarios || '',
      activo: partner.estatus === PartnerStatus.ACTIVO || partner.estatus === PartnerStatus.BECADO ? 1 : 0,
      becado: partner.becado ? 1 : 0,
      modopago: this.mapPeriodToModoPago(partner.periodicidad),
      clases: this.mapClasesArrayToString(partner.clases || []),
      fecnvo: fechaReg.toISOString().split('T')[0],
      importepago: 0,
      descpo: 0,
      direccion: '',
      diapago: '1',
      visitasdisp: 0,
      fecvencevis: new Date().toISOString().split('T')[0]
    };
  }

  private mapPeriodToModoPago(period?: PaymentPeriod): number {
    if (!period) return 3;
    switch (period) {
      case PaymentPeriod.SEMANAL: return 1;
      case PaymentPeriod.QUINCENAL: return 2;
      case PaymentPeriod.MENSUAL: return 3;
      case PaymentPeriod.TRIMESTRAL: return 4;
      case PaymentPeriod.SEMESTRAL: return 5;
      case PaymentPeriod.ANUAL: return 6;
      default: return 3;
    }
  }

  private mapClasesArrayToString(clases: PartnerClass[]): string {
    return clases.map(c => c.id).join(',');
  }

  getPartners(filter?: PartnerFilter): Observable<Partner[]> {
    let url = this.apiUrl;
    const params: string[] = [];

    if (filter) {
      if (filter.busqueda) {
        params.push(`search=${encodeURIComponent(filter.busqueda)}`);
      }
      if (filter.estatus && filter.estatus.length > 0) {
        params.push(`estatus=${filter.estatus.join(',')}`);
      }
      if (filter.becado !== undefined) {
        params.push(`becado=${filter.becado ? 1 : 0}`);
      }
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<SocioAPI[]>(url).pipe(
      map(socios => socios.map(socio => this.mapSocioToPartner(socio)))
    );
  }

  getPartnerById(id: number): Observable<Partner> {
    return this.http.get<SocioAPI>(`${this.apiUrl}/${id}`).pipe(
      map(socio => this.mapSocioToPartner(socio))
    );
  }

  getPartnerRawById(id: number): Observable<SocioAPI> {
    return this.http.get<SocioAPI>(`${this.apiUrl}/${id}`);
  }

  createPartner(partner: Partial<Partner>): Observable<Partner> {
    const socioData = this.mapPartnerToSocioAPI(partner);
    console.log('Datos enviados al backend:', socioData);
    console.log('URL del endpoint:', this.apiUrl);
    
    return this.http.post<SocioAPI>(this.apiUrl, socioData).pipe(
      map(socio => {
        console.log('Respuesta del backend:', socio);
        return this.mapSocioToPartner(socio);
      })
    );
  }

  updatePartner(id: number, partner: Partial<Partner>): Observable<Partner> {
    const socioData = this.mapPartnerToSocioAPI(partner);
    return this.http.put<SocioAPI>(`${this.apiUrl}/${id}`, socioData).pipe(
      map(socio => this.mapSocioToPartner(socio))
    );
  }

  deletePartner(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getAvailableClasses(): Observable<ClassCategory[]> {
    return this.http.get<any[]>('http://localhost:3000/api/classes/active').pipe(
      map(classes => this.mapClassesToCategories(classes))
    );
  }

  getMensualidadesBySocio(socioId: number): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:3000/api/mensualidades/socio/${socioId}`);
  }

  getDescuentosBySocio(socioId: number): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:3000/api/descuentos/socio/${socioId}`);
  }

  private mapClassesToCategories(classes: any[]): ClassCategory[] {
    const categoriesMap = new Map<string, any[]>();
    
    classes.forEach(clase => {
      const categoryName = clase.nomclase;
      if (!categoriesMap.has(categoryName)) {
        categoriesMap.set(categoryName, []);
      }
      categoriesMap.get(categoryName)!.push(clase);
    });

    const categories: ClassCategory[] = [];
    let categoryId = 1;

    categoriesMap.forEach((clases, categoryName) => {
      categories.push({
        id: categoryId++,
        nombre: categoryName,
        clases: clases.map(clase => ({
          id: clase.id,
          nombre: clase.nomclase,
          categoria: categoryName,
          precios: [
            { periodicidad: PaymentPeriod.SEMANAL, precio: clase.prsem || 0, descuento: clase.descsem || 0 },
            { periodicidad: PaymentPeriod.QUINCENAL, precio: clase.prqna || 0, descuento: clase.descqna || 0 },
            { periodicidad: PaymentPeriod.MENSUAL, precio: clase.prmes || 0, descuento: clase.descmes || 0 },
            { periodicidad: PaymentPeriod.TRIMESTRAL, precio: clase.prtrim || 0, descuento: clase.desctrim || 0 },
            { periodicidad: PaymentPeriod.SEMESTRAL, precio: clase.prstre || 0, descuento: clase.descstre || 0 },
            { periodicidad: PaymentPeriod.ANUAL, precio: clase.pranual || 0, descuento: clase.descanual || 0 }
          ]
        }))
      });
    });

    return categories;
  }
}
