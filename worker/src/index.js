import { handleLogin, handleMe } from './auth.js';
import { createReport, listReports, getReport, updateReport, createAction } from './reports.js';
import { handleStats } from './stats.js';
// Photos are stored as base64 in D1, no separate photo endpoint needed

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function addCors(response) {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      let response;

      // --- Auth routes ---
      if (path === '/api/auth/login' && method === 'POST') {
        response = await handleLogin(request, env);
      } else if (path === '/api/auth/me' && method === 'GET') {
        response = await handleMe(request, env);
      }
      // --- Stats route ---
      else if (path === '/api/stats' && method === 'GET') {
        response = await handleStats(request, env);
      }
      // --- Report action routes (must match before /api/reports/:id) ---
      else if (/^\/api\/reports\/(\d+)\/actions$/.test(path) && method === 'POST') {
        const id = parseInt(path.match(/^\/api\/reports\/(\d+)\/actions$/)[1], 10);
        response = await createAction(request, env, id);
      }
      // --- Report CRUD routes ---
      else if (path === '/api/reports' && method === 'POST') {
        response = await createReport(request, env);
      } else if (path === '/api/reports' && method === 'GET') {
        response = await listReports(request, env);
      } else if (/^\/api\/reports\/(\d+)$/.test(path) && method === 'GET') {
        const id = parseInt(path.match(/^\/api\/reports\/(\d+)$/)[1], 10);
        response = await getReport(request, env, id);
      } else if (/^\/api\/reports\/(\d+)$/.test(path) && method === 'PATCH') {
        const id = parseInt(path.match(/^\/api\/reports\/(\d+)$/)[1], 10);
        response = await updateReport(request, env, id);
      }
      // --- Static assets (SPA fallback) ---
      else if (!path.startsWith('/api/')) {
        // Let the assets binding handle static files
        return env.ASSETS.fetch(request);
      }
      // --- API 404 ---
      else {
        response = jsonResponse({ error: 'Not found' }, 404);
      }

      return addCors(response);
    } catch (err) {
      console.error('Unhandled error:', err);
      return addCors(jsonResponse({ error: 'Internal server error' }, 500));
    }
  },
};
