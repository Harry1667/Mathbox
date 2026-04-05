import express from 'express';
import cors from 'cors';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Set storage to src/database inside the react project
const dbPath = join(__dirname, 'src', 'database', 'formula_db.sqlite');

let db;
async function initializeDB() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS formulas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        latex TEXT NOT NULL,
        mathjs TEXT NOT NULL,
        variables TEXT NOT NULL,
        result TEXT NOT NULL,
        note TEXT
    )
  `);
  console.log(`✅ SQLite Database connected/created at: ${dbPath}`);
}

app.get('/api/formulas', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM formulas ORDER BY rowid DESC');
    const formulas = rows.map(row => ({
      ...row,
      variables: JSON.parse(row.variables),
      result: JSON.parse(row.result)
    }));
    res.json(formulas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/formulas', async (req, res) => {
  const f = req.body;
  try {
    await db.run(
      'INSERT OR REPLACE INTO formulas (id, name, category, latex, mathjs, variables, result, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      f.id, f.name, f.category, f.latex, f.mathjs, JSON.stringify(f.variables), JSON.stringify(f.result), f.note || ''
    );
    res.json({ success: true, id: f.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/formulas/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM formulas WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/formulas/:id/note', async (req, res) => {
  const { note } = req.body;
  try {
    await db.run('UPDATE formulas SET note = ? WHERE id = ?', note, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initializeDB().then(() => {
  const port = 3001;
  app.listen(port, () => {
    console.log(`🚀 API Server running at http://localhost:${port}`);
  });
}).catch(err => {
  console.error("❌ Database initialization failed:", err);
});
