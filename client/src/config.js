// API base URL — empty string means same origin (for dev proxy or same-domain deploy)
// In production, this points to the Cloudflare Worker
export const API_BASE = import.meta.env.VITE_API_BASE || '';
