import { requireAuth, AuthError } from './auth.js';

// --- Report handlers ---

export async function createReport(request, env) {
  try {
    const formData = await request.formData();

    const latitude = formData.get('latitude');
    const longitude = formData.get('longitude');
    const category = formData.get('category');
    const description = formData.get('description');
    const reporter_name = formData.get('reporter_name');
    const reporter_contact = formData.get('reporter_contact');
    const photo = formData.get('photo');

    if (!latitude || !longitude || !category) {
      return jsonResponse({ error: 'latitude, longitude, and category are required' }, 400);
    }

    if (!photo || !(photo instanceof File)) {
      return jsonResponse({ error: 'Photo is required' }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(photo.type)) {
      return jsonResponse({ error: 'Invalid photo format. Allowed: jpeg, jpg, png, gif, webp' }, 400);
    }

    // Convert photo to base64 and store in D1
    const arrayBuffer = await photo.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const photo_data = `data:${photo.type};base64,${base64}`;
    const photo_path = photo_data;

    // Insert into D1
    const result = await env.DB.prepare(
      `INSERT INTO reports (photo_path, latitude, longitude, category, description, reporter_name, reporter_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      photo_path,
      parseFloat(latitude),
      parseFloat(longitude),
      category,
      description || null,
      reporter_name || null,
      reporter_contact || null
    ).run();

    const insertedId = result.meta.last_row_id;
    const report = await env.DB.prepare('SELECT * FROM reports WHERE id = ?').bind(insertedId).first();

    return jsonResponse({ report }, 201);
  } catch (err) {
    console.error('Create report error:', err);
    if (err.message && err.message.includes('CHECK constraint')) {
      return jsonResponse({ error: 'Invalid category value' }, 400);
    }
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function listReports(request, env) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const sw_lat = url.searchParams.get('sw_lat');
    const sw_lng = url.searchParams.get('sw_lng');
    const ne_lat = url.searchParams.get('ne_lat');
    const ne_lng = url.searchParams.get('ne_lng');

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

    // Count query
    const countStmt = env.DB.prepare(`SELECT COUNT(*) AS count FROM reports ${where}`);
    const boundCount = params.length > 0 ? countStmt.bind(...params) : countStmt;
    const totalRow = await boundCount.first();
    const total = totalRow.count;
    const totalPages = Math.ceil(total / limit);

    // Data query
    const dataStmt = env.DB.prepare(
      `SELECT * FROM reports ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    );
    const allParams = [...params, limit, offset];
    const boundData = allParams.length > 0 ? dataStmt.bind(...allParams) : dataStmt;
    const { results: reports } = await boundData.all();

    return jsonResponse({ reports, total, page, totalPages });
  } catch (err) {
    console.error('List reports error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function getReport(request, env, id) {
  try {
    const report = await env.DB.prepare('SELECT * FROM reports WHERE id = ?').bind(id).first();

    if (!report) {
      return jsonResponse({ error: 'Report not found' }, 404);
    }

    const { results: actions } = await env.DB.prepare(
      `SELECT ca.*, u.username AS action_by_username
       FROM case_actions ca
       LEFT JOIN users u ON u.id = ca.action_by
       WHERE ca.report_id = ?
       ORDER BY ca.created_at DESC`
    ).bind(id).all();

    return jsonResponse({ report, actions });
  } catch (err) {
    console.error('Get report error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function updateReport(request, env, id) {
  try {
    const user = await requireAuth(request, env);

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return jsonResponse({ error: 'status is required' }, 400);
    }

    const report = await env.DB.prepare('SELECT * FROM reports WHERE id = ?').bind(id).first();

    if (!report) {
      return jsonResponse({ error: 'Report not found' }, 404);
    }

    const oldStatus = report.status;

    await env.DB.prepare(
      "UPDATE reports SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(status, id).run();

    await env.DB.prepare(
      'INSERT INTO case_actions (report_id, action_by, action, detail) VALUES (?, ?, ?, ?)'
    ).bind(id, user.id, 'status_change', `Status changed from ${oldStatus} to ${status}`).run();

    const updated = await env.DB.prepare('SELECT * FROM reports WHERE id = ?').bind(id).first();

    return jsonResponse({ report: updated });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonResponse({ error: err.message }, 401);
    }
    console.error('Update report error:', err);
    if (err.message && err.message.includes('CHECK constraint')) {
      return jsonResponse({ error: 'Invalid status value' }, 400);
    }
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export async function createAction(request, env, id) {
  try {
    const user = await requireAuth(request, env);

    const body = await request.json();
    const { action, detail } = body;

    if (!action) {
      return jsonResponse({ error: 'action is required' }, 400);
    }

    const report = await env.DB.prepare('SELECT id FROM reports WHERE id = ?').bind(id).first();

    if (!report) {
      return jsonResponse({ error: 'Report not found' }, 404);
    }

    const result = await env.DB.prepare(
      'INSERT INTO case_actions (report_id, action_by, action, detail) VALUES (?, ?, ?, ?)'
    ).bind(id, user.id, action, detail || null).run();

    const insertedId = result.meta.last_row_id;
    const created = await env.DB.prepare('SELECT * FROM case_actions WHERE id = ?').bind(insertedId).first();

    return jsonResponse({ action: created }, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonResponse({ error: err.message }, 401);
    }
    console.error('Create action error:', err);
    if (err.message && err.message.includes('CHECK constraint')) {
      return jsonResponse({ error: 'Invalid action value. Must be: status_change, note, or assignment' }, 400);
    }
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
