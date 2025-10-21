# 🎯 BUSINESS PERFORMANCE TARGET TABLES SETUP

## ❌ MASALAH
Target tidak dapat di-input karena **table `bp_target` dan `bp_target_audit_log` belum dibuat** di database.

---

## ✅ SOLUSI

### **STEP 1: BUKA SUPABASE SQL EDITOR**
1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project: **NEXMAX Dashboard**
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New Query**

---

### **STEP 2: COPY & RUN SQL SCRIPT**
1. Buka file: `scripts/create-bp-target-tables.sql`
2. **COPY seluruh isi file** (Ctrl+A, Ctrl+C)
3. **PASTE ke SQL Editor** di Supabase
4. Klik **Run** (atau tekan F5)

---

### **STEP 3: VERIFIKASI**
Setelah script berhasil, cek apakah table sudah dibuat:

```sql
-- Check bp_target table
SELECT * FROM public.bp_target LIMIT 1;

-- Check bp_target_audit_log table
SELECT * FROM public.bp_target_audit_log LIMIT 1;
```

Jika tidak ada error, berarti table sudah dibuat! ✅

---

### **STEP 4: TEST TARGET INPUT**
1. Kembali ke **MYR Business Performance** page
2. Klik tombol **"Edit Target"** di sub-header
3. Masukkan target values dan password manager
4. Klik **"Confirm"**
5. Target seharusnya **berhasil tersimpan** sekarang! 🎉

---

## 📋 TABLE SCHEMA

### **1. bp_target**
- `currency` - MYR/SGD/USD
- `line` - Brand (SBMY, LVMY, etc.) or 'ALL'
- `year` - Target year (2025)
- `quarter` - Q1/Q2/Q3/Q4
- **Target KPIs:**
  - `target_ggr`
  - `target_deposit_amount`
  - `target_deposit_cases`
  - `target_active_member`
  - `forecast_ggr`
- **Audit fields:** created_at, created_by, updated_at, updated_by

### **2. bp_target_audit_log**
- Tracks **all changes** to targets (CREATE/UPDATE/DELETE)
- Records **old vs new values** for comparison
- Stores **user, role, IP address, reason** for audit trail

---

## 🔒 SECURITY
- Only users with roles: `manager_myr`, `manager_sgd`, `manager_usc`, or `admin` can update targets
- All updates require **manager password verification**
- All changes are **logged in audit table** for compliance

---

## 🚀 SETELAH SETUP
Jika table sudah dibuat, target input akan **langsung berfungsi** tanpa perlu restart server atau redeploy!

Coba input target sekarang! 🎯

