import { useState, useRef } from 'react';
import exifr from 'exifr';
import { apiUrl } from '../api';
import { MapView } from '../components/MapEmbed';

const CATEGORIES = [
  { value: 'encroachment', label: '하천 점유' },
  { value: 'illegal_structure', label: '불법 구조물' },
  { value: 'pollution', label: '수질 오염' },
  { value: 'dumping', label: '불법 투기' },
  { value: 'other', label: '기타' },
];

export default function ReportForm() {
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [gps, setGps] = useState(null);
  const [gpsSource, setGpsSource] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [category, setCategory] = useState('encroachment');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('이 기기에서 위치 서비스를 지원하지 않습니다.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsSource('browser');
        setGeoLoading(false);
      },
      (err) => {
        setGeoError('위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setGps(null);
    setGpsSource(null);
    setGeoError(null);

    // Try EXIF GPS first
    try {
      const exif = await exifr.gps(file);
      if (exif && exif.latitude != null && exif.longitude != null) {
        setGps({ lat: exif.latitude, lng: exif.longitude });
        setGpsSource('exif');
        return;
      }
    } catch {
      // no EXIF
    }

    // Don't auto-trigger — some browsers block geolocation without user gesture
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!photo) {
      setError('사진을 선택해주세요');
      return;
    }
    if (!gps) {
      setError('위치 정보가 필요합니다. "현재 위치 사용" 버튼을 눌러주세요.');
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
              setGeoError(null);
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
                  ({gpsSource === 'exif' ? '사진에서 자동 추출' : '현재 위치 자동 감지'})
                </span>
              </div>
              <div className="map-container map-container-small" style={{ marginTop: 8 }}>
                <MapView lat={gps.lat} lng={gps.lng} zoom={15} />
              </div>
            </div>
          )}

          {/* Location button — always show when no GPS */}
          {!gps && (
            <div className="form-group">
              <label className="form-label">위치 정보 *</label>
              {geoLoading ? (
                <div className="gps-info">현재 위치를 확인하고 있습니다...</div>
              ) : (
                <>
                  {geoError && <div className="alert alert-error">{geoError}</div>}
                  <button type="button" className="btn btn-primary btn-block" onClick={getLocation}>
                    📍 현재 위치 사용
                  </button>
                  <p style={{ fontSize: '0.8rem', color: '#757575', marginTop: 6 }}>
                    버튼을 누르면 위치 권한을 요청합니다
                  </p>
                </>
              )}
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
