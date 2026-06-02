import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function HistoryTable() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const ticketsFiltrados = tickets.filter((ticket) => {
    return (ticket.id_ticket || '').toLowerCase().includes(busqueda.toLowerCase());
  });

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtro === 'dentro') params.set('estado', 'dentro');
      if (filtro === 'pagado') params.set('estado', 'pagado');
      if (filtro === 'pendiente') params.set('estado', 'pendiente');
      if (filtro === 'perdido') params.set('perdido', 'true');

      const res = await fetch(`/api/tickets/historial?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, filtro]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filtros = [
    { valor: 'todos', label: 'Todos' },
    { valor: 'dentro', label: 'Dentro' },
    { valor: 'pagado', label: 'Pagados' },
    { valor: 'pendiente', label: 'Pendientes' },
    { valor: 'perdido', label: 'Perdidos' },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">Historial de <span className="text-blue-500">Tickets</span></h1>
        <p className="text-gray-400 text-sm mt-1">Consulta todos los registros generados en el sistema</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {filtros.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                filtro === f.valor
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] border border-blue-400'
                  : 'bg-gray-800/50 text-gray-400 hover:text-blue-300 hover:bg-gray-800 border border-gray-700 backdrop-blur-sm'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar por ID de ticket..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-800/50 text-gray-100 placeholder-gray-400 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 backdrop-blur-sm text-sm"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-blue-400 transition-colors duration-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {cargando && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4 backdrop-blur-sm">
          Error: {error}
        </div>
      )}

      {!cargando && !error && tickets.length === 0 && (
        <div className="text-center py-20 text-gray-500 bg-gray-800/30 rounded-xl border border-gray-700/50 border-dashed">
          No hay tickets que mostrar.
        </div>
      )}

      {!cargando && !error && tickets.length > 0 && (
        <>
          {ticketsFiltrados.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-gray-800/30 rounded-xl border border-gray-700/50 border-dashed backdrop-blur-sm">
              No se encontraron tickets con el ID "<span className="text-blue-400 font-medium">{busqueda}</span>".
            </div>
          ) : (
            <div className="bg-gray-800/40 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden border border-gray-700/50 backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-900/80 text-blue-400 uppercase text-xs tracking-wider border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4 font-semibold">ID Ticket</th>
                      <th className="px-6 py-4 font-semibold">Tipo</th>
                      <th className="px-6 py-4 font-semibold">Entrada</th>
                      <th className="px-6 py-4 font-semibold">Salida</th>
                      <th className="px-6 py-4 font-semibold">Tiempo</th>
                      <th className="px-6 py-4 font-semibold">Estado</th>
                      <th className="px-6 py-4 font-semibold">Monto</th>
                      <th className="px-6 py-4 font-semibold">Perdido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {ticketsFiltrados.map((ticket) => {
                      const entrada = new Date(ticket.fecha_entrada);
                      let tiempoFinal = new Date();
                      if (ticket.fecha_salida) {
                        tiempoFinal = new Date(ticket.fecha_salida);
                      } else if (ticket.estado_pago === 'PAGADO' || ticket.estado_pago === 'EXENTO') {
                        tiempoFinal = (ticket.pagos_info && ticket.pagos_info.length > 0) ? new Date(ticket.pagos_info[ticket.pagos_info.length - 1].fecha_pago) : new Date(ticket.updatedAt);
                      }
                      const minsTotales = Math.max(0, Math.round((tiempoFinal - entrada) / 60000));
                      const horas = Math.floor(minsTotales / 60);
                      const mins = minsTotales % 60;
                      const tiempo = horas > 0 ? `${horas}h ${mins}m` : `${mins} min`;

                      return (
                      <tr key={ticket._id} className="hover:bg-blue-900/20 transition-colors duration-200 text-gray-300">
                        <td className="px-6 py-4 font-mono font-semibold text-blue-400">
                          {ticket.id_ticket}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                            ticket.tipo === 'Reposicion'
                              ? 'bg-purple-900/20 border-purple-500/30 text-purple-400'
                              : 'bg-gray-800 border-gray-700 text-gray-400'
                          }`}>
                            {ticket.tipo || 'Normal'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {new Date(ticket.fecha_entrada).toLocaleString('es-MX')}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {ticket.fecha_salida
                            ? new Date(ticket.fecha_salida).toLocaleString('es-MX')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-medium">
                          {tiempo}
                        </td>
                        <td className="px-6 py-4">
                          {ticket.estado_pago === 'PAGADO' && (
                            <span className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                              PAGADO
                            </span>
                          )}
                          {ticket.estado_pago === 'EXENTO' && (
                            <span className="bg-blue-900/30 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded-full text-xs font-semibold shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                              EXENTO
                            </span>
                          )}
                          {(ticket.estado_pago === 'NO_PAGADO' || ticket.estado_pago === 'PENDIENTE') && (
                            <span className="bg-amber-900/30 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-full text-xs font-semibold shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                              PENDIENTE
                            </span>
                          )}
                          {ticket.estado_pago === 'PERDIDO' && (
                            <span className="bg-red-900/30 border border-red-500/30 text-red-400 px-2.5 py-1 rounded-full text-xs font-semibold shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                              PERDIDO
                            </span>
                          )}
                          {ticket.estado_pago === 'Perdido_Sistema' && (
                            <div className="flex flex-col">
                              <span className="bg-rose-950/30 border border-rose-500/30 text-rose-400 px-2.5 py-1 rounded-full text-xs font-semibold shadow-[0_0_10px_rgba(244,63,94,0.2)] text-center">
                                PERDIDO (SISTEMA)
                              </span>
                              <span className={`text-[10px] text-center mt-1 font-medium ${ticket.pago_realizado ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {ticket.pago_realizado ? 'Auditoría: Pagó' : 'Auditoría: Sin Pagar'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-200">
                          ${ticket.monto_pagado.toLocaleString('es-MX')}
                        </td>
                        <td className="px-6 py-4">
                          {ticket.ticket_perdido ? (
                            <span className="bg-red-900/30 border border-red-500/30 text-red-400 px-2.5 py-1 rounded-full text-xs font-semibold shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                              SÍ
                            </span>
                          ) : (
                            <span className="bg-gray-800 text-gray-500 px-2.5 py-1 rounded-full text-xs border border-gray-700">
                              NO
                            </span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
