# 🎯 NEXMAX DASHBOARD - CENTRALIZED ICON SYSTEM

## 📋 Overview
Semua icon di dashboard NEXMAX dikelola secara terpusat melalui file `lib/centralIcons.tsx`. Sistem ini memastikan konsistensi dan kemudahan maintenance.

## 🎯 Icon Categories

### 1. KPI Icons (Untuk StatCard)
- **Lokasi**: `KPI_ICONS` object di `lib/centralIcons.tsx`
- **Penggunaan**: `<StatCard icon="icon-name" />`
- **Available Icons**:
  - `netProfit` - Net Profit KPI
  - `headcount` - Headcount KPI  
  - `depositAmount` - Deposit Amount KPI
  - `holdPercentage` - Hold Percentage KPI
  - `activeMember` - Active Member KPI
  - `conversionRate` - Conversion Rate KPI
  - `churnRate` - Churn Rate KPI
  - `ggrUser` - GGR User KPI
  - `pureUser` - Pure User KPI

### 2. Chart Icons (Untuk LineChart/BarChart)
- **Lokasi**: `CHART_ICONS` object di `lib/centralIcons.tsx`
- **Penggunaan**: `<LineChart chartIcon={getChartIcon('CHART TITLE')} />`
- **Available Charts**:
  - `'GGR USER TREND'` - GGR User Trend Chart
  - `'GGR PURE USER TREND'` - GGR Pure User Trend Chart
  - `'CUSTOMER VALUE PER HEADCOUNT'` - Customer Value Chart
  - `'CUSTOMER COUNT VS HEADCOUNT'` - Customer Count Chart
  - `'HEADCOUNT BY DEPARTMENT'` - Headcount Department Chart

### 3. Comparison Icons (Untuk MoM arrows)
- **Lokasi**: `COMPARISON_ICONS` object di `lib/centralIcons.tsx`
- **Penggunaan**: `<ComparisonIcon isPositive={true} />`
- **Available Icons**:
  - `arrowUp` - Green up arrow
  - `arrowDown` - Red down arrow

## 📍 Pages yang Menggunakan Icons

### 1. Main Dashboard (`/dashboard`)
- **File**: `app/dashboard/page.tsx`
- **Components**: StatCards, LineCharts, BarCharts
- **Icons Used**: All KPI icons, chart icons

### 2. Strategic Executive (`/strategic-executive`)
- **File**: `app/strategic-executive/page.tsx`
- **Components**: StatCards, LineCharts, BarCharts
- **Icons Used**: GGR User, Pure User, Headcount icons

### 3. Business Flow (`/business-flow`)
- **File**: `app/business-flow/page.tsx`
- **Components**: StatCards, Charts
- **Icons Used**: Business flow specific icons

### 4. Transaction Deposit (`/transaction/deposit`)
- **File**: `app/transaction/deposit/page.tsx`
- **Components**: Data table (no icons currently)

## 🛠️ Cara Menambah Icon Baru

### Menambah KPI Icon:
1. **Tambah SVG ke KPI_ICONS**:
```typescript
// Di lib/centralIcons.tsx
export const KPI_ICONS = {
  // ... existing icons
  newIcon: `<svg>...</svg>`
}
```

2. **Tambah mapping di getKpiIcon**:
```typescript
export function getKpiIcon(kpiName: string): string {
  const iconMap = {
    // ... existing mappings
    'New Icon': KPI_ICONS.newIcon,
    'NEW ICON': KPI_ICONS.newIcon, // Alternative name
  }
}
```

3. **Gunakan di StatCard**:
```typescript
<StatCard title="New KPI" icon="newIcon" />
```

### Menambah Chart Icon:
1. **Tambah ke CHART_ICONS**:
```typescript
export const CHART_ICONS = {
  // ... existing charts
  'NEW CHART TITLE': KPI_ICONS.someIcon
}
```

2. **Gunakan di Chart**:
```typescript
<LineChart chartIcon={getChartIcon('NEW CHART TITLE')} />
```

## 🔧 Helper Functions

### getKpiIcon(kpiName: string)
- Mengembalikan SVG string untuk KPI icon
- Menerima nama KPI dan mengembalikan icon yang sesuai
- Fallback ke default icon jika tidak ditemukan

### getChartIcon(chartName: string)  
- Mengembalikan SVG string untuk chart icon
- Menerima nama chart dan mengembalikan icon yang sesuai
- Fallback ke default icon jika tidak ditemukan

### getComparisonIcon(isPositive: boolean)
- Mengembalikan SVG string untuk comparison arrow
- `true` = up arrow (green), `false` = down arrow (red)

## 🎨 React Components

### ComparisonIcon Component
```typescript
<ComparisonIcon 
  isPositive={true} 
  size="14px" 
  className="" 
  color="green" 
/>
```

### KpiIcon Component
```typescript
<KpiIcon 
  kpiName="Net Profit" 
  size="20px" 
  className="" 
/>
```

## 📝 COMPARISON_TYPES

Untuk memudahkan pembuatan comparison data:
```typescript
// Di StatCard
comparison={COMPARISON_TYPES.MOM_NEGATIVE(-28.23)}

// Available types:
COMPARISON_TYPES.MOM(percentage, isPositive)
COMPARISON_TYPES.MOM_POSITIVE(percentage)
COMPARISON_TYPES.MOM_NEGATIVE(percentage)
COMPARISON_TYPES.YOY(percentage, isPositive)
COMPARISON_TYPES.YOY_POSITIVE(percentage)
COMPARISON_TYPES.YOY_NEGATIVE(percentage)
COMPARISON_TYPES.CUSTOM(percentage, isPositive, text)
```

## ✅ Checklist Maintenance

- [ ] Semua icon menggunakan sistem terpusat
- [ ] Tidak ada SVG hardcoded di komponen lain
- [ ] Semua mapping di getKpiIcon sudah benar
- [ ] Semua chart title di CHART_ICONS sudah benar
- [ ] Dokumentasi sudah lengkap dan update

## 🚨 Important Notes

1. **JANGAN** hardcode SVG di komponen lain
2. **SELALU** gunakan `getKpiIcon()` atau `getChartIcon()`
3. **UPDATE** dokumentasi ketika menambah icon baru
4. **TEST** icon di semua halaman yang relevan
5. **KEEP** fallback icons untuk error handling
