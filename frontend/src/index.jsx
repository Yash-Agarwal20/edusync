import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import AuthPage from './components/AuthPage';

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0c13', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#6366f1' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⬡</div>
        <div style={{ fontSize: 14, color: '#7a85a3' }}>Loading EduSync...</div>
      </div>
    </div>
  );
  return currentUser ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/*" element={<PrivateRoute><AppShell /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
