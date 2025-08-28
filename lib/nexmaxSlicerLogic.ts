import { supabase } from './supabase';

/**
 * NEXMAX SLICER LOGIC - Utility Functions
 * 
 * Implementasi rules slicer khusus untuk NEXMAX Dashboard
 * KECUALI Transaction Page
 * 
 * 🚨 PENTING: SEMUA DATA UNLIMITED - TIDAK ADA BATAS APAPUN
 * 🚨 PENTING: REAL DATA DARI SUPABASE - BUKAN DUMMY/FALLBACK
 */

// Types untuk slicer data
export interface SlicerData {
  currencies: string[];
  lines: string[];
  years: string[];
  months: string[];
  dateRanges: string[];
}

export interface SlicerFilters {
  currency: string;
  line: string;
  year: string;
  month: string;
  dateRange?: string;
}

// Constants
const VALID_CURRENCIES = ['USD', 'SGD', 'MYR'];
const VALID_LINES = ['Line1', 'Line2', 'Line3', 'Line4', 'Line5'];
const VALID_YEARS = ['2024', '2025', '2026'];
const VALID_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * 1. SLICER CURRENCY - Set Active Source data dari member_report_daily
 * 🚨 UNLIMITED DATA - TIDAK ADA BATAS
 */
export const getCurrencyData = async (): Promise<string[]> => {
  try {
    console.log('🔄 [NEXMAX Slicer] Getting UNLIMITED currency data from member_report_daily...');
    
    // ✅ WAJIB - Ambil SEMUA data tanpa limit
    const { data, error } = await supabase
      .from('member_report_daily')
      .select('currency')
      .order('currency');
    
    if (error) {
      console.error('❌ [NEXMAX Slicer] Database error getting currency data:', error);
      throw error; // Throw error, jangan gunakan fallback
    }
    
    if (!data || data.length === 0) {
      console.warn('⚠️ [NEXMAX Slicer] No currency data found in database');
      return []; // Return empty array, jangan gunakan fallback
    }
    
    // Extract unique currencies dan tambahkan "All" option
    const uniqueCurrencies = Array.from(new Set(data.map(row => row.currency).filter(Boolean)));
    const currenciesWithAll = ['All', ...uniqueCurrencies];
    
    console.log(`✅ [NEXMAX Slicer] UNLIMITED currency data loaded: ${currenciesWithAll.length} currencies`);
    return currenciesWithAll;
    
  } catch (error) {
    console.error('❌ [NEXMAX Slicer] Exception getting currency data:', error);
    throw error; // Throw error, jangan gunakan fallback
  }
};

/**
 * 2. SLICER LINE - Ikut filter Currency Active
 * 🚨 UNLIMITED DATA - TIDAK ADA BATAS
 */
export const getLineData = async (currency: string): Promise<string[]> => {
  try {
    console.log(`🔄 [NEXMAX Slicer] Getting UNLIMITED line data for currency: ${currency}`);
    
    if (currency === 'All') {
      // Jika Currency = "All" → Ambil SEMUA line dari SEMUA currency
      const { data, error } = await supabase
        .from('member_report_daily')
        .select('line')
        .order('line');
      
      if (error) throw error;
      
      const uniqueLines = Array.from(new Set(data?.map(row => row.line).filter(Boolean) || []));
      const linesWithAll = ['All', ...uniqueLines];
      
      console.log(`✅ [NEXMAX Slicer] UNLIMITED all lines loaded: ${linesWithAll.length} lines`);
      return linesWithAll;
    } else {
      // Filter berdasarkan currency yang dipilih - SEMUA data
      const { data, error } = await supabase
        .from('member_report_daily')
        .select('line')
        .eq('currency', currency)
        .order('line');
      
      if (error) throw error;
      
      const uniqueLines = Array.from(new Set(data?.map(row => row.line).filter(Boolean) || []));
      const linesWithAll = ['All', ...uniqueLines];
      
      console.log(`✅ [NEXMAX Slicer] UNLIMITED lines for ${currency}: ${linesWithAll.length} lines`);
      return linesWithAll;
    }
    
  } catch (error) {
    console.error('❌ [NEXMAX Slicer] Error getting line data:', error);
    throw error; // Throw error, jangan gunakan fallback
  }
};

/**
 * 3. SLICER YEAR - Ikut filter Currency Active
 * 🚨 UNLIMITED DATA - TIDAK ADA BATAS
 */
export const getYearData = async (currency: string): Promise<string[]> => {
  try {
    console.log(`🔄 [NEXMAX Slicer] Getting UNLIMITED year data for currency: ${currency}`);
    
    if (currency === 'All') {
      // Jika Currency = "All" → Ambil SEMUA year dari SEMUA currency
      const { data, error } = await supabase
        .from('member_report_daily')
        .select('year')
        .order('year', { ascending: false });
      
      if (error) throw error;
      
      const uniqueYears = Array.from(new Set(data?.map(row => row.year?.toString()).filter(Boolean) || []));
      const yearsWithAll = ['All', ...uniqueYears];
      
      console.log(`✅ [NEXMAX Slicer] UNLIMITED all years loaded: ${yearsWithAll.length} years`);
      return yearsWithAll;
    } else {
      // Filter berdasarkan currency yang dipilih - SEMUA data
      const { data, error } = await supabase
        .from('member_report_daily')
        .select('year')
        .eq('currency', currency)
        .order('year', { ascending: false });
      
      if (error) throw error;
      
      const uniqueYears = Array.from(new Set(data?.map(row => row.year?.toString()).filter(Boolean) || []));
      const yearsWithAll = ['All', ...uniqueYears];
      
      console.log(`✅ [NEXMAX Slicer] UNLIMITED years for ${currency}: ${yearsWithAll.length} years`);
      return yearsWithAll;
    }
    
  } catch (error) {
    console.error('❌ [NEXMAX Slicer] Error getting year data:', error);
    throw error; // Throw error, jangan gunakan fallback
  }
};

/**
 * 4. SLICER MONTH - Ikut filter Year Active
 * 🚨 UNLIMITED DATA - TIDAK ADA BATAS
 */
export const getMonthData = async (currency: string, year: string): Promise<string[]> => {
  try {
    console.log(`🔄 [NEXMAX Slicer] Getting UNLIMITED month data for currency: ${currency}, year: ${year}`);
    
    if (year === 'All') {
      // Jika Year = "All" → Ambil SEMUA month untuk currency yang dipilih
      const { data, error } = await supabase
        .from('member_report_daily')
        .select('month')
        .eq('currency', currency)
        .order('month');
      
      if (error) throw error;
      
      const uniqueMonths = Array.from(new Set(data?.map(row => row.month).filter(Boolean) || []));
      const monthsWithAll = ['All', ...uniqueMonths];
      
      console.log(`✅ [NEXMAX Slicer] UNLIMITED all months for ${currency}: ${monthsWithAll.length} months`);
      return monthsWithAll;
    } else {
      // Filter berdasarkan year yang dipilih - SEMUA data
      const { data, error } = await supabase
        .from('member_report_daily')
        .select('month')
        .eq('currency', currency)
        .eq('year', year)
        .order('month');
      
      if (error) throw error;
      
      const uniqueMonths = Array.from(new Set(data?.map(row => row.month).filter(Boolean) || []));
      const monthsWithAll = ['All', ...uniqueMonths];
      
      console.log(`✅ [NEXMAX Slicer] UNLIMITED months for ${currency} ${year}: ${monthsWithAll.length} months`);
      return monthsWithAll;
    }
    
  } catch (error) {
    console.error('❌ [NEXMAX Slicer] Error getting month data:', error);
    throw error; // Throw error, jangan gunakan fallback
  }
};

/**
 * 5. SLICER DATE RANGE - Ikut filter Year Active
 * 🚨 UNLIMITED DATA - TIDAK ADA BATAS
 */
export const getDateRangeData = async (currency: string, year: string): Promise<string[]> => {
  try {
    console.log(`🔄 [NEXMAX Slicer] Getting UNLIMITED date range data for currency: ${currency}, year: ${year}`);
    
    // Date Range options (customizable berdasarkan business logic)
    const dateRangeOptions = [
      'All',
      'Q1 (Jan-Mar)',
      'Q2 (Apr-Jun)', 
      'Q3 (Jul-Sep)',
      'Q4 (Oct-Dec)',
      'H1 (Jan-Jun)',
      'H2 (Jul-Dec)'
    ];
    
    console.log(`✅ [NEXMAX Slicer] UNLIMITED date range options: ${dateRangeOptions.length} options`);
    return dateRangeOptions;
    
  } catch (error) {
    console.error('❌ [NEXMAX Slicer] Error getting date range data:', error);
    throw error; // Throw error, jangan gunakan fallback
  }
};

/**
 * 6. LOGIC KHUSUS UNTUK "ALL" - Aggregate Data
 * 🚨 UNLIMITED DATA - TIDAK ADA BATAS
 */
export const handleAllSelection = async (
  filters: SlicerFilters,
  componentType: 'statcard' | 'table' | 'pie' | 'line' | 'bar'
): Promise<any> => {
  try {
    console.log(`🔄 [NEXMAX Slicer] Handling UNLIMITED "All" selection for ${componentType}:`, filters);
    
    // ✅ WAJIB - Ambil SEMUA data tanpa limit
    let query = supabase.from('member_report_daily').select('*');
    
    // Apply filters step by step
    if (filters.currency !== 'All') {
      query = query.eq('currency', filters.currency);
    }
    
    if (filters.line !== 'All') {
      query = query.eq('line', filters.line);
    }
    
    if (filters.year !== 'All') {
      query = query.eq('year', filters.year);
    }
    
    if (filters.month !== 'All') {
      query = query.eq('month', filters.month);
    }
    
    // Date Range logic
    if (filters.dateRange && filters.dateRange !== 'All') {
      // Implement date range filtering logic
      query = applyDateRangeFilter(query, filters.dateRange, filters.year);
    }
    
    // ✅ WAJIB - Fetch SEMUA data tanpa limit
    const { data, error } = await query;
    
    if (error) throw error;
    
    console.log(`✅ [NEXMAX Slicer] UNLIMITED data loaded for ${componentType}: ${data?.length || 0} records`);
    return data;
    
  } catch (error) {
    console.error(`❌ [NEXMAX Slicer] Error handling "All" selection for ${componentType}:`, error);
    throw error; // Throw error, jangan return null
  }
};

/**
 * 7. APPLY DATE RANGE FILTER
 * 🚨 UNLIMITED DATA - TIDAK ADA BATAS
 */
const applyDateRangeFilter = (query: any, dateRange: string, year: string) => {
  console.log(`🔄 [NEXMAX Slicer] Applying UNLIMITED date range filter: ${dateRange} for year: ${year}`);
  
  switch (dateRange) {
    case 'Q1 (Jan-Mar)':
      return query.in('month', ['January', 'February', 'March']);
    case 'Q2 (Apr-Jun)':
      return query.in('month', ['April', 'May', 'June']);
    case 'Q3 (Jul-Sep)':
      return query.in('month', ['July', 'August', 'September']);
    case 'Q4 (Oct-Dec)':
      return query.in('month', ['October', 'November', 'December']);
    case 'H1 (Jan-Jun)':
      return query.in('month', ['January', 'February', 'March', 'April', 'May', 'June']);
    case 'H2 (Jul-Dec)':
      return query.in('month', ['July', 'August', 'September', 'October', 'November', 'December']);
    default:
      return query;
  }
};

/**
 * 8. VALIDATE SLICER FILTERS
 * 🚨 VALIDASI LENGKAP - TIDAK ADA KOMPROMI
 */
export const validateNexmaxSlicerFilters = (filters: SlicerFilters): boolean => {
  try {
    console.log('🔄 [NEXMAX Slicer] Validating slicer filters:', filters);
    
    // Basic validation
    if (!filters.currency || !filters.line || !filters.year || !filters.month) {
      console.error('❌ [NEXMAX Slicer] Missing required filters');
      return false;
    }
    
    // Currency validation
    if (filters.currency !== 'All' && !VALID_CURRENCIES.includes(filters.currency)) {
      console.error('❌ [NEXMAX Slicer] Invalid currency:', filters.currency);
      return false;
    }
    
    // Line validation
    if (filters.line !== 'All' && !VALID_LINES.includes(filters.line)) {
      console.error('❌ [NEXMAX Slicer] Invalid line:', filters.line);
      return false;
    }
    
    // Year validation
    if (filters.year !== 'All' && !VALID_YEARS.includes(filters.year)) {
      console.error('❌ [NEXMAX Slicer] Invalid year:', filters.year);
      return false;
    }
    
    // Month validation
    if (filters.month !== 'All' && !VALID_MONTHS.includes(filters.month)) {
      console.error('❌ [NEXMAX Slicer] Invalid month:', filters.month);
      return false;
    }
    
    console.log('✅ [NEXMAX Slicer] All filters are valid');
    return true;
    
  } catch (error) {
    console.error('❌ [NEXMAX Slicer] Error validating filters:', error);
    return false;
  }
};

/**
 * 9. GET ALL SLICER DATA
 * 🚨 UNLIMITED DATA - TIDAK ADA BATAS
 */
export const getAllSlicerData = async (currency: string): Promise<SlicerData> => {
  try {
    console.log(`🔄 [NEXMAX Slicer] Getting UNLIMITED all slicer data for currency: ${currency}`);
    
    const [currencies, lines, years, months, dateRanges] = await Promise.all([
      getCurrencyData(),
      getLineData(currency),
      getYearData(currency),
      getMonthData(currency, 'All'), // Default to 'All' year
      getDateRangeData(currency, 'All') // Default to 'All' year
    ]);
    
    const slicerData: SlicerData = {
      currencies,
      lines,
      years,
      months,
      dateRanges
    };
    
    console.log(`✅ [NEXMAX Slicer] UNLIMITED all slicer data loaded: ${currencies.length} currencies, ${lines.length} lines, ${years.length} years, ${months.length} months, ${dateRanges.length} date ranges`);
    return slicerData;
    
  } catch (error) {
    console.error('❌ [NEXMAX Slicer] Error getting all slicer data:', error);
    throw error; // Throw error, jangan gunakan fallback
  }
};

/**
 * 10. AUTO LOCK MONTH SLICER WHEN DATE RANGE ACTIVE
 */
export const shouldLockMonthSlicer = (dateRange?: string): boolean => {
  if (!dateRange || dateRange === 'All') {
    return false; // Month slicer aktif
  }
  
  // Jika Date Range aktif (bukan "All"), lock Month Slicer
  return true;
};

/**
 * 11. GET SLICER INFO FOR DISPLAY
 */
export const getSlicerInfo = (filters: SlicerFilters): string => {
  const parts = [];
  
  if (filters.currency !== 'All') parts.push(filters.currency);
  if (filters.line !== 'All') parts.push(filters.line);
  if (filters.year !== 'All') parts.push(filters.year);
  if (filters.month !== 'All') parts.push(filters.month);
  if (filters.dateRange && filters.dateRange !== 'All') parts.push(filters.dateRange);
  
  if (parts.length === 0) {
    return 'All Data (Unlimited)';
  }
  
  return parts.join(' | ');
};

/**
 * 12. ERROR HANDLING FOR SLICER
 * 🚨 ERROR HANDLING ROBUST - TIDAK ADA FALLBACK
 */
export const handleSlicerError = (error: any, context: string): string => {
  console.error(`❌ [NEXMAX Slicer] Error in ${context}:`, error);
  
  if (error?.message) {
    return `Database Error: ${error.message}`;
  }
  
  if (error?.details) {
    return `Database Error: ${error.details}`;
  }
  
  return `Database Error occurred in ${context}`;
};

/**
 * 13. GET UNLIMITED DATA FOR COMPONENT
 * 🚨 UNLIMITED DATA - TIDAK ADA BATAS APAPUN
 */
export const getUnlimitedDataForComponent = async (
  filters: SlicerFilters,
  componentType: 'statcard' | 'table' | 'pie' | 'line' | 'bar'
): Promise<any> => {
  try {
    console.log(`🔄 [NEXMAX Slicer] Getting UNLIMITED data for ${componentType}:`, filters);
    
    // ✅ WAJIB - Ambil SEMUA data tanpa limit
    let query = supabase.from('member_report_daily').select('*');
    
    // Apply filters step by step
    if (filters.currency !== 'All') {
      query = query.eq('currency', filters.currency);
    }
    
    if (filters.line !== 'All') {
      query = query.eq('line', filters.line);
    }
    
    if (filters.year !== 'All') {
      query = query.eq('year', filters.year);
    }
    
    if (filters.month !== 'All') {
      query = query.eq('month', filters.month);
    }
    
    // Date Range logic
    if (filters.dateRange && filters.dateRange !== 'All') {
      query = applyDateRangeFilter(query, filters.dateRange, filters.year);
    }
    
    // ✅ WAJIB - Fetch SEMUA data tanpa limit
    const { data, error } = await query;
    
    if (error) {
      console.error(`❌ [NEXMAX Slicer] Database error for ${componentType}:`, error);
      throw error;
    }
    
    console.log(`✅ [NEXMAX Slicer] UNLIMITED data loaded for ${componentType}: ${data?.length || 0} records`);
    
    // ✅ WAJIB - Return SEMUA data tanpa limit
    return data;
    
  } catch (error) {
    console.error(`❌ [NEXMAX Slicer] Error getting unlimited data for ${componentType}:`, error);
    throw error; // Throw error, jangan return null atau fallback
  }
};
