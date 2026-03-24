import { useState, useRef, useEffect } from 'react';
import exifr from 'exifr';
import { apiUrl } from '../api';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORIES = [
  { value: 'encroachment', label: '하천 점유' },
  { value: 'illegal_structure', label: '불법 구조물' },
  { value: 'pollution', label: '수질 오염' },
  { value: 'dumping', label: '불법 투기' },
  { value: 'other', label: '기타' },
];

// Fix Safari: force map to recalculate size after mount
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function LocationPicker({ position, onSelect }) {
  useMapEvents({
    click(e) {
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

export default function ReportForm() {
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [gps, setGps] = useState(null);
  const [gpsSource, setGpsSource] = useState(null); // 'exif' | 'map'
  const [showMap, setShowMap] = useState(false);
  const [category, setCategory] = useState('encroachment');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const [geoLoading, setGeoLoading] = useState(false);

  const tryBrowserGeolocation = () => {
    if (!navigator.geolocation) {
      setShowMap(true);
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsSource('browser');
        setGeoLoading(false);
      },
      () => {
        // User denied or error — show map picker
        setShowMap(true);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setGps(null);
    setGpsSource(null);
    setShowMap(false);
    setGeoLoading(false);

    // 1. Try EXIF GPS
    try {
      const exif = await exifr.gps(file);
      if (exif && exif.latitude != null && exif.longitude != null) {
        setGps({ lat: exif.latitude, lng: exif.longitude });
        setGpsSource('exif');
        return;
      }
    } catch {
      // no EXIF GPS
    }

    // 2. Try browser Geolocation API (handles iOS Safari stripping EXIF)
    tryBrowserGeolocation();
  };

  const handleMapSelect = (pos) => {
    setGps(pos);
    setGpsSource('map');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!photo) {
      setError('사진을 선택해주세요');
      return;
    }
    if (!gps) {
      setError('위치 정보가 필요합니다. 지도에서 위치를 선택해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('photo', photo);
      formData.append('latitude', gps.lat);
      formData.append('longitude', gps.lng);
      formData.append('category', category);
      if (description.trim()) formData.append('description', description.trim());
      if (reporterName.trim()) formData.append('reporter_name', reporterName.trim());
      if (reporterContact.trim()) formData.append('reporter_contact', reporterContact.trim());

      const res = await fetch(apiUrl('/api/reports'), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || '신고 접수에 실패했습니다');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="container">
        <div className="card success-card">
          <h2>신고가 접수되었습니다</h2>
          <p className="report-id">접수번호: <strong>{result.id || result.report?.id}</strong></p>
          <p>신고가 정상적으로 접수되었습니다. 담당자가 검토 후 처리할 예정입니다.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setResult(null);
              setPhoto(null);
              setPhotoPreview(null);
              setGps(null);
              setGpsSource(null);
              setShowMap(false);
              setDescription('');
              setReporterName('');
              setReporterContact('');
              if (fileRef.current) fileRef.current.value = '';
            }}
          >
            새 신고하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="page-title">불법 점유 신고</h1>
        <p className="page-subtitle">하천, 계곡, 하천변의 불법 점유를 신고해주세요</p>

        <form onSubmit={handleSubmit} className="report-form">
          {/* Photo */}
          <div className="form-group">
            <label className="form-label">사진 촬영 / 선택 *</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="form-input file-input"
            />
            {photoPreview && (
              <img src={photoPreview} alt="미리보기" className="photo-preview" />
            )}
          </div>

          {/* GPS Info */}
          {gps && (
            <div className="form-group">
              <label className="form-label">위치 정보</label>
              <div className="gps-info">
                <span>위도: {gps.lat.toFixed(6)}</span>
                <span>경도: {gps.lng.toFixed(6)}</span>
                <span className="gps-source">
                  ({gpsSource === 'exif' ? '사진에서 자동 추출' : gpsSource === 'browser' ? '현재 위치 자동 감지' : '지도에서 선택'})
                </span>
              </div>
            </div>
          )}

          {/* Geolocation loading */}
          {geoLoading && (
            <div className="form-group">
              <div className="gps-info">현재 위치를 확인하고 있습니다...</div>
            </div>
          )}

          {/* Map fallback for location */}
          {showMap && (
            <div className="form-group">
              <label className="form-label">
                위치를 자동으로 가져올 수 없습니다. 지도에서 위치를 선택해주세요.
              </label>
              <div className="map-container map-container-small">
                <MapContainer
                  center={[36.5, 127.0]}
                  zoom={7}
                  style={{ height: '100%', width: '100%' }}
                >
                  <MapResizer />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationPicker position={gps} onSelect={handleMapSelect} />
                </MapContainer>
              </div>
            </div>
          )}

          {/* Category */}
          <div className="form-group">
            <label className="form-label">신고 유형 *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">상세 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input form-textarea"
              placeholder="현장 상황을 설명해주세요 (선택사항)"
              rows={4}
            />
          </div>

          {/* Reporter info */}
          <div className="form-group">
            <label className="form-label">신고자 이름</label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              className="form-input"
              placeholder="익명 가능"
            />
          </div>

          <div className="form-group">
            <label className="form-label">연락처</label>
            <input
              type="text"
              value={reporterContact}
              onChange={(e) => setReporterContact(e.target.value)}
              className="form-input"
              placeholder="연락처"
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting ? '접수 중...' : '신고 접수'}
          </button>
        </form>
      </div>
    </div>
  );
}
