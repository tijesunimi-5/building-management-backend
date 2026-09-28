import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Initialize Chat Database Schema & Purge any initial seed data
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS chat_threads (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        project_id VARCHAR(64),
        client_id VARCHAR(64),
        client_name VARCHAR(255),
        last_message TEXT,
        last_message_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS chat_participants (
        id VARCHAR(64) PRIMARY KEY,
        thread_id VARCHAR(64) REFERENCES chat_threads(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        role_title VARCHAR(100),
        avatar_url TEXT,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(thread_id, user_id)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(64) PRIMARY KEY,
        thread_id VARCHAR(64) REFERENCES chat_threads(id) ON DELETE CASCADE,
        sender_id VARCHAR(64) NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        attachment_urls TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Purge legacy/dummy seed data if present
    await query(`DELETE FROM chat_threads WHERE id IN ('thread-support-1', 'thread-proj-501');`);
  } catch (err) {
    console.error('Error initializing chat tables:', err);
  }
})();

/**
 * DELETE /api/v1/messages/clear
 * Clear all chat messages and threads from database
 */
router.delete('/clear', async (_req: Request, res: Response) => {
  try {
    await query('TRUNCATE chat_messages, chat_participants, chat_threads CASCADE;');
    return res.json({ success: true, message: 'All chat threads and messages cleared successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

/**
 * GET /api/v1/messages/threads
 * List all conversation threads with participants
 */
router.get('/threads', async (_req: Request, res: Response) => {
  try {
    const threadsRes = await query('SELECT * FROM chat_threads ORDER BY last_message_time DESC');
    const threads = threadsRes.rows;

    const populatedThreads = await Promise.all(threads.map(async (t) => {
      const partsRes = await query('SELECT * FROM chat_participants WHERE thread_id = $1', [t.id]);
      const participants = partsRes.rows.map(p => ({
        userId: p.user_id,
        name: p.user_name,
        role: p.user_role,
        roleTitle: p.role_title,
        avatarUrl: p.avatar_url
      }));

      return {
        id: t.id,
        title: t.title,
        projectId: t.project_id,
        clientId: t.client_id,
        clientName: t.client_name,
        lastMessage: t.last_message,
        lastMessageTime: t.last_message_time,
        participants,
        createdAt: t.created_at
      };
    }));

    return res.json({ success: true, data: populatedThreads });
  } catch (error) {
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

/**
 * GET /api/v1/messages/threads/:id/messages
 * Get all messages for a specific conversation thread
 */
router.get('/threads/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const msgRes = await query('SELECT * FROM chat_messages WHERE thread_id = $1 ORDER BY created_at ASC', [id]);
    
    const messages = msgRes.rows.map(m => ({
      id: m.id,
      threadId: m.thread_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      content: m.content,
      attachmentUrls: m.attachment_urls || [],
      createdAt: m.created_at
    }));

    return res.json({ success: true, data: messages });
  } catch (error) {
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

/**
 * POST /api/v1/messages/threads
 * Create a new conversation thread
 */
router.post('/threads', async (req: Request, res: Response) => {
  try {
    const { title, projectId, clientId, clientName } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Thread title is required' });
    }

    const threadId = `thread-${Date.now()}`;
    const insertThreadSql = `
      INSERT INTO chat_threads (id, title, project_id, client_id, client_name, last_message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const newThreadRes = await query(insertThreadSql, [
      threadId,
      title,
      projectId || null,
      clientId || 'user-client-1',
      clientName || 'Valued Client',
      'Conversation thread started.'
    ]);
    const row = newThreadRes.rows[0];

    // Add initial participants (Client and Admin)
    await query(`
      INSERT INTO chat_participants (id, thread_id, user_id, user_name, user_role, role_title)
      VALUES 
        ($1, $2, $3, $4, 'client', 'Homeowner'),
        ($5, $2, 'admin-1', 'ApexCare Dispatch Admin', 'admin', 'Technical Dispatch')
      ON CONFLICT DO NOTHING
    `, [`p-${Date.now()}-c`, threadId, clientId || 'user-client-1', clientName || 'Valued Client', `p-${Date.now()}-a`]);

    return res.status(201).json({
      success: true,
      data: {
        id: row.id,
        title: row.title,
        projectId: row.project_id,
        clientId: row.client_id,
        clientName: row.client_name,
        lastMessage: row.last_message,
        lastMessageTime: row.last_message_time,
        createdAt: row.created_at
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

/**
 * POST /api/v1/messages/threads/:id/messages
 * Post a new message to a conversation thread
 */
router.post('/threads/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { senderId, senderName, senderRole, content, attachmentUrls } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    const msgId = `msg-${Date.now()}`;
    const insertMsgSql = `
      INSERT INTO chat_messages (id, thread_id, sender_id, sender_name, sender_role, content, attachment_urls)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const msgRes = await query(insertMsgSql, [
      msgId,
      id,
      senderId || 'user-client-1',
      senderName || 'Client User',
      senderRole || 'client',
      content.trim(),
      attachmentUrls || []
    ]);
    const row = msgRes.rows[0];

    // Update last_message on thread
    await query(`
      UPDATE chat_threads 
      SET last_message = $1, last_message_time = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [content.trim(), id]);

    return res.status(201).json({
      success: true,
      data: {
        id: row.id,
        threadId: row.thread_id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        senderRole: row.sender_role,
        content: row.content,
        attachmentUrls: row.attachment_urls || [],
        createdAt: row.created_at
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

/**
 * POST /api/v1/messages/threads/:id/participants
 * Invite a worker / technician or other user to the conversation thread
 */
router.post('/threads/:id/participants', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName, userRole, roleTitle, avatarUrl } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ success: false, message: 'userId and userName are required to invite participant.' });
    }

    const partId = `part-${Date.now()}`;
    const insertSql = `
      INSERT INTO chat_participants (id, thread_id, user_id, user_name, user_role, role_title, avatar_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (thread_id, user_id) DO UPDATE SET user_name = EXCLUDED.user_name, avatar_url = EXCLUDED.avatar_url
      RETURNING *
    `;

    const result = await query(insertSql, [
      partId,
      id,
      userId,
      userName,
      userRole || 'worker',
      roleTitle || 'Field Technician',
      avatarUrl || null
    ]);

    // Also post a system message indicating participant joined
    const sysMsgId = `sys-${Date.now()}`;
    const joinText = `${userName} (${roleTitle || 'Field Technician'}) was invited to the conversation thread.`;

    await query(`
      INSERT INTO chat_messages (id, thread_id, sender_id, sender_name, sender_role, content)
      VALUES ($1, $2, 'system', 'ApexCare System', 'admin', $3)
    `, [sysMsgId, id, joinText]);

    await query(`
      UPDATE chat_threads 
      SET last_message = $1, last_message_time = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [joinText, id]);

    return res.status(200).json({
      success: true,
      message: joinText,
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: (error as Error).message });
  }
});

export default router;
