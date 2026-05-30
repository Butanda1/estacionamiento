import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [usuario, setUsuario] = useState(() => localStorage.getItem('usuario'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', usuario);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    }
  }, [token, usuario]);

  const login = (tokenValue, usuarioValue) => {
    setToken(tokenValue);
    setUsuario(usuarioValue);
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
  };

  const estaAutenticado = !!token;

  return React.createElement(
    AuthContext.Provider,
    { value: { token, usuario, login, logout, estaAutenticado } },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
