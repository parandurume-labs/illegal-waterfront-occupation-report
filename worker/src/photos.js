export async function handlePhoto(request, env, key) {
  try {
    const object = await env.PHOTOS.get(key);

    if (!object) {
      return new Response(JSON.stringify({ error: 'Photo not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=86400');

    // If no content-type was stored, guess from extension
    if (!headers.get('Content-Type')) {
      const ext = key.split('.').pop().toLowerCase();
      const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      headers.set('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    }

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('Photo serve error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
