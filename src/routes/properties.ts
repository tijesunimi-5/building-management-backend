import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Get All Properties Endpoint
router.get('/', async (_req: Request, res: Response) => {
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

export default router;
