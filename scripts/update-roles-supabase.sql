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
('sq_usc', 'sq_usc123', 'sq_usc', NOW(), NOW());

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
        ELSE 9
    END;

-- =============================================
-- ROLE PERMISSIONS SUMMARY
-- =============================================
/*
Admin = All Access All Page
- dashboard, myr, sgd, usc, transaction, supabase, users

Executive = Limited Access > Dashboard, MYR, SGD, USC
- dashboard, myr, sgd, usc

Manager MYR = Limited Access > MYR
- myr

Manager SGD = Limited Access > SGD
- sgd

Manager USC = Limited Access > USC
- usc

SQ_MYR = Limited Access > MYR
- myr

SQ_SGD = Limited Access > SGD
- sgd

SQ_USC = Limited Access > USC
- usc
*/
