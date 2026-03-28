const express = require('express');
const router = express.Router();
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

const imapConfig = {
  user: process.env.MAIL_USER,
  password: process.env.MAIL_PASSWORD,
  host: process.env.MAIL_HOST || 'ssl0.ovh.net',
  port: parseInt(process.env.MAIL_PORT_IMAP) || 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  connTimeout: 10000,
  authTimeout: 10000
};

const smtpTransporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'ssl0.ovh.net',
  port: parseInt(process.env.MAIL_PORT_SMTP) || 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
});

router.get('/inbox', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const imap = new Imap(imapConfig);
  const emails = [];
  let responded = false;

  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      try { imap.end(); } catch(e) {}
      res.status(504).json({ error: 'Timeout connexion IMAP' });
    }
  }, 15000);

  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        clearTimeout(timeout);
        responded = true;
        imap.end();
        return res.status(500).json({ error: 'Erreur ouverture INBOX: ' + err.message });
      }

      const total = box.messages.total;
      if (total === 0) {
        clearTimeout(timeout);
        responded = true;
        imap.end();
        return res.json([]);
      }

      const start = Math.max(1, total - limit + 1);
      const fetch = imap.seq.fetch(`${start}:${total}`, { bodies: '', struct: true });

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
                preview: (parsed.text || '').substring(0, 200),
                source: 'email'
              });
            }
          });
        });
      });

      fetch.once('end', () => { imap.end(); });
    });
  });

  imap.once('end', () => {
    if (!responded) {
      clearTimeout(timeout);
      responded = true;
      res.json(emails.reverse());
    }
  });

  imap.once('error', (err) => {
    if (!responded) {
      clearTimeout(timeout);
      responded = true;
      res.status(500).json({ error: 'Erreur IMAP: ' + err.message });
    }
  });

  imap.connect();
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
