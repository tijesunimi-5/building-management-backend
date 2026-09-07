-- ====================================================================
-- ApexCare Property Maintenance SaaS Database Schema & Initial Data
-- Works with PostgreSQL 12+, pgAdmin4, Neon PostgreSQL, and Local DBs
-- ====================================================================

-- 1. Create Users Table (Clients, Admins, Workers)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'CLIENT',
    role_title VARCHAR(100),
    avatar_url TEXT,
    password VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Available',
    active_job_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- 2. Create Properties Table
CREATE TABLE IF NOT EXISTS properties (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Toronto',
    province VARCHAR(50) DEFAULT 'ON',
    postal_code VARCHAR(20) DEFAULT 'M5R 1C2',
    property_type VARCHAR(100) DEFAULT 'Single Family Home',
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    image_url TEXT,
    active_projects_count INT DEFAULT 0,
    completed_projects_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Service Requests Table
CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR(64) PRIMARY KEY,
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    property_id VARCHAR(64) REFERENCES properties(id) ON DELETE SET NULL,
    property_name VARCHAR(255),
    property_address TEXT,
    client_name VARCHAR(255),
    service_category VARCHAR(100),
    description TEXT,
    preferred_date VARCHAR(50),
    additional_notes TEXT,
    photo_urls TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'Awaiting Review',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    service_request_id VARCHAR(64) REFERENCES service_requests(id) ON DELETE SET NULL,
    property_id VARCHAR(64) REFERENCES properties(id) ON DELETE SET NULL,
    property_name VARCHAR(255),
    property_address TEXT,
    client_name VARCHAR(255),
    service_category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Scheduled',
    priority VARCHAR(50) DEFAULT 'Medium',
    worker_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    worker_name VARCHAR(255),
    worker_phone VARCHAR(50),
    worker_avatar TEXT,
    client_request_summary TEXT,
    admin_observations TEXT,
    additional_issues_discovered TEXT,
    scheduled_date VARCHAR(50),
    expected_completion_date VARCHAR(50),
    latitude DOUBLE PRECISION DEFAULT 43.6702,
    longitude DOUBLE PRECISION DEFAULT -79.3897,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Project Tasks Table
CREATE TABLE IF NOT EXISTS project_tasks (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at VARCHAR(100),
    task_order INT DEFAULT 0
);

-- 6. Create Project Photos Table
CREATE TABLE IF NOT EXISTS project_photos (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'Before',
    description TEXT,
    uploaded_by VARCHAR(255),
    timestamp VARCHAR(100)
);

-- 7. Create Project Timeline Table
CREATE TABLE IF NOT EXISTS project_timeline (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
    date VARCHAR(100),
    time VARCHAR(100),
    title VARCHAR(255),
    description TEXT,
    author_name VARCHAR(255),
    author_role VARCHAR(100),
    icon_type VARCHAR(50) DEFAULT 'project',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Optimal Query Performance
CREATE INDEX IF NOT EXISTS idx_requests_property_id ON service_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_projects_worker_id ON projects(worker_id);
CREATE INDEX IF NOT EXISTS idx_projects_property_id ON projects(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON project_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_project_id ON project_timeline(project_id);

-- ====================================================================
-- SEED INITIAL DATA (Inserts records if tables are fresh)
-- ====================================================================

-- Properties
INSERT INTO properties (id, name, address, city, province, postal_code, property_type, client_name, client_email, client_phone, image_url, active_projects_count, completed_projects_count)
VALUES 
('prop-1', 'Thompson Residence', '142 Yorkville Avenue', 'Toronto', 'ON', 'M5R 1C2', 'Single Family Home', 'Michael Thompson', 'm.thompson@example.ca', '+1 (416) 555-0192', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80', 1, 3),
('prop-2', 'Williams Family Home', '88 Forest Hill Road', 'Toronto', 'ON', 'M4V 2L7', 'Single Family Home', 'Sarah Williams', 's.williams@example.ca', '+1 (416) 555-0184', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80', 0, 5),
('prop-3', 'Anderson Property', '320 Bay Street, Suite 1400', 'Toronto', 'ON', 'M5H 4A6', 'Condo / Apartment', 'David Anderson', 'd.anderson@example.ca', '+1 (416) 555-0137', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80', 1, 2)
ON CONFLICT (id) DO NOTHING;

-- Technicians (Users)
INSERT INTO users (id, name, email, phone, role, role_title, avatar_url, status, active_job_id)
VALUES
('worker-1', 'Michael Carter', 'm.carter@apexcare-demo.ca', '+1 (416) 555-0199', 'WORKER', 'Senior Plumbing Technician', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80', 'On Job', 'proj-501'),
('worker-2', 'Daniel Wilson', 'd.wilson@apexcare-demo.ca', '+1 (416) 555-0188', 'WORKER', 'Electrical & HVAC Specialist', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 'Available', NULL),
('worker-3', 'James Brown', 'j.brown@apexcare-demo.ca', '+1 (416) 555-0144', 'WORKER', 'General Repairs & Carpentry', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 'Available', NULL)
ON CONFLICT (id) DO NOTHING;

-- Service Requests
INSERT INTO service_requests (id, reference_number, property_id, property_name, property_address, client_name, service_category, description, preferred_date, additional_notes, photo_urls, status)
VALUES
('req-101', 'REQ-2026-8941', 'prop-1', 'Thompson Residence', '142 Yorkville Avenue, Toronto, ON', 'Michael Thompson', 'Plumbing', 'Leaking kitchen and bathroom taps causing water dripping under sink.', '2026-08-16', 'Please call 15 minutes before arrival. Gate code is #4829.', ARRAY['https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80'], 'Approved'),
('req-102', 'REQ-2026-9012', 'prop-3', 'Anderson Property', '320 Bay Street, Suite 1400, Toronto, ON', 'David Anderson', 'Electrical', 'Living room light switches tripping circuit breaker intermittently.', '2026-08-19', 'Concierge desk has keys.', ARRAY[]::TEXT[], 'Awaiting Review')
ON CONFLICT (id) DO NOTHING;

-- Projects
INSERT INTO projects (
  id, title, reference_number, service_request_id, property_id, property_name, property_address, 
  client_name, service_category, status, priority, worker_id, worker_name, worker_phone, worker_avatar, 
  client_request_summary, admin_observations, additional_issues_discovered, scheduled_date, expected_completion_date, latitude, longitude
)
VALUES (
  'proj-501', 'Thompson Residence — Plumbing Repair', 'PRJ-2026-7821', 'req-101', 'prop-1', 'Thompson Residence', 
  '142 Yorkville Avenue, Toronto, ON M5R 1C2', 'Michael Thompson', 'Plumbing', 'In Progress', 'High', 
  'worker-1', 'Michael Carter', '+1 (416) 555-0199', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
  'Client reported leaking kitchen and bathroom taps causing water dripping under sink.',
  'Kitchen cartridge appears damaged. Requires cartridge replacement and seal inspection.',
  'Bathroom faucet washer worn out; recommended full cartridge swap to prevent future leak.',
  '2026-08-16', '2026-08-18', 43.6702, -79.3897
)
ON CONFLICT (id) DO NOTHING;

-- Project Tasks
INSERT INTO project_tasks (id, project_id, title, is_completed, completed_at, task_order)
VALUES
('task-1', 'proj-501', 'Inspect kitchen tap & connections', true, '2026-08-16 10:45 AM', 1),
('task-2', 'proj-501', 'Inspect bathroom tap', true, '2026-08-16 11:10 AM', 2),
('task-3', 'proj-501', 'Replace kitchen tap cartridge', true, '2026-08-17 02:30 PM', 3),
('task-4', 'proj-501', 'Replace bathroom faucet cartridge', false, NULL, 4),
('task-5', 'proj-501', 'Test water pressure & verify no leaks', false, NULL, 5)
ON CONFLICT (id) DO NOTHING;

-- Project Photos
INSERT INTO project_photos (id, project_id, url, category, description, uploaded_by, timestamp)
VALUES
('photo-1', 'proj-501', 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80', 'Before', 'Kitchen Tap — Initial Inspection showing water corrosion around cartridge seal.', 'Michael Carter (Technician)', 'Aug 16, 2026 — 10:42 AM'),
('photo-2', 'proj-501', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80', 'During', 'Disassembled cartridge housing during component replacement under sink.', 'Michael Carter (Technician)', 'Aug 17, 2026 — 01:20 PM'),
('photo-3', 'proj-501', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', 'After', 'Kitchen Tap — High-arc chrome faucet successfully installed & pressure tested.', 'Michael Carter (Technician)', 'Aug 17, 2026 — 03:45 PM')
ON CONFLICT (id) DO NOTHING;

-- Project Timeline
INSERT INTO project_timeline (id, project_id, date, time, title, description, author_name, author_role, icon_type)
VALUES
('time-1', 'proj-501', 'August 13, 2026', '09:00 AM', 'Service Request Created', 'Client reported leaking kitchen and bathroom taps via online portal.', 'Michael Thompson', 'Client', 'request'),
('time-2', 'proj-501', 'August 14, 2026', '10:15 AM', 'Project Created & Reviewed', 'Service request reviewed by dispatch and converted into an active maintenance project.', 'ApexCare Dispatch', 'Company Admin', 'project'),
('time-3', 'proj-501', 'August 16, 2026', '08:30 AM', 'Technician Assigned', 'Michael Carter (Senior Plumbing Technician) assigned to project.', 'ApexCare Dispatch', 'Company Admin', 'user'),
('time-4', 'proj-501', 'August 16, 2026', '10:45 AM', 'Site Inspection Completed', 'Technician inspected property and confirmed kitchen cartridge replacement required.', 'Michael Carter', 'Field Worker', 'check')
ON CONFLICT (id) DO NOTHING;
