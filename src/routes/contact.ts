import { Hono } from 'hono';
import type { Env, ContactSubmission } from '../types';

type ContactEnv = { Bindings: Env };

const contact = new Hono<ContactEnv>();

// POST / - public contact form submission
contact.post('/', async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      email: string;
      subject?: string;
      message: string;
    }>();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return c.json({ error: 'Name is required' }, 400);
    }
    if (!body.email || !body.email.trim()) {
      return c.json({ error: 'Email is required' }, 400);
    }
    if (!body.message || !body.message.trim()) {
      return c.json({ error: 'Message is required' }, 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return c.json({ error: 'Invalid email address' }, 400);
    }

    await c.env.DB.prepare(
      'INSERT INTO contact_submissions (name, email, subject, message) VALUES (?, ?, ?, ?)'
    ).bind(
      body.name.trim(),
      body.email.trim(),
      body.subject?.trim() || null,
      body.message.trim()
    ).run();

    return c.json({ success: true, message: 'Thank you for your message! We will get back to you soon.' }, 201);
  } catch (e) {
    return c.json({ error: 'Failed to submit contact form' }, 500);
  }
});

// GET / - admin: list all submissions
contact.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM contact_submissions ORDER BY created_at DESC'
    ).all<ContactSubmission>();
    return c.json({ submissions: results });
  } catch (e) {
    return c.json({ error: 'Failed to fetch submissions' }, 500);
  }
});

// PUT /:id/read - mark as read
contact.put('/:id/read', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const existing = await c.env.DB.prepare(
      'SELECT * FROM contact_submissions WHERE id = ?'
    ).bind(id).first<ContactSubmission>();

    if (!existing) {
      return c.json({ error: 'Submission not found' }, 404);
    }

    await c.env.DB.prepare(
      'UPDATE contact_submissions SET is_read = 1 WHERE id = ?'
    ).bind(id).run();

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to update submission' }, 500);
  }
});

// DELETE /:id - delete submission
contact.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const existing = await c.env.DB.prepare(
      'SELECT * FROM contact_submissions WHERE id = ?'
    ).bind(id).first<ContactSubmission>();

    if (!existing) {
      return c.json({ error: 'Submission not found' }, 404);
    }

    await c.env.DB.prepare(
      'DELETE FROM contact_submissions WHERE id = ?'
    ).bind(id).run();

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Failed to delete submission' }, 500);
  }
});

export default contact;
