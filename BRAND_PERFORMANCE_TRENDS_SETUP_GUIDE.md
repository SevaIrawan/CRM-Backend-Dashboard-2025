# 📊 BRAND PERFORMANCE TRENDS - SGD & USC SETUP

**Date:** October 14, 2025  
**Status:** ✅ **STRUCTURE CREATED** - Ready for implementation  
**Pages Created:** 2 pages (SGD + USC)  
**API Routes Created:** 6 routes (3 per currency)

---

## ✅ COMPLETED SETUP

### **1. SGD Brand Performance Trends**

#### Page Created:
```
✅ app/sgd/brand-performance-trends/page.tsx
```
- Status: Coming Soon template
- Layout: Standard 3-row layout
- Components: Using StandardPageTemplate
- SubHeader: With page title

#### API Routes Created:
```
✅ app/api/sgd-brand-performance-trends/slicer-options/route.ts
✅ app/api/sgd-brand-performance-trends/data/route.ts
✅ app/api/sgd-brand-performance-trends/customer-details/route.ts
```

---

### **2. USC Brand Performance Trends**

#### Page Created:
```
✅ app/usc/brand-performance-trends/page.tsx
```
- Status: Coming Soon template
- Layout: Standard 3-row layout
- Components: Using StandardPageTemplate
- SubHeader: With page title

#### API Routes Created:
```
✅ app/api/usc-brand-performance-trends/slicer-options/route.ts
✅ app/api/usc-brand-performance-trends/data/route.ts
✅ app/api/usc-brand-performance-trends/customer-details/route.ts
```

---

## 📋 FILE STRUCTURE

```
NexMax-Dashboard/
├── app/
│   ├── sgd/
│   │   ├── member-analytic/page.tsx
│   │   └── brand-performance-trends/page.tsx  ✅ NEW
│   │
│   ├── usc/
│   │   ├── member-analytic/page.tsx
│   │   └── brand-performance-trends/page.tsx  ✅ NEW
│   │
│   └── api/
│       ├── sgd-brand-performance-trends/      ✅ NEW
│       │   ├── slicer-options/route.ts
│       │   ├── data/route.ts
│       │   └── customer-details/route.ts
│       │
│       └── usc-brand-performance-trends/      ✅ NEW
│           ├── slicer-options/route.ts
│           ├── data/route.ts
│           └── customer-details/route.ts
```

---

## 🔄 NEXT STEPS - IMPLEMENTATION GUIDE

### **Phase 1: Copy dari MYR (Manual by User)**

User akan copy konten dari MYR version ke SGD dan USC:

**Source Files (MYR):**
```
📄 app/myr/brand-performance-trends/page.tsx
📄 app/api/myr-brand-performance-trends/slicer-options/route.ts
📄 app/api/myr-brand-performance-trends/data/route.ts
📄 app/api/myr-brand-performance-trends/customer-details/route.ts
```

**Target Files:**

**For SGD:**
```
📄 app/sgd/brand-performance-trends/page.tsx
📄 app/api/sgd-brand-performance-trends/slicer-options/route.ts
📄 app/api/sgd-brand-performance-trends/data/route.ts
📄 app/api/sgd-brand-performance-trends/customer-details/route.ts
```

**For USC:**
```
📄 app/usc/brand-performance-trends/page.tsx
📄 app/api/usc-brand-performance-trends/slicer-options/route.ts
📄 app/api/usc-brand-performance-trends/data/route.ts
📄 app/api/usc-brand-performance-trends/customer-details/route.ts
```

---

### **Phase 2: Adjust Source Tables (By AI Assistant)**

Setelah user copy, AI Assistant akan adjust table references:

#### **SGD Adjustments:**
```typescript
// Change from:
.from('blue_whale_myr')
.eq('currency', 'MYR')

// To:
.from('blue_whale_sgd')  // ⚠️ Verify table name
.eq('currency', 'SGD')
```

```typescript
// Change from:
.from('blue_whale_myr_summary')

// To:
.from('blue_whale_sgd_summary')  // ⚠️ Verify table name
```

#### **USC Adjustments:**
```typescript
// Change from:
.from('blue_whale_myr')
.eq('currency', 'MYR')

// To:
.from('blue_whale_usc')  // ⚠️ Verify table name
.eq('currency', 'USC')
```

```typescript
// Change from:
.from('blue_whale_myr_summary')

// To:
.from('blue_whale_usc_summary')  // ⚠️ Verify table name
```

---

## 📌 KEY CHANGES REQUIRED

### **1. API Routes - Table References**

**slicer-options/route.ts:**
- Change table name
- Change currency filter
- Update console log messages

**data/route.ts:**
- Change master table reference
- Change MV/summary table reference
- Change currency filter throughout
- Update console log messages
- Verify column names match

**customer-details/route.ts:**
- Change master table reference
- Change currency filter
- Update console log messages

---

### **2. Page Component - API Endpoints**

**page.tsx:**
```typescript
// Change API endpoints from:
fetch('/api/myr-brand-performance-trends/...')

// SGD to:
fetch('/api/sgd-brand-performance-trends/...')

// USC to:
fetch('/api/usc-brand-performance-trends/...')
```

**Currency locked:**
```typescript
// SGD:
const selectedCurrency = 'SGD'

// USC:
const selectedCurrency = 'USC'
```

---

## ⚠️ IMPORTANT NOTES

### **1. Source Table Names**

**⚠️ VERIFY** these table names exist in Supabase:
- `blue_whale_sgd` (or actual SGD table name)
- `blue_whale_sgd_summary` (or actual SGD summary table)
- `blue_whale_usc` (or actual USC table name)
- `blue_whale_usc_summary` (or actual USC summary table)

**If different, adjust accordingly!**

---

### **2. Column Names**

Verify these columns exist in SGD and USC tables:
- `date`
- `currency`
- `line` (brand)
- `userkey`
- `unique_code`
- `deposit_amount`
- `deposit_cases`
- `withdraw_amount`
- `withdraw_cases`
- `net_profit`
- `ggr`

**If column names differ, adjust queries!**

---

### **3. Currency Values**

Make sure currency values in database match:
- SGD table has `currency = 'SGD'`
- USC table has `currency = 'USC'`

---

## 🎯 IMPLEMENTATION CHECKLIST

### **Before Starting:**
- [ ] Verify SGD source table exists in Supabase
- [ ] Verify USC source table exists in Supabase
- [ ] Verify column names in both tables
- [ ] Backup current working code (already done ✅)

### **For SGD:**
- [ ] User copies MYR page.tsx to SGD
- [ ] User copies MYR API routes to SGD
- [ ] AI adjusts table references to SGD
- [ ] Test slicer-options API
- [ ] Test data API
- [ ] Test customer-details API
- [ ] Test page loads correctly
- [ ] Verify charts display correctly

### **For USC:**
- [ ] User copies MYR page.tsx to USC
- [ ] User copies MYR API routes to USC
- [ ] AI adjusts table references to USC
- [ ] Test slicer-options API
- [ ] Test data API
- [ ] Test customer-details API
- [ ] Test page loads correctly
- [ ] Verify charts display correctly

---

## 🚀 TESTING PROCEDURE

### **1. Test API Routes:**

```bash
# Test SGD slicer-options
curl http://localhost:3000/api/sgd-brand-performance-trends/slicer-options

# Test USC slicer-options
curl http://localhost:3000/api/usc-brand-performance-trends/slicer-options
```

### **2. Test Pages:**

```
SGD: http://localhost:3000/sgd/brand-performance-trends
USC: http://localhost:3000/usc/brand-performance-trends
```

Expected: Coming Soon template displays correctly

### **3. After Implementation:**

- Verify date slicers load correctly
- Verify period comparisons work
- Verify charts display data
- Verify customer detail modal opens
- Verify export functionality works

---

## 📝 NOTES

### **Current Status:**
- ✅ File structure created
- ✅ Coming Soon pages active
- ✅ API route structure ready
- ⚠️ TODO comments in place
- ⚠️ Awaiting MYR content copy

### **Placeholder Status:**
All API routes currently return placeholder data with TODO comments indicating:
1. What needs to be copied
2. What needs to be adjusted
3. Source table references to change

### **Safety:**
- Original MYR version untouched ✅
- Full backup available ✅
- Easy rollback if needed ✅

---

## 🔗 RELATED FILES

**Reference (MYR):**
- `app/myr/brand-performance-trends/page.tsx` - Full implementation
- `app/api/myr-brand-performance-trends/*` - Working API routes

**New (SGD):**
- `app/sgd/brand-performance-trends/page.tsx` - Coming Soon template
- `app/api/sgd-brand-performance-trends/*` - Placeholder routes

**New (USC):**
- `app/usc/brand-performance-trends/page.tsx` - Coming Soon template
- `app/api/usc-brand-performance-trends/*` - Placeholder routes

---

## 📞 WHEN READY TO IMPLEMENT

Tell AI Assistant:
```
"Ready to implement SGD/USC Brand Performance Trends. 
I've copied the MYR code to SGD/USC files. 
Please adjust table references accordingly."
```

AI will then:
1. Scan copied files
2. Identify all table references
3. Adjust for SGD/USC
4. Verify currency filters
5. Update console logs
6. Test implementations

---

**Setup Status:** ✅ **COMPLETE**  
**Implementation Status:** ⏳ **AWAITING USER COPY**  
**Next Action:** User copies MYR content, then AI adjusts

---

**Created By:** AI Assistant (Claude Sonnet 4.5)  
**Date:** October 14, 2025

