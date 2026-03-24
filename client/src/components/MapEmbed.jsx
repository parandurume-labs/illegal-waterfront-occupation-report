// Google Maps iframe — no API key needed, works everywhere
export function MapView({ lat, lng, zoom = 15, className = '' }) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
  return (
    <iframe
      className={className}
      src={src}
      style={{ width: '100%', height: '100%', border: 0 }}
      allowFullScreen
      loading="lazy"
    />
  );
}

export function MapMultiView({ center = { lat: 36.5, lng: 127.0 }, zoom = 7, className = '' }) {
  const src = `https://maps.google.com/maps?q=${center.lat},${center.lng}&z=${zoom}&output=embed`;
  return (
    <iframe
      className={className}
      src={src}
      style={{ width: '100%', height: '100%', border: 0 }}
      allowFullScreen
      loading="lazy"
    />
  );
}
