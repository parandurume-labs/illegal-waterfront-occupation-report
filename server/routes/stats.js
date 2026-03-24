const express = require('express');
const { queryGet, queryAll } = require('../db/query');

const router = express.Router();

// GET /api/stats
router.get('/', (req, res) => {
  try {
    const { count: totalReports } = queryGet('SELECT COUNT(*) AS count FROM reports');

    const statusRows = queryAll('SELECT status, COUNT(*) AS count FROM reports GROUP BY status');
    const byStatus = { pending: 0, reviewing: 0, confirmed: 0, resolved: 0, dismissed: 0 };
    for (const row of statusRows) {
      byStatus[row.status] = row.count;
    }

    const categoryRows = queryAll('SELECT category, COUNT(*) AS count FROM reports GROUP BY category');
    const byCategory = { encroachment: 0, illegal_structure: 0, pollution: 0, dumping: 0, other: 0 };
    for (const row of categoryRows) {
      byCategory[row.category] = row.count;
    }

    const { count: recentReports } = queryGet(
      "SELECT COUNT(*) AS count FROM reports WHERE created_at >= datetime('now', '-7 days')"
    );

    res.json({ totalReports, byStatus, byCategory, recentReports });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
