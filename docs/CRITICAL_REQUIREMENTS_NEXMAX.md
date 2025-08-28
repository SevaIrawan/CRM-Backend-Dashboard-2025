# 🚨 CRITICAL REQUIREMENTS - NEXMAX DASHBOARD

## ⚠️ **PENTING: INI ADALAH PROJECT REAL DATA - BUKAN TESTING**

### 📊 **DATA SOURCE WAJIB:**
- ✅ **WAJIB** menggunakan `member_report_daily` (Supabase) untuk semua data
- ✅ **WAJIB** menggunakan `new_depositor` (Supabase) untuk data depositor
- ❌ **DILARANG KERAS** menggunakan data dummy/fallback
- ❌ **DILARANG KERAS** menggunakan mock data
- ❌ **DILARANG KERAS** menggunakan test data
- ❌ **DILARANG KERAS** menggunakan hardcoded values

---

## 🔥 **UNLIMITED DATA DISPLAY:**

### 📈 **Semua Data Wajib Ditampilkan:**
- ✅ **TIDAK ADA BATAS** untuk jumlah data yang ditampilkan
- ✅ **TIDAK ADA LIMIT** untuk records yang di-fetch
- ✅ **TIDAK ADA PAGINATION** yang membatasi data
- ✅ **TIDAK ADA CAPPING** untuk chart values
- ✅ **TIDAK ADA TRUNCATION** untuk table rows

### 💡 **Implementasi:**
```typescript
// ❌ SALAH - Ada limit/batas
const { data } = await supabase
  .from('member_report_daily')
  .select('*')
  .limit(100); // ❌ DILARANG

// ✅ BENAR - Unlimited data
const { data } = await supabase
  .from('member_report_daily')
  .select('*'); // ✅ SEMUA DATA
```

---

## 🎯 **SLICER PER PAGE - SESUAI KEBUTUHAN:**

### 1. **Dashboard Page:**
- ✅ Currency Slicer
- ✅ Line Slicer  
- ✅ Year Slicer
- ✅ Month Slicer
- ❌ Date Range Slicer

### 2. **USC Overview Page:**
- ✅ Currency Slicer (locked to USD)
- ✅ Line Slicer
- ✅ Year Slicer
- ✅ Month Slicer
- ❌ Date Range Slicer

### 3. **USC Sales Page:**
- ✅ Currency Slicer (locked to USD)
- ✅ Line Slicer
- ✅ Year Slicer
- ✅ Month Slicer
- ❌ Date Range Slicer

### 4. **Strategic Executive Page:**
- ✅ Currency Slicer
- ✅ Line Slicer
- ✅ Year Slicer
- ✅ Month Slicer
- ❌ Date Range Slicer

### 5. **Business Flow Page:**
- ✅ Currency Slicer
- ✅ Line Slicer
- ✅ Year Slicer
- ✅ Month Slicer
- ❌ Date Range Slicer

### 6. **Transaction Pages:**
- ❌ **TIDAK MENGGUNAKAN** NEXMAX Slicer Rules
- ❌ **TIDAK MENGGUNAKAN** `member_report_daily` untuk slicer
- ✅ **BOLEH MENGGUNAKAN** table lain sesuai kebutuhan

---

## 🚫 **YANG DILARANG KERAS:**

### ❌ **Data Dummy/Fallback:**
```typescript
// ❌ DILARANG KERAS
const fallbackData = [
  { month: 'January', value: 1000 },
  { month: 'February', value: 1500 },
  { month: 'March', value: 2000 }
];

// ❌ DILARANG KERAS
const mockData = generateMockData();

// ❌ DILARANG KERAS
const testData = getTestData();
```

### ❌ **Hardcoded Values:**
```typescript
// ❌ DILARANG KERAS
const hardcodedKPIs = {
  activeMember: 1500,
  newDepositor: 250,
  ggr: 50000
};

// ❌ DILARANG KERAS
const staticChartData = [
  { name: 'Jan', value: 100 },
  { name: 'Feb', value: 200 }
];
```

### ❌ **Data Limiting:**
```typescript
// ❌ DILARANG KERAS
.limit(100)
.range(0, 99)
.slice(0, 50)
```

---

## ✅ **YANG WAJIB DILAKUKAN:**

### 🔄 **Real Data Fetching:**
```typescript
// ✅ WAJIB - Ambil semua data
const { data, error } = await supabase
  .from('member_report_daily')
  .select('*')
  .eq('currency', selectedCurrency)
  .eq('year', selectedYear)
  .eq('month', selectedMonth);

// ✅ WAJIB - Handle error dengan proper logging
if (error) {
  console.error('❌ [NEXMAX] Database error:', error);
  throw error;
}

// ✅ WAJIB - Log jumlah data yang di-fetch
console.log(`✅ [NEXMAX] Data loaded: ${data?.length || 0} records`);
```

### 📊 **Unlimited Display:**
```typescript
// ✅ WAJIB - Tampilkan semua data tanpa batas
{data?.map((item, index) => (
  <TableRow key={index}>
    <td>{item.month}</td>
    <td>{item.activeMember}</td>
    <td>{item.ggr}</td>
  </TableRow>
))}

// ✅ WAJIB - Chart tanpa limit
<LineChart 
  data={data} // Semua data, tidak ada limit
  title="UNLIMITED DATA CHART"
/>
```

---

## 🔍 **VALIDASI SEBELUM DEPLOY:**

### ✅ **Checklist Wajib:**
- [ ] **SEMUA** data menggunakan Supabase (real data)
- [ ] **TIDAK ADA** data dummy/fallback/mock
- [ ] **TIDAK ADA** hardcoded values
- [ ] **TIDAK ADA** data limiting (limit, range, slice)
- [ ] **SEMUA** data ditampilkan tanpa batas
- [ ] **SLICER** sesuai kebutuhan setiap page
- [ ] **ERROR HANDLING** yang proper untuk database errors
- [ ] **LOGGING** yang informatif untuk debugging

---

## 🚨 **KONSEKUENSI PELANGGARAN:**

### ❌ **Jika menggunakan dummy/fallback data:**
- Project akan **DITOLAK** oleh user
- Data tidak akurat untuk business decisions
- Integritas project **HANCUR**
- User akan **MARAH** dan **FRUSTRATED**

### ❌ **Jika ada data limiting:**
- Data tidak lengkap
- Business insights tidak akurat
- User tidak puas dengan dashboard
- Project **GAGAL** memenuhi requirements

---

## 💡 **BEST PRACTICES:**

### 1. **Always Use Real Data:**
```typescript
// ✅ Selalu gunakan Supabase
const realData = await getDataFromSupabase();

// ✅ Selalu handle errors
if (!realData) {
  console.error('❌ No real data available');
  return null;
}
```

### 2. **Display All Data:**
```typescript
// ✅ Tampilkan semua data
const allData = realData.map(item => (
  <DataRow key={item.id} data={item} />
));

// ✅ Chart dengan semua data
<Chart data={realData} /> // Tidak ada limit
```

### 3. **Proper Error Handling:**
```typescript
// ✅ Handle database errors
try {
  const data = await fetchRealData();
  return data;
} catch (error) {
  console.error('❌ [NEXMAX] Database error:', error);
  throw new Error('Failed to fetch real data');
}
```

---

## 📝 **NOTES PENTING:**

1. **INI PROJECT REAL DATA** - Bukan testing atau development
2. **SEMUA DATA UNLIMITED** - Tidak ada batas apapun
3. **SUPABASE WAJIB** - Tidak ada alternatif lain
4. **SLICER PER PAGE** - Sesuai kebutuhan masing-masing
5. **ERROR HANDLING** - Harus robust dan informatif
6. **LOGGING** - Harus jelas untuk debugging
7. **VALIDASI LENGKAP** - Sebelum deploy

---

## 🎯 **TUJUAN UTAMA:**

**NEXMAX Dashboard harus menjadi tool business yang AKURAT, LENGKAP, dan DAPAT DIPERCAYA untuk pengambilan keputusan bisnis berdasarkan REAL DATA dari Supabase.**

**TIDAK BOLEH ada kompromi dalam hal data accuracy dan completeness.**
