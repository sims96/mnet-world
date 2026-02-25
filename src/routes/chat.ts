import { Hono } from 'hono';
import type { Env, ChatSession, ChatMessage } from '../types';

type ChatEnv = { Bindings: Env };

// ── Public Chat Routes (no auth) ──────────────────────────────────────────────

export const publicChatRoutes = new Hono<ChatEnv>();

// POST /session - Create or resume a chat session
publicChatRoutes.post('/session', async (c) => {
  try {
    const body = await c.req.json<{
      session_token?: string;
      visitor_name?: string;
    }>();

    // Try to resume existing session
    if (body.session_token) {
      const session = await c.env.DB.prepare(
        'SELECT * FROM chat_sessions WHERE session_token = ?'
      ).bind(body.session_token).first<ChatSession>();

      if (session) {
        return c.json({ session });
      }
    }

    // Create new session
    const token = crypto.randomUUID();
    const name = body.visitor_name?.trim() || 'Visitor';

    await c.env.DB.prepare(
      'INSERT INTO chat_sessions (visitor_name, session_token) VALUES (?, ?)'
    ).bind(name, token).run();

    const session = await c.env.DB.prepare(
      'SELECT * FROM chat_sessions WHERE session_token = ?'
    ).bind(token).first<ChatSession>();

    return c.json({ session }, 201);
  } catch (e) {
    return c.json({ error: 'Failed to create chat session' }, 500);
  }
});

// POST /message - Visitor sends a message
publicChatRoutes.post('/message', async (c) => {
  try {
    const body = await c.req.json<{
      session_token: string;
      message: string;
    }>();

    if (!body.session_token || !body.message?.trim()) {
      return c.json({ error: 'Session token and message are required' }, 400);
    }

    const message = body.message.trim().slice(0, 2000);

    const session = await c.env.DB.prepare(
      'SELECT * FROM chat_sessions WHERE session_token = ? AND status = ?'
    ).bind(body.session_token, 'active').first<ChatSession>();

    if (!session) {
      return c.json({ error: 'Chat session not found or closed' }, 404);
    }

    await c.env.DB.prepare(
      'INSERT INTO chat_messages (session_id, sender_type, message) VALUES (?, ?, ?)'
    ).bind(session.id, 'visitor', message).run();

    await c.env.DB.prepare(
      "UPDATE chat_sessions SET last_message_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).bind(session.id).run();

    const created = await c.env.DB.prepare(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 1'
    ).bind(session.id).first<ChatMessage>();

    return c.json({ success: true, message: created }, 201);
  } catch (e) {
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// GET /messages - Visitor polls for messages
publicChatRoutes.get('/messages', async (c) => {
  try {
    const sessionToken = c.req.query('session_token');
    const after = c.req.query('after');

    if (!sessionToken) {
      return c.json({ error: 'Session token is required' }, 400);
    }

    const session = await c.env.DB.prepare(
      'SELECT * FROM chat_sessions WHERE session_token = ?'
    ).bind(sessionToken).first<ChatSession>();

    if (!session) {
      return c.json({ error: 'Chat session not found' }, 404);
    }

    let messages;
    if (after) {
      const result = await c.env.DB.prepare(
        'SELECT * FROM chat_messages WHERE session_id = ? AND created_at > ? ORDER BY created_at ASC'
      ).bind(session.id, after).all<ChatMessage>();
      messages = result.results;
    } else {
      const result = await c.env.DB.prepare(
        'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 50'
      ).bind(session.id).all<ChatMessage>();
      messages = result.results;
    }

    return c.json({ messages, session_status: session.status });
  } catch (e) {
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

// ── Admin Chat Routes (behind authMiddleware) ─────────────────────────────────

export const adminChatRoutes = new Hono<ChatEnv>();

// GET /sessions - List all chat sessions with unread counts
adminChatRoutes.get('/sessions', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT cs.*,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.session_id = cs.id AND cm.sender_type = 'visitor' AND cm.is_read = 0) as unread_count,
        (SELECT cm.message FROM chat_messages cm WHERE cm.session_id = cs.id ORDER BY cm.created_at DESC LIMIT 1) as last_message
      FROM chat_sessions cs
      ORDER BY CASE WHEN cs.status = 'active' THEN 0 ELSE 1 END, cs.last_message_at DESC
    `).all();
    return c.json({ sessions: results });
  } catch (e) {
    return c.json({ error: 'Failed to fetch chat sessions' }, 500);
  }
});

// GET /sessions/:id/messages - Get all messages for a session
adminChatRoutes.get('/sessions/:id/messages', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const session = await c.env.DB.prepare(
      'SELECT * FROM chat_sessions WHERE id = ?'
    ).bind(id).first<ChatSession>();

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const { results: messages } = await c.env.DB.prepare(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
    ).bind(id).all<ChatMessage>();

    return c.json({ session, messages });
  } catch (e) {
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

// POST /sessions/:id/message - Admin sends a reply
adminChatRoutes.post('/sessions/:id/message', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json<{ message: string }>();

    if (!body.message?.trim()) {
      return c.json({ error: 'Message is required' }, 400);
    }

    const message = body.message.trim().slice(0, 2000);

    const session = await c.env.DB.prepare(
      'SELECT * FROM chat_sessions WHERE id = ? AND status = ?'
    ).bind(id, 'active').first<ChatSession>();

    if (!session) {
      return c.json({ error: 'Session not found or closed' }, 404);
    }

    await c.env.DB.prepare(
      'INSERT INTO chat_messages (session_id, sender_type, message, is_read) VALUES (?, ?, ?, 1)'
    ).bind(id, 'admin', message).run();

    await c.env.DB.prepare(
      "UPDATE chat_sessions SET last_message_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();

    const created = await c.env.DB.prepare(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 1'
    ).bind(id).first<ChatMessage>();

    return c.json({ success: true, message: created }, 201);
  } catch (e) {
    return c.json({ error: 'Failed to send reply' }, 500);
  }
});

// PUT /sessions/:id/read - Mark visitor messages as read
adminChatRoutes.put('/sessions/:id/read', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    await c.env.DB.prepare(
      "UPDATE chat_messages SET is_read = 1 WHERE session_id = ? AND sender_type = 'visitor' AND is_read = 0"
    ).bind(id).run();

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to mark messages as read' }, 500);
  }
});

// PUT /sessions/:id/close - Close a chat session
adminChatRoutes.put('/sessions/:id/close', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const session = await c.env.DB.prepare(
      'SELECT * FROM chat_sessions WHERE id = ?'
    ).bind(id).first<ChatSession>();

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    await c.env.DB.prepare(
      "UPDATE chat_sessions SET status = 'closed', updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to close session' }, 500);
  }
});
