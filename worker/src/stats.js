export async function handleStats(request, env) {
  try {
    const totalRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM reports').first();
    const totalReports = totalRow.count;

    const { results: statusRows } = await env.DB.prepare(
      'SELECT status, COUNT(*) AS count FROM reports GROUP BY status'
    ).all();

    const byStatus = { pending: 0, reviewing: 0, confirmed: 0, resolved: 0, dismissed: 0 };
    for (const row of statusRows) {
      byStatus[row.status] = row.count;
    }

    const { results: categoryRows } = await env.DB.prepare(
      'SELECT category, COUNT(*) AS count FROM reports GROUP BY category'
    ).all();

    const byCategory = { encroachment: 0, illegal_structure: 0, pollution: 0, dumping: 0, other: 0 };
    for (const row of categoryRows) {
      byCategory[row.category] = row.count;
    }

    const recentRow = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM reports WHERE created_at >= datetime('now', '-7 days')"
    ).first();
    const recentReports = recentRow.count;

    return new Response(JSON.stringify({ totalReports, byStatus, byCategory, recentReports }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Stats error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
