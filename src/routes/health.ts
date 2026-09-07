import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Health Check Endpoint
router.get('/', async (_req: Request, res: Response) => {
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

export default router;
