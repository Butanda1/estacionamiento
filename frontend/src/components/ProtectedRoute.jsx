import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

export default function ProtectedRoute({ children }) {
  const { estaAutenticado } = useAuth();

  if (!estaAutenticado) {
    return React.createElement(Navigate, { to: '/login', replace: true });
  }

  return React.createElement(
    'div',
    null,
    React.createElement(Navbar),
    React.createElement('main', { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' }, children)
  );
}
