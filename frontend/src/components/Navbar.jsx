import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import icon from './icon.png';

export default function Navbar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
      isActive 
        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
        : 'text-gray-400 hover:bg-gray-800 hover:text-blue-400 hover:border hover:border-gray-700 border border-transparent'
    }`;

  return (
    <nav className="bg-[#0B0F19]/90 backdrop-blur-md border-b border-blue-900/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <span className="text-gray-100 font-bold text-lg tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] animate-pulse"></span>
              <img
                src={icon}
                alt="BeneParc"
                className="h-8 w-8 object-contain"
              />
              BeneParc <span className="text-blue-500">Pro</span>
            </span>
            <div className="hidden md:flex space-x-2 ml-8">
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
              <NavLink to="/pagos" className={linkClass}>Pagos</NavLink>
              <NavLink to="/historial" className={linkClass}>Historial</NavLink>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 text-sm hidden sm:block">
              Operador: <span className="text-blue-400 font-mono">{usuario}</span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-900/20 border border-red-500/50 hover:bg-red-900/40 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              <span>Salir</span>
            </button>
          </div>
        </div>
        <div className="md:hidden flex space-x-2 pb-3 overflow-x-auto">
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/pagos" className={linkClass}>Pagos</NavLink>
          <NavLink to="/historial" className={linkClass}>Historial</NavLink>
        </div>
      </div>
    </nav>
  );
}
