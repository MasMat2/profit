export class DateUtils {
  static readonly MESES_ESPAÑOL = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  static getMonthName(date: Date): string {
    return this.MESES_ESPAÑOL[date.getMonth()];
  }
}