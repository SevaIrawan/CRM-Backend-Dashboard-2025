# API ROUTES INVENTORY - NEXMAX DASHBOARD

**Last Updated:** 2025-10-27  
**Total Endpoints:** 87  
**Status:** Production

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [MYR APIs (43 endpoints)](#myr-apis)
3. [SGD APIs (27 endpoints)](#sgd-apis)
4. [USC APIs (27 endpoints)](#usc-apis)
5. [Admin & System APIs (9 endpoints)](#admin--system-apis)
6. [API Standards](#api-standards)

---

## OVERVIEW

### **API Distribution by Currency:**

| Currency | Endpoints | Percentage |
|----------|-----------|------------|
| **MYR** | 43 | 49% |
| **SGD** | 27 | 31% |
| **USC** | 27 | 31% |
| **Admin/System** | 9 | 10% |
| **TOTAL** | **87** | **100%** |

### **API Categories:**

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Business Performance** | 7 | Main analytics (data, slicer-options, active-member-details, target CRUD) |
| **Overview** | 6 | Dashboard KPIs & charts |
| **Brand Performance Trends** | 9 | Brand-level analytics |
| **Customer Retention** | 9 | Retention analysis |
| **Churn Member** | 9 | Churn tracking |
| **Member Report** | 9 | Member-level reports |
| **KPI Comparison** | 6 | Side-by-side comparisons |
| **Auto Approval** | 8 | Approval monitoring |
| **AIA Candy Tracking** | 4 | Candy distribution |
| **Overall Label** | 4 | Label analytics (MYR only) |
| **Member Analytic** | 5 | Advanced segmentation (USC only) |
| **Activity Logs** | 4 | System logging |
| **Feedback** | 2 | User feedback |
| **Page Visibility** | 3 | Page control |
| **Target Audit Log** | 1 | Audit trail |

---

## MYR APIs

### **1. Business Performance (7 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/myr-business-performance/data` | GET | 46 KPIs + 11 charts + daily avg + MoM | 150-250ms |
| `/api/myr-business-performance/slicer-options` | GET | Years, quarters, brands, date ranges | <50ms |
| `/api/myr-business-performance/active-member-details` | GET | Member drill-down dengan pagination | 200-500ms |
| `/api/myr-business-performance/target-achieve-details` | GET | Target breakdown per brand | 100-200ms |
| `/api/myr-business-performance/target` | GET | Get single target | <50ms |
| `/api/myr-business-performance/target/list` | GET | Get all targets for year | <50ms |
| `/api/myr-business-performance/target/update` | POST | Create/update target dengan audit | 100-200ms |

**Key Features:**
- ✅ 2 modes: Daily & Quarterly
- ✅ Real-time KPI calculation
- ✅ Pre-calculated trend KPIs from MV
- ✅ Role-based target editing
- ✅ Audit trail untuk semua changes

---

### **2. Overview (2 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/myr-overview/chart-data` | GET | Dashboard charts (6 charts) | 100-200ms |
| `/api/myr-overview/slicer-options` | GET | Filter options | <50ms |

---

### **3. Brand Performance Trends (3 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/myr-brand-performance-trends/data` | GET | Brand trends + charts | 200-400ms |
| `/api/myr-brand-performance-trends/slicer-options` | GET | Filter options | <50ms |
| `/api/myr-brand-performance-trends/customer-details` | GET | Customer drill-down | 200-500ms |

---

### **4. Customer Retention (3 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/myr-customer-retention/data` | GET | Retention metrics + analysis | 200-400ms |
| `/api/myr-customer-retention/slicer-options` | GET | Filter options | <50ms |
| `/api/myr-customer-retention/export` | GET | CSV export | 1-3s |

---

### **5. Churn Member (3 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/myr-churn-member/data` | GET | Churn tracking + analysis | 200-400ms |
| `/api/myr-churn-member/slicer-options` | GET | Filter options | <50ms |
| `/api/myr-churn-member/export` | GET | CSV export | 1-3s |

---

### **6. Member Report (3 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/myr-member-report/data` | GET | Member-level reports | 200-500ms |
| `/api/myr-member-report/slicer-options` | GET | Filter options | <50ms |
| `/api/myr-member-report/export` | GET | CSV export | 1-3s |

---

### **7. KPI Comparison (2 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/myr-kpi-comparison/data` | GET | Side-by-side KPI comparison | 100-200ms |
| `/api/myr-kpi-comparison/slicer-options` | GET | Filter options | <50ms |

---

### **8. Overall Label (4 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/myr-overall-label/data` | GET | Label-based analytics data | 200-400ms |
| `/api/myr-overall-label/kpis` | GET | Label KPIs | 100-200ms |
| `/api/myr-overall-label/slicer-options` | GET | Filter options | <50ms |
| `/api/myr-overall-label/export` | GET | CSV export | 1-3s |

---

### **9. Auto Approval Monitor (4 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/myr-auto-approval-monitor/data` | GET | Approval monitoring data | 200-400ms |
| `/api/myr-auto-approval-monitor/slicer-options` | GET | Filter options | <50ms |
| `/api/myr-auto-approval-monitor/overdue-details` | GET | Overdue drill-down | 200-500ms |
| `/api/myr-auto-approval-monitor/export` | GET | CSV export | 1-3s |

---

### **10. Auto Approval Withdraw (4 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/myr-auto-approval-withdraw/data` | GET | Withdrawal approval data | 200-400ms |
| `/api/myr-auto-approval-withdraw/slicer-options` | GET | Filter options | <50ms |
| `/api/myr-auto-approval-withdraw/overdue-details` | GET | Overdue drill-down | 200-500ms |
| `/api/myr-auto-approval-withdraw/export` | GET | CSV export | 1-3s |

---

### **11. AIA Candy Tracking (2 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/aia-candy-tracking/data` | GET | Candy distribution tracking (shared) | 200-400ms |
| `/api/aia-candy-tracking/slicer-options` | GET | Filter options (shared) | <50ms |

---

## SGD APIs

**Note:** SGD APIs have the same structure as MYR, with `sgd-` prefix instead of `myr-`.

### **Total SGD Endpoints: 27**

| Module | Endpoints |
|--------|-----------|
| Business Performance | 7 |
| Overview | 2 |
| Brand Performance Trends | 3 |
| Customer Retention | 3 |
| Churn Member | 3 |
| Member Report | 3 |
| KPI Comparison | 2 |
| Auto Approval Monitor | 4 |
| AIA Candy Tracking | 2 (shared) |

**SGD-specific endpoints:**

- `/api/sgd-business-performance/*` (7 endpoints)
- `/api/sgd-overview/*` (2 endpoints)
- `/api/sgd-brand-performance-trends/*` (3 endpoints)
- `/api/sgd-customer-retention/*` (3 endpoints)
- `/api/sgd-churn-member/*` (3 endpoints)
- `/api/sgd-member-report/*` (3 endpoints)
- `/api/sgd-kpi-comparison/*` (2 endpoints)
- `/api/sgd-auto-approval-monitor/*` (4 endpoints)
- `/api/sgd-aia-candy-tracking/*` (2 endpoints)

---

## USC APIs

**Note:** USC APIs similar to MYR/SGD, with `usc-` prefix. USC has **Member Analytic** page yang tidak ada di MYR/SGD.

### **Total USC Endpoints: 27**

| Module | Endpoints |
|--------|-----------|
| Business Performance | 7 |
| Overview | 2 |
| Brand Performance Trends | 3 |
| Customer Retention | 3 |
| Churn Member | 3 |
| Member Report | 3 |
| KPI Comparison | 2 |
| Auto Approval Monitor | 4 |
| **Member Analytic** | 5 (USC only) |

**USC-specific endpoints:**

- `/api/usc-business-performance/*` (7 endpoints)
- `/api/usc-overview/*` (2 endpoints)
- `/api/usc-brand-performance-trends/*` (3 endpoints)
- `/api/usc-customer-retention/*` (3 endpoints)
- `/api/usc-churn-member/*` (3 endpoints)
- `/api/usc-member-report/*` (3 endpoints)
- `/api/usc-kpi-comparison/*` (2 endpoints)
- `/api/usc-auto-approval-monitor/*` (4 endpoints)
- `/api/usc-member-analytic/*` **(5 endpoints - USC ONLY)**

### **USC Member Analytic (5 endpoints) - UNIQUE TO USC**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/usc-member-analytic/kpi-data` | GET | Advanced member KPIs | 100-200ms |
| `/api/usc-member-analytic/chart-data` | GET | Member analytics charts | 200-400ms |
| `/api/usc-member-analytic/retention-data` | GET | Retention analytics | 200-400ms |
| `/api/usc-member-analytic/slicer-options` | GET | Filter options | <50ms |
| `/api/usc-member-analytic/export` | GET | CSV export | 1-3s |

---

## ADMIN & SYSTEM APIs

### **1. Activity Logs (4 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/activity-logs/data` | GET | Get activity logs dengan pagination | 100-200ms |
| `/api/activity-logs/stats` | GET | Activity statistics | <50ms |
| `/api/activity-logs/log` | POST | Create new activity log | <50ms |
| `/api/activity-logs/export` | GET | CSV export | 1-3s |

---

### **2. Feedback (2 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/feedback/submit` | POST | Submit user feedback | <100ms |
| `/api/feedback/reply` | POST | Admin reply to feedback | <100ms |

---

### **3. Page Visibility (3 endpoints)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/page-visibility` | GET | Get all page visibility status | <50ms |
| `/api/page-visibility/add` | POST | Add new page visibility record | <100ms |
| `/api/page-visibility/toggle` | POST | Toggle page ON/OFF | <100ms |

---

### **4. Target Audit Log (1 endpoint)**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/target-audit-log` | GET | Get target change history | 100-200ms |

---

## API STANDARDS

### **Request Headers**

```typescript
{
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

### **Query Parameters (Standard Filters)**

**Common filters across all data endpoints:**

```typescript
// Currency filter
currency?: "MYR" | "SGD" | "USC"

// Time filters
year?: string          // e.g. "2025"
quarter?: string       // e.g. "Q4"
month?: string         // e.g. "10" (October)
isDateRange?: boolean  // true = daily mode, false = quarterly mode
startDate?: string     // ISO format: "2025-10-01"
endDate?: string       // ISO format: "2025-10-31"

// Other filters
brand?: string         // Brand filter (e.g. "SBMY", "LVMY")
line?: string          // Same as brand
status?: string        // Status filter (depends on page)

// Pagination (for detail endpoints)
page?: number          // Default: 1
limit?: number         // Default: 100
```

### **Response Format (Standard Success)**

```typescript
{
  "success": true,
  "data": {
    // ... response data
  },
  "meta": {
    "timestamp": "2025-10-27T10:30:00Z",
    "dataSource": "bp_quarter_summary_myr",
    "comparisonMode": "QUARTER_TO_QUARTER"
  }
}
```

### **Response Format (Standard Error)**

```typescript
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error description",
  "code": "ERROR_CODE"
}
```

### **HTTP Status Codes**

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET request |
| 201 | Created | Successful POST (create) |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

---

## PERFORMANCE METRICS

### **Response Time Targets:**

| Endpoint Type | Target | Actual (Avg) | Status |
|---------------|--------|--------------|--------|
| **Slicer Options** | <50ms | ~30-40ms | ✅ Excellent |
| **KPI Data (Quarterly)** | <300ms | ~150-250ms | ✅ Good |
| **KPI Data (Daily)** | <500ms | ~200-500ms | ✅ Acceptable |
| **Chart Data** | <200ms | ~100-150ms | ✅ Excellent |
| **Detail/Drill-down** | <500ms | ~200-500ms | ✅ Acceptable |
| **CSV Export (1K rows)** | <3s | ~1-2s | ✅ Good |
| **Target CRUD** | <200ms | ~100-150ms | ✅ Excellent |
| **Activity Log** | <100ms | ~50-80ms | ✅ Excellent |

---

## OPTIMIZATION STRATEGIES

### **1. Materialized Views (MVs)**

6 MVs untuk pre-calculated aggregates:
- `bp_daily_summary_myr` - Daily aggregates + 7 KPIs
- `bp_quarter_summary_myr` - Quarterly aggregates + member metrics + trend KPIs
- (Same for SGD & USC)

**Benefits:**
- ✅ 90% reduction in query time
- ✅ Consistent performance
- ✅ Reduced database load

### **2. Indexes**

15+ indexes untuk fast lookups:
- Primary keys
- Foreign keys
- Frequently filtered columns (currency, year, quarter, line)
- Date range queries

### **3. Query Optimization**

- ✅ COUNT DISTINCT only when needed
- ✅ Use MV for financial aggregates
- ✅ Parallel queries dengan Promise.all
- ✅ Pagination untuk large datasets
- ✅ Selective column fetching (tidak SELECT *)

### **4. Caching Strategy**

- ✅ Browser caching untuk slicer-options (rarely changes)
- ✅ Server-side caching untuk MV results (planned)
- ✅ CDN caching via Vercel Edge

---

## SECURITY

### **1. Authentication**

- ✅ Session-based authentication via Supabase
- ✅ JWT tokens untuk API calls
- ✅ Automatic token refresh

### **2. Authorization**

- ✅ Role-based access control (RBAC)
- ✅ Currency-specific permissions for managers
- ✅ Admin-only endpoints protected

### **3. Input Validation**

- ✅ Type checking dengan TypeScript
- ✅ Query parameter validation
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection

### **4. Rate Limiting**

- ✅ Vercel automatic rate limiting
- ✅ 100 requests/minute per IP (default)
- ✅ Custom rate limits for heavy endpoints (planned)

---

## MONITORING

### **Tools:**
- **Vercel Analytics:** API performance, errors, traffic
- **Supabase Dashboard:** Database metrics, slow queries
- **Activity Logs:** User actions tracking

### **Key Metrics Tracked:**
- ✅ Response time per endpoint
- ✅ Error rate
- ✅ Traffic volume
- ✅ Database query performance
- ✅ MV refresh time

---

## FUTURE ENHANCEMENTS

### **Planned:**
- [ ] GraphQL API untuk flexible queries
- [ ] WebSocket untuk real-time updates
- [ ] API versioning (v2)
- [ ] Server-side caching dengan Redis
- [ ] Advanced rate limiting per role
- [ ] API documentation dengan Swagger/OpenAPI
- [ ] Automated API testing

---

**END OF DOCUMENT**

