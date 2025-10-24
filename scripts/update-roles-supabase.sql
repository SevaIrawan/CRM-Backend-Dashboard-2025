-- =============================================
-- NEXMAX ROLE PERMISSIONS UPDATE SCRIPT
-- =============================================
-- Script untuk update role permissions di Supabase
-- Jalankan script ini di SQL Editor Supabase

-- 1. Hapus semua data users yang ada (HATI-HATI!)
-- DELETE FROM users;

-- 2. Insert role users baru sesuai struktur yang diminta
INSERT INTO users (username, password, role, created_at, updated_at) VALUES
-- Admin = All Access All Page
('admin', 'admin123', 'admin', NOW(), NOW()),

-- Executive = Level/Role Execute = Limited Access > Dashboard, MYR, SGD, USC
('executive', 'executive123', 'executive', NOW(), NOW()),

-- Manager MYR = Level/Role Manager = Limited Access > MYR
('manager_myr', 'manager_myr123', 'manager_myr', NOW(), NOW()),

-- Manager SGD = Level/Role Manager = Limited Access > SGD
('manager_sgd', 'manager_sgd123', 'manager_sgd', NOW(), NOW()),

-- Manager USC = Level/Role Manager = Limited Access > USC
('manager_usc', 'manager_usc123', 'manager_usc', NOW(), NOW()),

-- SQ_MYR = Level/Role User = Limited Access > MYR
('sq_myr', 'sq_myr123', 'sq_myr', NOW(), NOW()),

-- SQ_SGD = Level/Role User = Limited Access > SGD
('sq_sgd', 'sq_sgd123', 'sq_sgd', NOW(), NOW()),

-- SQ_USC = Level/Role User = Limited Access > USC
('sq_usc', 'sq_usc123', 'sq_usc', NOW(), NOW()),

-- Analyst = Full Dashboard Access (No Admin Features)
('analyst', 'analyst123', 'analyst', NOW(), NOW()),

-- Ops = Operations (Full Dashboard Access, No Admin Features)
('ops', 'ops123', 'ops', NOW(), NOW()),

-- Demo = Demo User (Full Dashboard Access, Can Edit Targets for Testing)
('demo', 'demo123', 'demo', NOW(), NOW());

-- 3. Verifikasi data yang sudah di-insert
SELECT 
    id,
    username,
    role,
    created_at,
    updated_at
FROM users 
ORDER BY 
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'executive' THEN 2
        WHEN 'manager_myr' THEN 3
        WHEN 'manager_sgd' THEN 4
        WHEN 'manager_usc' THEN 5
        WHEN 'sq_myr' THEN 6
        WHEN 'sq_sgd' THEN 7
        WHEN 'sq_usc' THEN 8
        WHEN 'analyst' THEN 9
        WHEN 'ops' THEN 10
        WHEN 'demo' THEN 11
        ELSE 12
    END;

-- =============================================
-- ROLE PERMISSIONS SUMMARY
-- =============================================
/*
1. Admin = All Access All Page + User Management + Admin Features
   - dashboard, myr, sgd, usc, transaction, supabase, users, admin

2. Executive = Limited Access > Dashboard, MYR, SGD, USC (Read Only)
   - dashboard, myr, sgd, usc

3. Manager MYR = Limited Access > MYR + Can Edit MYR Targets
   - myr

4. Manager SGD = Limited Access > SGD + Can Edit SGD Targets
   - sgd

5. Manager USC = Limited Access > USC + Can Edit USC Targets
   - usc

6. SQ_MYR = Limited Access > MYR (Read Only)
   - myr

7. SQ_SGD = Limited Access > SGD (Read Only)
   - sgd

8. SQ_USC = Limited Access > USC (Read Only)
   - usc

9. Analyst = Full Dashboard Access (Read Only, No Admin Features)
   - dashboard, myr, sgd, usc

10. Ops = Full Dashboard Access (Read Only, No Admin Features)
    - dashboard, myr, sgd, usc

11. Demo = Full Dashboard Access + Can Edit ALL Targets (For Testing & Feedback)
    - dashboard, myr, sgd, usc
    - Special permission: Can edit targets for MYR, SGD, USC (for testing purposes)
*/
