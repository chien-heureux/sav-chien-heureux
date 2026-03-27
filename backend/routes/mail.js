const express = require('express');
const router = express.Router();
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

const imapConfig = {
  user: process.env.MAIL_USER,
  password: process.env.MAIL_PASSWORD,
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT_IMAP),
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

const smtpTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT_SMTP),
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
});

// GET /api/mail/inbox — lire la boîte de réception
router.get('/inbox', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const imap = new Imap(imapConfig);
  const emails = [];

  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) { imap.end(); return res.status(500).json({ error: 'Erreur ouverture INBOX' }); }

      const total = box.messages.total;
      if (total === 0) { imap.end(); return res.json([]); }

      const start = Math.max(1, total - limit + 1);
      const fetch = imap.seq.fetch(`${start}:${total}`, {
        bodies: '',
        struct: true,
        envelope: true
      });

      fetch.on('message', (msg) => {
        let uid;
        msg.on('attributes', (attrs) => { uid = attrs.uid; });
        msg.on('body', (stream) => {
          simpleParser(stream, (err, parsed) => {
            if (!err) {
              emails.push({
                uid,
                from: parsed.from?.text || '',
                subject: parsed.subject || '(sans objet)',
                date: parsed.date,
                text: parsed.text?.substring(0, 500) || '',
                html: parsed.html || '',
                read: false,
                source: 'email'
              });
            }
          });
        });
      });

      fetch.once('end', () => {
        imap.end();
      });
    });
  });

  imap.once('end', () => {
    res.json(emails.reverse());
  });

  imap.once('error', (err) => {
    console.error('IMAP error:', err);
    res.status(500).json({ error: 'Erreur connexion mail' });
  });

  imap.connect();
});

// POST /api/mail/send — envoyer un email
router.post('/send', async (req, res) => {
  try {
    const { to, subject, text, replyTo } = req.body;
    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'to, subject et text sont requis' });
    }

    await smtpTransporter.sendMail({
      from: `Chien Heureux SAV <${process.env.MAIL_USER}>`,
      to,
      subject,
      text,
      inReplyTo: replyTo || undefined
    });

    res.json({ success: true, message: 'Email envoyé' });
  } catch (err) {
    console.error('SMTP send error:', err);
    res.status(500).json({ error: 'Erreur envoi email' });
  }
});

module.exports = router;
