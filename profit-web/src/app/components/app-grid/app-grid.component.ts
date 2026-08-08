import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  Column,
  ColumnState,
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

      <div class="pagination-bar">
        <div class="pagination-info">
          <span>Filas por página:</span>
          <select [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange($event)">
            <option *ngFor="let s of pageSizeOptions" [value]="s">{{ s }}</option>
          </select>
          <span class="row-count">{{ rowRangeLabel }}</span>

          <div class="chooser" #chooser>
            <button type="button" class="chooser-btn" (click)="toggleColumnsPanel()">
              <i class="fas fa-table-columns"></i>
              Columnas
            </button>

            <div class="chooser-panel" *ngIf="showColumnsPanel">
              <label class="chooser-item" *ngFor="let c of columnasChooser">
                <input
                  type="checkbox"
                  [checked]="c.visible"
                  (change)="toggleColumna(c.colId, $any($event.target).checked)"
                />
                <span>{{ c.header }}</span>
              </label>

              <div class="chooser-actions">
                <button type="button" (click)="mostrarTodasLasColumnas()">Mostrar todas</button>
                <button type="button" (click)="restablecerColumnas()">Restablecer</button>
              </div>
            </div>
          </div>
        </div>

        <div class="pagination-controls" *ngIf="totalPages > 0">
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

    /* ── Selector de columnas (vive en la barra de paginación) ────────────── */

    .chooser {
      position: relative; /* ancla del panel flotante */
      margin-left: 8px;
    }

    /* Se abre hacia arriba: el botón está en el borde inferior del grid. */
    .chooser-panel {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 0;
      z-index: 20;
      min-width: 210px;
      max-height: 320px;
      overflow-y: auto;
      padding: 6px;
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      font-family: Inter, sans-serif;
      font-size: 13px;
      color: #374151;
    }

    .chooser-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: pointer;
      user-select: none;
    }

    .chooser-item input[type='checkbox'] {
      width: 15px;
      height: 15px;
      accent-color: #F97316;
      cursor: pointer;
      flex-shrink: 0;
    }

    .chooser-actions {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid #E5E7EB;
    }

    .chooser-actions button {
      border: none;
      background: none;
      padding: 4px 6px;
      border-radius: 6px;
      color: #F97316;
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .chooser-item:hover,
    .chooser-actions button:hover {
      background: #FFF7ED;
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

    .pagination-info select,
    .chooser-btn {
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 3px 6px;
      font-size: 13px;
      color: #374151;
      background: #fff;
      cursor: pointer;
      outline: none;
    }

    .chooser-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      font-family: inherit;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
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

    .page-btn:hover:not(:disabled),
    .chooser-btn:hover {
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

  @ViewChild('chooser') chooserRef?: ElementRef<HTMLElement>;

  private gridApi!: GridApi;

  showColumnsPanel = false;
  columnasChooser: { colId: string; header: string; visible: boolean }[] = [];

  // Visibilidad declarada en columnDefs (el `hide`), para poder restablecerla.
  private estadoInicial: ColumnState[] = [];

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
    // Sin separadores verticales: las columnas se distinguen por el espaciado.
    headerColumnBorder: false,
    columnBorder: false,
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
    // Se captura antes de que el usuario toque nada: es el estado por defecto.
    this.estadoInicial = event.api.getColumnState().map((c) => ({ colId: c.colId, hide: !!c.hide }));
    event.api.sizeColumnsToFit();
  }

  toggleColumnsPanel(): void {
    this.showColumnsPanel = !this.showColumnsPanel;
    if (this.showColumnsPanel) this.refrescarListaColumnas();
  }

  toggleColumna(colId: string, visible: boolean): void {
    this.gridApi?.setColumnsVisible([colId], visible);
    const item = this.columnasChooser.find((c) => c.colId === colId);
    if (item) item.visible = visible;
    this.gridApi?.sizeColumnsToFit();
  }

  mostrarTodasLasColumnas(): void {
    this.gridApi?.setColumnsVisible(this.columnasChooser.map((c) => c.colId), true);
    this.refrescarListaColumnas();
    this.gridApi?.sizeColumnsToFit();
  }

  restablecerColumnas(): void {
    this.gridApi?.applyColumnState({ state: this.estadoInicial });
    this.refrescarListaColumnas();
    this.gridApi?.sizeColumnsToFit();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.showColumnsPanel = false;
  }

  // Se compara contra el wrapper del selector y no contra todo el componente, para que
  // un clic sobre el grid también cierre el panel.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showColumnsPanel) return;
    if (!this.chooserRef?.nativeElement.contains(event.target as Node)) {
      this.showColumnsPanel = false;
    }
  }

  // getColumns() incluye las ocultas y respeta el orden de columnDefs.
  private refrescarListaColumnas(): void {
    this.columnasChooser = (this.gridApi?.getColumns() ?? []).map((col: Column) => {
      const def = col.getColDef();
      return {
        colId: col.getColId(),
        header: def.headerName ?? String(def.field ?? col.getColId()),
        visible: col.isVisible(),
      };
    });
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
