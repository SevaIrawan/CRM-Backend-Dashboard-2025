# COMPONENTS LIBRARY - NEXMAX DASHBOARD

**Last Updated:** 2025-10-27  
**Total Components:** 34  
**Status:** Production

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Layout Components (4)](#layout-components)
3. [Chart Components (5)](#chart-components)
4. [Card Components (5)](#card-components)
5. [Modal Components (5)](#modal-components)
6. [Slicer Components (7)](#slicer-components)
7. [Utility Components (8)](#utility-components)
8. [Component Usage Guidelines](#component-usage-guidelines)

---

## OVERVIEW

### **Component Distribution:**

| Category | Count | Purpose |
|----------|-------|---------|
| **Layout** | 4 | Page structure & navigation |
| **Charts** | 5 | Data visualization |
| **Cards** | 5 | KPI display |
| **Modals** | 5 | Drill-down & editing |
| **Slicers** | 7 | Filtering & selection |
| **Utilities** | 8 | Helper components |
| **TOTAL** | **34** | Full component library |

---

## LAYOUT COMPONENTS

### **1. Layout.tsx**

**Purpose:** Main application layout wrapper

**Props:**
```typescript
interface LayoutProps {
  children: React.ReactNode
}
```

**Features:**
- ✅ Persistent sidebar + header
- ✅ Dynamic content area
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Auto-height adjustment

**Usage:**
```typescript
<Layout>
  <YourPage />
</Layout>
```

---

### **2. Sidebar.tsx**

**Purpose:** Navigation sidebar dengan menu hierarchy

**Features:**
- ✅ Multi-level menu (Currency → Pages)
- ✅ Active state highlighting
- ✅ Icon + label display
- ✅ Collapsible submenu
- ✅ Role-based menu visibility
- ✅ Scroll disabled (fixed height)

**Menu Structure:**
```
- Main Dashboard
- MYR (13 pages)
  - Overview
  - Business Performance
  - Brand Performance Trends
  - ...
- SGD (11 pages)
- USC (9 pages)
- Admin (4 pages)
  - Activity Logs
  - Feedback
  - Page Status
  - Target Audit Log
```

---

### **3. Header.tsx**

**Purpose:** Top header bar dengan user info & notifications

**Features:**
- ✅ User avatar + name
- ✅ Role display
- ✅ Notification icon
- ✅ Logout button
- ✅ Real-time timestamp display
- ✅ Scroll disabled (fixed position)

**Usage:**
```typescript
<Header 
  userEmail="user@example.com"
  userRole="manager_myr"
/>
```

---

### **4. SubHeader.tsx**

**Purpose:** Secondary header with filters/slicers

**Features:**
- ✅ Centralized slicer container
- ✅ Consistent spacing (10px between slicers)
- ✅ Quick date filter integration
- ✅ Auto-layout slicers
- ✅ Scroll disabled (fixed position)

**Usage:**
```typescript
<SubHeader>
  <YearSlicer />
  <QuarterSlicer />
  <MonthSlicer />
  <QuickDateFilter />
</SubHeader>
```

---

## CHART COMPONENTS

### **1. LineChart.tsx**

**Purpose:** Line chart untuk trend visualization

**Props:**
```typescript
interface LineChartProps {
  data: any[]
  categories: string[]
  series: {
    name: string
    dataKey: string
    color: string
  }[]
  title?: string
  height?: number
  enableZoom?: boolean
}
```

**Features:**
- ✅ Multiple series support
- ✅ Responsive design
- ✅ Tooltip dengan formatting
- ✅ Legend
- ✅ Zoom/pan capability (optional)
- ✅ Custom colors per series

**Usage:**
```typescript
<LineChart
  data={chartData}
  categories={categories}
  series={[
    { name: "GGR", dataKey: "ggr", color: "#3b82f6" },
    { name: "Target", dataKey: "target", color: "#10b981" }
  ]}
  title="GGR Trend"
  height={300}
  enableZoom={true}
/>
```

---

### **2. BarChart.tsx**

**Purpose:** Bar chart untuk comparison

**Props:**
```typescript
interface BarChartProps {
  data: any[]
  categories: string[]
  series: {
    name: string
    dataKey: string
    color: string
  }[]
  title?: string
  height?: number
  horizontal?: boolean
}
```

**Features:**
- ✅ Vertical/horizontal orientation
- ✅ Stacked mode support
- ✅ Multiple series
- ✅ Responsive design
- ✅ Tooltip formatting

---

### **3. StackedBarChart.tsx**

**Purpose:** Stacked bar chart untuk composition analysis

**Features:**
- ✅ Dynamic series dari data
- ✅ Auto-color assignment
- ✅ Percentage mode
- ✅ Legend dengan sort
- ✅ Responsive design

**Usage:**
```typescript
<StackedBarChart
  data={brandContribution}
  categories={quarters}
  stackKeys={brands}
  title="Brand GGR Contribution"
/>
```

---

### **4. SankeyChart.tsx**

**Purpose:** Sankey diagram untuk flow visualization

**Props:**
```typescript
interface SankeyChartProps {
  nodes: Array<{ name: string; value: number }>
  links: Array<{ source: number; target: number; value: number }>
  title?: string
  height?: number
}
```

**Features:**
- ✅ 3-column layout support
- ✅ Dynamic node sizing
- ✅ Flow animation
- ✅ Tooltip dengan details
- ✅ Custom color scheme

**Usage:**
```typescript
<SankeyChart
  nodes={sankeyNodes}
  links={sankeyLinks}
  title="Pure User Distribution"
  height={400}
/>
```

---

### **5. ChartZoomModal.tsx**

**Purpose:** Full-screen modal untuk chart zoom

**Features:**
- ✅ Enlarged chart view
- ✅ Export to PNG
- ✅ Print functionality
- ✅ Close/minimize controls

---

## CARD COMPONENTS

### **1. StatCard.tsx**

**Purpose:** Standard KPI card dengan comparison

**Props:**
```typescript
interface StatCardProps {
  title: string
  value: number | string
  format: "currency" | "number" | "percentage"
  currency?: string
  icon?: React.ReactNode
  comparison?: {
    value: number
    label: string
  }
  onClick?: () => void
}
```

**Features:**
- ✅ Auto-formatting based on type
- ✅ MoM comparison display
- ✅ Icon support
- ✅ Clickable (drill-down)
- ✅ Consistent styling

**Usage:**
```typescript
<StatCard
  title="Gross Gaming Revenue"
  value={10500000}
  format="currency"
  currency="MYR"
  icon={<DollarIcon />}
  comparison={{
    value: 5.2,
    label: "vs Last Month"
  }}
  onClick={() => openModal()}
/>
```

---

### **2. ComparisonStatCard.tsx**

**Purpose:** KPI card dengan side-by-side comparison

**Features:**
- ✅ Current vs Target display
- ✅ Percentage calculation
- ✅ Color-coded status
- ✅ Auto-formatting

---

### **3. ProgressBarStatCard.tsx**

**Purpose:** KPI card dengan progress bar

**Features:**
- ✅ Progress visualization
- ✅ Target achievement display
- ✅ Color gradient based on percentage
- ✅ Status indicators (On Track/Behind/Risk)

**Usage:**
```typescript
<ProgressBarStatCard
  title="Target Achievement"
  current={8500000}
  target={10000000}
  format="currency"
  currency="MYR"
/>
```

---

### **4. DualKPICard.tsx**

**Purpose:** Card dengan 2 KPIs side-by-side

**Features:**
- ✅ Two KPIs dalam satu card
- ✅ Individual formatting
- ✅ Comparison support
- ✅ Compact design

---

### **5. ComparisonIcon.tsx**

**Purpose:** Icon untuk comparison (up/down arrow)

**Features:**
- ✅ Auto-color based on value (green/red)
- ✅ Percentage display
- ✅ Arrow direction (up/down)

---

## MODAL COMPONENTS

### **1. ActiveMemberDetailsModal.tsx**

**Purpose:** Drill-down modal untuk active member details

**Props:**
```typescript
interface ActiveMemberDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  totalCount: number
  currency: string
  year: string
  quarter: string
  startDate?: string
  endDate?: string
  isDateRange: boolean
}
```

**Features:**
- ✅ Pagination (20/50/100 rows)
- ✅ Status filter (Retention/Reactivation/New Depositor)
- ✅ Brand filter
- ✅ Export CSV (all data)
- ✅ Mini KPI cards
- ✅ 17 columns display
- ✅ Sticky header
- ✅ Sorting (GGR DESC)

**Table Columns:**
- Unique Code, User Name
- First Deposit Date, Last Deposit Date
- Days Inactive, Days Active
- ATV, DC, DA, WC, WA
- GGR, Net Profit
- Win Rate, Withdrawal Rate
- Status, Brand

---

### **2. TargetEditModal.tsx**

**Purpose:** Modal untuk edit/create target

**Features:**
- ✅ Two-step input (Total → Brand breakdown)
- ✅ Auto-calculate dari percentage
- ✅ Target list table (editable)
- ✅ Role-based access control
- ✅ Percentage validation (≤100%)
- ✅ Auto-reset other brands (with warning)
- ✅ Audit trail automatic

**Input Fields:**
- Quarter, Line, Percentage
- GGR, Deposit Amount, Deposit Cases, Active Member

---

### **3. TargetAchieveModal.tsx**

**Purpose:** Target achievement breakdown modal

**Features:**
- ✅ Per-brand breakdown
- ✅ 4 KPI groups (GGR, DC, DA, AM)
- ✅ Current vs Target vs %
- ✅ Status indicators (icons)
- ✅ Export CSV
- ✅ Daily breakdown support

**Status Icons:**
- ✅ On Track (≥90%) - Green check
- ⚠️ Behind (70-89%) - Orange warning
- ❌ Risk (<70%) - Red X
- ➖ N/A (no target) - Gray dash

---

### **4. CustomerDetailModal.tsx**

**Purpose:** Customer detail drill-down

**Features:**
- ✅ Customer info display
- ✅ Transaction history
- ✅ KPI summary
- ✅ Timeline view

---

### **5. OverdueDetailsModal.tsx**

**Purpose:** Overdue approval details

**Features:**
- ✅ Overdue list
- ✅ Reason tracking
- ✅ Priority sorting
- ✅ Export CSV

---

## SLICER COMPONENTS

### **1. YearSlicer.tsx**

**Purpose:** Year selection dropdown

**Props:**
```typescript
interface YearSlicerProps {
  value: string
  onChange: (year: string) => void
  years: string[]
}
```

**Features:**
- ✅ Auto-populated from data
- ✅ Default to current year
- ✅ Sorted DESC

---

### **2. QuarterSlicer.tsx**

**Purpose:** Quarter selection dropdown

**Features:**
- ✅ Q1/Q2/Q3/Q4 options
- ✅ Filtered by year
- ✅ Auto-select latest available

---

### **3. MonthSlicer.tsx**

**Purpose:** Month selection dropdown

**Features:**
- ✅ Full month names
- ✅ Filtered by year
- ✅ Sorted chronologically

---

### **4. DateRangeSlicer.tsx**

**Purpose:** Date range picker

**Props:**
```typescript
interface DateRangeSlicerProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  minDate?: string
  maxDate?: string
}
```

**Features:**
- ✅ Start/End date pickers
- ✅ Min/Max date validation
- ✅ Bounded by available data
- ✅ Auto-adjust if invalid range

---

### **5. LineSlicer.tsx / CurrencySlicer.tsx**

**Purpose:** Brand/Line/Currency selection

**Features:**
- ✅ Dynamic options from data
- ✅ "All" option
- ✅ Alphabetical sorting
- ✅ Brand detection from database

---

### **6. QuickDateFilter.tsx**

**Purpose:** Quick date range shortcuts

**Options:**
- 7 Days
- 14 Days
- This Month
- Last Month
- This Quarter
- Last Quarter
- This Year

**Features:**
- ✅ One-click date range selection
- ✅ Auto-calculate start/end dates
- ✅ Bounded by available data
- ✅ Button group UI

---

### **7. index.ts (Slicer Barrel Export)**

**Purpose:** Centralized export untuk all slicers

```typescript
export * from './YearSlicer'
export * from './QuarterSlicer'
export * from './MonthSlicer'
export * from './DateRangeSlicer'
export * from './LineSlicer'
export * from './CurrencySlicer'
export * from './QuickDateFilter'
```

---

## UTILITY COMPONENTS

### **1. Frame.tsx**

**Purpose:** Content frame container

**Features:**
- ✅ Consistent padding
- ✅ White background
- ✅ Border radius
- ✅ Shadow
- ✅ Scroll container

**Usage:**
```typescript
<Frame title="Business Performance">
  <YourContent />
</Frame>
```

---

### **2. Icons.tsx**

**Purpose:** Centralized icon definitions

**Icons Available:**
- Dashboard, Overview, Business, Brand, Customer
- Member, Report, Analytic, Churn, Retention
- KPI, Comparison, Label, Candy, Approval
- Activity, Feedback, Settings, Users
- Upload, Download, Edit, Delete
- Check, X, Arrow, Dot, Loading

---

### **3. SkeletonLoader.tsx**

**Purpose:** Loading skeleton untuk better UX

**Features:**
- ✅ Animated pulse effect
- ✅ Multiple variants (card, table, chart)
- ✅ Customizable dimensions

---

### **4. PageTransition.tsx**

**Purpose:** Smooth page transition animation

**Features:**
- ✅ Fade in/out effect
- ✅ 200ms duration
- ✅ Automatic on route change

---

### **5. ComingSoon.tsx**

**Purpose:** Coming soon placeholder

**Features:**
- ✅ Centered message
- ✅ Icon display
- ✅ Page name from props
- ✅ Consistent styling

---

### **6. FeedbackWidget.tsx**

**Purpose:** Floating feedback button

**Features:**
- ✅ Fixed bottom-right position
- ✅ Click to open feedback form
- ✅ Auto-capture page name
- ✅ Success/error messages

---

### **7. ActivityTracker.tsx**

**Purpose:** Automatic user activity logging

**Features:**
- ✅ Track page views
- ✅ Track user actions
- ✅ Auto-send to API
- ✅ IP address capture
- ✅ Timestamp automatic

---

### **8. AccessControl.tsx**

**Purpose:** Role-based component visibility

**Props:**
```typescript
interface AccessControlProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}
```

**Usage:**
```typescript
<AccessControl allowedRoles={["admin", "manager_myr"]}>
  <TargetEditButton />
</AccessControl>
```

---

## COMPONENT USAGE GUIDELINES

### **1. Import Standards**

```typescript
// Layout
import { Layout, Sidebar, Header, SubHeader } from '@/components'

// Charts
import { LineChart, BarChart, SankeyChart } from '@/components'

// Cards
import { StatCard, ComparisonStatCard } from '@/components'

// Modals
import ActiveMemberDetailsModal from '@/components/ActiveMemberDetailsModal'

// Slicers
import { YearSlicer, QuarterSlicer, QuickDateFilter } from '@/components/slicers'

// Utilities
import { Frame, Icons, SkeletonLoader } from '@/components'
```

---

### **2. Styling Standards**

**Colors:**
```typescript
// Primary colors
primary: "#3b82f6"      // Blue
secondary: "#10b981"    // Green
danger: "#ef4444"       // Red
warning: "#f59e0b"      // Orange
gray: "#6b7280"         // Gray

// Background
bg: "#ffffff"           // White
bgGray: "#f9fafb"       // Light gray
border: "#e5e7eb"       // Border gray
```

**Spacing:**
```typescript
// Standard spacing (px)
gap: 10                 // Between slicers
padding: 16             // Frame padding
margin: 10              // Between sections
```

**Typography:**
```typescript
// Font sizes
title: "18px"           // Page title
heading: "16px"         // Section heading
body: "14px"            // Body text
small: "12px"           // Small text
```

---

### **3. Responsive Design**

**Breakpoints:**
```typescript
mobile: 640px
tablet: 768px
desktop: 1024px
wide: 1280px
```

**Guidelines:**
- ✅ Use Tailwind responsive classes
- ✅ Test on mobile/tablet/desktop
- ✅ Stack vertically on mobile
- ✅ Grid layout on desktop

---

### **4. Performance Best Practices**

**Optimization:**
```typescript
// 1. Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // ... render logic
})

// 2. Use useCallback for event handlers
const handleClick = useCallback(() => {
  // ... handler logic
}, [dependencies])

// 3. Use useMemo for expensive calculations
const calculatedValue = useMemo(() => {
  return expensiveCalculation(data)
}, [data])

// 4. Lazy load modals
const Modal = lazy(() => import('./Modal'))
```

---

### **5. Accessibility**

**Standards:**
- ✅ Semantic HTML elements
- ✅ ARIA labels untuk icons
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Screen reader friendly
- ✅ Color contrast ratio >4.5:1

---

### **6. Testing Guidelines**

**Component Testing:**
```typescript
// Unit tests for logic
describe('StatCard', () => {
  it('formats currency correctly', () => {
    // test logic
  })
})

// Integration tests for user flows
describe('TargetEditModal', () => {
  it('saves target successfully', () => {
    // test flow
  })
})
```

---

## COMPONENT DEPENDENCIES

### **External Libraries:**

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.x | Core framework |
| Next.js | 14.x | App Router |
| Tailwind CSS | 3.x | Styling |
| Recharts | 2.x | Charts |
| date-fns | 2.x | Date manipulation |

### **Internal Dependencies:**

| Module | Purpose |
|--------|---------|
| `@/lib/formatHelpers` | Number/currency formatting |
| `@/lib/supabase` | Database client |
| `@/lib/CentralIcon` | Centralized icons |
| `@/utils/rolePermissions` | Role-based access |
| `@/utils/centralLogic` | Business logic |

---

## FUTURE ENHANCEMENTS

### **Planned Components:**

- [ ] **DataGrid Component:** Advanced table dengan sorting/filtering/pagination
- [ ] **DatePicker Component:** Better date picker dengan calendar UI
- [ ] **SearchBar Component:** Global search functionality
- [ ] **Notification Component:** Toast/alert notifications
- [ ] **LoadingOverlay Component:** Full-screen loading indicator
- [ ] **ErrorBoundary Component:** Error handling wrapper
- [ ] **ThemeProvider Component:** Dark mode support

---

**END OF DOCUMENT**

