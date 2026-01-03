# 📊 RESEARCH REPORT: Implementasi Role SNR (Marketing) di NEXMAX Dashboard

**Tanggal:** 2025-01-XX  
**Status:** Research & Feasibility Analysis  
**Tujuan:** Analisa implementasi role SNR dengan account fixed dan handler yang bisa di-update

---

## 📋 EXECUTIVE SUMMARY

Implementasi role SNR **SANGAT MEMUNGKINKAN** dan **FEASIBLE** berdasarkan:
1. ✅ Project sudah punya pattern yang mirip (Squad Lead dengan `allowed_brands`)
2. ✅ Database schema flexible (blue_whale tables bisa di-alter)
3. ✅ User management system sudah support role-based creation
4. ✅ Assignment system sudah ada (handler assignment di Business Performance)
5. ✅ Best practices RBAC sudah diimplementasikan

**Rekomendasi:** Implementasi bisa dilakukan dengan pendekatan **incremental** dan **modern**, mengikuti pattern yang sudah ada.

---

## 🔍 1. RESEARCH GLOBAL (Best Practices)

### 1.1 Role-Based Access Control (RBAC) Best Practices

**Key Principles:**
- **Separation of Concerns:** Account (fixed) vs Handler (mutable)
- **Principle of Least Privilege:** SNR hanya lihat data yang di-assign ke mereka
- **Audit Trail:** Track siapa yang assign dan kapan
- **Scalability:** Support multiple SNR per brand/line

**Modern Approach:**
- ✅ Account-based filtering (fixed identifier)
- ✅ Metadata tracking (handler, assigned_by, assigned_at)
- ✅ Auto-filtering based on session
- ✅ Flexible assignment management

### 1.2 Multi-Tenant Database Design

**Pattern yang Cocok:**
```
Account (Fixed) → Multiple Handlers (Over Time)
- snr_account: "SNR01_SBKH" (FIXED)
- snr_handler: "Andi" → "Budi" → "Sari" (MUTABLE)
```

**Benefits:**
- ✅ Historical tracking tetap konsisten
- ✅ Easy handler replacement
- ✅ Account-based filtering tetap stabil

---

## 🔍 2. RESEARCH PROJECT-SPECIFIC

### 2.1 Struktur Role yang Ada

**File:** `utils/rolePermissions.ts`

**Pattern yang Sudah Ada:**
```typescript
'squad_lead_myr': {
  id: 'squad_lead_myr',
  name: 'squad_lead_myr',
  displayName: 'Squad Lead MYR',
  permissions: ['myr'],
  canAccessUserManagement: false,
  isReadOnly: true,
  allowedBrands: null // Populated from database
}
```

**Kesimpulan:** Pattern Squad Lead bisa di-replicate untuk SNR dengan:
- ✅ Role per market: `snr_myr`, `snr_sgd`, `snr_usc`
- ✅ `allowed_brands` untuk brand filtering (optional)
- ✅ Read-only access

### 2.2 User Management System

**File:** `app/users/page.tsx`

**Fitur yang Sudah Ada:**
- ✅ Create user dengan role
- ✅ Edit user (termasuk role dan allowed_brands)
- ✅ Market-based brand selection (MYR/SGD/USC)
- ✅ Validation untuk Squad Lead (min 1 brand)

**Kesimpulan:** User management sudah support:
- ✅ Role creation untuk SNR
- ✅ Account creation (username = snr_account)
- ✅ Brand assignment (optional untuk SNR)

### 2.3 Database Schema - Blue Whale Tables

**Pattern yang Sudah Ada:**
```sql
-- Squad Lead column (auto-update via trigger)
ALTER TABLE blue_whale_usc ADD COLUMN squad_lead VARCHAR(50);
CREATE INDEX idx_blue_whale_usc_squad_lead ON blue_whale_usc(squad_lead);
```

**Kesimpulan:** Database schema sangat flexible:
- ✅ Bisa tambah kolom baru (IF NOT EXISTS pattern)
- ✅ Support indexing untuk performance
- ✅ Trigger untuk auto-update (optional)
- ✅ Pattern sudah proven untuk production

### 2.4 Assignment System yang Ada

**File:** `app/api/usc-business-performance/save-assignment/route.ts`

**Current Implementation:**
- ✅ Save assignment ke `customer_assignments` table
- ✅ Support handler assignment
- ✅ Period-based assignment (period_a, period_b)

**Kesimpulan:** Assignment system bisa di-extend untuk:
- ✅ Update `snr_account` dan `snr_handler` di blue_whale tables
- ✅ Track `snr_assigned_by` dan `snr_assigned_at`
- ✅ Support bulk assignment

### 2.5 Page Structure & Filtering

**Pattern yang Sudah Ada:**
- ✅ Customer Retention pages (filter by line, year, month)
- ✅ Business Performance pages (filter by tier, line, squad_lead)
- ✅ Auto-filtering based on role (Squad Lead dengan allowed_brands)

**Kesimpulan:** Page structure support:
- ✅ Auto-filtering berdasarkan `snr_account` (session username)
- ✅ Brand/line filtering (optional)
- ✅ Period-based filtering

---

## ✅ 3. FEASIBILITY ANALYSIS

### 3.1 Technical Feasibility: ✅ **SANGAT MEMUNGKINKAN**

**Reasons:**
1. ✅ Database schema flexible (bisa alter table)
2. ✅ Role system sudah mature (pattern Squad Lead)
3. ✅ User management sudah support role creation
4. ✅ Assignment system sudah ada
5. ✅ Filtering mechanism sudah proven

**Risk Level:** 🟢 **LOW**

### 3.2 Implementation Complexity: 🟡 **MEDIUM**

**Complexity Breakdown:**
- **Database Changes:** 🟢 LOW (add columns, indexes)
- **Role System:** 🟢 LOW (follow Squad Lead pattern)
- **User Management:** 🟢 LOW (extend existing UI)
- **Assignment Flow:** 🟡 MEDIUM (update blue_whale directly)
- **Page Development:** 🟡 MEDIUM (new page dengan filtering)
- **Testing:** 🟡 MEDIUM (multiple scenarios)

**Estimated Effort:** 3-5 days (incremental implementation)

### 3.3 Scalability: ✅ **SCALABLE**

**Support:**
- ✅ Multiple SNR per brand/line
- ✅ Multiple brands per SNR (optional)
- ✅ Handler replacement tanpa impact account
- ✅ Historical tracking tetap konsisten

**Limitations:**
- ⚠️ Index performance (perlu monitoring jika data besar)
- ⚠️ Bulk update performance (perlu batch processing)

### 3.4 Maintainability: ✅ **MAINTAINABLE**

**Reasons:**
- ✅ Follow existing patterns (Squad Lead)
- ✅ Clear separation (account vs handler)
- ✅ Consistent with project standards
- ✅ Well-documented approach

---

## 🎯 4. IMPLEMENTATION RECOMMENDATIONS

### 4.1 Database Schema Changes

**File:** `scripts/add-snr-columns-to-blue-whale.sql`

**Kolom yang Perlu Ditambahkan:**
```sql
-- Untuk blue_whale_usc, blue_whale_sgd, blue_whale_myr
ALTER TABLE blue_whale_usc
  ADD COLUMN IF NOT EXISTS snr_account VARCHAR(100),      -- Account fixed (SNR01_SBKH)
  ADD COLUMN IF NOT EXISTS snr_handler VARCHAR(100),      -- Handler name (Andi, Budi, etc)
  ADD COLUMN IF NOT EXISTS snr_assigned_at TIMESTAMP,    -- Kapan di-assign
  ADD COLUMN IF NOT EXISTS snr_assigned_by VARCHAR(100); -- Username yang assign

-- Indexes untuk performance
CREATE INDEX IF NOT EXISTS idx_blue_whale_usc_snr_account 
  ON blue_whale_usc(snr_account) 
  WHERE snr_account IS NOT NULL;
```

**Benefits:**
- ✅ Fast filtering by snr_account
- ✅ Historical tracking
- ✅ Easy handler replacement

### 4.2 Role System Implementation

**File:** `utils/rolePermissions.ts`

**Tambahkan Role SNR:**
```typescript
'snr_myr': {
  id: 'snr_myr',
  name: 'snr_myr',
  displayName: 'SNR Marketing MYR',
  permissions: ['myr'],
  canAccessUserManagement: false,
  isReadOnly: true,
  allowedBrands: null // Optional: untuk brand filtering
},
'snr_sgd': { /* ... */ },
'snr_usc': { /* ... */ }
```

**Update Functions:**
- ✅ `getDefaultPageByRole()` → redirect ke `/myr/snr-customers`
- ✅ `hasPermission()` → support SNR pages
- ✅ `isSquadLead()` → tambah `isSNR()` helper

### 4.3 User Management Extension

**File:** `app/users/page.tsx`

**Changes Needed:**
1. ✅ Add SNR roles to role dropdown
2. ✅ Support SNR account creation (username = snr_account)
3. ✅ Optional: brand assignment (jika perlu brand filtering)
4. ✅ Validation: SNR account format (SNR01_SBKH pattern)

**UI Enhancement:**
- ✅ Show SNR account format hint
- ✅ Handler field (optional, bisa di-update later)
- ✅ Market selection (MYR/SGD/USC)

### 4.4 Assignment Flow Implementation

**Option A: Update Blue Whale Directly (Recommended)**
```typescript
// Manager/Squad Lead assign customer
UPDATE blue_whale_usc
SET 
  snr_account = 'SNR01_SBKH',
  snr_handler = 'Andi',
  snr_assigned_at = NOW(),
  snr_assigned_by = current_user.username
WHERE unique_code = 'CUSTOMER123';
```

**Option B: Hybrid (Assignment Table + Sync)**
- Save ke `customer_assignments` (existing)
- Sync ke `blue_whale_usc` via trigger/function

**Recommendation:** **Option A** (direct update) karena:
- ✅ Simpler implementation
- ✅ Real-time update
- ✅ No sync complexity

### 4.5 Page Development

**New Page:** `app/[currency]/snr-customers/page.tsx`

**Features:**
- ✅ Auto-filter: `WHERE snr_account = current_user.username`
- ✅ Customer listing (similar to Customer Retention page)
- ✅ Filter by: brand/line, period, tier (optional)
- ✅ Export functionality
- ✅ Handler display (read-only for SNR)

**API Route:** `app/api/[currency]-snr-customers/data/route.ts`
```typescript
// Auto-filter by snr_account
const { data } = await supabase
  .from(`blue_whale_${currency.toLowerCase()}`)
  .select('*')
  .eq('snr_account', currentUser.username) // Auto-filter
  .not('snr_account', 'is', null);
```

### 4.6 Assignment UI Enhancement

**File:** `app/[currency]/business-performance/components/TierMovementCustomerModal.tsx`

**Changes:**
- ✅ Add SNR Account dropdown (list of SNR accounts)
- ✅ Add Handler input field (text, bisa di-update)
- ✅ Show current assignment (if exists)
- ✅ Bulk assignment support (optional)

**UI Flow:**
1. Manager/Squad Lead select customers
2. Select SNR Account (SNR01_SBKH, SNR02_OK188, etc)
3. Enter Handler name (Andi, Budi, etc)
4. Click "Assign" → Update blue_whale table

---

## 📐 5. ARCHITECTURE DESIGN

### 5.1 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Manager/Squad Lead                                         │
│  - Assign customer to SNR                                   │
│  - Update: snr_account, snr_handler, snr_assigned_by       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  blue_whale_usc/sgd/myr                                     │
│  - snr_account: "SNR01_SBKH" (FIXED)                        │
│  - snr_handler: "Andi" (MUTABLE)                           │
│  - snr_assigned_at: timestamp                               │
│  - snr_assigned_by: "manager_usc"                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  SNR Login (snr_account = "SNR01_SBKH")                    │
│  - Auto-filter: WHERE snr_account = 'SNR01_SBKH'           │
│  - Display: All customers assigned to SNR01_SBKH           │
│  - Handler: Show current handler (read-only)               │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Database Schema

```sql
-- blue_whale_usc/sgd/myr
CREATE TABLE blue_whale_usc (
  -- ... existing columns ...
  snr_account VARCHAR(100),      -- Account fixed (SNR01_SBKH)
  snr_handler VARCHAR(100),       -- Handler name (Andi, Budi)
  snr_assigned_at TIMESTAMP,     -- Assignment timestamp
  snr_assigned_by VARCHAR(100),  -- Username who assigned
  -- ... other columns ...
);

-- Indexes
CREATE INDEX idx_blue_whale_usc_snr_account 
  ON blue_whale_usc(snr_account) 
  WHERE snr_account IS NOT NULL;
```

### 5.3 Role Hierarchy

```
Executive
  ├── Manager (MYR/SGD/USC)
  │     ├── Squad Lead (Brand-specific)
  │     │     └── SNR (Account-based, Handler-mutable)
  │     └── SQ
  └── Analyst/Ops
```

---

## 🚀 6. IMPLEMENTATION PHASES

### Phase 1: Database & Role Setup (Day 1)
- ✅ Add SNR columns to blue_whale tables
- ✅ Create indexes
- ✅ Add SNR roles to rolePermissions.ts
- ✅ Update role helper functions

### Phase 2: User Management (Day 2)
- ✅ Add SNR role support in user management
- ✅ SNR account creation UI
- ✅ Validation & formatting

### Phase 3: Assignment Flow (Day 3)
- ✅ Update Business Performance modal
- ✅ Add SNR assignment UI
- ✅ API route untuk update blue_whale
- ✅ Handler update functionality

### Phase 4: SNR Page Development (Day 4-5)
- ✅ Create SNR customers page
- ✅ API route dengan auto-filtering
- ✅ Customer listing & export
- ✅ Filtering & pagination

### Phase 5: Testing & Refinement (Day 6)
- ✅ Test assignment flow
- ✅ Test SNR page filtering
- ✅ Test handler replacement
- ✅ Performance testing

---

## ⚠️ 7. CONSIDERATIONS & RISKS

### 7.1 Performance Considerations

**Potential Issues:**
- ⚠️ Index performance jika data sangat besar
- ⚠️ Bulk update performance (jika assign banyak customer sekaligus)

**Mitigation:**
- ✅ Use batch updates (limit 1000 per batch)
- ✅ Monitor index performance
- ✅ Consider partitioning jika perlu

### 7.2 Data Consistency

**Potential Issues:**
- ⚠️ Handler update harus update semua records dengan snr_account yang sama
- ⚠️ Account vs Handler mismatch

**Mitigation:**
- ✅ Use transaction untuk bulk updates
- ✅ Validation: handler harus sesuai dengan account
- ✅ Audit trail untuk tracking changes

### 7.3 Security Considerations

**Potential Issues:**
- ⚠️ SNR bisa lihat data customer yang di-assign ke mereka
- ⚠️ Manager/Squad Lead bisa assign ke SNR manapun

**Mitigation:**
- ✅ Role-based access control (RBAC)
- ✅ Auto-filtering based on session
- ✅ Audit trail untuk assignment changes

---

## 📊 8. SUCCESS METRICS

### 8.1 Functional Requirements
- ✅ SNR bisa login dengan account mereka
- ✅ SNR hanya lihat customer yang di-assign ke mereka
- ✅ Manager/Squad Lead bisa assign customer ke SNR
- ✅ Handler bisa di-update tanpa mengubah account
- ✅ Multiple SNR per brand/line supported

### 8.2 Performance Requirements
- ✅ Page load time < 2 seconds
- ✅ Filter response time < 500ms
- ✅ Bulk assignment < 5 seconds per 1000 records

### 8.3 Usability Requirements
- ✅ Intuitive assignment flow
- ✅ Clear handler display
- ✅ Easy handler replacement

---

## 🎯 9. CONCLUSION

### 9.1 Feasibility: ✅ **HIGHLY FEASIBLE**

Implementasi role SNR **SANGAT MEMUNGKINKAN** karena:
1. ✅ Project sudah punya pattern yang mirip (Squad Lead)
2. ✅ Database schema flexible
3. ✅ User management system mature
4. ✅ Assignment system sudah ada
5. ✅ Best practices RBAC sudah diimplementasikan

### 9.2 Recommendation: ✅ **PROCEED WITH IMPLEMENTATION**

**Approach:**
- ✅ Follow existing patterns (Squad Lead)
- ✅ Incremental implementation (phase by phase)
- ✅ Modern & responsive design
- ✅ Flexible & scalable architecture

### 9.3 Next Steps

1. **Review & Approval:** Review dokumen ini dengan stakeholder
2. **Database Setup:** Run migration scripts untuk add columns
3. **Role Implementation:** Add SNR roles ke system
4. **User Management:** Extend UI untuk SNR account creation
5. **Assignment Flow:** Implement assignment di Business Performance
6. **Page Development:** Create SNR customers page
7. **Testing:** Comprehensive testing
8. **Deployment:** Production deployment

---

## 📚 10. REFERENCES

### Project Files
- `utils/rolePermissions.ts` - Role system
- `app/users/page.tsx` - User management
- `app/usc/business-performance/components/TierMovementCustomerModal.tsx` - Assignment UI
- `scripts/add-squad-lead-to-blue-whale-usc.sql` - Database pattern
- `app/api/usc-business-performance/save-assignment/route.ts` - Assignment API

### Best Practices
- RBAC Best Practices (webpeak.org)
- Multi-tenant Database Design
- Role-Based Access Control in Web Applications

---

**Status:** ✅ **READY FOR IMPLEMENTATION**  
**Risk Level:** 🟢 **LOW**  
**Complexity:** 🟡 **MEDIUM**  
**Estimated Time:** 3-5 days (incremental)

