# 📊 KPI Dashboard - Next.js + Supabase

## 🏗️ Architecture Overview

```
Frontend (React + TSX)
│
├─ Slicer (Dropdown/Filter) ← baca langsung dari Supabase (tanpa limit)
│  ├─ YearSlicer ✅ (KPILogic)
│  ├─ MonthSlicer ✅ (Direct Supabase - lebih efficient)
│  ├─ CurrencySlicer ✅ (KPILogic)
│  └─ LineSlicer ✅ (KPILogic)
│
├─ KPILogic.tsx (Logic file pusat) ✅ ← semua perhitungan kustom di sini
│  ├─ getSlicerData() ✅
│  ├─ getAllKPIs() ✅
│  ├─ Individual KPI functions ✅
│  └─ NO LIMIT queries ✅
│
└─ Visualisasi (Komponen Chart, Table, dll) ✅ ← tampilkan hasil berdasarkan logic
```

## 🚀 Features

### ✅ **CENTRALIZED KPI LOGIC**
- **Single Source of Truth**: `lib/KPILogic.tsx`
- **Flexible Configuration**: Easy to add new KPIs
- **NO LIMIT Queries**: Bypass Supabase default limits
- **Caching Mechanism**: Performance optimization
- **Error Handling**: Retry mechanism for reliability

### ✅ **DYNAMIC SLICERS**
- **YearSlicer**: Auto-detect years from database
- **MonthSlicer**: Filter months by selected year
- **CurrencySlicer**: Auto-detect currencies from database
- **LineSlicer**: Auto-detect lines from database

### ✅ **REAL-TIME DATA**
- **Direct Supabase Integration**: Real-time data fetching
- **Accurate Calculations**: Based on actual database values
- **Dynamic Updates**: Refresh when slicers change

## 📁 Project Structure

```
NEXMAX/
├── app/
│   ├── dashboard/page.tsx          # Main dashboard
│   ├── test-connection/page.tsx    # Connection test
│   └── connection-test/page.tsx    # Supabase test
├── components/
│   ├── Layout.tsx                  # Main layout
│   ├── StatCard.tsx                # KPI cards
│   └── slicers/
│       ├── YearSlicer.tsx          # Year filter
│       ├── MonthSlicer.tsx         # Month filter
│       ├── CurrencySlicer.tsx      # Currency filter
│       └── LineSlicer.tsx          # Line filter
├── lib/
│   ├── KPILogic.tsx               # 🎯 CENTRALIZED LOGIC
│   ├── config.ts                   # Supabase config
│   ├── supabase.ts                 # Supabase client
│   └── pageKPIHelper.ts            # Helper functions
└── README.md                       # This file
```

## 🔧 KPILogic.tsx - Centralized Logic

### **Core Functions:**
```typescript
// Get all slicer data (years, currencies, lines)
export async function getSlicerData(): Promise<SlicerData>

// Get months for specific year
export async function getMonthsForYear(year: string): Promise<string[]>

// Get all KPIs at once
export async function getAllKPIs(filters: SlicerFilters): Promise<KPIData>

// Get individual KPI
export async function getKPIByName(kpiName: string, filters: SlicerFilters): Promise<number>
```

### **Available KPIs:**
- **Active Member**: Count of active members
- **New Depositor**: Count of new depositors
- **Deposit Amount**: Sum of deposits
- **Gross Gaming Revenue**: Sum of GGR
- **Net Profit**: Sum of net profit
- **Withdraw Amount**: Sum of withdrawals

### **Flexible Configuration:**
```typescript
export const KPI_CONFIG = {
  activeMember: { name: 'Active Member', type: 'count', field: '*' },
  newDepositor: { name: 'New Depositor', type: 'count', field: 'deposit_amount', condition: 'gt:0' },
  depositAmount: { name: 'Deposit Amount', type: 'sum', field: 'deposit_amount' },
  // ... add more KPIs easily
}
```

## 🎯 Usage Examples

### **1. Get Slicer Data:**
```typescript
import { getSlicerData } from '@/lib/KPILogic'

const slicerData = await getSlicerData()
console.log('Years:', slicerData.years)
console.log('Currencies:', slicerData.currencies)
console.log('Lines:', slicerData.lines)
```

### **2. Get All KPIs:**
```typescript
import { getAllKPIs } from '@/lib/KPILogic'

const filters = { year: '2025', month: 'July', currency: 'MYR' }
const kpis = await getAllKPIs(filters)
console.log('Active Members:', kpis.activeMember)
console.log('Deposit Amount:', kpis.depositAmount)
```

### **3. Get Single KPI:**
```typescript
import { getKPIByName } from '@/lib/KPILogic'

const value = await getKPIByName('activeMember', filters)
```

### **4. Use Page Helper:**
```typescript
import { PageKPIHelper } from '@/lib/pageKPIHelper'

const result = await PageKPIHelper.getKPIForVisualization(
  'activeMember', 
  filters, 
  'number'
)
```

## 🔄 Adding New KPIs

### **Step 1: Add to KPI_CONFIG**
```typescript
// In lib/KPILogic.tsx
export const KPI_CONFIG = {
  // ... existing KPIs
  newKPI: { name: 'New KPI', type: 'sum', field: 'new_field' }
}
```

### **Step 2: Add to Interface**
```typescript
export interface KPIData {
  // ... existing fields
  newKPI: number
}
```

### **Step 3: Add to getAllKPIs**
```typescript
export async function getAllKPIs(filters: SlicerFilters): Promise<KPIData> {
  const [/* existing */, newKPI] = await Promise.all([
    // ... existing calls
    getNewKPI(filters)
  ])
  
  return {
    // ... existing fields
    newKPI
  }
}
```

## 🚀 Performance Features

### **Caching:**
- **5-minute TTL**: Automatic cache expiration
- **Smart Invalidation**: Clear expired cache
- **Memory Efficient**: Map-based storage

### **Error Handling:**
- **Retry Mechanism**: 3 attempts with exponential backoff
- **Graceful Degradation**: Fallback to default values
- **Detailed Logging**: Console logs for debugging

### **NO LIMIT Queries:**
- **Bypass Default Limits**: Use `.limit(100000)`
- **Count Optimization**: Use `{ count: 'exact', head: true }`
- **Efficient Filtering**: Filter at database level

## 🎨 UI Components

### **Layout:**
- **Dark Header**: Navigation and user info
- **Sub-header**: Slicer filters aligned to right
- **Main Content**: KPI cards and charts

### **Slicers:**
- **Consistent Styling**: White background, rounded corners
- **Loading States**: Disabled state with "Loading..." text
- **Dynamic Options**: Based on database data

### **KPI Cards:**
- **6 Cards**: Deposit, Withdraw, Gross Profit, Net Profit, New Depositor, Active Member
- **Icons**: Visual indicators for each KPI
- **Formatting**: Currency, number, and percentage formatting

## 🔧 Configuration

### **Supabase Setup:**
```typescript
// lib/config.ts
export default {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  }
}
```

### **Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚀 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Set Environment Variables:**
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

3. **Run Development Server:**
   ```bash
   npm run dev
   ```

4. **Access Dashboard:**
   ```
   http://localhost:3000/dashboard
   ```

## 📊 Database Schema

### **member_report_monthly Table:**
```sql
- year: string
- month: string  
- currency: string
- line: string
- deposit_amount: number
- withdraw_amount: number
- ggr: number (Gross Gaming Revenue)
- net_profit: number
```

## 🎯 Key Benefits

### **✅ Centralized Logic:**
- Single source of truth for all KPI calculations
- Easy to maintain and update
- Consistent data across all components

### **✅ Flexible Architecture:**
- Easy to add new KPIs
- Easy to add new slicers
- Easy to modify calculations

### **✅ Performance Optimized:**
- Caching mechanism
- NO LIMIT queries
- Efficient database queries

### **✅ Real-time Data:**
- Direct Supabase integration
- Dynamic slicer updates
- Accurate calculations

## 🔮 Future Enhancements

### **Planned Features:**
- **Real-time Updates**: WebSocket integration
- **Advanced Caching**: Redis integration
- **Custom Formulas**: User-defined KPI calculations
- **Multi-currency**: Currency conversion
- **Historical Comparison**: Period-over-period analysis
- **Export Features**: PDF/Excel export
- **Mobile Responsive**: Better mobile experience

---

**🎉 Project Status: PRODUCTION READY**

All components are using centralized KPILogic, NO LIMIT queries implemented, and architecture is clean and maintainable!

# 🎯 **KPI Dashboard - Standard Comparison Icons**

## **🔄 Comparison Icon System**

### **📋 Overview**
Sistem icon compare yang standard untuk semua page dengan SVG custom yang otomatis ikut warna.

### **🎨 Icon Types**
- **🔼 UP Icon**: Untuk nilai positif (> 0)
- **🔽 DOWN Icon**: Untuk nilai negatif (< 0)  
- **➡️ NEUTRAL Icon**: Untuk nilai neutral (= 0)

### **🌈 Color Scheme**
- **🟢 Green (#059669)**: Nilai positif
- **🔴 Red (#dc2626)**: Nilai negatif
- **⚫ Gray (#6b7280)**: Nilai neutral

### **📦 Usage Examples**

#### **1. Utility Functions (lib/KPILogic.tsx)**
```typescript
import { getComparisonIcon, getComparisonColor, formatMoMValue } from '@/lib/KPILogic'

// Get icon with custom size
const icon = getComparisonIcon(value, '16px')

// Get color
const color = getComparisonColor(value)

// Format MoM value
const text = formatMoMValue(value) // Returns "+5.2%" or "-3.1%"
```

#### **2. ComparisonIcon Component**
```typescript
import ComparisonIcon from '@/components/ComparisonIcon'

// Icon only
<ComparisonIcon value={5.2} size="14px" />

// Icon with text
<ComparisonIcon 
  value={-3.1} 
  showText={true} 
  text="+5.2% vs Last Month" 
  size="12px"
/>
```

#### **3. In Dashboard Cards**
```typescript
<small>
  <ComparisonIcon 
    value={momData.depositAmount} 
    showText={true} 
    text={`${formatMoMValue(momData.depositAmount)} vs Last Month`}
  />
</small>
```

### **🔧 Implementation Details**

#### **SVG Icons**
- **Up Icon**: Arrow pointing up-right
- **Down Icon**: Arrow pointing down-right  
- **Neutral Icon**: Same as up icon (for consistency)

#### **Dynamic Styling**
- `fill: ${color}` - Icon color follows value
- `width/height: ${size}` - Customizable size
- `display: inline-block` - Proper alignment
- `vertical-align: middle` - Center alignment
- `margin-left: 4px` - Spacing from text

### **📱 Responsive Design**
- **Desktop**: 12px default size
- **Tablet**: 14px for better visibility
- **Mobile**: 16px for touch targets

### **🎯 Benefits**
1. **Consistency**: Same icons across all pages
2. **Accessibility**: Clear visual indicators
3. **Maintainability**: Centralized icon system
4. **Flexibility**: Customizable size and text
5. **Performance**: SVG icons are lightweight

### **🚀 Future Enhancements**
- [ ] Add animation on hover
- [ ] Support for different icon styles
- [ ] Accessibility labels
- [ ] Dark mode support

## **📊 Business Flow Page**

### **🎯 Overview**
Business Flow page menggunakan icon compare yang sama dengan Main Dashboard untuk consistency.

### **🔄 Updated Components**
- **PPC Service Module**: 3 KPI cards dengan icon compare standard
- **First Depositor Module**: 4 KPI cards dengan icon compare standard  
- **Old Member Module**: 2 KPI cards dengan icon compare standard
- **Traffic Executive Module**: 3 KPI cards dengan icon compare standard

### **🎨 Implementation**
```typescript
// Business Flow KPI Card Example
<div className="kpi-card">
  <h4 className="kpi-title">NEW CUSTOMER CONVERSION RATE</h4>
  <div className="kpi-value">4.83%</div>
  <div className="kpi-change">
    <ComparisonIcon 
      value={-28.23} 
      showText={true} 
      text={`${formatMoMValue(-28.23)} vs Last Month`}
    />
  </div>
</div>
```

### **✅ Benefits**
- **Consistency**: Same icon system across all pages
- **Dynamic Colors**: Icons automatically follow value colors
- **Maintainable**: Centralized icon system
- **Professional**: Clean and modern appearance

## **🎯 Centralized KPI Icons System**

### **📋 Overview**
Sistem icon terpusat untuk semua KPI cards dengan SVG custom yang sesuai dengan jenis KPI.

### **🎨 Icon Types**
- **💰 Deposit Amount**: Dollar sign icon
- **💸 Withdraw Amount**: Arrow pointing right icon  
- **📈 Gross Profit**: Trending up icon
- **🎯 Net Profit**: Target/bullseye icon
- **👥 New Depositor**: User plus icon
- **👤 Active Member**: User with search icon

### **📦 Usage Examples**

#### **1. Central Icons (lib/centralIcons.tsx)**
```typescript
import { KPI_ICONS, getKpiIcon, KpiIcon } from '@/lib/centralIcons'

// Get icon SVG string
const iconSvg = getKpiIcon('depositAmount')

// Use React component
<KpiIcon kpiName="depositAmount" size="24px" />
```

#### **2. In StatCard Component**
```typescript
import StatCard from '@/components/StatCard'

<StatCard
  title="DEPOSIT AMOUNT"
  value={formatCurrency(kpiData.depositAmount)}
  icon="depositAmount"
  comparison={{
    percentage: formatMoMValue(momData.depositAmount),
    isPositive: momData.depositAmount > 0,
    text: "vs Last Month"
  }}
/>
```

#### **3. Available KPI Icons**
- `depositAmount` - Dollar sign for deposit amounts
- `withdrawAmount` - Arrow for withdrawals
- `grossProfit` - Trending up for gross profit
- `netProfit` - Target for net profit
- `newDepositor` - User plus for new customers
- `activeMember` - User with search for active members

### **🔧 Implementation Details**

#### **SVG Icons**
- **Custom SVG**: Each icon is custom SVG with proper viewBox
- **Dynamic Styling**: `fill: currentColor` for theme compatibility
- **Responsive**: Scalable without quality loss
- **Accessible**: Proper semantic structure

#### **Centralized System**
- **Single Source**: All icons in `lib/centralIcons.tsx`
- **Flexible Mapping**: Multiple name variations supported
- **Fallback**: Default icon if KPI not found
- **Type Safe**: TypeScript interfaces for safety

### **📱 Responsive Design**
- **Desktop**: 24px default size
- **Tablet**: 20px for better fit
- **Mobile**: 18px for touch targets

### **🎯 Benefits**
1. **Consistency**: Same icons across all KPI cards
2. **Semantic**: Icons match KPI meaning
3. **Maintainable**: Centralized icon management
4. **Scalable**: SVG icons scale perfectly
5. **Themeable**: Icons follow color scheme
