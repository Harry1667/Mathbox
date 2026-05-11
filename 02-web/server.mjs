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
        mode TEXT DEFAULT 'algebraic',
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
      'INSERT OR REPLACE INTO formulas (id, name, category, latex, mathjs, variables, result, mode, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      f.id, f.name, f.category, f.latex, f.mathjs, JSON.stringify(f.variables), JSON.stringify(f.result), f.mode || 'algebraic', f.note || ''
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

// gRPC client with keepalive
function createGrpcClient() {
  const creds = PROXY_TLS ? grpc.credentials.createSsl() : grpc.credentials.createInsecure();
  const opts = {
    'grpc.keepalive_time_ms': 30000,
    'grpc.keepalive_timeout_ms': 10000,
    'grpc.keepalive_permit_without_calls': 1,
  };
  const client = new aiproxyProto.AIProxy(`${PROXY_HOST}:${PROXY_PORT}`, creds, opts);
  console.log(`🔗 gRPC client created: ${PROXY_HOST}:${PROXY_PORT}`);
  return client;
}

let grpcClient = createGrpcClient();

function proxyCompleteOnce(prompt, system, provider, model) {
  return new Promise((resolve, reject) => {
    const meta = new grpc.Metadata();
    if (PROXY_TOKEN) meta.add('authorization', `Bearer ${PROXY_TOKEN}`);

    grpcClient.Complete({
      provider, model, prompt, system,
      max_tokens: 2048,
      project: process.env.AI_PROXY_PROJECT || 'mathbox',
      group: process.env.AI_PROXY_GROUP || 'webdev',
    }, meta, { deadline: Date.now() + 55000 }, (err, resp) => {
      if (err) reject(err);
      else resolve(resp);
    });
  });
}

async function proxyComplete(prompt, system, provider = 'claude', model = 'haiku') {
  const start = Date.now();
  console.log(`📤 AI request: provider=${provider}, model=${model}, prompt="${prompt.slice(0, 50)}..."`);

  // 嘗試最多 2 次（第二次重建 channel）
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await proxyCompleteOnce(prompt, system, provider, model);
      console.log(`✅ AI response (${Date.now() - start}ms, attempt ${attempt}): ${resp.content?.slice(0, 80)}...`);
      return resp;
    } catch (err) {
      const elapsed = Date.now() - start;
      console.error(`❌ Attempt ${attempt} failed (${elapsed}ms):`, err.details || err.message);
      if (attempt === 1 && (err.code === 4 || err.details?.includes('Deadline'))) {
        // Deadline exceeded → 重建 channel 再試一次
        console.log('🔄 Rebuilding gRPC channel...');
        grpcClient.close();
        grpcClient = createGrpcClient();
        continue;
      }
      throw new Error(err.details || err.message);
    }
  }
}

const FORMULA_SYSTEM_PROMPT = `MathBox 公式生成器。只輸出 JSON。

範例：{"id":"ohms_law","name":"歐姆定律","category":"電路學","latex":"V = I \\\\cdot R","mathjs":"I * R","mode":"algebraic","variables":[{"symbol":"I","name":"電流","type":"current","defaultUnit":"A"},{"symbol":"R","name":"電阻","type":"resistance","defaultUnit":"Ω"}],"result":{"symbol":"V","name":"電壓","type":"voltage","defaultUnit":"V"}}

mode 類型：
- "algebraic"：代數求解（預設，填 N-1 變數解 1 未知數）
- "calculus"：符號微積分。mathjs 用 diff(expr,var) 或 integrate(expr,var)，例如 "diff(x^3+2*x,x)"
- "matrix"：矩陣運算。mathjs 用 det/inv/transpose，例如 "det([[a,b],[c,d]])"
- "evaluate"：直接數值代入。所有變數填值後代入 mathjs 算結果。適合帶參數的公式。

重要：對於積分公式如 ∫x^n dx = x^(n+1)/(n+1)+C，用 mode="evaluate"，mathjs="x^(n+1)/(n+1)+C"，variables 必須包含所有可輸入的符號（x, n, C），不要漏掉。C 是積分常數，type=dimensionless，defaultUnit=""。x 也要列為變數。

type/defaultUnit 對照：
length/m, mass/kg, time/s, voltage/V, current/A, resistance/Ω, force/N, pressure/Pa, energy/J, power/W, frequency/Hz, velocity/m/s, temperature/K, dimensionless/, angle/rad, area/m², volume/m³, capacitance/F, inductance/H, momentum/kg·m/s, torque/N·m, angular_frequency/rad/s, electric_charge/C

規則：type 和 defaultUnit 是獨立欄位。latex 反斜線雙跳脫。mathjs 只寫等號右邊。根據公式性質選對應 mode。

⚠️ 重要：variables 是「輸入變數」清單，**絕對不要把 result 的 symbol 放進 variables**。例如 V=I·R，result 是 V，那 variables 只能有 [I, R]，不能包含 V。result 跟 variables 是分開的兩個欄位。`;

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

    const formula = extractJSON(content);
    if (formula) {
      res.json({ formula, raw: content });
    } else {
      res.json({ message: content, formula: null });
    }
  } catch (err) {
    console.error('AI 生成錯誤:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 從 AI 回應中萃取第一個完整的 JSON 物件（balanced braces，處理 string 內的 { }）
function extractJSON(text) {
  if (!text) return null;

  // 1. 優先抓 ```json ... ``` code block
  const codeBlock = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]); } catch { /* 試下一招 */ }
  }

  // 2. Balanced brace scanner，正確處理 string literal 內的 { }
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try { return JSON.parse(candidate); } catch { return null; }
      }
    }
  }
  return null;
}

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
