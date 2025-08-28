# NEXMAX SLICER IMPLEMENTATION EXAMPLES

## IMPLEMENTASI SLICER UNTUK SETIAP PAGE

### 🎯 **PENTING: KECUALI TRANSACTION PAGE**
Semua implementasi di bawah ini **TIDAK BERLAKU** untuk Transaction Page.

---

## 1. DASHBOARD PAGE IMPLEMENTATION

```typescript
import React, { useState, useEffect } from 'react';
import { 
  getAllSlicerData, 
  validateNexmaxSlicerFilters,
  handleAllSelection,
  shouldLockMonthSlicer,
  getSlicerInfo
} from '@/lib/nexmaxSlicerLogic';

export default function DashboardPage() {
  // State untuk slicer
  const [selectedCurrency, setSelectedCurrency] = useState('All');
  const [selectedLine, setSelectedLine] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('All');
  
  // State untuk slicer data
  const [slicerData, setSlicerData] = useState({
    currencies: [],
    lines: [],
    years: [],
    months: [],
    dateRanges: []
  });
  
  // State untuk data
  const [kpiData, setKpiData] = useState(null);
  const [chartData, setChartData] = useState(null);
  
  // Load slicer data
  useEffect(() => {
    const loadSlicerData = async () => {
      try {
        const data = await getAllSlicerData(selectedCurrency);
        setSlicerData(data);
      } catch (error) {
        console.error('Error loading slicer data:', error);
      }
    };
    
    loadSlicerData();
  }, [selectedCurrency]);
  
  // Handle slicer changes
  const handleCurrencyChange = async (currency: string) => {
    setSelectedCurrency(currency);
    setSelectedLine('All'); // Reset line
    setSelectedYear('All'); // Reset year
    setSelectedMonth('All'); // Reset month
    setSelectedDateRange('All'); // Reset date range
  };
  
  const handleLineChange = async (line: string) => {
    setSelectedLine(line);
    setSelectedYear('All'); // Reset year
    setSelectedMonth('All'); // Reset month
    setSelectedDateRange('All'); // Reset date range
  };
  
  const handleYearChange = async (year: string) => {
    setSelectedYear(year);
    setSelectedMonth('All'); // Reset month
    setSelectedDateRange('All'); // Reset date range
  };
  
  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month);
    setSelectedDateRange('All'); // Reset date range
  };
  
  const handleDateRangeChange = async (dateRange: string) => {
    setSelectedDateRange(dateRange);
    // Month slicer akan auto lock jika date range aktif
  };
  
  // Load data berdasarkan slicer
  useEffect(() => {
    const loadData = async () => {
      try {
        // Validasi filters
        const filters = {
          currency: selectedCurrency,
          line: selectedLine,
          year: selectedYear,
          month: selectedMonth,
          dateRange: selectedDateRange
        };
        
        if (!validateNexmaxSlicerFilters(filters)) {
          console.error('Invalid slicer filters');
          return;
        }
        
        // Load KPI data (StatCard)
        const kpiResult = await handleAllSelection(filters, 'statcard');
        setKpiData(kpiResult);
        
        // Load chart data (Line Chart, Bar Chart)
        const chartResult = await handleAllSelection(filters, 'line');
        setChartData(chartResult);
        
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [selectedCurrency, selectedLine, selectedYear, selectedMonth, selectedDateRange]);
  
  // Check if month slicer should be locked
  const isMonthLocked = shouldLockMonthSlicer(selectedDateRange);
  
  // Get slicer info for display
  const slicerInfo = getSlicerInfo({
    currency: selectedCurrency,
    line: selectedLine,
    year: selectedYear,
    month: selectedMonth,
    dateRange: selectedDateRange
  });
  
  return (
    <div>
      {/* Slicer Controls */}
      <div className="slicer-controls">
        <div className="slicer-group">
          <label>Currency:</label>
          <select 
            value={selectedCurrency} 
            onChange={(e) => handleCurrencyChange(e.target.value)}
          >
            {slicerData.currencies.map(currency => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label>Line:</label>
          <select 
            value={selectedLine} 
            onChange={(e) => handleLineChange(e.target.value)}
          >
            {slicerData.lines.map(line => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label>Year:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => handleYearChange(e.target.value)}
          >
            {slicerData.years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label>Month:</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={isMonthLocked}
            className={isMonthLocked ? 'locked' : ''}
          >
            {slicerData.months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label>Date Range:</label>
          <select 
            value={selectedDateRange} 
            onChange={(e) => handleDateRangeChange(e.target.value)}
          >
            {slicerData.dateRanges.map(dateRange => (
              <option key={dateRange} value={dateRange}>{dateRange}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Slicer Info */}
      <div className="slicer-info">
        <p>Showing data for: {slicerInfo}</p>
        {isMonthLocked && (
          <p className="month-locked-info">
            ⚠️ Month Slicer is locked because Date Range is active
          </p>
        )}
      </div>
      
      {/* Content */}
      <div className="dashboard-content">
        {/* StatCard dengan semua slicer aktif */}
        <StatCard 
          title="ACTIVE MEMBER"
          value={kpiData?.activeMember}
          filters={{
            currency: selectedCurrency,
            line: selectedLine,
            year: selectedYear,
            month: selectedMonth,
            dateRange: selectedDateRange
          }}
        />
        
        {/* Line Chart tanpa Month Slicer */}
        <LineChart 
          title="ACTIVE MEMBER TREND"
          data={chartData}
          filters={{
            currency: selectedCurrency,
            line: selectedLine,
            year: selectedYear,
            month: undefined, // Month Slicer tidak aktif untuk chart
            dateRange: selectedDateRange
          }}
          slicerInfo="Period Month (Month Slicer disabled)"
        />
      </div>
    </div>
  );
}
```

---

## 2. USC OVERVIEW PAGE IMPLEMENTATION

```typescript
import React, { useState, useEffect } from 'react';
import { 
  getLineData, 
  getYearData, 
  getMonthData,
  validateNexmaxSlicerFilters,
  handleAllSelection,
  getSlicerInfo
} from '@/lib/nexmaxSlicerLogic';

export default function USCOverviewPage() {
  // USC Page: Currency locked to USD
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [selectedLine, setSelectedLine] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  
  // State untuk slicer data
  const [slicerData, setSlicerData] = useState({
    lines: [],
    years: [],
    months: []
  });
  
  // Load slicer data untuk USD
  useEffect(() => {
    const loadSlicerData = async () => {
      try {
        const [lines, years, months] = await Promise.all([
          getLineData('USD'),
          getYearData('USD'),
          getMonthData('USD', 'All')
        ]);
        
        setSlicerData({ lines, years, months });
      } catch (error) {
        console.error('Error loading slicer data:', error);
      }
    };
    
    loadSlicerData();
  }, []);
  
  // Handle slicer changes
  const handleLineChange = async (line: string) => {
    setSelectedLine(line);
    setSelectedYear('All'); // Reset year
    setSelectedMonth('All'); // Reset month
  };
  
  const handleYearChange = async (year: string) => {
    setSelectedYear(year);
    setSelectedMonth('All'); // Reset month
  };
  
  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month);
  };
  
  // Load data berdasarkan slicer
  useEffect(() => {
    const loadData = async () => {
      try {
        // Validasi filters
        const filters = {
          currency: selectedCurrency,
          line: selectedLine,
          year: selectedYear,
          month: selectedMonth
        };
        
        if (!validateNexmaxSlicerFilters(filters)) {
          console.error('Invalid slicer filters');
          return;
        }
        
        // Load data untuk USC Overview
        const result = await handleAllSelection(filters, 'statcard');
        // Set data ke state
        
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [selectedLine, selectedYear, selectedMonth]);
  
  // Get slicer info for display
  const slicerInfo = getSlicerInfo({
    currency: selectedCurrency,
    line: selectedLine,
    year: selectedYear,
    month: selectedMonth
  });
  
  return (
    <div>
      {/* Slicer Controls - Currency locked to USD */}
      <div className="slicer-controls">
        <div className="slicer-group">
          <label>Currency:</label>
          <select value={selectedCurrency} disabled>
            <option value="USD">USD (Locked)</option>
          </select>
        </div>
        
        <div className="slicer-group">
          <label>Line:</label>
          <select 
            value={selectedLine} 
            onChange={(e) => handleLineChange(e.target.value)}
          >
            {slicerData.lines.map(line => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label>Year:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => handleYearChange(e.target.value)}
          >
            {slicerData.years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label>Month:</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => handleMonthChange(e.target.value)}
          >
            {slicerData.months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Slicer Info */}
      <div className="slicer-info">
        <p>Showing data for: {slicerInfo}</p>
      </div>
      
      {/* Content */}
      <div className="usc-overview-content">
        {/* StatCard dengan semua slicer aktif */}
        <StatCard 
          title="ACTIVE MEMBER"
          value={kpiData?.activeMember}
          filters={{
            currency: selectedCurrency,
            line: selectedLine,
            year: selectedYear,
            month: selectedMonth
          }}
        />
        
        {/* Line Chart tanpa Month Slicer */}
        <LineChart 
          title="ACTIVE MEMBER TREND"
          data={chartData}
          filters={{
            currency: selectedCurrency,
            line: selectedLine,
            year: selectedYear,
            month: undefined, // Month Slicer tidak aktif untuk chart
          }}
          slicerInfo="Period Month (Month Slicer disabled)"
        />
      </div>
    </div>
  );
}
```

---

## 3. STRATEGIC EXECUTIVE PAGE IMPLEMENTATION

```typescript
import React, { useState, useEffect } from 'react';
import { 
  getAllSlicerData, 
  validateNexmaxSlicerFilters,
  handleAllSelection,
  shouldLockMonthSlicer,
  getSlicerInfo
} from '@/lib/nexmaxSlicerLogic';

export default function StrategicExecutivePage() {
  // Strategic Executive: Semua slicer aktif
  const [selectedCurrency, setSelectedCurrency] = useState('All');
  const [selectedLine, setSelectedLine] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('All');
  
  // State untuk slicer data
  const [slicerData, setSlicerData] = useState({
    currencies: [],
    lines: [],
    years: [],
    months: [],
    dateRanges: []
  });
  
  // Load slicer data
  useEffect(() => {
    const loadSlicerData = async () => {
      try {
        const data = await getAllSlicerData(selectedCurrency);
        setSlicerData(data);
      } catch (error) {
        console.error('Error loading slicer data:', error);
      }
    };
    
    loadSlicerData();
  }, [selectedCurrency]);
  
  // Handle slicer changes dengan reset logic
  const handleCurrencyChange = async (currency: string) => {
    setSelectedCurrency(currency);
    setSelectedLine('All');
    setSelectedYear('All');
    setSelectedMonth('All');
    setSelectedDateRange('All');
  };
  
  const handleLineChange = async (line: string) => {
    setSelectedLine(line);
    setSelectedYear('All');
    setSelectedMonth('All');
    setSelectedDateRange('All');
  };
  
  const handleYearChange = async (year: string) => {
    setSelectedYear(year);
    setSelectedMonth('All');
    setSelectedDateRange('All');
  };
  
  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month);
    setSelectedDateRange('All');
  };
  
  const handleDateRangeChange = async (dateRange: string) => {
    setSelectedDateRange(dateRange);
  };
  
  // Load data berdasarkan slicer
  useEffect(() => {
    const loadData = async () => {
      try {
        // Validasi filters
        const filters = {
          currency: selectedCurrency,
          line: selectedLine,
          year: selectedYear,
          month: selectedMonth,
          dateRange: selectedDateRange
        };
        
        if (!validateNexmaxSlicerFilters(filters)) {
          console.error('Invalid slicer filters');
          return;
        }
        
        // Load data untuk Strategic Executive
        const kpiResult = await handleAllSelection(filters, 'statcard');
        const chartResult = await handleAllSelection(filters, 'line');
        
        // Set data ke state
        
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [selectedCurrency, selectedLine, selectedYear, selectedMonth, selectedDateRange]);
  
  // Check if month slicer should be locked
  const isMonthLocked = shouldLockMonthSlicer(selectedDateRange);
  
  // Get slicer info for display
  const slicerInfo = getSlicerInfo({
    currency: selectedCurrency,
    line: selectedLine,
    year: selectedYear,
    month: selectedMonth,
    dateRange: selectedDateRange
  });
  
  return (
    <div>
      {/* Slicer Controls */}
      <div className="slicer-controls">
        <div className="slicer-group">
          <label>Currency:</label>
          <select 
            value={selectedCurrency} 
            onChange={(e) => handleCurrencyChange(e.target.value)}
          >
            {slicerData.currencies.map(currency => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label>Line:</label>
          <select 
            value={selectedLine} 
            onChange={(e) => handleLineChange(e.target.value)}
          >
            {slicerData.lines.map(line => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label>Year:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => handleYearChange(e.target.value)}
          >
            {slicerData.years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label>Month:</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={isMonthLocked}
            className={isMonthLocked ? 'locked' : ''}
          >
            {slicerData.months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
        
        <div className="slicer-group">
          <label>Date Range:</label>
          <select 
            value={selectedDateRange} 
            onChange={(e) => handleDateRangeChange(e.target.value)}
          >
            {slicerData.dateRanges.map(dateRange => (
              <option key={dateRange} value={dateRange}>{dateRange}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Slicer Info */}
      <div className="slicer-info">
        <p>Showing data for: {slicerInfo}</p>
        {isMonthLocked && (
          <p className="month-locked-info">
            ⚠️ Month Slicer is locked because Date Range is active
          </p>
        )}
      </div>
      
      {/* Content */}
      <div className="strategic-executive-content">
        {/* StatCard dengan semua slicer aktif */}
        <StatCard 
          title="GGR USER"
          value={kpiData?.ggrUser}
          filters={{
            currency: selectedCurrency,
            line: selectedLine,
            year: selectedYear,
            month: selectedMonth,
            dateRange: selectedDateRange
          }}
        />
        
        {/* Line Chart tanpa Month Slicer */}
        <LineChart 
          title="GGR USER TREND"
          data={chartData}
          filters={{
            currency: selectedCurrency,
            line: selectedLine,
            year: selectedYear,
            month: undefined, // Month Slicer tidak aktif untuk chart
            dateRange: selectedDateRange
          }}
          slicerInfo="Period Month (Month Slicer disabled)"
        />
      </div>
    </div>
  );
}
```

---

## 4. CSS STYLING UNTUK SLICER

```css
/* Slicer Controls Styling */
.slicer-controls {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.slicer-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slicer-group label {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.slicer-group select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  min-width: 120px;
}

.slicer-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* Locked Month Slicer */
.slicer-group select.locked {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
  border-color: #ced4da;
}

/* Slicer Info */
.slicer-info {
  background: #e7f3ff;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #b3d9ff;
  margin-bottom: 20px;
}

.slicer-info p {
  margin: 0;
  color: #0056b3;
  font-weight: 500;
}

.month-locked-info {
  margin-top: 8px !important;
  color: #856404 !important;
  font-size: 14px;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .slicer-controls {
    flex-direction: column;
    gap: 16px;
  }
  
  .slicer-group select {
    min-width: 100%;
  }
}

@media (max-width: 768px) {
  .slicer-controls {
    padding: 16px;
  }
  
  .slicer-group {
    gap: 6px;
  }
}
```

---

## PENTING UNTUK DIINGAT

1. **KECUALI TRANSACTION PAGE** - rules ini tidak berlaku
2. **WAJIB** menggunakan `member_report_daily` untuk semua slicer
3. **LOGIC KHUSUS** diperlukan untuk handle "All" selection
4. **AUTO LOCK** Month Slicer ketika Date Range aktif
5. **FILTER BERANTAI** - Currency → Line → Year → Month → Date Range
6. **SETIAP PAGE** menggunakan slicer sesuai kebutuhan
7. **VALIDASI LENGKAP** sebelum deploy
8. **ERROR HANDLING** yang robust untuk semua slicer operations
