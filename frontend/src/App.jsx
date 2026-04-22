import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import CompanyDashboard from './pages/CompanyDashboard';
import CandidateDashboard from './pages/CandidateDashboard';
import CodeEditor from './pages/CodeEditor';
import Leaderboard from './pages/Leaderboard';

const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/company/dashboard" element={
          <ProtectedRoute role="company">
            <CompanyDashboard />
          </ProtectedRoute>
        } />
        <Route path="/candidate/dashboard" element={
          <ProtectedRoute role="candidate">
            <CandidateDashboard />
          </ProtectedRoute>
        } />
        <Route path="/contest/:contestId/question/:questionId" element={
          <ProtectedRoute role="candidate">
            <CodeEditor />
          </ProtectedRoute>
        } />
        <Route path="/leaderboard/:contestId" element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          user ? (
            user.role === 'company'
              ? <Navigate to="/company/dashboard" />
              : <Navigate to="/candidate/dashboard" />
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;