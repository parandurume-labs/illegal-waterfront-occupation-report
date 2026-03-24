import { Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ReportForm from './pages/ReportForm';
import Dashboard from './pages/Dashboard';
import ReportDetail from './pages/ReportDetail';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <AuthProvider>
      <div className="app">
        <nav className="navbar">
          <div className="navbar-inner">
            <Link to="/" className="navbar-brand">
              불법점유 신고
            </Link>
            <div className="navbar-links">
              <Link to="/" className="nav-link">신고하기</Link>
              <Link to="/dashboard" className="nav-link">관리자</Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<ReportForm />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reports/:id" element={<ReportDetail />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
