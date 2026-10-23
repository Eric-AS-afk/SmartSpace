import { createContext, useContext, useEffect, useState } from 'react';
import { authLogin, authRegister } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) localStorage.setItem('auth_user', JSON.stringify(user));
      else localStorage.removeItem('auth_user');
    } catch {}
  }, [user]);

  const login = async ({ correo, password }) => {
    const { data } = await authLogin({ correo, password });
    setUser(data);
    return data;
  };

  const register = async ({ nombre, apellido, correo, password }) => {
    const { data } = await authRegister({ nombre, apellido, correo, password });
    // backend returns created user info
    setUser({ id: data.id ?? data.US_usuario, correo: data.correo ?? data.US_correo, nombre: data.nombre ?? data.US_nombre });
    return data;
  };

  const logout = () => setUser(null);

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
