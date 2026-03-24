-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
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
);

-- Case actions table
CREATE TABLE IF NOT EXISTS case_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL,
  action_by INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('status_change', 'note', 'assignment')),
  detail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id),
  FOREIGN KEY (action_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_case_actions_report ON case_actions(report_id);

-- Seed admin user (password: admin1234)
INSERT OR IGNORE INTO users (username, password_hash, role)
VALUES ('admin', '$2a$10$rQEY0tJGmGKZ5v4lOxfAb.F6FmWEyy3YfGKPJGy/xNnmwqXjKz4Xm', 'admin');
