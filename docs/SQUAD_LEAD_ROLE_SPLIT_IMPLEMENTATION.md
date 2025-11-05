# SQUAD LEAD ROLE SPLIT IMPLEMENTATION

**Date:** November 5, 2025  
**Status:** ✅ COMPLETED  
**Version:** 2.0

---

## 📋 OVERVIEW

### **WHAT CHANGED:**
Split single `squad_lead` role into **3 market-specific roles** for better clarity, consistency, and maintainability.

### **WHY:**
1. ✅ **Consistency:** Follow same pattern as `sq_myr`, `sq_sgd`, `sq_usc`
2. ✅ **Clarity:** Role name explicitly shows market (no ambiguity)
3. ✅ **Simplicity:** No need for market auto-detection logic
4. ✅ **Better UX:** Sidebar only shows relevant market menus
5. ✅ **Type-Safe:** Cleaner TypeScript code
6. ✅ **Scalable:** Easy to add new markets in future

---

## 🔄 ROLE CHANGES

### **BEFORE (v1.0):**
```typescript
'squad_lead': {
  id: 'squad_lead',
  name: 'squad_lead',
  displayName: 'Squad Lead',
  permissions: ['myr', 'sgd', 'usc'], // Ambiguous!
  allowedBrands: ['SBMY', 'LVMY'] // Which market?
}
```

### **AFTER (v2.0):**
```typescript
'squad_lead_myr': {
  id: 'squad_lead_myr',
  name: 'squad_lead_myr',
  displayName: 'Squad Lead MYR',
  permissions: ['myr'], // Clear & specific
  allowedBrands: ['SBMY', 'LVMY'] // MYR brands only
}

'squad_lead_sgd': {
  id: 'squad_lead_sgd',
  name: 'squad_lead_sgd',
  displayName: 'Squad Lead SGD',
  permissions: ['sgd'], // Clear & specific
  allowedBrands: ['SBSG', 'LVSG'] // SGD brands only
}

'squad_lead_usc': {
  id: 'squad_lead_usc',
  name: 'squad_lead_usc',
  displayName: 'Squad Lead USC',
  permissions: ['usc'], // Clear & specific
  allowedBrands: ['WIN99', 'CAM888'] // USC brands only
}
```

---

## 📊 NEW ROLE STRUCTURE

### **Complete Role Hierarchy:**

```
1. admin (all markets + admin features)
2. executive (all markets, read-only)
3. analyst (all markets, read-only)
4. ops (all markets, read-only)
5. demo (all markets, testing)

MYR Market:
  6. manager_myr (full MYR access)
  7. sq_myr (MYR access, read-only)
  8. squad_lead_myr (specific MYR brands only) ← NEW

SGD Market:
  9. manager_sgd (full SGD access)
  10. sq_sgd (SGD access, read-only)
  11. squad_lead_sgd (specific SGD brands only) ← NEW

USC Market:
  12. manager_usc (full USC access)
  13. sq_usc (USC access, read-only)
  14. squad_lead_usc (specific USC brands only) ← NEW
```

---

## 🔧 CODE CHANGES

### **Files Modified (7 files):**

1. ✅ `utils/rolePermissions.ts`
   - Removed: `squad_lead` role definition
   - Added: `squad_lead_myr`, `squad_lead_sgd`, `squad_lead_usc` roles
   - Removed: `getMarketFromBrands()` function (no longer needed)
   - Simplified: `getRoleInfo()` function (removed dynamic logic)
   - Updated: `isSquadLead()` to use `startsWith('squad_lead_')`
   - Updated: `getDefaultPageByRole()` with 3 new cases

2. ✅ `components/Sidebar.tsx`
   - Updated: Menu filtering logic to use `squad_lead_myr/sgd/usc`
   - Removed: `getUserMarketFromBrands()` function
   - Removed: Dynamic market filtering logic (not needed)

3. ✅ `app/login/page.tsx`
   - Updated: Valid roles array to include 3 new roles
   - Removed: `squad_lead` from valid roles

4. ✅ `app/users/page.tsx`
   - Updated: All `=== 'squad_lead'` to `startsWith('squad_lead_')`
   - Updated: Market detection from role suffix
   - Updated: Brand fetching logic for each market
   - Updated: Display name mapping for 3 new roles

5. ✅ `scripts/migrate-squad-lead-roles.sql`
   - Created: Database migration script
   - Includes: Verification queries
   - Includes: Rollback script

6. ✅ `docs/SQUAD_LEAD_ROLE_SPLIT_IMPLEMENTATION.md`
   - Created: This documentation file

7. ✅ `utils/rolePermissions.ts.backup`
   - Created: Backup of original file

---

## 🗃️ DATABASE MIGRATION

### **Migration Script:**
Location: `scripts/migrate-squad-lead-roles.sql`

### **Migration Steps:**

1. **Backup current data:**
   ```sql
   SELECT * FROM users WHERE role = 'squad_lead';
   ```

2. **Migrate MYR Squad Leads:**
   ```sql
   UPDATE users
   SET role = 'squad_lead_myr'
   WHERE role = 'squad_lead'
     AND allowed_brands::text LIKE '%MY%';
   ```

3. **Migrate SGD Squad Leads:**
   ```sql
   UPDATE users
   SET role = 'squad_lead_sgd'
   WHERE role = 'squad_lead'
     AND allowed_brands::text LIKE '%SG%';
   ```

4. **Migrate USC Squad Leads:**
   ```sql
   UPDATE users
   SET role = 'squad_lead_usc'
   WHERE role = 'squad_lead'
     AND allowed_brands::text LIKE '%KH%';
   ```

5. **Verify migration:**
   ```sql
   SELECT role, COUNT(*) 
   FROM users 
   WHERE role LIKE 'squad_lead_%' 
   GROUP BY role;
   ```

### **Expected Results:**
- All `squad_lead` users migrated to market-specific roles
- `allowed_brands` field preserved
- Zero users with old `squad_lead` role

---

## 🎯 FUNCTIONALITY

### **Squad Lead MYR:**
- ✅ Access: MYR pages only
- ✅ Brands: Only allowed MYR brands (e.g., SBMY, LVMY)
- ✅ Sidebar: Shows MYR menu only
- ✅ Default Page: `/myr/overview`

### **Squad Lead SGD:**
- ✅ Access: SGD pages only
- ✅ Brands: Only allowed SGD brands (e.g., SBSG, LVSG)
- ✅ Sidebar: Shows SGD menu only
- ✅ Default Page: `/sgd/overview`

### **Squad Lead USC:**
- ✅ Access: USC pages only
- ✅ Brands: Only allowed USC brands (e.g., WIN99, CAM888)
- ✅ Sidebar: Shows USC menu only
- ✅ Default Page: `/usc/overview`

---

## ✅ BENEFITS

### **Code Quality:**
- ✅ **Removed 45+ lines** of complex market detection logic
- ✅ **Simpler `getRoleInfo()`** - no dynamic logic needed
- ✅ **Cleaner Sidebar** - no dynamic filtering
- ✅ **Type-Safe** - explicit role types

### **User Experience:**
- ✅ **Clear Role Names** - no confusion about market access
- ✅ **Focused Sidebar** - only relevant market menus
- ✅ **Better Performance** - less dynamic logic

### **Admin Experience:**
- ✅ **Explicit Role Selection** - choose market first
- ✅ **No Ambiguity** - role name shows market
- ✅ **Easy Management** - consistent pattern

### **Maintenance:**
- ✅ **Consistent Pattern** - same as SQ_* roles
- ✅ **Scalable** - easy to add new markets
- ✅ **Less Bugs** - simpler logic, less edge cases

---

## 🧪 TESTING CHECKLIST

### **After Deployment:**

- [ ] **Login Test:**
  - [ ] Squad Lead MYR can login
  - [ ] Squad Lead SGD can login
  - [ ] Squad Lead USC can login
  - [ ] Old `squad_lead` role rejected

- [ ] **Sidebar Test:**
  - [ ] Squad Lead MYR: Only MYR menu visible
  - [ ] Squad Lead SGD: Only SGD menu visible
  - [ ] Squad Lead USC: Only USC menu visible

- [ ] **Brand Filtering Test:**
  - [ ] Squad Lead MYR: Only allowed MYR brands in slicer
  - [ ] Squad Lead SGD: Only allowed SGD brands in slicer
  - [ ] Squad Lead USC: Only allowed USC brands in slicer
  - [ ] 'ALL' option NOT available for Squad Leads

- [ ] **Data Access Test:**
  - [ ] Squad Lead can view data for allowed brands
  - [ ] Squad Lead CANNOT access other brands (403 error)
  - [ ] Auto-approval pages work correctly
  - [ ] Member report works correctly

- [ ] **User Management Test (Admin):**
  - [ ] Can create new Squad Lead MYR user
  - [ ] Can create new Squad Lead SGD user
  - [ ] Can create new Squad Lead USC user
  - [ ] Market selection updates brands list
  - [ ] Can edit existing Squad Lead users
  - [ ] Brand selection persists correctly

---

## 📝 MIGRATION NOTES

### **Important:**
1. **Users must re-login** after migration to get new role
2. **Existing sessions** may still use old role until logout
3. **Run session cleanup** to force re-authentication if needed
4. **Backup database** before running migration script

### **Safe Migration Process:**
1. Deploy code changes to production
2. Backup `users` table
3. Run migration script during low-traffic hours
4. Verify results immediately
5. Monitor for any issues
6. Keep rollback script ready

---

## 🔍 VERIFICATION QUERIES

### **Check Migration Status:**
```sql
-- Should return 0
SELECT COUNT(*) FROM users WHERE role = 'squad_lead';

-- Should show distribution
SELECT role, COUNT(*) FROM users 
WHERE role LIKE 'squad_lead_%' 
GROUP BY role;
```

### **Verify Brand Assignments:**
```sql
-- All Squad Lead MYR should have MY brands
SELECT username, allowed_brands 
FROM users 
WHERE role = 'squad_lead_myr';

-- All Squad Lead SGD should have SG brands
SELECT username, allowed_brands 
FROM users 
WHERE role = 'squad_lead_sgd';

-- All Squad Lead USC should have KH/CAM brands
SELECT username, allowed_brands 
FROM users 
WHERE role = 'squad_lead_usc';
```

---

## 🚀 DEPLOYMENT STEPS

### **1. Code Deployment:**
```bash
git add .
git commit -m "Split Squad Lead role into market-specific roles (myr/sgd/usc)"
git push origin main
```

### **2. Database Migration:**
```bash
# Run via Supabase Dashboard SQL Editor
# Copy contents of scripts/migrate-squad-lead-roles.sql
# Execute step by step
# Verify results after each step
```

### **3. Verification:**
- Check build succeeded on Vercel
- Test login with Squad Lead users
- Verify sidebar menu filtering
- Test brand access control

---

## 📚 REFERENCES

### **Related Files:**
- `utils/rolePermissions.ts` - Role definitions
- `utils/brandAccessHelper.ts` - Brand filtering logic
- `components/Sidebar.tsx` - Menu filtering
- `app/users/page.tsx` - User management UI
- `app/login/page.tsx` - Login validation

### **Related Documentation:**
- `NEXMAX_STANDARDS_COMPLETE_REFERENCE.md`
- `CBO_FRONTEND_FRAMEWORK_STANDARD.md`
- `API_ROUTES_INVENTORY.md`

---

## 🎓 LESSONS LEARNED

### **Design Principles:**
1. ✅ **Explicit > Implicit:** Clear role names better than auto-detection
2. ✅ **Consistency > Clever:** Follow existing patterns
3. ✅ **Simple > Complex:** Less code, less bugs
4. ✅ **Type-Safe > Dynamic:** TypeScript loves explicit types

### **Best Practices:**
1. ✅ Always backup before major changes
2. ✅ Test compilation after each step
3. ✅ Update all references systematically
4. ✅ Document changes thoroughly
5. ✅ Provide rollback script

---

**END OF DOCUMENT**

---

*For questions or issues, contact NEXMAX Development Team*

