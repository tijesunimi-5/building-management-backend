import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Service Requests Endpoints
router.get('/', async (_req: Request, res: Response) => {
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

router.post('/', async (req: Request, res: Response) => {
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

export default router;
