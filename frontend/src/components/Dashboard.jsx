import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { CurrencyDollarIcon, ClockIcon, LockClosedIcon, TruckIcon } from '@heroicons/react/24/outline';
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard() {
  const { token } = useAuth();
  const { socket } = useSocket();
  const [metricas, setMetricas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMetricas = async () => {
      try {
        const res = await fetch('/api/dashboard/metricas', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMetricas(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    fetchMetricas();
    // Polling de respaldo cada 30s (el WebSocket es el canal principal)
    const interval = setInterval(fetchMetricas, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Refrescar métricas inmediatamente ante cualquier evento WebSocket
  useEffect(() => {
    if (!socket) return;

    const fetchMetricas = async () => {
      try {
        const res = await fetch('/api/dashboard/metricas', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setMetricas(data);
      } catch (_) {}
    };

    socket.on('ticket:created', fetchMetricas);
    socket.on('ticket:updated', fetchMetricas);
    socket.on('pago:created', fetchMetricas);
    socket.on('ticket:lost', fetchMetricas);

    return () => {
      socket.off('ticket:created', fetchMetricas);
      socket.off('ticket:updated', fetchMetricas);
      socket.off('pago:created', fetchMetricas);
      socket.off('ticket:lost', fetchMetricas);
    };
  }, [socket, token]);

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg backdrop-blur-sm">
        Error: {error}
      </div>
    );
  }

  const tarjetas = [
    {
      titulo: 'Ganancias Totales',
      valor: `$${(metricas?.gananciasTotales || 0).toLocaleString('es-MX')} MXN`,
      color: 'from-blue-600 to-blue-900',
      icono: <CurrencyDollarIcon className="h-8 w-8 text-blue-400" />,
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]'
    },
    {
      titulo: 'Salidas (<5 min)',
      valor: metricas?.salidasGratis || 0,
      color: 'from-gray-800 to-gray-900',
      icono: <ClockIcon className="h-8 w-8 text-emerald-400" />,
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]'
    },
    {
      titulo: 'Tickets Perdidos',
      valor: metricas?.ticketsPerdidos || 0,
      color: 'from-gray-800 to-gray-900',
      icono: <LockClosedIcon className="h-8 w-8 text-red-400" />,
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]'
    },
    {
      titulo: 'Vehículos Adentro',
      valor: metricas?.vehiculosActuales || 0,
      color: 'from-gray-800 to-gray-900',
      icono: <TruckIcon className="h-8 w-8 text-purple-400" />,
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]'
    },
  ];

  const pieColors = ['#3b82f6', '#10b981', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">Dashboard <span className="text-blue-500">Global</span></h1>
        <p className="text-gray-400 text-sm mt-1">Métricas en tiempo real del sistema de estacionamiento</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tarjetas.map((t, i) => (
          <div key={i} className={`bg-gradient-to-br ${t.color} rounded-xl p-6 text-white border border-gray-700/50 backdrop-blur-md ${t.glow} transition-all duration-300 hover:scale-105`}>
            <div className="flex items-center justify-between mb-4">
              <span className="p-2 bg-gray-900/50 rounded-lg backdrop-blur-sm border border-gray-700">{t.icono}</span>
              <span className="text-gray-300 text-sm font-medium uppercase tracking-wider">{t.titulo}</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{t.valor}</p>
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* Ingresos por Mes */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2 text-blue-400" /> Ingresos por Mes
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metricas?.ingresos_por_mes || []}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="mes" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución de Tickets */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-blue-400" /> Distribución de Tickets
          </h2>
          <div className="h-64 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metricas?.estadisticas_pastel || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {(metricas?.estadisticas_pastel || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '0.5rem' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Promedio de Autos (Últimos 7 días) */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center">
            <TruckIcon className="h-5 w-5 mr-2 text-purple-400" /> Flujo de Automóviles (Últimos 7 Días)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricas?.autos_por_dia || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="fecha" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '0.5rem' }}
                  cursor={{fill: '#374151', opacity: 0.4}}
                />
                <Bar dataKey="autos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
