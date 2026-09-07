import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

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

// Get All Projects
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM projects ORDER BY created_at DESC');
    const fullProjects = await Promise.all(result.rows.map((row) => getFullProject(row)));
    res.json({ success: true, data: fullProjects });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Get Project By ID
router.get('/:id', async (req: Request, res: Response) => {
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
router.post('/triage', async (req: Request, res: Response) => {
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

export default router;
