# 🔧 MAINTENANCE MODE SETUP

## ✅ SOLUSI

### **STEP 1: BUKA SUPABASE SQL EDITOR**
1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project: **NEXMAX Dashboard**
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New Query**

---

### **STEP 2: COPY & RUN SQL SCRIPT**
1. Buka file: `scripts/create-maintenance-config-table.sql`
2. **COPY seluruh isi file** (Ctrl+A, Ctrl+C)
3. **PASTE ke SQL Editor** di Supabase
4. Klik **Run** (atau tekan F5)

---

### **STEP 3: VERIFIKASI**
Setelah script berhasil, cek apakah table sudah dibuat:

```sql
-- Check maintenance_config table
SELECT * FROM public.maintenance_config;

-- Check maintenance mode status
SELECT is_maintenance_mode, maintenance_message_id, countdown_enabled, countdown_datetime 
FROM maintenance_config;
```

Jika tidak ada error, berarti table sudah dibuat! ✅

---

### **STEP 4: TEST MAINTENANCE MODE**
1. Login sebagai **admin**
2. Buka **Admin → Maintenance Mode**
3. Klik **Turn ON Maintenance**
4. Logout dan login sebagai **non-admin user**
5. User non-admin akan diarahkan ke **Maintenance Page** ✅
6. Login sebagai **admin** lagi
7. Admin masih bisa akses semua page (bypass maintenance mode) ✅
8. Klik **Turn OFF Maintenance** untuk menonaktifkan maintenance mode

---

## 📋 TABLE SCHEMA

### **maintenance_config**
- `id` - UUID Primary Key
- `is_maintenance_mode` - Boolean (ON/OFF)
- `maintenance_message` - Text (English)
- `maintenance_message_id` - Text (Indonesian)
- `countdown_enabled` - Boolean (Enable/Disable countdown)
- `countdown_datetime` - Timestamp (Target datetime for countdown)
- `background_image_url` - Text (Custom background image URL)
- `background_color` - Text (Background color, default: #1a1a1a)
- `text_color` - Text (Text color, default: #ffffff)
- `show_logo` - Boolean (Show/Hide logo)
- `logo_url` - Text (Custom logo URL)
- `custom_html` - Text (Custom HTML content)
- `created_at` - Timestamp
- `updated_at` - Timestamp
- `updated_by` - UUID (Reference to users table)

---

## 🔒 SECURITY
- Only **admin** users can toggle maintenance mode
- Only **admin** users can access all pages during maintenance mode
- All **non-admin** users are redirected to maintenance page when maintenance mode is ON
- Maintenance mode status is checked in:
  - `AccessControl` component (client-side)
  - `HomePage` (client-side)
  - `LoginPage` (client-side)

---

## 🎨 CUSTOMIZATION
Admin can customize maintenance page:
- **Message** (English & Indonesian)
- **Countdown** (Enable/Disable, Set target datetime)
- **Background** (Color or Image URL)
- **Text Color**
- **Logo** (Show/Hide, Custom URL)
- **Custom HTML** (Optional)

---

## 📝 NOTES
1. Maintenance mode is **OFF** by default
2. Only **ONE** row should exist in `maintenance_config` table (singleton pattern)
3. Admin can **bypass** maintenance mode and access all pages
4. Non-admin users are **redirected** to `/maintenance` page when maintenance mode is ON
5. Maintenance page design can be customized later based on user's design requirements

---

## 🚀 NEXT STEPS
1. Run SQL script to create `maintenance_config` table
2. Test maintenance mode toggle (ON/OFF)
3. Test admin bypass functionality
4. Test non-admin redirect to maintenance page
5. Customize maintenance page design (waiting for user's design)
6. Add maintenance mode to page visibility config (optional)

