const { initSQL, getDb, saveDb } = require('./connection');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  await initSQL();
  const db = getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_path TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('encroachment', 'illegal_structure', 'pollution', 'dumping', 'other')),
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'confirmed', 'resolved', 'dismissed')),
      reporter_name TEXT,
      reporter_contact TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS case_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      action_by INTEGER NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('status_change', 'note', 'assignment')),
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports(id),
      FOREIGN KEY (action_by) REFERENCES users(id)
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(latitude, longitude)');
  db.run('CREATE INDEX IF NOT EXISTS idx_case_actions_report ON case_actions(report_id)');

  // Seed default admin user if none exists
  const result = db.exec("SELECT id FROM users WHERE role = 'admin'");
  if (result.length === 0 || result[0].values.length === 0) {
    const hash = bcrypt.hashSync('admin1234', 10);
    db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
    console.log('Default admin user created (username: admin, password: admin1234)');
  }

  saveDb();
  console.log('Database initialized.');
}

initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
