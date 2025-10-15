# 🚀 Page Visibility Setup Instructions

## 📋 **What This Does:**
Creates a database table to manage which pages are visible to which roles.

---

## ⚡ **Quick Setup (5 minutes):**

### **Step 1: Open Supabase Dashboard**
1. Go to: https://supabase.com/dashboard
2. Select your project: **NexMax Dashboard**
3. Click **SQL Editor** (left sidebar)

### **Step 2: Run the SQL Script**
1. Click **New Query**
2. Open file: `scripts/create-page-visibility-table.sql`
3. Copy ALL content from the file
4. Paste into Supabase SQL Editor
5. Click **RUN** (or press Ctrl+Enter)

### **Step 3: Verify Success**
You should see:
```
Success. No rows returned
```

Then run this verification query:
```sql
SELECT COUNT(*) as total_pages FROM page_visibility_config;
```

Expected result: **33 pages** total

---

## 🔍 **Verification Queries:**

### **Check all pages:**
```sql
SELECT * FROM page_visibility_config 
ORDER BY page_section, page_name;
```

### **Check Building pages (admin only):**
```sql
SELECT page_path, page_name, page_section 
FROM page_visibility_config 
WHERE visible_for_roles = '["admin"]'::jsonb
ORDER BY page_section, page_name;
```

Expected: 6 pages (member-analytic & churn-member for MYR, SGD, USC)

### **Check Running pages (multi-role access):**
```sql
SELECT page_path, page_name, page_section, visible_for_roles 
FROM page_visibility_config 
WHERE jsonb_array_length(visible_for_roles) > 1
ORDER BY page_section, page_name;
```

Expected: 27 pages

---

## 📊 **Table Structure:**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| page_path | TEXT | URL path (e.g., '/myr/overview') |
| page_name | TEXT | Display name (e.g., 'Overview') |
| page_section | TEXT | Section (MYR/SGD/USC/Admin/Other) |
| visible_for_roles | JSONB | Array of role names |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

---

## ✅ **Success Indicators:**

- ✅ No errors in SQL execution
- ✅ 33 pages inserted
- ✅ 6 pages with "Building" status (admin only)
- ✅ 27 pages with "Running" status (multi-role)
- ✅ Table has auto-update timestamp trigger

---

## ⚠️ **Troubleshooting:**

### **Error: "relation already exists"**
**Solution:** Table already created. To recreate:
```sql
DROP TABLE IF EXISTS page_visibility_config CASCADE;
```
Then run the full script again.

### **Error: "duplicate key value"**
**Solution:** Data already seeded. To reseed:
```sql
DELETE FROM page_visibility_config;
```
Then run the INSERT statements again.

---

## 🎯 **Next Steps:**

After successful table creation:
1. ✅ Phase 1 Complete!
2. ➡️ Move to Phase 2: Create API Routes
3. ➡️ Move to Phase 3: Create Admin UI
4. ➡️ Move to Phase 4: Update Sidebar

---

## 💡 **Understanding the Data:**

### **Building Status (Hidden from users):**
```json
visible_for_roles = ["admin"]
```
Only admin can see. All other roles = hidden.

### **Running Status (Visible to users):**
```json
visible_for_roles = ["admin", "executive", "manager_myr", "sq_myr"]
```
Multiple roles can access.

### **To Toggle Visibility:**
```sql
-- Hide from all non-admin:
UPDATE page_visibility_config 
SET visible_for_roles = '["admin"]'::jsonb
WHERE page_path = '/myr/overview';

-- Show to specific roles:
UPDATE page_visibility_config 
SET visible_for_roles = '["admin", "executive", "manager_myr", "sq_myr"]'::jsonb
WHERE page_path = '/myr/overview';
```

---

## 📞 **Need Help?**

If you encounter any issues:
1. Check Supabase logs
2. Verify your project has necessary permissions
3. Ensure you're connected to the correct database

---

**Created:** October 15, 2025  
**Purpose:** Page Visibility Management System - Phase 1  
**Status:** Ready for Deployment

