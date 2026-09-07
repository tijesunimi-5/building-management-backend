import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Get Field Technicians
router.get('/', async (_req: Request, res: Response) => {
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

// Add Field Technician
router.post('/', async (req: Request, res: Response) => {
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

// Remove Field Technician
router.delete('/:id', async (req: Request, res: Response) => {
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

export default router;
