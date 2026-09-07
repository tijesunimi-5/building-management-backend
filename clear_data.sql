-- ====================================================================
-- Script to Clear All Dummy Data from Neon PostgreSQL / Local Database
-- Run this script in Neon SQL Editor or pgAdmin4 to start completely fresh!
-- ====================================================================

-- Truncate all operational tables while preserving table structures
TRUNCATE TABLE project_timeline CASCADE;
TRUNCATE TABLE project_photos CASCADE;
TRUNCATE TABLE project_tasks CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE service_requests CASCADE;
TRUNCATE TABLE properties CASCADE;

-- Clear non-admin users (deletes dummy clients & technicians, keeps system admins)
DELETE FROM users WHERE role != 'ADMIN';

-- Ensure Default Admin exists
INSERT INTO users (id, name, email, phone, role, role_title, password, status)
VALUES (
    'admin-1', 
    'ApexCare Admin', 
    'admin@apexcare.ca', 
    '+1 (416) 555-0100', 
    'ADMIN', 
    'System Administrator', 
    'admin123', 
    'Available'
)
ON CONFLICT (email) DO UPDATE 
SET password = EXCLUDED.password, role = 'ADMIN';

SELECT 'Database successfully cleared! All tables are fresh and ready for live data.' AS result;
