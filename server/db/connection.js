const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'reports.db');

let db;
let SQL;

async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

function getDb() {
  if (db) return db;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!SQL) {
    throw new Error('SQL.js not initialized. Call initSQL() first.');
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, buffer);
}

// Auto-save periodically and on process exit
let saveInterval;
function startAutoSave(intervalMs = 5000) {
  if (saveInterval) return;
  saveInterval = setInterval(() => {
    try { saveDb(); } catch (e) { /* ignore */ }
  }, intervalMs);

  process.on('exit', () => { try { saveDb(); } catch (e) { /* ignore */ } });
  process.on('SIGINT', () => { try { saveDb(); } catch (e) { /* ignore */ } process.exit(); });
  process.on('SIGTERM', () => { try { saveDb(); } catch (e) { /* ignore */ } process.exit(); });
}

module.exports = { getDb, saveDb, initSQL, startAutoSave };
