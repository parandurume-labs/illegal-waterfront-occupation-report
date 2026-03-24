import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_LABELS = {
  pending: '접수',
  reviewing: '검토중',
  confirmed: '확인됨',
  resolved: '처리완료',
  dismissed: '기각',
};

const CATEGORY_LABELS = {
  encroachment: '하천 점유',
  illegal_structure: '불법 구조물',
  pollution: '수질 오염',
  dumping: '불법 투기',
  other: '기타',
};

const STATUS_OPTIONS = ['pending', 'reviewing', 'confirmed', 'resolved', 'dismissed'];

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function ReportDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();

  const [report, setReport] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin action form
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchReport = () => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(apiUrl(`/api/reports/${id}`), { headers })
      .then((r) => {
        if (!r.ok) throw new Error('신고를 찾을 수 없습니다');
        return r.json();
      })
      .then((data) => {
        const r = data.report || data;
        setReport(r);
        setNewStatus(r.status);
        setActions(data.actions || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, [id, token]);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);

    try {
      // Update status if changed
      if (newStatus !== report.status) {
        const statusRes = await fetch(apiUrl(`/api/reports/${id}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!statusRes.ok) {
          const body = await statusRes.json().catch(() => ({}));
          throw new Error(body.error || '상태 변경에 실패했습니다');
        }
      }

      // Add note if provided
      if (note.trim()) {
        const noteRes = await fetch(apiUrl(`/api/reports/${id}/actions`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'note', detail: note.trim() }),
        });
        if (!noteRes.ok) {
          const body = await noteRes.json().catch(() => ({}));
          throw new Error(body.error || '메모 추가에 실패했습니다');
        }
      }

      setNote('');
      fetchReport();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="container"><div className="loading">로딩 중...</div></div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="container">
      <div className="card">
        <h1 className="page-title">신고 상세</h1>
        <div className="report-id-display">접수번호: {report.id}</div>

        {/* Photo */}
        {report.photo_path && (
          <div className="report-photo">
            <img src={report.photo_path} alt="신고 사진" className="report-photo-img" />
          </div>
        )}

        {/* Map */}
        {report.latitude && report.longitude && (
          <div className="map-container map-container-detail">
            <MapContainer
              center={[report.latitude, report.longitude]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapResizer />
              <Marker position={[report.latitude, report.longitude]} />
            </MapContainer>
          </div>
        )}

        {/* Details */}
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">유형</span>
            <span className="detail-value">{CATEGORY_LABELS[report.category] || report.category}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">상태</span>
            <span className={`status-badge status-${report.status}`}>
              {STATUS_LABELS[report.status] || report.status}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">위치</span>
            <span className="detail-value">
              {report.latitude?.toFixed(6)}, {report.longitude?.toFixed(6)}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">접수일시</span>
            <span className="detail-value">{formatDateTime(report.created_at)}</span>
          </div>
          {report.updated_at && (
            <div className="detail-item">
              <span className="detail-label">최종 수정</span>
              <span className="detail-value">{formatDateTime(report.updated_at)}</span>
            </div>
          )}
          {report.reporter_name && (
            <div className="detail-item">
              <span className="detail-label">신고자</span>
              <span className="detail-value">{report.reporter_name}</span>
            </div>
          )}
          {report.reporter_contact && (
            <div className="detail-item">
              <span className="detail-label">연락처</span>
              <span className="detail-value">{report.reporter_contact}</span>
            </div>
          )}
        </div>

        {report.description && (
          <div className="report-description">
            <h3>상세 설명</h3>
            <p>{report.description}</p>
          </div>
        )}
      </div>

      {/* Admin actions */}
      {user && (
        <div className="card">
          <h2 className="section-title">상태 변경</h2>
          <form onSubmit={handleActionSubmit} className="action-form">
            <div className="form-group">
              <label className="form-label">상태</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="form-input"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">메모</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="form-input form-textarea"
                placeholder="처리 내용을 입력하세요"
                rows={3}
              />
            </div>
            {actionError && <div className="alert alert-error">{actionError}</div>}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '처리 중...' : '상태 변경'}
            </button>
          </form>
        </div>
      )}

      {/* Action history / timeline */}
      {actions.length > 0 && (
        <div className="card">
          <h2 className="section-title">처리 이력</h2>
          <div className="timeline">
            {actions.map((act, idx) => (
              <div key={act.id || idx} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="status-badge status-reviewing">
                      {act.action === 'status_change' ? '상태변경' : act.action === 'note' ? '메모' : act.action}
                    </span>
                    <span className="timeline-date">
                      {formatDateTime(act.created_at)}
                    </span>
                  </div>
                  {act.detail && <p className="timeline-note">{act.detail}</p>}
                  {act.action_by_username && (
                    <span className="timeline-admin">처리자: {act.action_by_username}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
