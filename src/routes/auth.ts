import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Authentication Endpoint (Hassle-free Email for Clients/Workers, Password-protected for Admin)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Admin Role requires password verification
      if (user.role === 'ADMIN') {
        if (!password || (user.password && user.password !== password)) {
          return res.status(401).json({ success: false, message: 'Invalid Admin credentials. Password incorrect.' });
        }
      }

      return res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role.toLowerCase(), // 'admin', 'client', 'worker'
          roleTitle: user.role_title,
          avatarUrl: user.avatar_url
        }
      });
    }

    // If user does not exist and password was provided, block unauthorized admin attempts
    if (password) {
      return res.status(401).json({ success: false, message: 'Admin account not found for this email.' });
    }

    // Auto-create new Client user with just Email (Hassle-free onboarding)
    const newUserId = `user-${Date.now()}`;
    const nameFromEmail = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const insertSql = `
      INSERT INTO users (id, email, name, role, role_title, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const newRes = await query(insertSql, [newUserId, cleanEmail, nameFromEmail, 'CLIENT', 'Property Client', 'Available']);
    const newUser = newRes.rows[0];

    return res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: 'client',
        roleTitle: newUser.role_title,
        avatarUrl: newUser.avatar_url
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

export default router;
