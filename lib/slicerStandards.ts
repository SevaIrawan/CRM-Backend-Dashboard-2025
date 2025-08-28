import { SlicerFilters } from './nexmaxSlicerLogic';

/**
 * SLICER STANDARDS - NEXMAX DASHBOARD
 * 
 * Utility functions untuk membantu implementasi standard slicer
 * yang berbeda untuk setiap jenis komponen
 */

/**
 * Membuat filter untuk StatCard, Table Chart, dan Pie Chart
 * SEMUA slicer AKTIF termasuk Month
 */
export const createFullSlicerFilters = (
  year: string,
  month: string,
  currency: string,
  line: string
): SlicerFilters => {
  return {
    year,
    month,        // ✅ AKTIF
    currency,
    line
  };
};

/**
 * Membuat filter untuk Line Chart dan Bar Chart
 * Month Slicer TIDAK AKTIF (undefined)
 */
export const createChartSlicerFilters = (
  year: string,
  month: string,  // Akan di-set menjadi undefined
  currency: string,
  line: string
): SlicerFilters => {
  return {
    year,          // ✅ AKTIF - Tampilkan Period Month
    month: undefined, // ❌ TIDAK AKTIF
    currency,
    line
  };
};

/**
 * Validasi apakah filter sudah sesuai standard
 */
export const validateSlicerFilters = (
  filters: SlicerFilters,
  componentType: 'statcard' | 'table' | 'pie' | 'line' | 'bar'
): boolean => {
  switch (componentType) {
    case 'statcard':
    case 'table':
    case 'pie':
      // Semua slicer harus aktif
      return !!(filters.year && filters.month && filters.currency && filters.line);
    
    case 'line':
    case 'bar':
      // Month Slicer TIDAK AKTIF
      return !!(filters.year && !filters.month && filters.currency && filters.line);
    
    default:
      return false;
  }
};

/**
 * Helper untuk mendapatkan label yang sesuai dengan standard
 */
export const getSlicerLabels = (
  componentType: 'statcard' | 'table' | 'pie' | 'line' | 'bar',
  year: string,
  month: string,
  currency: string,
  line: string
): string => {
  switch (componentType) {
    case 'statcard':
    case 'table':
    case 'pie':
      return `${year} | ${month} | ${currency} | ${line}`;
    
    case 'line':
    case 'bar':
      return `${year} | Period Month | ${currency} | ${line}`;
    
    default:
      return `${year} | ${month} | ${currency} | ${line}`;
  }
};

/**
 * Helper untuk mendapatkan info slicer yang ditampilkan
 */
export const getSlicerInfo = (
  componentType: 'statcard' | 'table' | 'pie' | 'line' | 'bar',
  year: string,
  month: string,
  currency: string,
  line: string
): string => {
  const baseInfo = `Showing data for: ${year} | ${currency} | ${line}`;
  
  switch (componentType) {
    case 'statcard':
    case 'table':
    case 'pie':
      return `${baseInfo} | ${month}`;
    
    case 'line':
    case 'bar':
      return `${baseInfo} | Period Month (Month Slicer disabled)`;
    
    default:
      return `${baseInfo} | ${month}`;
  }
};

/**
 * Constants untuk standard slicer
 */
export const SLICER_STANDARDS = {
  // Komponen yang menggunakan SEMUA slicer aktif
  FULL_SLICER_COMPONENTS: ['statcard', 'table', 'pie'] as const,
  
  // Komponen yang TIDAK menggunakan Month Slicer
  CHART_COMPONENTS: ['line', 'bar'] as const,
  
  // Label untuk setiap jenis komponen
  LABELS: {
    statcard: 'KPI Cards - All Slicers Active',
    table: 'Table Chart - All Slicers Active',
    pie: 'Pie Chart - All Slicers Active',
    line: 'Line Chart - Month Slicer Disabled',
    bar: 'Bar Chart - Month Slicer Disabled'
  }
} as const;

/**
 * Type untuk komponen yang menggunakan full slicer
 */
export type FullSlicerComponent = typeof SLICER_STANDARDS.FULL_SLICER_COMPONENTS[number];

/**
 * Type untuk komponen chart (tidak menggunakan month slicer)
 */
export type ChartComponent = typeof SLICER_STANDARDS.CHART_COMPONENTS[number];

/**
 * Type untuk semua jenis komponen
 */
export type ComponentType = FullSlicerComponent | ChartComponent;
