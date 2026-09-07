import { query } from './index';

async function clearDatabase() {
  console.log('Clearing all dummy data from Neon PostgreSQL...');
  try {
    await query('TRUNCATE TABLE project_timeline, project_photos, project_tasks, projects, service_requests, properties CASCADE;');
    await query("DELETE FROM users WHERE role != 'ADMIN';");

    // Ensure default admin exists
    await query(`
      INSERT INTO users (id, name, email, phone, role, role_title, password, status)
      VALUES ('admin-1', 'ApexCare Admin', 'admin@apexcare.ca', '+1 (416) 555-0100', 'ADMIN', 'System Administrator', 'admin123', 'Available')
      ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password, role = 'ADMIN';
    `);

    console.log('NEON POSTGRESQL DATABASE CLEARED CLEANLY! Only system admin remains.');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
