const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { queryGet, queryAll, queryRun } = require('../db/query');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype.split('/')[1]);
    cb(null, extOk && mimeOk);
  },
});

// POST /api/reports — create a new report (no auth required)
router.post('/', upload.single('photo'), (req, res) => {
  try {
    const { latitude, longitude, category, description, reporter_name, reporter_contact } = req.body;

    if (!latitude || !longitude || !category) {
      return res.status(400).json({ error: 'latitude, longitude, and category are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    const photo_path = `/uploads/${req.file.filename}`;

    const result = queryRun(
      `INSERT INTO reports (photo_path, latitude, longitude, category, description, reporter_name, reporter_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [photo_path, parseFloat(latitude), parseFloat(longitude), category,
       description || null, reporter_name || null, reporter_contact || null]
    );

    const report = queryGet('SELECT * FROM reports WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json({ report });
  } catch (err) {
    console.error('Create report error:', err);
    if (err.message && err.message.includes('CHECK constraint')) {
      return res.status(400).json({ error: 'Invalid category value' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports — list reports with filtering and pagination
router.get('/', (req, res) => {
  try {
    const { status, category, page: pageParam, limit: limitParam, sw_lat, sw_lng, ne_lat, ne_lng } = req.query;

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(limitParam, 10) || 50));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (sw_lat && sw_lng && ne_lat && ne_lng) {
      conditions.push('latitude >= ? AND latitude <= ? AND longitude >= ? AND longitude <= ?');
      params.push(parseFloat(sw_lat), parseFloat(ne_lat), parseFloat(sw_lng), parseFloat(ne_lng));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRow = queryGet(`SELECT COUNT(*) as count FROM reports ${where}`, params);
    const total = totalRow.count;
    const totalPages = Math.ceil(total / limit);

    const reports = queryAll(
      `SELECT * FROM reports ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ reports, total, page, totalPages });
  } catch (err) {
    console.error('List reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/reports/:id — single report with case_actions
router.get('/:id', (req, res) => {
  try {
    const report = queryGet('SELECT * FROM reports WHERE id = ?', [req.params.id]);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const actions = queryAll(
      `SELECT ca.*, u.username AS action_by_username
       FROM case_actions ca
       LEFT JOIN users u ON u.id = ca.action_by
       WHERE ca.report_id = ?
       ORDER BY ca.created_at DESC`,
      [req.params.id]
    );

    res.json({ report, actions });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/reports/:id — update report status (auth required)
router.patch('/:id', requireAuth, (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const report = queryGet('SELECT * FROM reports WHERE id = ?', [req.params.id]);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const oldStatus = report.status;

    queryRun("UPDATE reports SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, req.params.id]);

    queryRun('INSERT INTO case_actions (report_id, action_by, action, detail) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, 'status_change', `Status changed from ${oldStatus} to ${status}`]);

    const updated = queryGet('SELECT * FROM reports WHERE id = ?', [req.params.id]);
    res.json({ report: updated });
  } catch (err) {
    console.error('Update report error:', err);
    if (err.message && err.message.includes('CHECK constraint')) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/reports/:id/actions — add a case action (auth required)
router.post('/:id/actions', requireAuth, (req, res) => {
  try {
    const { action, detail } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    const report = queryGet('SELECT id FROM reports WHERE id = ?', [req.params.id]);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const result = queryRun(
      'INSERT INTO case_actions (report_id, action_by, action, detail) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, action, detail || null]
    );

    const created = queryGet('SELECT * FROM case_actions WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json({ action: created });
  } catch (err) {
    console.error('Create action error:', err);
    if (err.message && err.message.includes('CHECK constraint')) {
      return res.status(400).json({ error: 'Invalid action value. Must be: status_change, note, or assignment' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
