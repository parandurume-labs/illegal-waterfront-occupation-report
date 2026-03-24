const express = require('express');
const { getDb } = require('../db/connection');

const router = express.Router();

// GET /api/stats
router.get('/', (req, res) => {
  try {
    const db = getDb();

    const { totalReports } = db.prepare('SELECT COUNT(*) AS totalReports FROM reports').get();

    // Count by status
    const statusRows = db.prepare(
      'SELECT status, COUNT(*) AS count FROM reports GROUP BY status'
    ).all();

    const byStatus = { pending: 0, reviewing: 0, confirmed: 0, resolved: 0, dismissed: 0 };
    for (const row of statusRows) {
      byStatus[row.status] = row.count;
    }

    // Count by category
    const categoryRows = db.prepare(
      'SELECT category, COUNT(*) AS count FROM reports GROUP BY category'
    ).all();

    const byCategory = { encroachment: 0, illegal_structure: 0, pollution: 0, dumping: 0, other: 0 };
    for (const row of categoryRows) {
      byCategory[row.category] = row.count;
    }

    // Recent reports (last 7 days)
    const { recentReports } = db.prepare(
      "SELECT COUNT(*) AS recentReports FROM reports WHERE created_at >= datetime('now', '-7 days')"
    ).get();

    res.json({
      totalReports,
      byStatus,
      byCategory,
      recentReports,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
