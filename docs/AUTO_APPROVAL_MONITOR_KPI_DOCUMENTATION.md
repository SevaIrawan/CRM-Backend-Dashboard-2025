# AUTO APPROVAL MONITOR MYR - KPI DOCUMENTATION

## 📋 OVERVIEW
Dokumentasi lengkap untuk 23 Key Performance Indicators (KPIs) pada Auto Approval Monitor MYR dengan kemampuan tracking Daily, Weekly, dan Monthly.

---

## 📊 KPI CATEGORIES & DETAILS

### 1. VOLUME KPIs (5 KPIs)

| No | KPI Name | Formula | Logic | Purpose | Tracking |
|----|----------|---------|-------|---------|----------|
| 1 | **Total Amount** | `SUM(deposit[amount])` | Sum dari semua amount dalam periode | Mengukur total nilai transaksi | Daily/Weekly/Monthly |
| 2 | **Total Transactions** | `COUNT(*)` | Count semua transaksi dalam periode | Mengukur volume transaksi | Daily/Weekly/Monthly |
| 3 | **Average Transaction Value** | `SUM(amount) / COUNT(*)` | Total amount dibagi total transaksi | Mengukur rata-rata nilai per transaksi | Daily/Weekly/Monthly |
| 4 | **Automation Amount** | `SUM(amount) WHERE operator_group = 'Automation'` | Sum amount hanya untuk transaksi automation | Mengukur nilai transaksi yang di-automate | Daily/Weekly/Monthly |
| 5 | **Manual Amount** | `SUM(amount) WHERE operator_group != 'Automation'` | Sum amount untuk transaksi manual | Mengukur nilai transaksi manual | Daily/Weekly/Monthly |

### 2. AUTOMATION EFFICIENCY KPIs (3 KPIs)

| No | KPI Name | Formula | Logic | Purpose | Tracking |
|----|----------|---------|-------|---------|----------|
| 6 | **Automation Rate** | `(COUNT(*) WHERE automation / COUNT(*)) * 100` | Prosentase transaksi yang di-automate | Mengukur tingkat otomasi | Daily/Weekly/Monthly |
| 7 | **Manual Processing Rate** | `(COUNT(*) WHERE manual / COUNT(*)) * 100` | Prosentase transaksi manual | Mengukur tingkat manual processing | Daily/Weekly/Monthly |
| 8 | **Automation Amount Rate** | `(SUM(amount) WHERE automation / SUM(amount)) * 100` | Prosentase nilai transaksi automation | Mengukur kontribusi nilai automation | Daily/Weekly/Monthly |

### 3. PROCESSING TIME KPIs (4 KPIs)

| No | KPI Name | Formula | Logic | Purpose | Tracking |
|----|----------|---------|-------|---------|----------|
| 9 | **Average Processing Time (All)** | `SUM(proc_sec) / COUNT(*)` | Rata-rata waktu processing semua transaksi | Mengukur efisiensi overall | Daily/Weekly/Monthly |
| 10 | **Average Processing Time (Automation)** | `SUM(proc_sec) WHERE automation / COUNT(*) WHERE automation` | Rata-rata waktu processing automation | Mengukur efisiensi automation | Daily/Weekly/Monthly |
| 11 | **Average Processing Time (Manual)** | `SUM(proc_sec) WHERE manual / COUNT(*) WHERE manual` | Rata-rata waktu processing manual | Mengukur efisiensi manual | Daily/Weekly/Monthly |
| 12 | **Processing Time Efficiency Ratio** | `SUM(proc_sec) ALL / SUM(proc_sec) WHERE automation` | Ratio total processing time vs automation | Mengukur efisiensi automation vs total | Daily/Weekly/Monthly |

### 4. PERFORMANCE KPIs (5 KPIs)

| No | KPI Name | Formula | Logic | Purpose | Tracking |
|----|----------|---------|-------|---------|----------|
| 13 | **Overdue Transactions** | `COUNT(*) WHERE proc_sec > 30` | Count transaksi yang processing time > 30 detik | Mengukur transaksi terlambat | Daily/Weekly/Monthly |
| 14 | **Fast Processing Rate** | `(COUNT(*) WHERE proc_sec <= 10 / COUNT(*)) * 100` | Prosentase transaksi cepat (≤10 detik) | Mengukur performa cepat | Daily/Weekly/Monthly |
| 15 | **Overdue Rate** | `(COUNT(*) WHERE proc_sec > 30 / COUNT(*)) * 100` | Prosentase transaksi terlambat | Mengukur tingkat keterlambatan | Daily/Weekly/Monthly |
| 16 | **Automation Overdue** | `COUNT(*) WHERE automation AND proc_sec > 30` | Count automation yang terlambat | Mengukur automation yang bermasalah | Daily/Weekly/Monthly |
| 17 | **Manual Overdue** | `COUNT(*) WHERE manual AND proc_sec > 30` | Count manual yang terlambat | Mengukur manual yang bermasalah | Daily/Weekly/Monthly |

### 5. TIME SAVINGS KPIs (4 KPIs)

| No | KPI Name | Formula | Logic | Purpose | Tracking |
|----|----------|---------|-------|---------|----------|
| 18 | **Time Saved per Transaction** | `avg_manual_time - avg_automation_time` | Selisih waktu manual vs automation | Mengukur waktu tersimpan per transaksi | Daily/Weekly/Monthly |
| 19 | **Total Time Saved (Seconds)** | `time_saved_per_transaction * automation_count` | Total waktu tersimpan dalam detik | Mengukur total waktu tersimpan | Daily/Weekly/Monthly |
| 20 | **Total Time Saved (Hours)** | `total_time_saved_seconds / 3600` | Total waktu tersimpan dalam jam | Mengukur total waktu tersimpan (jam) | Daily/Weekly/Monthly |
| 21 | **Efficiency Improvement** | `((manual_time - automation_time) / manual_time) * 100` | Prosentase peningkatan efisiensi | Mengukur peningkatan efisiensi | Daily/Weekly/Monthly |

### 6. DISTRIBUTION KPIs (2 KPIs)

| No | KPI Name | Formula | Logic | Purpose | Tracking |
|----|----------|---------|-------|---------|----------|
| 22 | **Coverage Rate** | `(COUNT(*) WHERE automation / COUNT(*)) * 100` | Prosentase coverage automation | Mengukur cakupan automation | Daily/Weekly/Monthly |
| 23 | **Processing Stats** | `MIN, MAX, MEDIAN, Q1, Q3 dari proc_sec` | Statistik distribusi processing time | Mengukur distribusi waktu processing | Daily/Weekly/Monthly |

---

## 🔄 TRACKING SYSTEM

### Time Period Grouping Logic

#### Daily Tracking
- **Grouping**: `date.toISOString().split('T')[0]` (YYYY-MM-DD)
- **Use Case**: Monitoring harian, trend harian
- **Data Points**: Setiap hari dalam periode

#### Weekly Tracking  
- **Grouping**: `YYYY-W{week_number}` (ISO Week)
- **Use Case**: Analisis mingguan, trend mingguan
- **Data Points**: Setiap minggu dalam periode

#### Monthly Tracking
- **Grouping**: `YYYY-MM` (Year-Month)
- **Use Case**: Analisis bulanan, trend bulanan
- **Data Points**: Setiap bulan dalam periode

### API Parameters
```
GET /api/myr-auto-approval-monitor/data

Parameters:
- line: string (ALL, atau line spesifik)
- startDate: string (YYYY-MM-DD)
- endDate: string (YYYY-MM-DD)
- isWeekly: boolean (true untuk weekly tracking)
- isMonthly: boolean (true untuk monthly tracking)
```

### Response Structure
```json
{
  "success": true,
  "data": {
    // Main KPIs untuk StatCard
    "depositAmount": 123456.78,
    "depositCases": 150,
    "averageProcessingTime": 2.5,
    "overdueTransactions": 5,
    "coverageRate": 85.5,
    "manualTimeSaved": 12.5,
    
    // Comprehensive KPI Data
    "volume": { ... },
    "automation": { ... },
    "processingTime": { ... },
    "performance": { ... },
    "timeSavings": { ... },
    "processingStats": { ... },
    
    // Chart Data untuk semua KPI
    "totalAmountTrend": { "series": [...], "categories": [...] },
    "automationRateTrend": { "series": [...], "categories": [...] },
    // ... semua 23 KPI dengan trend data
  }
}
```

---

## 📈 BUSINESS VALUE

### 1. Operational Efficiency
- **Volume KPIs**: Memantau volume dan nilai transaksi
- **Processing Time KPIs**: Mengukur efisiensi processing
- **Performance KPIs**: Mengidentifikasi bottleneck

### 2. Automation ROI
- **Automation Efficiency KPIs**: Mengukur efektivitas automation
- **Time Savings KPIs**: Menghitung ROI dari automation
- **Coverage Rate**: Mengukur cakupan automation

### 3. Quality Control
- **Overdue Tracking**: Mengidentifikasi transaksi bermasalah
- **Processing Stats**: Analisis distribusi performa
- **Fast Processing Rate**: Mengukur kualitas service

### 4. Strategic Planning
- **Trend Analysis**: Daily/Weekly/Monthly trends untuk forecasting
- **Comparative Analysis**: Automation vs Manual performance
- **Capacity Planning**: Berdasarkan volume dan processing time

---

## 🎯 KEY BENEFITS

1. **Real-time Monitoring**: Semua KPI dapat di-track real-time
2. **Multi-period Analysis**: Daily, Weekly, Monthly tracking
3. **Comprehensive Coverage**: 23 KPI mencakup semua aspek operasional
4. **Data-driven Decisions**: Berdasarkan data real dari database
5. **Scalable Architecture**: Mudah ditambah KPI baru
6. **Performance Optimization**: Identifikasi area improvement
7. **ROI Measurement**: Mengukur return on investment automation

---

## 📊 DASHBOARD IMPLEMENTATION

### StatCard Display (Main KPIs)
- Deposit Amount
- Deposit Cases  
- Average Processing Time
- Overdue Transactions
- Coverage Rate
- Manual Time Saved

### Chart Visualization
- Line Charts: Trends over time
- Bar Charts: Comparative analysis
- Distribution Charts: Processing time stats
- Peak Hour Analysis: Time-based patterns

### Slicer Controls
- Line Selection: Filter by business line
- Date Range: Custom period selection
- Weekly Toggle: Switch between daily/weekly view
- Monthly Toggle: Switch to monthly view

---

*Dokumentasi ini dibuat untuk Auto Approval Monitor MYR Dashboard - NEXMAX Project*
