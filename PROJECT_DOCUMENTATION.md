# NEXMAX DASHBOARD - COMPLETE PROJECT DOCUMENTATION

**Last Updated:** 2025-10-27  
**Version:** 2.0  
**Status:** Production Ready

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Currencies & Modules](#currencies--modules)
5. [Page Inventory](#page-inventory)
6. [Architecture & Data Flow](#architecture--data-flow)
7. [Authentication & Authorization](#authentication--authorization)
8. [Database Schema](#database-schema)
9. [Performance Strategy](#performance-strategy)
10. [Deployment](#deployment)

---

## 1. PROJECT OVERVIEW

NEXMAX Dashboard adalah **Multi-Currency Analytics Dashboard** untuk analisis performa bisnis gaming platform dengan 3 currencies:
- **MYR** (Malaysian Ringgit) - 13 pages
- **SGD** (Singapore Dollar) - 11 pages  
- **USC** (US Casino) - 9 pages

### **Key Features:**
- ✅ Real-time KPI monitoring (46+ KPIs per currency)
- ✅ Multi-mode visualization (Daily, Monthly, Quarterly)
- ✅ Advanced filtering (Year, Quarter, Month, Date Range, Brand)
- ✅ Interactive charts (11 chart types per page)
- ✅ Drill-down modals dengan pagination & export CSV
- ✅ Role-based access control (6 roles)
- ✅ Target management system dengan audit trail
- ✅ Activity logging & feedback system

---

## 2. TECH STACK

### **Frontend:**
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Custom CSS
- **Charts:** Recharts
- **UI Components:** Custom component library
- **State Management:** React useState/useEffect
- **Data Fetching:** Fetch API (Server-side & Client-side)

### **Backend:**
- **API Routes:** Next.js API Routes (87 routes)
- **Database:** Supabase (PostgreSQL)
- **ORM:** Supabase Client
- **Materialized Views:** 6 MVs untuk performance optimization

### **Infrastructure:**
- **Hosting:** Vercel
- **Database:** Supabase Cloud
- **CDN:** Vercel Edge Network
- **Monitoring:** Supabase Dashboard

---

## 3. PROJECT STRUCTURE

```
NexMax-Dashboard/
│
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin pages (4 pages)
│   │   ├── activity-logs/
│   │   ├── feedback/
│   │   ├── page-status/
│   │   └── target-audit-log/
│   │
│   ├── api/                      # API Routes (87 endpoints)
│   │   ├── myr-*/                # MYR-specific APIs
│   │   ├── sgd-*/                # SGD-specific APIs
│   │   ├── usc-*/                # USC-specific APIs
│   │   ├── activity-logs/
│   │   ├── feedback/
│   │   ├── page-visibility/
│   │   └── target-audit-log/
│   │
│   ├── myr/                      # MYR Pages (13 pages)
│   ├── sgd/                      # SGD Pages (11 pages)
│   ├── usc/                      # USC Pages (9 pages)
│   ├── dashboard/                # Main Dashboard
│   ├── login/                    # Login Page
│   └── users/                    # User Management
│
├── components/                   # Reusable Components (34 components)
│   ├── slicers/                  # Filter Components (7 slicers)
│   ├── modals/                   # Modal Components
│   ├── charts/                   # Chart Components
│   └── layout/                   # Layout Components
│
├── lib/                          # Utility Libraries (16 files)
│   ├── supabase.ts               # Supabase client
│   ├── formatHelpers.ts          # Number formatting
│   ├── businessPerformanceComparison.ts
│   ├── businessPerformanceHelper.ts
│   ├── CentralIcon.tsx           # Centralized icon system
│   └── *DailyAverageAndMoM.ts   # Currency-specific logic
│
├── utils/                        # Utility Functions (4 files)
│   ├── centralLogic.ts
│   ├── rolePermissions.ts
│   ├── pageVisibilityHelper.ts
│   └── sessionCleanup.ts
│
├── docs/                         # Documentation (15 files)
│   ├── BP_MV_LOGIC_SUMMARY.md
│   ├── BUSINESS_PERFORMANCE_STANDARD.md
│   ├── DASHBOARD_FRONTEND_FRAMEWORK.md
│   └── ...
│
├── scripts/                      # Database Scripts (26 files)
│   ├── create-bp-quarter-summary-myr.sql
│   ├── create-bp-daily-summary-myr.sql
│   ├── create-bp-target-tables.sql
│   └── ...
│
└── styles/                       # Global Styles
    ├── globals.css
    └── table-styles.css
```

---

## 4. CURRENCIES & MODULES

### **MYR (Malaysian Ringgit) - 13 Pages**

| Page | Description | Status |
|------|-------------|--------|
| Overview | Main dashboard dengan 12 KPI cards | ✅ Production |
| Business Performance | 46 KPIs + 11 charts + target system | ✅ Production |
| Brand Performance Trends | Trend analysis per brand | ✅ Production |
| Customer Retention | Retention analysis + cohort tracking | ✅ Production |
| Churn Member | Churn tracking + drill-down | ✅ Production |
| Member Report | Member-level analytics | ✅ Production |
| Member Analytic | Advanced member segmentation | ✅ Production |
| KPI Comparison | Side-by-side KPI comparison | ✅ Production |
| Overall Label | Label-based analytics | ✅ Production |
| AIA Candy Tracking | Candy distribution tracking | ✅ Production |
| Auto Approval Monitor | Approval process monitoring | ✅ Production |
| Auto Approval Withdraw | Withdrawal approval tracking | ✅ Production |

### **SGD (Singapore Dollar) - 11 Pages**

| Page | Description | Status |
|------|-------------|--------|
| Overview | Main dashboard | ✅ Production |
| Business Performance | Full BP analytics | ✅ Production |
| Brand Performance Trends | Brand trends | ✅ Production |
| Customer Retention | Retention analytics | ✅ Production |
| Churn Member | Churn tracking | ✅ Production |
| Member Report | Member analytics | ✅ Production |
| Member Analytic | Advanced segmentation | ✅ Production |
| KPI Comparison | KPI comparison | ✅ Production |
| AIA Candy Tracking | Candy tracking | ✅ Production |
| Auto Approval Monitor | Approval monitoring | ✅ Production |

### **USC (US Casino) - 9 Pages**

| Page | Description | Status |
|------|-------------|--------|
| Overview | Main dashboard | ✅ Production |
| Business Performance | Full BP analytics | ✅ Production |
| Brand Performance Trends | Brand trends | ✅ Production |
| Customer Retention | Retention analytics | ✅ Production |
| Churn Member | Churn tracking | ✅ Production |
| Member Report | Member analytics | ✅ Production |
| Member Analytic | Advanced segmentation | ✅ Production |
| KPI Comparison | KPI comparison | ✅ Production |
| Auto Approval Monitor | Approval monitoring | ✅ Production |

### **Admin Pages - 4 Pages**

| Page | Description | Status |
|------|-------------|--------|
| Activity Logs | System activity tracking | ✅ Production |
| Feedback | User feedback management | ✅ Production |
| Page Status | Page visibility control | ✅ Production |
| Target Audit Log | Target change tracking | ✅ Production |

---

## 5. PAGE INVENTORY

### **Total Pages:** 37 pages

#### **By Currency:**
- MYR: 13 pages
- SGD: 11 pages
- USC: 9 pages
- Admin: 4 pages

#### **By Category:**
- **Overview/Dashboard:** 4 pages (MYR, SGD, USC, Main)
- **Business Performance:** 3 pages (MYR, SGD, USC)
- **Brand Performance:** 3 pages
- **Customer Analytics:** 9 pages (Retention, Churn, Member Report × 3 currencies)
- **Member Analytics:** 3 pages
- **KPI Analysis:** 3 pages
- **Special Tracking:** 4 pages (AIA Candy, Auto Approval)
- **Admin:** 4 pages

---

## 6. ARCHITECTURE & DATA FLOW

### **6.1. Overall Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  MYR Pages   │  │  SGD Pages   │  │  USC Pages   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                 │
│                            │                                     │
│                  ┌─────────▼─────────┐                          │
│                  │   API Routes      │                          │
│                  │   (87 endpoints)  │                          │
│                  └─────────┬─────────┘                          │
└────────────────────────────┼──────────────────────────────────┘
                             │
                   ┌─────────▼─────────┐
                   │   Supabase DB     │
                   │   (PostgreSQL)    │
                   │                   │
                   │  ┌──────────────┐ │
                   │  │  Raw Tables  │ │
                   │  ├──────────────┤ │
                   │  │     MVs      │ │
                   │  ├──────────────┤ │
                   │  │   Indexes    │ │
                   │  └──────────────┘ │
                   └───────────────────┘
```

### **6.2. Business Performance Data Flow (Example)**

```
┌────────────────────┐
│  Business          │
│  Performance Page  │
│  (Frontend)        │
└─────────┬──────────┘
          │
          │ 1. User selects filters (Year, Quarter, Date Range)
          │
          ▼
┌────────────────────────────────────┐
│  API: /myr-business-performance    │
│       /data                         │
└─────────┬──────────────────────────┘
          │
          │ 2. Fetch from MV + Calculate via Logic
          │
          ├─────────────────┬───────────────────┐
          │                 │                   │
          ▼                 ▼                   ▼
┌──────────────────┐ ┌────────────┐ ┌─────────────────┐
│ bp_quarter_      │ │ blue_whale │ │ bp_target       │
│ summary_myr (MV) │ │ _myr       │ │                 │
│                  │ │            │ │                 │
│ • Financial      │ │ • COUNT    │ │ • Target values │
│   aggregates     │ │   DISTINCT │ │ • Forecast      │
│ • Active Member  │ │ • Pure User│ │                 │
│ • Trend KPIs     │ │ • Cohort   │ │                 │
└──────────────────┘ └────────────┘ └─────────────────┘
          │                 │                   │
          └─────────────────┴───────────────────┘
                            │
                            │ 3. Merge & Calculate final KPIs
                            │
                            ▼
                   ┌────────────────┐
                   │  JSON Response │
                   │                │
                   │  • 46 KPIs     │
                   │  • 11 Charts   │
                   │  • Daily Avg   │
                   │  • MoM Compare │
                   └────────────────┘
```

### **6.3. Materialized Views Strategy**

**6 Materialized Views untuk Performance:**

| MV Name | Purpose | Refresh | Size |
|---------|---------|---------|------|
| `bp_daily_summary_myr` | Daily financial aggregates + 7 pre-calculated KPIs | On-demand | ~50MB |
| `bp_quarter_summary_myr` | Quarterly/Monthly aggregates + member metrics + trend KPIs | Daily | ~5MB |
| `bp_daily_summary_sgd` | SGD daily aggregates | On-demand | ~30MB |
| `bp_quarter_summary_sgd` | SGD quarterly aggregates | Daily | ~3MB |
| `bp_daily_summary_usc` | USC daily aggregates | On-demand | ~20MB |
| `bp_quarter_summary_usc` | USC quarterly aggregates | Daily | ~2MB |

**Benefits:**
- ✅ Query time: <100ms (vs 2-5s without MV)
- ✅ Reduced database load (no real-time aggregation)
- ✅ Consistent performance regardless of date range
- ✅ Chart loading: <100ms (fetch dari MV, no calculation)

---

## 7. AUTHENTICATION & AUTHORIZATION

### **7.1. User Roles**

| Role | Access Level | Description |
|------|--------------|-------------|
| `admin` | Full access | All pages, all currencies, can edit targets |
| `manager_myr` | MYR only | MYR pages + can edit MYR targets only |
| `manager_sgd` | SGD only | SGD pages + can edit SGD targets only |
| `manager_usc` | USC only | USC pages + can edit USC targets only |
| `viewer` | Read-only | View all pages, cannot edit targets |
| `demo` | Full access (testing) | Same as admin, for demo purposes |

### **7.2. Role-based Target Editing**

**Target Edit Matrix:**

| Role | Can Edit MYR Target? | Can Edit SGD Target? | Can Edit USC Target? |
|------|---------------------|---------------------|---------------------|
| `admin` | ✅ Yes | ✅ Yes | ✅ Yes |
| `manager_myr` | ✅ Yes | ❌ No | ❌ No |
| `manager_sgd` | ❌ No | ✅ Yes | ❌ No |
| `manager_usc` | ❌ No | ❌ No | ✅ Yes |
| `viewer` | ❌ No | ❌ No | ❌ No |
| `demo` | ✅ Yes | ✅ Yes | ✅ Yes |

### **7.3. Page Visibility Control**

Admins dapat control visibility per page melalui **Page Status** admin panel:
- Toggle ON/OFF untuk setiap page
- "Coming Soon" message untuk pages yang di-disable
- Dynamic sidebar menu based on enabled pages

---

## 8. DATABASE SCHEMA

### **8.1. Master Tables**

| Table | Purpose | Rows | Key Columns |
|-------|---------|------|-------------|
| `blue_whale_myr` | Master transaction data MYR | ~5M | userkey, unique_code, date, deposit_amount, withdraw_amount |
| `blue_whale_sgd` | Master transaction data SGD | ~3M | Same as MYR |
| `blue_whale_usc` | Master transaction data USC | ~2M | Same as MYR |
| `new_register` | New user registration data | ~500K | userkey, first_deposit_date, registration_date |

### **8.2. Target System Tables**

| Table | Purpose | Rows | Key Columns |
|-------|---------|------|-------------|
| `bp_target` | Target values per currency/quarter/brand | ~100 | currency, line, year, quarter, target_ggr, forecast_ggr |
| `bp_target_audit_log` | Audit trail for target changes | ~1K | target_id, action, old_value, new_value, changed_by, changed_at |

### **8.3. Admin System Tables**

| Table | Purpose | Rows | Key Columns |
|-------|---------|------|-------------|
| `activity_logs` | User activity tracking | ~10K | user_email, page, action, timestamp, ip_address |
| `page_visibility` | Page ON/OFF control | ~37 | page_name, is_enabled, currency |
| `feedback` | User feedback | ~50 | user_email, page, message, status, created_at |

---

## 9. PERFORMANCE STRATEGY

### **9.1. Frontend Optimization**

- ✅ **Code Splitting:** Next.js automatic code splitting per page
- ✅ **Lazy Loading:** Charts loaded on-demand
- ✅ **Memoization:** React.memo untuk expensive components
- ✅ **Debouncing:** Filter changes debounced 300ms
- ✅ **Pagination:** Modal tables dengan pagination (100 rows/page)
- ✅ **Virtual Scrolling:** Long lists dengan virtual scrolling

### **9.2. Backend Optimization**

- ✅ **Materialized Views:** Pre-calculated aggregates
- ✅ **Indexes:** 15+ indexes untuk fast lookups
- ✅ **Connection Pooling:** Supabase connection pooling
- ✅ **Caching:** Browser caching untuk static assets
- ✅ **Parallel Queries:** Multiple Promise.all untuk concurrent queries

### **9.3. Performance Targets**

| Metric | Target | Actual |
|--------|--------|--------|
| **Page Load (First Contentful Paint)** | <1.5s | ~1.2s ✅ |
| **API Response (Quarterly Mode)** | <300ms | ~150-250ms ✅ |
| **API Response (Daily Mode)** | <500ms | ~200-500ms ✅ |
| **Chart Rendering** | <200ms | ~100-150ms ✅ |
| **Modal Load** | <1s | ~500-800ms ✅ |
| **CSV Export (1000 rows)** | <3s | ~2s ✅ |

---

## 10. DEPLOYMENT

### **10.1. Production Environment**

- **Hosting:** Vercel (Hobby Plan → Production Plan)
- **Domain:** nexmax-dashboard.vercel.app (custom domain coming soon)
- **Database:** Supabase Cloud (Pro Plan)
- **CDN:** Vercel Edge Network (Global)
- **SSL:** Automatic SSL via Vercel
- **Environment:** Production (with staging branch)

### **10.2. Environment Variables**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# App Config
NEXT_PUBLIC_APP_URL=https://nexmax-dashboard.vercel.app
NODE_ENV=production
```

### **10.3. Deployment Process**

```bash
# 1. Push ke main branch
git add .
git commit -m "feat: your feature"
git push origin main

# 2. Vercel auto-deploy (triggered by push)
#    - Build takes ~2-3 minutes
#    - Auto-preview on PR
#    - Auto-production on main branch

# 3. Database migration (if needed)
#    - Run SQL scripts via Supabase Dashboard
#    - Refresh MVs: REFRESH MATERIALIZED VIEW bp_quarter_summary_myr;
```

### **10.4. Monitoring & Maintenance**

- **Vercel Analytics:** Traffic, performance, errors
- **Supabase Dashboard:** Database metrics, query performance
- **Activity Logs:** User activity tracking in-app
- **Feedback System:** User feedback collection in-app

---

## 📚 RELATED DOCUMENTATION

- [API Routes Inventory](./API_ROUTES_INVENTORY.md)
- [Components Library](./COMPONENTS_LIBRARY.md)
- [Business Performance Standard](./docs/BUSINESS_PERFORMANCE_STANDARD.md)
- [BP MV Logic Summary](./docs/BP_MV_LOGIC_SUMMARY.md)
- [Setup Guide](./SETUP-GUIDE.md)
- [README](./README.md)

---

## 📝 VERSION HISTORY

### **v2.0 (2025-10-27) - Current**
- ✅ Complete project documentation update
- ✅ Fixed BP_MV_LOGIC_SUMMARY.md (corrected Quarterly Mode info)
- ✅ Added comprehensive project overview

### **v1.0 (2025-10-20)**
- ✅ Initial production release
- ✅ All 37 pages completed
- ✅ Target system implemented
- ✅ Admin panels completed

---

**END OF DOCUMENT**

