# SLICER STANDARDS - NEXMAX DASHBOARD

## ATURAN STANDARD SLICER YANG AKTIF

### 1. STATCARD (KPI Cards)
**Slicer yang AKTIF:**
- ✅ Currency (Currency Slicer)
- ✅ Line (Line Slicer) 
- ✅ Year (Year Slicer)
- ✅ Month (Month Slicer)
- ✅ Date Range (Date Range Slicer)

**Keterangan:** Semua slicer aktif untuk memfilter data KPI yang ditampilkan pada StatCard.

---

### 2. TABLE CHART
**Slicer yang AKTIF:**
- ✅ Currency (Currency Slicer)
- ✅ Line (Line Slicer)
- ✅ Year (Year Slicer)
- ✅ Month (Month Slicer)
- ✅ Date Range (Date Range Slicer)

**Keterangan:** Semua slicer aktif untuk memfilter data yang ditampilkan pada table.

---

### 3. PIE CHART
**Slicer yang AKTIF:**
- ✅ Currency (Currency Slicer)
- ✅ Line (Line Slicer)
- ✅ Year (Year Slicer)
- ✅ Month (Month Slicer)
- ✅ Date Range (Date Range Slicer)

**Keterangan:** Semua slicer aktif untuk memfilter data yang ditampilkan pada pie chart.

---

### 4. LINE CHART (Single Line & 2 Lines)
**Slicer yang AKTIF:**
- ✅ Currency (Currency Slicer)
- ✅ Line (Line Slicer)
- ✅ Year (Year Slicer) - **Tampilkan Period Month**
- ❌ Month (Month Slicer) - **TIDAK AKTIF**
- ✅ Date Range (Date Range Slicer) - **Tampilkan Period Date**

**Keterangan:** 
- Month Slicer TIDAK AKTIF karena data ditampilkan per bulan dalam chart
- Year Slicer menampilkan Period Month (Jan, Feb, Mar, dst)
- Date Range Slicer menampilkan Period Date untuk granular data

---

### 5. BAR CHART (Single Bar & 2 Bars)
**Slicer yang AKTIF:**
- ✅ Currency (Currency Slicer)
- ✅ Line (Line Slicer)
- ✅ Year (Year Slicer) - **Tampilkan Period Month**
- ❌ Month (Month Slicer) - **TIDAK AKTIF**
- ✅ Date Range (Date Range Slicer) - **Tampilkan Period Date**

**Keterangan:**
- Month Slicer TIDAK AKTIF karena data ditampilkan per bulan dalam chart
- Year Slicer menampilkan Period Month (Jan, Feb, Mar, dst)
- Date Range Slicer menampilkan Period Date untuk granular data

---

## IMPLEMENTASI STANDARD

### A. Untuk StatCard, Table Chart, dan Pie Chart:
```typescript
// Semua slicer aktif
const filters: SlicerFilters = {
  year: selectedYear,
  month: selectedMonth,        // ✅ AKTIF
  currency: selectedCurrency,
  line: selectedLine,
  dateRange: selectedDateRange
};
```

### B. Untuk Line Chart dan Bar Chart:
```typescript
// Month Slicer TIDAK AKTIF
const chartFilters: SlicerFilters = {
  year: selectedYear,          // ✅ AKTIF - Tampilkan Period Month
  month: undefined,            // ❌ TIDAK AKTIF
  currency: selectedCurrency,
  line: selectedLine,
  dateRange: selectedDateRange // ✅ AKTIF - Tampilkan Period Date
};
```

---

## CONTOH PENGGUNAAN

### 1. StatCard Component:
```typescript
// Semua slicer aktif
const kpiData = await getAllKPIsWithMoM({
  year: selectedYear,
  month: selectedMonth,        // ✅ AKTIF
  currency: selectedCurrency,
  line: selectedLine,
  dateRange: selectedDateRange
});
```

### 2. Line Chart Component:
```typescript
// Month Slicer TIDAK AKTIF
const chartData = await getLineChartData({
  year: selectedYear,          // ✅ AKTIF - Tampilkan Period Month
  month: undefined,            // ❌ TIDAK AKTIF
  currency: selectedCurrency,
  line: selectedLine,
  dateRange: selectedDateRange // ✅ AKTIF - Tampilkan Period Date
});
```

---

## PENTING UNTUK DIINGAT

1. **Month Slicer TIDAK AKTIF** pada Line Chart dan Bar Chart
2. **Year Slicer** pada Line/Bar Chart menampilkan **Period Month** (Jan, Feb, Mar, dst)
3. **Date Range Slicer** pada Line/Bar Chart menampilkan **Period Date** untuk data granular
4. Semua komponen lain (StatCard, Table, Pie) menggunakan **semua slicer aktif**
5. Standard ini berlaku untuk **SEMUA PAGE** dalam project NEXMAX

---

## VALIDASI STANDARD

Sebelum deploy, pastikan:
- [ ] StatCard menggunakan semua slicer aktif
- [ ] Table Chart menggunakan semua slicer aktif  
- [ ] Pie Chart menggunakan semua slicer aktif
- [ ] Line Chart TIDAK menggunakan Month Slicer
- [ ] Bar Chart TIDAK menggunakan Month Slicer
- [ ] Line/Bar Chart menggunakan Year Slicer untuk Period Month
- [ ] Line/Bar Chart menggunakan Date Range Slicer untuk Period Date
