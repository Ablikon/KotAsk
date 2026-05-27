import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// Auto-initialize DB tables on startup
const initDb = async () => {
    try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS entries (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            seen_status BOOLEAN DEFAULT FALSE,
            warmth_status BOOLEAN DEFAULT FALSE,
            admin_comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        // Provide backwards compatibility (add columns if not exists)
        await pool.query('ALTER TABLE entries ADD COLUMN IF NOT EXISTS warmth_status BOOLEAN DEFAULT FALSE');
        await pool.query('ALTER TABLE entries ADD COLUMN IF NOT EXISTS admin_comment TEXT');
        
        console.log('Database tables verified/initialized.');
    } catch (err) {
        console.error('Failed to initialize database tables:', err);
    }
};
initDb();

// Create tables if they don't exist (manual fallback)
app.get('/api/init-db', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        seen_status BOOLEAN DEFAULT FALSE,
        warmth_status BOOLEAN DEFAULT FALSE,
        admin_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('ALTER TABLE entries ADD COLUMN IF NOT EXISTS warmth_status BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE entries ADD COLUMN IF NOT EXISTS admin_comment TEXT');
    
    res.json({ message: 'Database initialized' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Endpoints for Entries

// Telegram bot setup
async function sendTelegramNotification(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.error('Telegram config missing in .env');
    return;
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Telegram API Error:', data);
    } else {
      console.log('Telegram notification sent successfully.');
    }
  } catch (err) {
    console.error('Telegram notification failed:', err);
  }
}

app.post('/api/notify-visit', (req, res) => {
  sendTelegramNotification('👀 Она только что зашла на сайт...');
  res.json({ success: true });
});

app.post('/api/entries', async (req, res) => {
  const { content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO entries (content) VALUES ($1) RETURNING *',
      [content]
    );
    sendTelegramNotification(`💌 Новая запись от неё:\n\n${content}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

app.get('/api/entries', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM entries ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Basic Server Sent Events implementation
let clients = [];

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

app.post('/api/heart', (req, res) => {
  clients.forEach(client => client.write(`data: ${JSON.stringify({ type: 'HEART' })}\n\n`));
  res.json({ success: true });
});

app.post('/api/photo', (req, res) => {
  const randomNum = Math.floor(Math.random() * 25) + 1;
  const photoUrl = `/gallery/photo${randomNum}.JPG`;
  
  clients.forEach(client => client.write(`data: ${JSON.stringify({ type: 'PHOTO', photoUrl })}\n\n`));
  res.json({ success: true, photoUrl });
});

app.post('/api/seen', async (req, res) => {
    const { id } = req.body;
    try {
        await pool.query('UPDATE entries SET seen_status = TRUE WHERE id = $1', [id]);
        clients.forEach(client => client.write(`data: ${JSON.stringify({ type: 'SEEN', id })}\n\n`));
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

app.post('/api/warmth', async (req, res) => {
    const { id, warmth_status } = req.body;
    try {
        await pool.query('UPDATE entries SET warmth_status = $1 WHERE id = $2', [warmth_status, id]);
        clients.forEach(client => client.write(`data: ${JSON.stringify({ type: 'UPDATE_ENTRY', id })}\n\n`));
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update warmth' });
    }
});

app.post('/api/comment', async (req, res) => {
    const { id, admin_comment } = req.body;
    try {
        await pool.query('UPDATE entries SET admin_comment = $1 WHERE id = $2', [admin_comment, id]);
        clients.forEach(client => client.write(`data: ${JSON.stringify({ type: 'UPDATE_ENTRY', id })}\n\n`));
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update comment' });
    }
});

app.delete('/api/entries/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM entries WHERE id = $1', [id]);
        clients.forEach(client => client.write(`data: ${JSON.stringify({ type: 'DELETE_ENTRY', id })}\n\n`));
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
