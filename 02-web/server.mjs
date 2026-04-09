import express from 'express';
import cors from 'cors';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

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

// ==========================================
// AI 公式生成（ProxyCLI via gRPC）
// ==========================================

// 讀取 .env
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* .env 不存在就跳過 */ }
}
loadEnv();

const PROXY_HOST = process.env.AI_PROXY_HOST || 'cli.twloop.com';
const PROXY_PORT = process.env.AI_PROXY_PORT || '443';
const PROXY_TOKEN = process.env.AI_PROXY_TOKEN || '';
const PROXY_TLS = (process.env.AI_PROXY_TLS || 'true').toLowerCase() === 'true';

// 載入 gRPC proto
const packageDef = protoLoader.loadSync(join(__dirname, 'aiproxy.proto'), {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const aiproxyProto = grpc.loadPackageDefinition(packageDef).aiproxy;

// 建立 gRPC channel
const grpcCreds = PROXY_TLS ? grpc.credentials.createSsl() : grpc.credentials.createInsecure();
const grpcClient = new aiproxyProto.AIProxy(`${PROXY_HOST}:${PROXY_PORT}`, grpcCreds);

function proxyComplete(prompt, system, provider = 'claude', model = 'sonnet') {
  return new Promise((resolve, reject) => {
    const meta = new grpc.Metadata();
    if (PROXY_TOKEN) meta.add('authorization', `Bearer ${PROXY_TOKEN}`);

    grpcClient.Complete({
      provider, model, prompt, system,
      max_tokens: 2048,
      project: process.env.AI_PROXY_PROJECT || 'mathbox',
      group: process.env.AI_PROXY_GROUP || 'webdev',
    }, meta, { deadline: Date.now() + 60000 }, (err, resp) => {
      if (err) reject(new Error(err.details || err.message));
      else resolve(resp);
    });
  });
}

const FORMULA_SYSTEM_PROMPT = `你是 MathBox 公式生成助手。使用者會描述一個物理、工程或數學公式，你需要輸出嚴格符合以下 JSON 格式的公式設定檔。

輸出格式（只輸出 JSON，不要其他文字）：
{
  "id": "snake_case_id",
  "name": "公式中文名稱",
  "category": "學科分類（電路學/物理/力學/微積分/熱力學/流體力學/電磁學）",
  "latex": "LaTeX 顯示公式（例如 V = I \\\\cdot R）",
  "mathjs": "MathJS 計算表達式（例如 I * R），只寫等號右邊",
  "variables": [
    { "symbol": "變數符號", "name": "中文名稱", "type": "物理量類型", "defaultUnit": "預設單位" }
  ],
  "result": { "symbol": "結果符號", "name": "中文名稱", "type": "物理量類型", "defaultUnit": "預設單位" }
}

可用的 type 值：length, mass, time, voltage, current, resistance, capacitance, inductance, force, pressure, energy, power, frequency, temperature_delta, dimensionless, electric_charge, temperature, velocity, angle, area, volume, momentum, torque, magnetic_flux_density, magnetic_flux, permittivity, permeability, conductivity, angular_frequency, wavenumber, gravitational_field, energy_density, power_density

注意事項：
- latex 中的反斜線要雙重跳脫（\\\\cdot 而非 \\cdot）
- mathjs 只寫等號右邊的計算式，用標準數學運算符
- 如果公式可以用不同方式表達，選最常用的形式
- id 用 snake_case，例如 ohms_law, kinetic_energy
- 如果使用者的描述不夠明確，用最合理的預設解釋`;

app.post('/api/ai/generate-formula', async (req, res) => {
  const { prompt, history } = req.body;
  if (!prompt) return res.status(400).json({ error: '請輸入公式描述' });
  if (!PROXY_TOKEN || PROXY_TOKEN === '你的token') {
    return res.status(500).json({ error: '尚未設定 AI_PROXY_TOKEN，請在 .env 中填入你的 ProxyCLI token' });
  }

  try {
    let fullPrompt = prompt;
    if (history && history.length > 0) {
      const ctx = history.map(h => `${h.role === 'user' ? '使用者' : 'AI'}：${h.content}`).join('\n');
      fullPrompt = `${ctx}\n使用者：${prompt}`;
    }

    const resp = await proxyComplete(fullPrompt, FORMULA_SYSTEM_PROMPT);
    const content = resp.content || '';

    // 嘗試解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const formula = JSON.parse(jsonMatch[0]);
      res.json({ formula, raw: content });
    } else {
      res.json({ message: content, formula: null });
    }
  } catch (err) {
    console.error('AI 生成錯誤:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Production 模式：serve 前端靜態檔
app.use(express.static(join(__dirname, 'dist')));
app.get('*path', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

initializeDB().then(() => {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });
}).catch(err => {
  console.error("❌ Database initialization failed:", err);
});
