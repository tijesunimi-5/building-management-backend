import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Migration: Ensure user setting preference columns exist in Neon PostgreSQL
(async () => {
  try {
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_address TEXT;");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact TEXT;");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(50) DEFAULT 'Email';");
  } catch (err) {
    console.warn('User settings columns migration warning:', err);
  }
})();

/**
 * POST /api/v1/auth/login
 * Hassle-free Email login for Clients/Workers, Password-protected for Admin
 */
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
          phone: user.phone || '',
          role: user.role.toLowerCase(), // 'admin', 'client', 'worker'
          roleTitle: user.role_title,
          avatarUrl: user.avatar_url,
          primaryAddress: user.primary_address || '',
          emergencyContact: user.emergency_contact || '',
          preferredContactMethod: user.preferred_contact_method || 'Email'
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
        phone: newUser.phone || '',
        role: 'client',
        roleTitle: newUser.role_title,
        avatarUrl: newUser.avatar_url,
        primaryAddress: newUser.primary_address || '',
        emergencyContact: newUser.emergency_contact || '',
        preferredContactMethod: newUser.preferred_contact_method || 'Email'
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

/**
 * GET /api/v1/auth/profile/:id
 * Retrieve full user settings profile from PostgreSQL DB
 */
router.get('/profile/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM users WHERE id = $1 OR LOWER(email) = LOWER($1)', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const user = result.rows[0];
    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role.toLowerCase(),
        roleTitle: user.role_title,
        avatarUrl: user.avatar_url,
        primaryAddress: user.primary_address || '',
        emergencyContact: user.emergency_contact || '',
        preferredContactMethod: user.preferred_contact_method || 'Email'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

/**
 * PUT /api/v1/auth/profile/:id
 * Update user settings profile in PostgreSQL DB
 */
router.put('/profile/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, primaryAddress, emergencyContact, preferredContactMethod, avatarUrl } = req.body;

    // First check if user exists by ID or email
    const checkUser = await query('SELECT * FROM users WHERE id = $1 OR (email IS NOT NULL AND LOWER(email) = LOWER($2))', [id, email || '']);

    let targetId = id;
    if (checkUser.rows.length > 0) {
      targetId = checkUser.rows[0].id;
    } else {
      // Upsert new user row if ID didn't exist yet
      const insertNew = await query(
        `INSERT INTO users (id, email, name, phone, role, role_title, primary_address, emergency_contact, preferred_contact_method)
         VALUES ($1, $2, $3, $4, 'CLIENT', 'Property Client', $5, $6, $7)
         ON CONFLICT (id) DO NOTHING
         RETURNING *`,
        [targetId, email || 'client@example.ca', name || 'Client User', phone || '', primaryAddress || '', emergencyContact || '', preferredContactMethod || 'Email']
      );
      if (insertNew.rows.length > 0) {
        const u = insertNew.rows[0];
        return res.json({
          success: true,
          data: {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone || '',
            role: u.role.toLowerCase(),
            roleTitle: u.role_title,
            avatarUrl: u.avatar_url,
            primaryAddress: u.primary_address || '',
            emergencyContact: u.emergency_contact || '',
            preferredContactMethod: u.preferred_contact_method || 'Email'
          }
        });
      }
    }

    const updateSql = `
      UPDATE users 
      SET name = COALESCE(NULLIF($1, ''), name),
          email = COALESCE(NULLIF($2, ''), email),
          phone = COALESCE($3, phone),
          primary_address = COALESCE($4, primary_address),
          emergency_contact = COALESCE($5, emergency_contact),
          preferred_contact_method = COALESCE($6, preferred_contact_method),
          avatar_url = COALESCE($7, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;

    const values = [name, email, phone, primaryAddress, emergencyContact, preferredContactMethod, avatarUrl, targetId];
    const result = await query(updateSql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User settings update failed' });
    }

    const user = result.rows[0];

    // If client updated name/phone, update any corresponding client properties in properties table
    if (name || phone || email) {
      try {
        await query(
          `UPDATE properties 
           SET client_name = COALESCE(NULLIF($1, ''), client_name),
               client_phone = COALESCE(NULLIF($2, ''), client_phone)
           WHERE LOWER(client_email) = LOWER($3)`,
          [name, phone, user.email]
        );
      } catch (err) {
        console.warn('Property client name update warning:', err);
      }
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role.toLowerCase(),
        roleTitle: user.role_title,
        avatarUrl: user.avatar_url,
        primaryAddress: user.primary_address || '',
        emergencyContact: user.emergency_contact || '',
        preferredContactMethod: user.preferred_contact_method || 'Email'
      }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

export default router;
