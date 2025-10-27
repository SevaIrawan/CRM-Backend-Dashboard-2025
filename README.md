# 📊 NEXMAX DASHBOARD

**Multi-Currency Analytics Dashboard untuk Gaming Platform**

![Version](https://img.shields.io/badge/version-2.0-blue)
![Status](https://img.shields.io/badge/status-production-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

---

## 🎯 OVERVIEW

NEXMAX Dashboard adalah **comprehensive analytics platform** yang menyediakan real-time insights untuk business performance gaming platform dengan support untuk 3 currencies: **MYR**, **SGD**, dan **USC**.

### **Key Highlights:**
- ✅ **37 Pages** - 13 MYR, 11 SGD, 9 USC, 4 Admin
- ✅ **87 API Endpoints** - RESTful API architecture
- ✅ **46+ KPIs** - Comprehensive business metrics
- ✅ **11 Chart Types** - Interactive data visualization
- ✅ **6 Materialized Views** - Optimized performance
- ✅ **34 Components** - Reusable component library
- ✅ **Role-Based Access** - 6 user roles dengan granular permissions
- ✅ **Production Ready** - Deployed on Vercel + Supabase

---

## 🚀 QUICK START

### **Prerequisites:**
- Node.js 18+
- npm atau yarn
- Supabase account
- Git

### **Installation:**

```bash
# 1. Clone repository
git clone https://github.com/your-org/nexmax-dashboard.git
cd nexmax-dashboard

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local
# Edit .env.local dengan Supabase credentials

# 4. Run development server
npm run dev

# 5. Open browser
http://localhost:3000
```

### **Environment Variables:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 📚 COMPREHENSIVE DOCUMENTATION

Untuk dokumentasi lengkap, silakan lihat:

### **📖 Core Documentation:**
1. **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)** - Complete project overview
2. **[API_ROUTES_INVENTORY.md](./API_ROUTES_INVENTORY.md)** - All 87 API endpoints
3. **[COMPONENTS_LIBRARY.md](./COMPONENTS_LIBRARY.md)** - Component usage guide
4. **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** - Setup & deployment guide

### **📊 Business Performance Documentation:**
5. **[docs/BUSINESS_PERFORMANCE_STANDARD.md](./docs/BUSINESS_PERFORMANCE_STANDARD.md)** - BP standards
6. **[docs/BP_MV_LOGIC_SUMMARY.md](./docs/BP_MV_LOGIC_SUMMARY.md)** - Materialized Views logic
7. **[docs/BP_API_LOGIC_REQUIREMENTS.md](./docs/BP_API_LOGIC_REQUIREMENTS.md)** - API requirements
8. **[docs/BP_COMPARISON_STANDARD.md](./docs/BP_COMPARISON_STANDARD.md)** - Comparison standards
9. **[docs/FORECAST_GGR_SPECIFICATION.md](./docs/FORECAST_GGR_SPECIFICATION.md)** - Forecast GGR formula & implementation
10. **[docs/BP_TARGET_DAILY_MODE_FIX.md](./docs/BP_TARGET_DAILY_MODE_FIX.md)** - Target calculation fixes

### **🎨 UI/UX Standards:**
11. **[NEXMAX_STANDARDS_COMPLETE_REFERENCE.md](./NEXMAX_STANDARDS_COMPLETE_REFERENCE.md)** - UI standards
12. **[SUB_MENU_STANDARD_RULES.md](./SUB_MENU_STANDARD_RULES.md)** - Menu structure
13. **[ICON_SYSTEM_GUIDE.md](./ICON_SYSTEM_GUIDE.md)** - Icon system
14. **[docs/table-chart-popup-standard.md](./docs/table-chart-popup-standard.md)** - Modal standards
15. **[docs/CHART_ZOOM_MODAL_FEATURE.md](./docs/CHART_ZOOM_MODAL_FEATURE.md)** - Chart zoom functionality

---

## 🏗️ PROJECT STRUCTURE

```
NexMax-Dashboard/
│
├── app/                          # Next.js App Router
│   ├── myr/                      # MYR Pages (13 pages)
│   ├── sgd/                      # SGD Pages (11 pages)
│   ├── usc/                      # USC Pages (9 pages)
│   ├── admin/                    # Admin Pages (4 pages)
│   ├── api/                      # API Routes (87 endpoints)
│   ├── dashboard/                # Main Dashboard
│   └── login/                    # Authentication
│
├── components/                   # Component Library (34 components)
│   ├── slicers/                  # Filter Components (7)
│   ├── modals/                   # Modal Components (5)
│   ├── charts/                   # Chart Components (5)
│   └── [other components]/
│
├── lib/                          # Business Logic (16 files)
│   ├── supabase.ts               # Database client
│   ├── businessPerformanceHelper.ts
│   ├── formatHelpers.ts
│   └── [other helpers]/
│
├── utils/                        # Utilities (4 files)
│   ├── centralLogic.ts
│   ├── rolePermissions.ts
│   └── [other utils]/
│
├── docs/                         # Documentation (15 files)
├── scripts/                      # Database Scripts (26 files)
├── styles/                       # Global Styles
└── [config files]/
```

---

## 🎯 KEY FEATURES

### **1. Multi-Currency Support**

| Currency | Pages | Description |
|----------|-------|-------------|
| **MYR** | 13 | Malaysian Ringgit - Full suite |
| **SGD** | 11 | Singapore Dollar - Full suite |
| **USC** | 9 | US Casino - Core features |

### **2. Business Performance Analytics**

- ✅ **46 KPIs** - Comprehensive business metrics
- ✅ **11 Charts** - GGR trends, forecasts, brand contributions
- ✅ **2 Modes** - Daily & Quarterly analysis
- ✅ **Target System** - Target setting & tracking dengan audit trail
- ✅ **Drill-down** - Active member details dengan pagination

### **3. Advanced Features**

- ✅ **Cohort Analysis** - Retention, Reactivation, Churn tracking
- ✅ **Brand Performance** - Per-brand trend analysis
- ✅ **Member Analytics** - Individual member-level insights
- ✅ **Auto Approval Monitor** - Approval process tracking
- ✅ **Activity Logging** - Complete user activity tracking
- ✅ **Feedback System** - In-app feedback collection

---

## 🔐 AUTHENTICATION & ROLES

### **User Roles:**

| Role | Access Level | Description |
|------|--------------|-------------|
| `admin` | Full access | All pages, all currencies, can edit all targets |
| `manager_myr` | MYR only | MYR pages + can edit MYR targets only |
| `manager_sgd` | SGD only | SGD pages + can edit SGD targets only |
| `manager_usc` | USC only | USC pages + can edit USC targets only |
| `viewer` | Read-only | View all pages, cannot edit targets |
| `demo` | Full access | Same as admin, for demo purposes |

### **Role-Based Features:**
- ✅ Dynamic sidebar menu based on role
- ✅ Target editing permissions per currency
- ✅ Admin-only pages (Activity Logs, Page Status)
- ✅ Audit trail untuk all changes

---

## 📊 PERFORMANCE METRICS

### **Response Time:**

| Endpoint Type | Target | Actual | Status |
|---------------|--------|--------|--------|
| Slicer Options | <50ms | ~30-40ms | ✅ Excellent |
| KPI Data (Quarterly) | <300ms | ~150-250ms | ✅ Good |
| KPI Data (Daily) | <500ms | ~200-500ms | ✅ Acceptable |
| Chart Data | <200ms | ~100-150ms | ✅ Excellent |
| Detail Modals | <500ms | ~200-500ms | ✅ Acceptable |

### **Optimization Strategies:**

1. **Materialized Views** - 6 MVs untuk pre-calculated aggregates
2. **Database Indexes** - 15+ indexes untuk fast lookups
3. **Parallel Queries** - Promise.all untuk concurrent fetching
4. **Code Splitting** - Next.js automatic splitting
5. **CDN Caching** - Vercel Edge Network

---

## 🛠️ TECH STACK

### **Frontend:**
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.0
- **Styling:** Tailwind CSS 3.x
- **Charts:** Recharts 2.x
- **UI:** Custom component library

### **Backend:**
- **API:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **ORM:** Supabase Client
- **MVs:** 6 Materialized Views

### **Infrastructure:**
- **Hosting:** Vercel
- **Database:** Supabase Cloud
- **CDN:** Vercel Edge Network
- **Monitoring:** Vercel Analytics + Supabase Dashboard

---

## 📈 DATABASE SCHEMA

### **Master Tables:**
- `blue_whale_myr` - MYR transaction data (~5M rows)
- `blue_whale_sgd` - SGD transaction data (~3M rows)
- `blue_whale_usc` - USC transaction data (~2M rows)
- `new_register` - User registration data (~500K rows)

### **Materialized Views:**
- `bp_daily_summary_myr` - Daily aggregates + 7 pre-calculated KPIs
- `bp_quarter_summary_myr` - Quarterly aggregates + member metrics + trend KPIs
- (Same for SGD & USC)

### **System Tables:**
- `bp_target` - Target values per currency/quarter/brand
- `bp_target_audit_log` - Audit trail for target changes
- `activity_logs` - User activity tracking
- `page_visibility` - Page ON/OFF control
- `feedback` - User feedback

---

## 🎨 UI COMPONENTS

### **Component Categories:**

| Category | Count | Examples |
|----------|-------|----------|
| **Layout** | 4 | Layout, Sidebar, Header, SubHeader |
| **Charts** | 5 | LineChart, BarChart, StackedBarChart, SankeyChart |
| **Cards** | 5 | StatCard, ComparisonStatCard, ProgressBarStatCard |
| **Modals** | 5 | ActiveMemberDetailsModal, TargetEditModal |
| **Slicers** | 7 | YearSlicer, QuarterSlicer, DateRangeSlicer |
| **Utilities** | 8 | Frame, Icons, SkeletonLoader, ActivityTracker |

**Lihat [COMPONENTS_LIBRARY.md](./COMPONENTS_LIBRARY.md) untuk usage guide lengkap.**

---

## 🔄 API ENDPOINTS

### **Total Endpoints:** 87

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **MYR APIs** | 43 | MYR-specific endpoints |
| **SGD APIs** | 27 | SGD-specific endpoints |
| **USC APIs** | 27 | USC-specific endpoints |
| **Admin APIs** | 9 | System & admin endpoints |

**Lihat [API_ROUTES_INVENTORY.md](./API_ROUTES_INVENTORY.md) untuk API documentation lengkap.**

---

## 📦 DEPLOYMENT

### **Production Environment:**
- **URL:** nexmax-dashboard.vercel.app
- **Hosting:** Vercel (Production Plan)
- **Database:** Supabase (Pro Plan)
- **SSL:** Automatic via Vercel
- **CDN:** Global Edge Network

### **Deployment Process:**

   ```bash
# 1. Push ke main branch
git add .
git commit -m "feat: your feature"
git push origin main

# 2. Vercel auto-deploy
# Build takes ~2-3 minutes
# Auto-preview on PR
# Auto-production on main branch

# 3. Database migration (if needed)
# Run SQL scripts via Supabase Dashboard
# Refresh MVs if needed
```

---

## 🧪 TESTING

### **Testing Strategy:**

   ```bash
# Run linter
npm run lint

# Type checking
npm run type-check

# Build test
npm run build

# Run development server
   npm run dev
   ```

---

## 📝 CONTRIBUTION GUIDELINES

### **Development Workflow:**

1. **Create feature branch** dari `main`
2. **Implement changes** dengan proper documentation
3. **Test locally** - verify all functionality
4. **Create PR** dengan descriptive title & description
5. **Code review** by team lead
6. **Merge to main** - auto-deploy ke production

### **Coding Standards:**

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier formatting
- ✅ Component naming: PascalCase
- ✅ File naming: kebab-case
- ✅ Comment critical logic
- ✅ Document API changes

---

## 🔮 FUTURE ROADMAP

### **Planned Features:**

- [ ] **Real-time Updates** - WebSocket integration
- [ ] **Advanced Caching** - Redis integration
- [ ] **GraphQL API** - Flexible data fetching
- [ ] **Mobile App** - React Native
- [ ] **Dark Mode** - Theme switching
- [ ] **Export Features** - PDF/Excel reports
- [ ] **Notifications** - Email/SMS alerts
- [ ] **Advanced Analytics** - ML-powered insights

---

## 🐛 TROUBLESHOOTING

### **Common Issues:**

**1. API Connection Error**
```bash
# Check .env.local file
# Verify Supabase URL & key
# Check network connectivity
```

**2. Slow Query Performance**
```sql
-- Refresh Materialized Views
REFRESH MATERIALIZED VIEW bp_quarter_summary_myr;
```

**3. Build Error**
```bash
# Clear cache
rm -rf .next
npm install
npm run build
```

---

## 📞 SUPPORT

### **Resources:**

- **Documentation:** See all `.md` files in `/docs`
- **API Reference:** [API_ROUTES_INVENTORY.md](./API_ROUTES_INVENTORY.md)
- **Component Guide:** [COMPONENTS_LIBRARY.md](./COMPONENTS_LIBRARY.md)
- **Setup Guide:** [SETUP-GUIDE.md](./SETUP-GUIDE.md)

### **Contact:**

- **Email:** support@nexmax.com
- **Slack:** #nexmax-dashboard
- **GitHub Issues:** [Create Issue](https://github.com/your-org/nexmax-dashboard/issues)

---

## 📄 LICENSE

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 ACKNOWLEDGMENTS

- **Next.js Team** - Amazing framework
- **Supabase Team** - Powerful backend platform
- **Vercel Team** - Seamless deployment
- **Recharts Team** - Beautiful charts
- **Tailwind CSS Team** - Utility-first CSS

---

## 📊 PROJECT STATUS

### **Current Version:** 2.0
### **Status:** 🟢 Production Ready
### **Last Updated:** 2025-10-27

### **Statistics:**
- ✅ 37 Pages implemented
- ✅ 87 API endpoints
- ✅ 34 Components
- ✅ 6 Materialized Views
- ✅ 46+ KPIs tracked
- ✅ 15 Documentation files
- ✅ 100% TypeScript coverage

---

**🎉 Built with ❤️ by NEXMAX Team**
