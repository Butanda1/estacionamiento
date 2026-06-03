import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import PublicPayment from './components/PublicPayment';
import HistoryTable from './components/HistoryTable';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const wrap = (Component) =>
    React.createElement(ProtectedRoute, null, React.createElement(Component));

  return React.createElement(
    Routes,
    null,
    React.createElement(Route, { path: '/', element: React.createElement(PublicPayment) }),
    React.createElement(Route, { path: '/pagos', element: wrap(PublicPayment) }),
    React.createElement(Route, { path: '/dashboard', element: wrap(Dashboard) }),
    React.createElement(Route, { path: '/historial', element: wrap(HistoryTable) }),
    React.createElement(Route, { path: '*', element: React.createElement(Navigate, { to: '/', replace: true }) })
  );
}
