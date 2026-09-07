import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db';
import { initDb } from './db/init';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Database Tables and Seed Data on Startup
initDb().catch((err) => console.error('Failed to initialize database:', err));

// Health Check Endpoint
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  try {
    const dbResult = await query('SELECT NOW()');
    res.json({
      status: 'online',
      service: 'ApexCare REST API Backend',
      timestamp: new Date().toISOString(),
      database: 'Neon PostgreSQL Connected',
      dbTime: dbResult.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'degraded',
      service: 'ApexCare REST API Backend',
      timestamp: new Date().toISOString(),
      databaseError: (error as Error).message
    });
  }
});

// Properties Endpoints
app.get('/api/v1/properties', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM properties ORDER BY created_at DESC');
    const properties = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      city: row.city,
      province: row.province,
      postalCode: row.postal_code,
      propertyType: row.property_type,
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientPhone: row.client_phone,
      imageUrl: row.image_url,
      activeProjectsCount: row.active_projects_count,
      completedProjectsCount: row.completed_projects_count
    }));
    res.json({ success: true, data: properties });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Service Requests Endpoints
app.get('/api/v1/requests', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM service_requests ORDER BY created_at DESC');
    const requests = result.rows.map((row) => ({
      id: row.id,
      referenceNumber: row.reference_number,
      propertyId: row.property_id,
      propertyName: row.property_name,
      propertyAddress: row.property_address,
      clientName: row.client_name,
      serviceCategory: row.service_category,
      description: row.description,
      preferredDate: row.preferred_date,
      additionalNotes: row.additional_notes,
      photoUrls: row.photo_urls || [],
      status: row.status,
      createdAt: row.created_at
    }));
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

app.post('/api/v1/requests', async (req: Request, res: Response) => {
  try {
    const { propertyId, propertyName, propertyAddress, clientName, serviceCategory, description, preferredDate, additionalNotes, photoUrls } = req.body;
    
    if (!serviceCategory || !description) {
      return res.status(400).json({ success: false, message: 'serviceCategory and description are required fields.' });
    }

    const id = `req-${Date.now()}`;
    const referenceNumber = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const insertSql = `
      INSERT INTO service_requests (
        id, reference_number, property_id, property_name, property_address, 
        client_name, service_category, description, preferred_date, additional_notes, photo_urls, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      id,
      referenceNumber,
      propertyId || 'prop-1',
      propertyName || 'Thompson Residence',
      propertyAddress || '142 Yorkville Avenue, Toronto, ON',
      clientName || 'Michael Thompson',
      serviceCategory,
      description,
      preferredDate || new Date().toISOString().split('T')[0],
      additionalNotes || '',
      photoUrls || [],
      'Awaiting Review'
    ];

    const result = await query(insertSql, values);
    const row = result.rows[0];

    const newRequest = {
      id: row.id,
      referenceNumber: row.reference_number,
      propertyId: row.property_id,
      propertyName: row.property_name,
      propertyAddress: row.property_address,
      clientName: row.client_name,
      serviceCategory: row.service_category,
      description: row.description,
      preferredDate: row.preferred_date,
      additionalNotes: row.additional_notes,
      photoUrls: row.photo_urls,
      status: row.status,
      createdAt: row.created_at
    };

    res.status(201).json({ success: true, data: newRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Helper function to build full project object from SQL rows
async function getFullProject(projRow: any) {
  const tasksRes = await query('SELECT * FROM project_tasks WHERE project_id = $1 ORDER BY task_order ASC', [projRow.id]);
  const photosRes = await query('SELECT * FROM project_photos WHERE project_id = $1 ORDER BY timestamp DESC', [projRow.id]);
  const timelineRes = await query('SELECT * FROM project_timeline WHERE project_id = $1 ORDER BY created_at ASC', [projRow.id]);

  return {
    id: projRow.id,
    title: projRow.title,
    referenceNumber: projRow.reference_number,
    propertyId: projRow.property_id,
    propertyName: projRow.property_name,
    propertyAddress: projRow.property_address,
    clientName: projRow.client_name,
    serviceCategory: projRow.service_category,
    status: projRow.status,
    priority: projRow.priority,
    workerId: projRow.worker_id,
    workerName: projRow.worker_name,
    workerPhone: projRow.worker_phone,
    workerAvatar: projRow.worker_avatar,
    clientRequestSummary: projRow.client_request_summary,
    adminObservations: projRow.admin_observations,
    additionalIssuesDiscovered: projRow.additional_issues_discovered || '',
    scheduledDate: projRow.scheduled_date,
    expectedCompletionDate: projRow.expected_completion_date,
    latitude: projRow.latitude,
    longitude: projRow.longitude,
    tasks: tasksRes.rows.map((t) => ({
      id: t.id,
      title: t.title,
      isCompleted: t.is_completed,
      completedAt: t.completed_at
    })),
    photos: photosRes.rows.map((p) => ({
      id: p.id,
      url: p.url,
      category: p.category,
      description: p.description,
      uploadedBy: p.uploaded_by,
      timestamp: p.timestamp
    })),
    timeline: timelineRes.rows.map((tl) => ({
      id: tl.id,
      date: tl.date,
      time: tl.time,
      title: tl.title,
      description: tl.description,
      authorName: tl.author_name,
      authorRole: tl.author_role,
      iconType: tl.icon_type
    }))
  };
}

// Projects Endpoints
app.get('/api/v1/projects', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM projects ORDER BY created_at DESC');
    const fullProjects = await Promise.all(result.rows.map((row) => getFullProject(row)));
    res.json({ success: true, data: fullProjects });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

app.get('/api/v1/projects/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    const project = await getFullProject(result.rows[0]);
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Triage Request -> Convert to Active Project
app.post('/api/v1/projects/triage', async (req: Request, res: Response) => {
  try {
    const { requestId, workerId, priority, adminObservations, tasks } = req.body;

    const reqResult = await query('SELECT * FROM service_requests WHERE id = $1', [requestId]);
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service Request not found' });
    }

    const targetReq = reqResult.rows[0];

    let worker: any = null;
    if (workerId) {
      const workerRes = await query('SELECT * FROM users WHERE id = $1 AND role = $2', [workerId, 'WORKER']);
      if (workerRes.rows.length > 0) {
        worker = workerRes.rows[0];
      }
    }

    // Update request status to 'Approved'
    await query("UPDATE service_requests SET status = 'Approved' WHERE id = $1", [requestId]);

    const newProjId = `proj-${Date.now()}`;
    const projRef = `PRJ-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const insertProjSql = `
      INSERT INTO projects (
        id, title, reference_number, service_request_id, property_id, property_name, property_address,
        client_name, service_category, status, priority, worker_id, worker_name, worker_phone, worker_avatar,
        client_request_summary, admin_observations, additional_issues_discovered, scheduled_date, expected_completion_date, latitude, longitude
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const projValues = [
      newProjId,
      `${targetReq.property_name} — ${targetReq.service_category} Maintenance`,
      projRef,
      requestId,
      targetReq.property_id,
      targetReq.property_name,
      targetReq.property_address,
      targetReq.client_name,
      targetReq.service_category,
      'Scheduled',
      priority || 'Medium',
      worker?.id || null,
      worker?.name || 'Unassigned',
      worker?.phone || '',
      worker?.avatar_url || '',
      targetReq.description,
      adminObservations || 'Initial triage completed.',
      req.body.additionalIssuesDiscovered || '',
      new Date(Date.now() + 86400000).toISOString().split('T')[0],
      new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      43.6702,
      -79.3897
    ];

    const projInsertRes = await query(insertProjSql, projValues);

    // Insert Tasks
    const taskList = tasks && Array.isArray(tasks) && tasks.length > 0 ? tasks : [
      `Initial inspection of ${targetReq.service_category.toLowerCase()} issue`,
      `Execute repair work for ${targetReq.description}`,
      'Verify installation & test system functionality'
    ];

    for (let i = 0; i < taskList.length; i++) {
      await query(
        'INSERT INTO project_tasks (id, project_id, title, is_completed, task_order) VALUES ($1, $2, $3, $4, $5)',
        [`task-${Date.now()}-${i}`, newProjId, taskList[i], false, i + 1]
      );
    }

    // Insert Timeline Events
    await query(
      `INSERT INTO project_timeline (id, project_id, date, time, title, description, author_name, author_role, icon_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [`t-req-${Date.now()}`, newProjId, formattedDate, formattedTime, 'Service Request Submitted', targetReq.description, targetReq.client_name, 'Client', 'request']
    );

    await query(
      `INSERT INTO project_timeline (id, project_id, date, time, title, description, author_name, author_role, icon_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [`t-proj-${Date.now()}`, newProjId, formattedDate, formattedTime, 'Project Created & Assigned', `Converted to project (${projRef}). Assigned to ${worker?.name || 'Technician'}.`, 'ApexCare Admin', 'Company Admin', 'project']
    );

    const fullNewProject = await getFullProject(projInsertRes.rows[0]);
    res.status(201).json({ success: true, data: fullNewProject });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Workers Endpoints (CRUD: Add & Remove Workers)
app.get('/api/v1/workers', async (_req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM users WHERE role = 'WORKER' ORDER BY created_at DESC");
    const workers = result.rows.map((w) => ({
      id: w.id,
      name: w.name,
      roleTitle: w.role_title || 'Field Maintenance Specialist',
      phone: w.phone || '',
      email: w.email,
      avatarUrl: w.avatar_url || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
      status: w.status || 'Available',
      activeJobId: w.active_job_id
    }));
    res.json({ success: true, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

app.post('/api/v1/workers', async (req: Request, res: Response) => {
  try {
    const { name, roleTitle, phone, email, avatarUrl } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const workerId = `worker-${Date.now()}`;
    const workerEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}@apexcare-demo.ca`;
    const workerPhone = phone || '+1 (416) 555-0100';
    const workerAvatar = avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80';
    const title = roleTitle || 'Field Maintenance Specialist';

    const insertSql = `
      INSERT INTO users (id, name, email, phone, role, role_title, avatar_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await query(insertSql, [workerId, name, workerEmail, workerPhone, 'WORKER', title, workerAvatar, 'Available']);
    const w = result.rows[0];

    const newWorker = {
      id: w.id,
      name: w.name,
      roleTitle: w.role_title,
      phone: w.phone,
      email: w.email,
      avatarUrl: w.avatar_url,
      status: w.status
    };

    res.status(201).json({ success: true, data: newWorker });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

app.delete('/api/v1/workers/:id', async (req: Request, res: Response) => {
  try {
    const workerId = req.params.id;
    const checkRes = await query("SELECT * FROM users WHERE id = $1 AND role = 'WORKER'", [workerId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Technician not found' });
    }

    // Unassign worker from any active projects
    await query('UPDATE projects SET worker_id = NULL, worker_name = $1 WHERE worker_id = $2', ['Unassigned', workerId]);

    // Delete worker from users table
    await query('DELETE FROM users WHERE id = $1', [workerId]);

    res.json({ success: true, message: `Technician (${workerId}) successfully removed from roster.` });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`ApexCare Express REST API Server running on port ${PORT}`);
  console.log(`Connected to Neon PostgreSQL Database`);
});
