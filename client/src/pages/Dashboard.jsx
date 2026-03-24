import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapMultiView } from '../components/MapEmbed';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';

// Maps use iframe embed — no interactive markers needed

const STATUS_COLORS = {
  pending: '#ff9800',
  reviewing: '#1976d2',
  confirmed: '#ff9800',
  resolved: '#4caf50',
  dismissed: '#9e9e9e',
};

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

const STATUS_OPTIONS = ['all', 'pending', 'reviewing', 'confirmed', 'resolved', 'dismissed'];
const CATEGORY_OPTIONS = ['all', 'encroachment', 'illegal_structure', 'pollution', 'dumping', 'other'];

export default function Dashboard() {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [listReports, setListReports] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Fetch stats
  useEffect(() => {
    if (!token) return;
    fetch(apiUrl('/api/stats'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setStats({
        total: data.totalReports,
        pending: data.byStatus?.pending || 0,
        confirmed: data.byStatus?.confirmed || 0,
        resolved: data.byStatus?.resolved || 0,
      }))
      .catch(() => {});
  }, [token]);

  // Fetch list reports
  useEffect(() => {
    if (!token) return;
    setListLoading(true);

    const params = new URLSearchParams({ page, limit: 20 });
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterCategory !== 'all') params.set('category', filterCategory);

    fetch(apiUrl(`/api/reports?${params}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setListReports(data.reports || data.data || []);
        setTotalPages(data.totalPages || data.total_pages || 1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setListLoading(false));
  }, [token, page, filterStatus, filterCategory]);


  if (authLoading) {
    return <div className="container"><div className="loading">로딩 중...</div></div>;
  }

  if (!user) return null;

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="container">
      <h1 className="page-title">관리자 대시보드</h1>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.total ?? '-'}</div>
          <div className="stat-label">전체 신고</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-value">{stats?.pending ?? '-'}</div>
          <div className="stat-label">접수 대기</div>
        </div>
        <div className="stat-card stat-confirmed">
          <div className="stat-value">{stats?.confirmed ?? '-'}</div>
          <div className="stat-label">확인됨</div>
        </div>
        <div className="stat-card stat-resolved">
          <div className="stat-value">{stats?.resolved ?? '-'}</div>
          <div className="stat-label">처리완료</div>
        </div>
      </div>

      {/* Map Overview */}
      <div className="card">
        <h2 className="section-title">신고 지도</h2>
        <div className="map-container map-container-dashboard">
          <MapMultiView center={{ lat: 36.5, lng: 127.0 }} zoom={7} />
        </div>
        <div className="map-legend">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <span key={key} className="legend-item">
              <span
                className="legend-dot"
                style={{ backgroundColor: STATUS_COLORS[key] }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="section-title">신고 목록</h2>

        <div className="filters">
          <div className="filter-group">
            <label>상태:</label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="form-input filter-select"
            >
              <option value="all">전체</option>
              {STATUS_OPTIONS.slice(1).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>유형:</label>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              className="form-input filter-select"
            >
              <option value="all">전체</option>
              {CATEGORY_OPTIONS.slice(1).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {listLoading ? (
          <div className="loading">로딩 중...</div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>유형</th>
                    <th>상태</th>
                    <th>날짜</th>
                    <th>위치</th>
                  </tr>
                </thead>
                <tbody>
                  {listReports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-row">신고 내역이 없습니다</td>
                    </tr>
                  ) : (
                    listReports.map((r) => (
                      <tr key={r.id} onClick={() => navigate(`/reports/${r.id}`)} className="clickable-row">
                        <td>{r.id?.toString().slice(0, 8)}...</td>
                        <td>{CATEGORY_LABELS[r.category] || r.category}</td>
                        <td>
                          <span className={`status-badge status-${r.status}`}>
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td>{formatDate(r.created_at)}</td>
                        <td>{r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button
                className="btn btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                이전
              </button>
              <span className="page-info">{page} / {totalPages}</span>
              <button
                className="btn btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
