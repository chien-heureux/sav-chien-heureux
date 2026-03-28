const express = require('express');
const router = express.Router();
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

const getImapClient = () => new ImapFlow({
  host: process.env.MAIL_HOST || 'ssl0.ovh.net',
  port: parseInt(process.env.MAIL_PORT_IMAP) || 993,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  },
  logger: false
});

const smtpTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'ssl0.ovh.net',
  port: parseInt(process.env.MAIL_PORT_SMTP) || 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
});

router.get('/inbox', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const client = getImapClient();
  try {
    await client.connect();
    const emails = [];
    const mailbox = await client.mailboxOpen('INBOX');
    const total = mailbox.exists;
    if (total === 0) {
      await client.logout();
      return res.json([]);
    }
    const start = Math.max(1, total - limit + 1);
    for await (let message of client.fetch(`${start}:${total}`, { source: true })) {
      try {
        const parsed = await simpleParser(message.source);
        emails.push({
          uid: message.uid,
          seq: message.seq,
          from: parsed.from?.text || '',
          subject: parsed.subject || '(sans objet)',
          date: parsed.date,
          preview: (parsed.text || '').substring(0, 200),
          source: 'email'
        });
      } catch(e) {}
    }
    await client.logout();
    res.json(emails.reverse());
  } catch (err) {
    try { await client.logout(); } catch(e) {}
    res.status(500).json({ error: 'Erreur IMAP: ' + err.message });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    if (!to || !subject || !text) return res.status(400).json({ error: 'to, subject et text requis' });
    await smtpTransporter.sendMail({
      from: `Chien Heureux SAV <${process.env.MAIL_USER}>`,
      to, subject, text
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur envoi: ' + err.message });
  }
});

module.exports = router;
