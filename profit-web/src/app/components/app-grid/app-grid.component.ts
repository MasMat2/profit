import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  GridSizeChangedEvent,
  PaginationChangedEvent,
  RowClickedEvent,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [AgGridAngular, CommonModule, FormsModule],
  template: `
    <div class="grid-wrapper">
      <ag-grid-angular
        [rowData]="rowData"
        [columnDefs]="columnDefs"
        [defaultColDef]="defaultColDef"
        [theme]="theme"
        [localeText]="localeText"
        [rowHeight]="rowHeight"
        [pagination]="true"
        [paginationPageSize]="pageSize"
        [suppressPaginationPanel]="true"
        [animateRows]="true"
        style="width:100%;height:100%"
        (gridReady)="onGridReady($event)"
        (gridSizeChanged)="onGridSizeChanged($event)"
        (rowClicked)="onRowClicked($event)"
        (paginationChanged)="onPaginationChanged($event)"
      />

      <div class="pagination-bar" *ngIf="totalPages > 0">
        <div class="pagination-info">
          <span>Filas por página:</span>
          <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange($event)">
            <option *ngFor="let s of pageSizeOptions" [value]="s">{{ s }}</option>
          </select>
          <span class="row-count">{{ rowRangeLabel }}</span>
        </div>

        <div class="pagination-controls">
          <button class="page-btn" (click)="goToFirst()" [disabled]="currentPage === 1" title="Primera página">
            <i class="fas fa-angle-double-left"></i>
          </button>
          <button class="page-btn" (click)="goToPrev()" [disabled]="currentPage === 1" title="Anterior">
            <i class="fas fa-angle-left"></i>
          </button>

          <div class="page-input-group">
            <input
              type="number"
              class="page-input"
              [(ngModel)]="pageInputValue"
              (keydown.enter)="commitPageInput()"
              (blur)="commitPageInput()"
              [min]="1"
              [max]="totalPages"
            />
            <span class="page-total">de {{ totalPages }}</span>
          </div>

          <button class="page-btn" (click)="goToNext()" [disabled]="currentPage === totalPages" title="Siguiente">
            <i class="fas fa-angle-right"></i>
          </button>
          <button class="page-btn" (click)="goToLast()" [disabled]="currentPage === totalPages" title="Última página">
            <i class="fas fa-angle-double-right"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; width:100%; height:100%; }

    .grid-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .grid-wrapper ag-grid-angular {
      flex: 1;
      min-height: 0;
    }

    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-top: none;
      font-family: Inter, sans-serif;
      font-size: 13px;
      color: #374151;
      flex-shrink: 0;
    }

    .pagination-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pagination-info select {
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 3px 6px;
      font-size: 13px;
      color: #374151;
      background: #fff;
      cursor: pointer;
      outline: none;
    }

    .row-count {
      color: #6B7280;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .page-btn {
      width: 30px;
      height: 30px;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      background: #fff;
      color: #374151;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, border-color 0.15s;
    }

    .page-btn:hover:not(:disabled) {
      background: #FFF7ED;
      border-color: #F97316;
      color: #F97316;
    }

    .page-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .page-input-group {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 4px;
    }

    .page-input {
      width: 52px;
      height: 30px;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      text-align: center;
      font-size: 13px;
      color: #374151;
      outline: none;
      transition: border-color 0.15s;
    }

    .page-input:focus {
      border-color: #F97316;
      box-shadow: 0 0 0 2px rgba(249,115,22,0.15);
    }

    .page-input::-webkit-inner-spin-button,
    .page-input::-webkit-outer-spin-button {
      -webkit-appearance: none;
    }

    .page-total {
      color: #6B7280;
      white-space: nowrap;
    }
  `],
})
export class AppGridComponent {
  @Input() rowData: any[] = [];
  @Input() columnDefs: ColDef[] = [];
  @Input() rowHeight: number = 52;
  @Output() rowClicked = new EventEmitter<any>();

  private gridApi!: GridApi;

  currentPage = 1;
  totalPages = 0;
  pageSize = 50;
  pageInputValue = 1;
  rowRangeLabel = '';
  pageSizeOptions = [25, 50, 100, 200];

  theme = themeQuartz.withParams({
    accentColor: '#F97316',
    headerBackgroundColor: '#F9FAFB',
    rowHoverColor: '#FFF7ED',
    borderColor: '#E5E7EB',
    foregroundColor: '#374151',
    headerTextColor: '#6B7280',
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
  });

  localeText = {
    page: 'Página',
    more: 'más',
    to: 'a',
    of: 'de',
    next: 'Siguiente',
    last: 'Último',
    first: 'Primero',
    previous: 'Anterior',
    loadingOoo: 'Cargando...',
    noRowsToShow: 'Sin datos',
    filterOoo: 'Filtrar...',
    applyFilter: 'Aplicar',
    equals: 'Igual',
    notEqual: 'No igual',
    lessThan: 'Menor que',
    greaterThan: 'Mayor que',
    lessThanOrEqual: 'Menor o igual',
    greaterThanOrEqual: 'Mayor o igual',
    inRange: 'En rango',
    inRangeStart: 'Desde',
    inRangeEnd: 'Hasta',
    contains: 'Contiene',
    notContains: 'No contiene',
    startsWith: 'Comienza con',
    endsWith: 'Termina con',
    blank: 'Vacío',
    notBlank: 'No vacío',
    andCondition: 'Y',
    orCondition: 'O',
    apply: 'Aplicar',
    reset: 'Limpiar',
    clear: 'Limpiar',
    cancel: 'Cancelar',
    columns: 'Columnas',
    filters: 'Filtros',
    rowGroupColumns: 'Agrupar por',
    rowGroupColumnsEmptyMessage: 'Arrastra columnas aquí',
    valueColumns: 'Valores',
    pivotMode: 'Modo Pivote',
    groups: 'Grupos',
    values: 'Valores',
    pivots: 'Pivotes',
    group: 'Agrupar',
    pivot: 'Pivote',
    valueColumnsEmptyMessage: 'Arrastra columnas aquí',
    pivotColumnsEmptyMessage: 'Arrastra columnas aquí',
    toolPanelButton: 'Panel',
    noPin: 'Sin anclar',
    pinLeft: 'Anclar izquierda',
    pinRight: 'Anclar derecha',
    sortAscending: 'Orden ascendente',
    sortDescending: 'Orden descendente',
    sortUnSort: 'Sin orden',
    columnMenuVisibilityPopupButton: 'Columnas',
    sum: 'Suma',
    min: 'Mínimo',
    max: 'Máximo',
    count: 'Conteo',
    avg: 'Promedio',
    filteredRows: 'Filtrados',
    selectedRows: 'Seleccionados',
    totalRows: 'Total',
    totalAndFilteredRows: 'Filas',
    searchOoo: 'Buscar...',
    selectAll: 'Seleccionar todo',
    selectAllSearchResults: 'Seleccionar resultados',
    addCurrentSelectionToFilter: 'Agregar al filtro',
    copy: 'Copiar',
    copyWithHeaders: 'Copiar con encabezados',
    copyWithGroupHeaders: 'Copiar con grupos',
    paste: 'Pegar',
    export: 'Exportar',
    csvExport: 'Exportar CSV',
    excelExport: 'Exportar Excel',
    pageSize: 'Tamaño de página',
  };

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: false,
    minWidth: 100,
  };

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
    event.api.sizeColumnsToFit();
  }

  onGridSizeChanged(event: GridSizeChangedEvent): void {
    event.api.sizeColumnsToFit();
  }

  onRowClicked(event: RowClickedEvent): void {
    this.rowClicked.emit(event.data);
  }

  onPaginationChanged(_event: PaginationChangedEvent): void {
    if (!this.gridApi) return;
    this.totalPages = this.gridApi.paginationGetTotalPages();
    this.currentPage = this.gridApi.paginationGetCurrentPage() + 1;
    this.pageInputValue = this.currentPage;
    this.updateRowRangeLabel();
  }

  onPageSizeChange(size: number): void {
    if (!this.gridApi) return;
    this.gridApi.setGridOption('paginationPageSize', Number(size));
  }

  commitPageInput(): void {
    if (!this.gridApi) return;
    let page = Math.floor(Number(this.pageInputValue));
    if (isNaN(page) || page < 1) page = 1;
    if (page > this.totalPages) page = this.totalPages;
    this.pageInputValue = page;
    this.gridApi.paginationGoToPage(page - 1);
  }

  goToFirst(): void { this.gridApi?.paginationGoToFirstPage(); }
  goToPrev(): void  { this.gridApi?.paginationGoToPreviousPage(); }
  goToNext(): void  { this.gridApi?.paginationGoToNextPage(); }
  goToLast(): void  { this.gridApi?.paginationGoToLastPage(); }

  private updateRowRangeLabel(): void {
    if (!this.gridApi) return;
    const total = this.gridApi.paginationGetRowCount();
    const pageSize = this.gridApi.paginationGetPageSize();
    const start = (this.currentPage - 1) * pageSize + 1;
    const end = Math.min(this.currentPage * pageSize, total);
    this.rowRangeLabel = total > 0 ? `${start}–${end} de ${total}` : '';
  }
}
