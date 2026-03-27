const express = require('express');
const router = express.Router();
const db = require('../db/init');

function generateRef() {
  const count = db.prepare('SELECT COUNT(*) as c FROM tickets').get().c;
  return `T-${String(count + 1).padStart(3, '0')}`;
}

// GET /api/tickets — liste tous les tickets
router.get('/', (req, res) => {
  try {
    const { status, priority, category } = req.query;
    let query = 'SELECT * FROM tickets';
    const conditions = [];
    const params = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (priority) { conditions.push('priority = ?'); params.push(priority); }
    if (category) { conditions.push('category = ?'); params.push(category); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';

    const tickets = db.prepare(query).all(...params);
    res.json(tickets);
  } catch (err) {
    console.error('Tickets list error:', err);
    res.status(500).json({ error: 'Erreur liste tickets' });
  }
});

// GET /api/tickets/:id — détail ticket + messages
router.get('/:id', (req, res) => {
  try {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

    const messages = db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id);
    res.json({ ...ticket, messages });
  } catch (err) {
    res.status(500).json({ error: 'Erreur ticket' });
  }
});

// POST /api/tickets — créer un ticket
router.post('/', (req, res) => {
  try {
    const { client_name, client_email, source, category, priority, subject, description, order_id, assigned_to } = req.body;
    if (!client_name || !subject) return res.status(400).json({ error: 'client_name et subject requis' });

    const reference = generateRef();
    const result = db.prepare(`
      INSERT INTO tickets (reference, client_name, client_email, source, category, priority, subject, description, order_id, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(reference, client_name, client_email || '', source || 'manuel', category || 'autre', priority || 'normal', subject, description || '', order_id || '', assigned_to || 'Joe');

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(ticket);
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ error: 'Erreur création ticket' });
  }
});

// PATCH /api/tickets/:id — mettre à jour statut/priorité/assignation
router.patch('/:id', (req, res) => {
  try {
    const { status, priority, assigned_to, category } = req.body;
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

    db.prepare(`
      UPDATE tickets SET
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        assigned_to = COALESCE(?, assigned_to),
        category = COALESCE(?, category),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(status || null, priority || null, assigned_to || null, category || null, req.params.id);

    const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erreur mise à jour ticket' });
  }
});

// POST /api/tickets/:id/messages — ajouter un message au ticket
router.post('/:id/messages', (req, res) => {
  try {
    const { author, content } = req.body;
    if (!author || !content) return res.status(400).json({ error: 'author et content requis' });

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket introuvable' });

    db.prepare('INSERT INTO ticket_messages (ticket_id, author, content) VALUES (?, ?, ?)').run(ticket.id, author, content);
    db.prepare("UPDATE tickets SET updated_at = datetime('now') WHERE id = ?").run(ticket.id);

    const messages = db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erreur ajout message' });
  }
});

// DELETE /api/tickets/:id — supprimer un ticket
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM ticket_messages WHERE ticket_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tickets WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur suppression ticket' });
  }
});

module.exports = router;
