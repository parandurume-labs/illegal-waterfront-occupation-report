const API_KEY = 'AIzaSyBizRAdiOR4ePc2I2Uu2t4GSCBKajEX70o';

// Simple Google Maps iframe embed — works on all browsers and PWAs
export function MapView({ lat, lng, zoom = 15, className = '' }) {
  const src = `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${lat},${lng}&zoom=${zoom}&maptype=roadmap`;
  return (
    <iframe
      className={className}
      src={src}
      style={{ width: '100%', height: '100%', border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

export function MapMultiView({ center = { lat: 36.5, lng: 127.0 }, zoom = 7, className = '' }) {
  const src = `https://www.google.com/maps/embed/v1/view?key=${API_KEY}&center=${center.lat},${center.lng}&zoom=${zoom}&maptype=roadmap`;
  return (
    <iframe
      className={className}
      src={src}
      style={{ width: '100%', height: '100%', border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
