# SLICER RULES - NEXMAX DASHBOARD

## ATURAN UTAMA SLICER

### ⚠️ **KECUALI TRANSACTION PAGE**
Semua rules di bawah ini **TIDAK BERLAKU** untuk Transaction Page.

---

## 1. SOURCE DATA WAJIB

### 📊 **Table Source:**
- ✅ **WAJIB** menggunakan `member_report_daily` (Supabase)
- ❌ **DILARANG** menggunakan data dummy/fallback
- ❌ **DILARANG** menggunakan table lain untuk slicer data

---

## 2. SLICER CURRENCY

### 🎯 **Rules:**
- ✅ **WAJIB** set Active Source data dari `member_report_daily`
- ✅ **WAJIB** filter data berdasarkan currency yang dipilih
- ❌ **TIDAK ADA** opsi "All" dalam data asli
- 🔧 **LOGIC KHUSUS** diperlukan untuk handle "All" selection

### 💡 **Implementasi:**
```typescript
// Jika Currency = "All" → Ambil semua data dari member_report_daily
// Jika Currency = "USD" → Filter WHERE currency = 'USD'
// Jika Currency = "SGD" → Filter WHERE currency = 'SGD'
// Jika Currency = "MYR" → Filter WHERE currency = 'MYR'
```

---

## 3. SLICER LINE

### 🎯 **Rules:**
- ✅ **WAJIB** ikut filter Currency Active
- ✅ **WAJIB** handle "All" selection dengan logic khusus
- ✅ **WAJIB** filter data berdasarkan Line yang dipilih

### 💡 **Logic "All":**
```typescript
// Jika Line = "All" → Tampilkan semua data berdasarkan Currency Active
// Jika Line = "Line1" → Filter WHERE currency = selectedCurrency AND line = 'Line1'
// Jika Line = "Line2" → Filter WHERE currency = selectedCurrency AND line = 'Line2'
```

### 🔧 **Implementasi:**
```typescript
const getLineData = async (currency: string, line: string) => {
  if (line === 'All') {
    // Ambil semua line untuk currency yang dipilih
    return await supabase
      .from('member_report_daily')
      .select('line')
      .eq('currency', currency)
      .order('line');
  } else {
    // Filter berdasarkan line spesifik
    return await supabase
      .from('member_report_daily')
      .select('*')
      .eq('currency', currency)
      .eq('line', line);
  }
};
```

---

## 4. SLICER YEAR

### 🎯 **Rules:**
- ✅ **WAJIB** ikut filter Currency Active
- ✅ **WAJIB** ambil data dari `member_report_daily`
- ❌ **TIDAK ADA** opsi "All" dalam data asli
- 🔧 **LOGIC KHUSUS** diperlukan untuk handle "All" selection

### 💡 **Logic "All":**
```typescript
// Jika Year = "All" → Tampilkan semua tahun untuk Currency Active
// Jika Year = "2025" → Filter WHERE currency = selectedCurrency AND year = '2025'
// Jika Year = "2024" → Filter WHERE currency = selectedCurrency AND year = '2024'
```

---

## 5. SLICER MONTH

### 🎯 **Rules:**
- ✅ **WAJIB** ikut filter Year Active
- ✅ **WAJIB** ambil data dari `member_report_daily`
- ❌ **TIDAK ADA** opsi "All" dalam data asli
- 🔧 **LOGIC KHUSUS** diperlukan untuk handle "All" selection
- 🔒 **AUTO LOCK** jika Date Range aktif

### 💡 **Logic "All":**
```typescript
// Jika Month = "All" → Tampilkan semua bulan untuk Year Active
// Jika Month = "January" → Filter WHERE year = selectedYear AND month = 'January'
// Jika Month = "February" → Filter WHERE year = selectedYear AND month = 'February'
```

### 🔒 **Auto Lock dengan Date Range:**
```typescript
// Jika Date Range aktif → Month Slicer auto lock (disabled/grayed out)
// Data diambil berdasarkan Date Range yang dipilih
```

---

## 6. SLICER DATE RANGE

### 🎯 **Rules:**
- ✅ **WAJIB** ikut filter Year Active
- ✅ **WAJIB** auto lock Month Slicer ketika aktif
- ✅ **WAJIB** tampilkan data berdasarkan Date Range yang dipilih
- ❌ **TIDAK ADA** opsi "All" dalam data asli

### 🔒 **Auto Lock Month:**
```typescript
// Ketika Date Range aktif:
// 1. Month Slicer menjadi disabled (abu-abu)
// 2. Data diambil berdasarkan Date Range
// 3. Month Slicer tidak bisa diubah
```

---

## 7. LOGIC KHUSUS UNTUK "ALL"

### 🎯 **Karena tidak ada "All" dalam data asli:**
- 🔧 **BUAT LOGIC KHUSUS** untuk handle "All" selection
- 🔧 **AGGREGATE DATA** dari semua nilai yang ada
- 🔧 **HANDLE UI** untuk menampilkan "All" sebagai opsi

### 💡 **Implementasi Logic "All":**
```typescript
// Currency "All" → Aggregate semua currency
const getAllCurrencyData = async () => {
  const { data } = await supabase
    .from('member_report_daily')
    .select('*');
  
  // Group dan aggregate berdasarkan currency
  return aggregateByCurrency(data);
};

// Line "All" → Aggregate semua line untuk currency aktif
const getAllLineData = async (currency: string) => {
  const { data } = await supabase
    .from('member_report_daily')
    .select('*')
    .eq('currency', currency);
  
  // Group dan aggregate berdasarkan line
  return aggregateByLine(data);
};

// Year "All" → Aggregate semua year untuk currency aktif
const getAllYearData = async (currency: string) => {
  const { data } = await supabase
    .from('member_report_daily')
    .select('*')
    .eq('currency', currency);
  
  // Group dan aggregate berdasarkan year
  return aggregateByYear(data);
};

// Month "All" → Aggregate semua month untuk year aktif
const getAllMonthData = async (currency: string, year: string) => {
  const { data } = await supabase
    .from('member_report_daily')
    .select('*')
    .eq('currency', currency)
    .eq('year', year);
  
  // Group dan aggregate berdasarkan month
  return aggregateByMonth(data);
};
```

---

## 8. IMPLEMENTASI PER PAGE

### 🎯 **Setiap page menggunakan Slicer sesuai kebutuhan:**

#### **Dashboard Page:**
- ✅ Currency Slicer
- ✅ Line Slicer  
- ✅ Year Slicer
- ✅ Month Slicer
- ❌ Date Range Slicer

#### **USC Overview Page:**
- ✅ Currency Slicer (locked to USD)
- ✅ Line Slicer
- ✅ Year Slicer
- ✅ Month Slicer
- ❌ Date Range Slicer

#### **USC Sales Page:**
- ✅ Currency Slicer (locked to USD)
- ✅ Line Slicer
- ✅ Year Slicer
- ✅ Month Slicer
- ❌ Date Range Slicer

#### **Strategic Executive Page:**
- ✅ Currency Slicer
- ✅ Line Slicer
- ✅ Year Slicer
- ✅ Month Slicer
- ❌ Date Range Slicer

#### **Business Flow Page:**
- ✅ Currency Slicer
- ✅ Line Slicer
- ✅ Year Slicer
- ✅ Month Slicer
- ❌ Date Range Slicer

---

## 9. VALIDASI RULES

### ✅ **Sebelum Deploy, Pastikan:**
- [ ] Semua slicer menggunakan `member_report_daily`
- [ ] Logic "All" sudah diimplementasi dengan benar
- [ ] Currency Slicer set Active Source data
- [ ] Line Slicer ikut filter Currency Active
- [ ] Year Slicer ikut filter Currency Active
- [ ] Month Slicer ikut filter Year Active
- [ ] Date Range auto lock Month Slicer
- [ ] Tidak ada data dummy/fallback
- [ ] Setiap page menggunakan slicer sesuai kebutuhan

---

## 10. ERROR HANDLING

### 🚨 **Handle Error Cases:**
```typescript
// 1. Data tidak ditemukan
if (!data || data.length === 0) {
  console.error('❌ No data found for selected filters');
  return { error: 'No data available' };
}

// 2. Currency tidak valid
if (!validCurrencies.includes(selectedCurrency)) {
  console.error('❌ Invalid currency selected');
  return { error: 'Invalid currency' };
}

// 3. Line tidak valid untuk currency
if (selectedLine !== 'All' && !validLinesForCurrency.includes(selectedLine)) {
  console.error('❌ Invalid line for selected currency');
  return { error: 'Invalid line for currency' };
}

// 4. Year tidak valid untuk currency
if (!validYearsForCurrency.includes(selectedYear)) {
  console.error('❌ Invalid year for selected currency');
  return { error: 'Invalid year for currency' };
}

// 5. Month tidak valid untuk year
if (!validMonthsForYear.includes(selectedMonth)) {
  console.error('❌ Invalid month for selected year');
  return { error: 'Invalid month for year' };
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
