import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PaymentSimulator from './components/PaymentSimulator';
import HistoryTable from './components/HistoryTable';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const wrap = (Component) =>
    React.createElement(ProtectedRoute, null, React.createElement(Component));

  return React.createElement(
    Routes,
    null,
    React.createElement(Route, { path: '/login', element: React.createElement(Login) }),
    React.createElement(Route, { path: '/dashboard', element: wrap(Dashboard) }),
    React.createElement(Route, { path: '/pagos', element: wrap(PaymentSimulator) }),
    React.createElement(Route, { path: '/historial', element: wrap(HistoryTable) }),
    React.createElement(Route, { path: '*', element: React.createElement(Navigate, { to: '/dashboard', replace: true }) })
  );
}
