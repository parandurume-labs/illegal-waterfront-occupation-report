const { getDb, saveDb } = require('./connection');

// Compatibility helpers — sql.js uses db.exec/db.run differently from better-sqlite3
// These helpers provide a similar API to better-sqlite3's prepare().get/all/run

function queryGet(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    stmt.free();
    const row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
    return row;
  }
  stmt.free();
  return undefined;
}

function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  const cols = stmt.getColumnNames();
  while (stmt.step()) {
    const vals = stmt.get();
    const row = {};
    cols.forEach((c, i) => { row[c] = vals[i]; });
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function queryRun(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
  const lastId = db.exec("SELECT last_insert_rowid() as id");
  const changes = db.getRowsModified();
  saveDb();
  return {
    lastInsertRowid: lastId.length > 0 ? lastId[0].values[0][0] : 0,
    changes
  };
}

function queryExec(sql) {
  const db = getDb();
  db.exec(sql);
  saveDb();
}

module.exports = { queryGet, queryAll, queryRun, queryExec };
