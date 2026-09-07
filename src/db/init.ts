import { pool, query } from './index';

export async function initDb() {
  console.log('Initializing Neon PostgreSQL Database Schema...');

  try {
    // 1. Users Table
    await query(`
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
    `);

    // Ensure password column exists on existing installations
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);`);

    // 2. Properties Table
    await query(`
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
    `);

    // 3. Service Requests Table
    await query(`
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
    `);

    // 4. Projects Table
    await query(`
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
    `);

    // 5. Tasks Table
    await query(`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at VARCHAR(100),
        task_order INT DEFAULT 0
      );
    `);

    // 6. Photos Table
    await query(`
      CREATE TABLE IF NOT EXISTS project_photos (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'Before',
        description TEXT,
        uploaded_by VARCHAR(255),
        timestamp VARCHAR(100)
      );
    `);

    // 7. Timeline Table
    await query(`
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
    `);

    console.log('Database tables verified / created successfully.');

    // Seed Default Admin Account if no admin exists
    await seedDefaultAdmin();

  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
}

async function seedDefaultAdmin() {
  const adminRes = await query("SELECT COUNT(*) FROM users WHERE role = 'ADMIN'");
  if (parseInt(adminRes.rows[0].count) === 0) {
    console.log('Seeding default system admin account...');
    await query(`
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
      ON CONFLICT (email) DO NOTHING;
    `);
  }
}
