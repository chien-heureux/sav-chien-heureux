const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'sav.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    source TEXT DEFAULT 'manuel',
    category TEXT DEFAULT 'autre',
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'ouvert',
    subject TEXT NOT NULL,
    description TEXT,
    order_id TEXT,
    assigned_to TEXT DEFAULT 'Joe',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    source_id TEXT,
    client_name TEXT,
    client_email TEXT,
    preview TEXT,
    unread INTEGER DEFAULT 1,
    ticket_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
