import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin, signup as apiSignup } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('edusync_token');
    if (token) {
      getMe()
        .then(res => setCurrentUser(res.data))
        .catch(() => localStorage.removeItem('edusync_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin({ email, password });
    localStorage.setItem('edusync_token', res.data.token);
    setCurrentUser(res.data.user);
    return res.data.user;
  };

  const register = async (formData) => {
    const res = await apiSignup(formData);
    localStorage.setItem('edusync_token', res.data.token);
    setCurrentUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('edusync_token');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
