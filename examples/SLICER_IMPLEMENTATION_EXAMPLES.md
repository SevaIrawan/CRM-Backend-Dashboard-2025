# CONTOH IMPLEMENTASI SLICER STANDARDS

## 1. STATCARD IMPLEMENTATION

```typescript
import { createFullSlicerFilters } from '@/lib/slicerStandards';

// ✅ SEMUA slicer AKTIF termasuk Month
const kpiFilters = createFullSlicerFilters(
  selectedYear,
  selectedMonth,        // ✅ AKTIF
  selectedCurrency,
  selectedLine
);

const kpiData = await getAllKPIsWithMoM(kpiFilters);

// Tampilkan info slicer
const slicerInfo = `Showing data for: ${selectedYear} | ${selectedMonth} | ${selectedCurrency} | ${selectedLine}`;
```

---

## 2. TABLE CHART IMPLEMENTATION

```typescript
import { createFullSlicerFilters } from '@/lib/slicerStandards';

// ✅ SEMUA slicer AKTIF termasuk Month
const tableFilters = createFullSlicerFilters(
  selectedYear,
  selectedMonth,        // ✅ AKTIF
  selectedCurrency,
  selectedLine
);

const tableData = await getTableData(tableFilters);

// Tampilkan info slicer
const slicerInfo = `Showing data for: ${selectedYear} | ${selectedMonth} | ${selectedCurrency} | ${selectedLine}`;
```

---

## 3. PIE CHART IMPLEMENTATION

```typescript
import { createFullSlicerFilters } from '@/lib/slicerStandards';

// ✅ SEMUA slicer AKTIF termasuk Month
const pieFilters = createFullSlicerFilters(
  selectedYear,
  selectedMonth,        // ✅ AKTIF
  selectedCurrency,
  selectedLine
);

const pieData = await getPieChartData(pieFilters);

// Tampilkan info slicer
const slicerInfo = `Showing data for: ${selectedYear} | ${selectedMonth} | ${selectedCurrency} | ${selectedLine}`;
```

---

## 4. LINE CHART IMPLEMENTATION

```typescript
import { createChartSlicerFilters } from '@/lib/slicerStandards';

// ❌ Month Slicer TIDAK AKTIF
const chartFilters = createChartSlicerFilters(
  selectedYear,
  selectedMonth,        // Akan di-set menjadi undefined
  selectedCurrency,
  selectedLine
);

const lineChartData = await getLineChartData(chartFilters);

// Tampilkan info slicer - Month Slicer disabled
const slicerInfo = `Showing data for: ${selectedYear} | Period Month | ${selectedCurrency} | ${selectedLine}`;
```

---

## 5. BAR CHART IMPLEMENTATION

```typescript
import { createChartSlicerFilters } from '@/lib/slicerStandards';

// ❌ Month Slicer TIDAK AKTIF
const chartFilters = createChartSlicerFilters(
  selectedYear,
  selectedMonth,        // Akan di-set menjadi undefined
  selectedCurrency,
  selectedLine
);

const barChartData = await getBarChartData(chartFilters);

// Tampilkan info slicer - Month Slicer disabled
const slicerInfo = `Showing data for: ${selectedYear} | Period Month | ${selectedCurrency} | ${selectedLine}`;
```

---

## 6. COMPLETE PAGE IMPLEMENTATION

```typescript
import React, { useState, useEffect } from 'react';
import { createFullSlicerFilters, createChartSlicerFilters } from '@/lib/slicerStandards';

export default function ExamplePage() {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('July');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [selectedLine, setSelectedLine] = useState('All');

  // 1. STATCARD - SEMUA slicer AKTIF
  const kpiFilters = createFullSlicerFilters(
    selectedYear,
    selectedMonth,        // ✅ AKTIF
    selectedCurrency,
    selectedLine
  );

  // 2. LINE CHART - Month Slicer TIDAK AKTIF
  const lineChartFilters = createChartSlicerFilters(
    selectedYear,
    selectedMonth,        // ❌ TIDAK AKTIF
    selectedCurrency,
    selectedLine
  );

  // 3. BAR CHART - Month Slicer TIDAK AKTIF
  const barChartFilters = createChartSlicerFilters(
    selectedYear,
    selectedMonth,        // ❌ TIDAK AKTIF
    selectedCurrency,
    selectedLine
  );

  // 4. TABLE - SEMUA slicer AKTIF
  const tableFilters = createFullSlicerFilters(
    selectedYear,
    selectedMonth,        // ✅ AKTIF
    selectedCurrency,
    selectedLine
  );

  // 5. PIE CHART - SEMUA slicer AKTIF
  const pieFilters = createFullSlicerFilters(
    selectedYear,
    selectedMonth,        // ✅ AKTIF
    selectedCurrency,
    selectedLine
  );

  return (
    <div>
      {/* StatCard dengan semua slicer aktif */}
      <StatCard 
        title="ACTIVE MEMBER"
        value={kpiData?.activeMember}
        filters={kpiFilters}
      />

      {/* Line Chart tanpa Month Slicer */}
      <LineChart 
        title="ACTIVE MEMBER TREND"
        data={lineChartData}
        filters={lineChartFilters}
        slicerInfo="Period Month (Month Slicer disabled)"
      />

      {/* Bar Chart tanpa Month Slicer */}
      <BarChart 
        title="NEW DEPOSITOR TREND"
        data={barChartData}
        filters={barChartFilters}
        slicerInfo="Period Month (Month Slicer disabled)"
      />

      {/* Table dengan semua slicer aktif */}
      <TableChart 
        data={tableData}
        filters={tableFilters}
        slicerInfo={`${selectedYear} | ${selectedMonth} | ${selectedCurrency} | ${selectedLine}`}
      />

      {/* Pie Chart dengan semua slicer aktif */}
      <PieChart 
        data={pieData}
        filters={pieFilters}
        slicerInfo={`${selectedYear} | ${selectedMonth} | ${selectedCurrency} | ${selectedLine}`}
      />
    </div>
  );
}
```

---

## 7. VALIDATION IMPLEMENTATION

```typescript
import { validateSlicerFilters } from '@/lib/slicerStandards';

// Validasi sebelum menggunakan filter
const validateFilters = () => {
  // Validasi StatCard
  const isStatCardValid = validateSlicerFilters(kpiFilters, 'statcard');
  console.log('StatCard filters valid:', isStatCardValid);

  // Validasi Line Chart
  const isLineChartValid = validateSlicerFilters(lineChartFilters, 'line');
  console.log('Line Chart filters valid:', isLineChartValid);

  // Validasi Bar Chart
  const isBarChartValid = validateSlicerFilters(barChartFilters, 'bar');
  console.log('Bar Chart filters valid:', isBarChartValid);

  // Validasi Table
  const isTableValid = validateSlicerFilters(tableFilters, 'table');
  console.log('Table filters valid:', isTableValid);

  // Validasi Pie Chart
  const isPieChartValid = validateSlicerFilters(pieFilters, 'pie');
  console.log('Pie Chart filters valid:', isPieChartValid);
};
```

---

## 8. ERROR HANDLING

```typescript
// Error handling untuk filter yang tidak valid
const handleInvalidFilters = (componentType: string, filters: SlicerFilters) => {
  const isValid = validateSlicerFilters(filters, componentType as any);
  
  if (!isValid) {
    console.error(`❌ Invalid filters for ${componentType}:`, filters);
    
    if (componentType === 'line' || componentType === 'bar') {
      console.error('Month Slicer should be undefined for chart components');
    } else {
      console.error('All slicers should be active for non-chart components');
    }
    
    return false;
  }
  
  return true;
};

// Gunakan dalam component
useEffect(() => {
  const loadData = async () => {
    try {
      // Validasi StatCard
      if (!handleInvalidFilters('statcard', kpiFilters)) return;
      
      // Validasi Line Chart
      if (!handleInvalidFilters('line', lineChartFilters)) return;
      
      // Load data jika semua filter valid
      const kpiResult = await getAllKPIsWithMoM(kpiFilters);
      const chartResult = await getLineChartData(lineChartFilters);
      
      setKpiData(kpiResult);
      setChartData(chartResult);
      
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };
  
  loadData();
}, [selectedYear, selectedMonth, selectedCurrency, selectedLine]);
```

---

## PENTING UNTUK DIINGAT

1. **StatCard, Table, Pie Chart**: Gunakan `createFullSlicerFilters()` - semua slicer aktif
2. **Line Chart, Bar Chart**: Gunakan `createChartSlicerFilters()` - Month Slicer tidak aktif
3. **Validasi selalu** sebelum menggunakan filter
4. **Info slicer berbeda** untuk chart vs non-chart components
5. **Error handling** untuk filter yang tidak valid
6. **Konsisten** di semua page dalam project
