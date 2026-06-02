import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CreditCardIcon, ExclamationTriangleIcon, MagnifyingGlassIcon,
  PlusIcon, ClipboardDocumentIcon, TicketIcon,
  UserCircleIcon, KeyIcon, ArrowRightEndOnRectangleIcon, XMarkIcon
} from '@heroicons/react/24/outline';

export default function PublicPayment() {
  const { login, estaAutenticado } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const esAdmin = location.pathname === '/pagos';

  // Redirigir si ya está autenticado y entra al "/" público
  useEffect(() => {
    if (estaAutenticado && location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [estaAutenticado, location.pathname, navigate]);

  // Modal login
  const [showLogin, setShowLogin] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState('normal');

  // Normal tab
  const [idTicket, setIdTicket] = useState('');
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Reposicion tab
  const [ticketReposicion, setTicketReposicion] = useState(null);
  const [codigoReposicion, setCodigoReposicion] = useState('');
  const [resultadoReposicion, setResultadoReposicion] = useState(null);
  const [cargandoReposicion, setCargandoReposicion] = useState(false);
  const [errorReposicion, setErrorReposicion] = useState('');
  const [copiado, setCopiado] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: loginUser, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || 'Error al iniciar sesión'); return; }
      login(data.token, loginUser);
      navigate('/dashboard');
    } catch { setLoginError('Error de conexión'); }
    finally { setLoginLoading(false); }
  };

  const buscarTicket = async () => {
    if (!idTicket.trim()) return;
    setError(''); setResultado(null); setCargando(true);
    try {
      const res = await fetch(`/api/tickets/${idTicket.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Ticket no encontrado'); return; }
      
      let tiempoFinal = new Date();
      if (data.fecha_salida) {
        tiempoFinal = new Date(data.fecha_salida);
      } else if (data.estado_pago === 'PAGADO' || data.estado_pago === 'EXENTO') {
        tiempoFinal = (data.pagos_info && data.pagos_info.length > 0) ? new Date(data.pagos_info[data.pagos_info.length - 1].fecha_pago) : new Date(data.updatedAt);
      }
      
      const minutos = Math.max(0, Math.round((tiempoFinal - new Date(data.fecha_entrada)) / 60000));
      let monto = data.tipo === 'Reposicion' ? 100 : (minutos <= 5 ? 0 : Math.ceil(minutos / 60) * 15);
      
      // Si ya estaba pagado, respetamos el monto que se pagó realmente
      if (data.estado_pago === 'PAGADO') monto = data.monto_pagado || monto;
      if (data.estado_pago === 'EXENTO') monto = 0;
      
      setResultado({ ticket: data, minutosTranscurridos: minutos, montoCalculado: monto, esGratuito: monto === 0 && data.tipo !== 'Reposicion' });
    } catch { setError('Error de conexión con el servidor'); }
    finally { setCargando(false); }
  };

  const simularPago = async () => {
    setCargando(true); setError('');
    try {
      const res = await fetch('/api/pagos/simular-pago', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: idTicket.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al simular pago'); return; }
      setResultado(prev => ({ ...prev, ticket: data.ticket, pagado: true, montoPagado: data.monto_pagado }));
    } catch { setError('Error de conexión'); }
    finally { setCargando(false); }
  };

  const reportarPerdido = async () => {
    setCargando(true); setError('');
    try {
      const res = await fetch('/api/pagos/reportar-perdido', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id_original: idTicket.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al reportar'); return; }
      setResultado({ ticket: data.ticket_reemplazo, perdido: true, penalizacion: data.penalizacion, nuevoCodigo: data.ticket_reemplazo?.id_ticket });
    } catch { setError('Error de conexión'); }
    finally { setCargando(false); }
  };

  const emitirTicketReposicion = async () => {
    setErrorReposicion(''); setTicketReposicion(null); setCargandoReposicion(true);
    try {
      const res = await fetch('/api/tickets/reposicion', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setErrorReposicion(data.error || 'Error'); return; }
      setTicketReposicion(data);
      setCodigoReposicion(data.id_ticket);
    } catch { setErrorReposicion('Error de conexión'); }
    finally { setCargandoReposicion(false); }
  };

  const buscarTicketReposicion = async () => {
    if (!codigoReposicion.trim()) return;
    setErrorReposicion(''); setResultadoReposicion(null); setCargandoReposicion(true);
    try {
      const res = await fetch(`/api/tickets/${codigoReposicion.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) { setErrorReposicion(data.error || 'No encontrado'); return; }
      if (data.tipo !== 'Reposicion') { setErrorReposicion('No es un ticket de Reposición.'); return; }
      setResultadoReposicion({ ticket: data, montoCalculado: 100 });
    } catch { setErrorReposicion('Error de conexión'); }
    finally { setCargandoReposicion(false); }
  };

  const cobrarTicketReposicion = async () => {
    if (!codigoReposicion.trim()) return;
    setErrorReposicion(''); setCargandoReposicion(true);
    try {
      const res = await fetch('/api/pagos/simular-pago', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: codigoReposicion.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorReposicion(data.error || 'Error al cobrar'); return; }
      setResultadoReposicion(prev => ({ ...prev, ticket: data.ticket, pagado: true, montoPagado: data.monto_pagado }));
    } catch { setErrorReposicion('Error de conexión'); }
    finally { setCargandoReposicion(false); }
  };

  const copiarAlPortapapeles = (texto) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className={esAdmin ? "" : "min-h-screen bg-[#0B0F19] relative overflow-hidden"}>
      {/* Fondo decorativo */}
      {!esAdmin && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full filter blur-[128px] opacity-10 pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full filter blur-[128px] opacity-10 pointer-events-none" />
        </>
      )}

      {/* Navbar pública */}
      {!esAdmin && (
        <nav className="bg-[#0B0F19]/90 backdrop-blur-md border-b border-blue-900/50 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <span className="text-gray-100 font-bold text-lg tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] animate-pulse" />
              ESTACIONAMIENTO <span className="text-blue-500">PRO</span>
            </span>
            <button
              onClick={() => { setShowLogin(true); setLoginError(''); setLoginUser(''); setLoginPass(''); }}
              className="flex items-center gap-2 bg-blue-900/30 border border-blue-500/50 hover:bg-blue-800/50 text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
            >
              <UserCircleIcon className="h-4 w-4" />
              Iniciar Sesión Admin
            </button>
          </div>
        </nav>
      )}

      {/* Contenido principal */}
      <main className={esAdmin ? "max-w-5xl mx-auto py-2 relative z-10" : "max-w-5xl mx-auto px-4 py-8 relative z-10"}>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-gray-100 tracking-tight">Caja <span className="text-blue-500">Virtual</span></h1>
            <p className="text-gray-400 text-sm mt-1">Cobro de tickets, extravíos y reposiciones</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700/50 mb-6">
            <button onClick={() => setActiveTab('normal')} className={`flex-1 py-3 text-center font-medium transition-all duration-200 border-b-2 text-sm ${activeTab === 'normal' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
              Caja Estándar (Tickets Normales)
            </button>
            <button onClick={() => setActiveTab('reposicion')} className={`flex-1 py-3 text-center font-medium transition-all duration-200 border-b-2 text-sm ${activeTab === 'reposicion' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
              Módulo de Reposición (Tickets Perdidos)
            </button>
          </div>

          {activeTab === 'normal' ? (
            <div className="space-y-6">
              <div className="bg-gray-800/40 rounded-xl p-6 border border-gray-700/50 backdrop-blur-md">
                <label className="block text-sm font-medium text-gray-300 mb-2">Ingrese el ID del Ticket</label>
                <div className="flex gap-3">
                  <input type="text" value={idTicket} onChange={e => setIdTicket(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && buscarTicket()} placeholder="Ej: A1B2C3D4" className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase text-white placeholder-gray-500 transition-all" />
                  <button onClick={buscarTicket} disabled={cargando || !idTicket.trim()} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-500 transition-all disabled:opacity-50">
                    {cargando ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <MagnifyingGlassIcon className="h-5 w-5" />}
                    Buscar
                  </button>
                </div>
              </div>

              {error && <div className="bg-red-900/40 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg flex items-center gap-3"><ExclamationTriangleIcon className="h-6 w-6 text-red-400" />{error}</div>}

              {resultado && !resultado.perdido && (
                <div className="bg-gray-800/40 rounded-xl p-6 space-y-6 border border-gray-700/50 backdrop-blur-md">
                  <h3 className="text-xl font-semibold text-gray-100 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500" />Información del Ticket</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                    <div><span className="text-gray-500 block mb-1">ID Ticket:</span><span className="font-mono font-bold text-blue-400 text-lg">{resultado.ticket.id_ticket}</span></div>
                    <div><span className="text-gray-500 block mb-1">Entrada:</span><span className="text-gray-200">{new Date(resultado.ticket.fecha_entrada).toLocaleString('es-MX')}</span></div>
                    <div>
                      <span className="text-gray-500 block mb-1">Tiempo Transcurrido:</span>
                      <span className="text-gray-200 font-semibold">
                        {(() => {
                          const horas = Math.floor(resultado.minutosTranscurridos / 60);
                          const mins = resultado.minutosTranscurridos % 60;
                          return horas > 0 ? `${horas}h ${mins}m` : `${mins} min`;
                        })()}
                      </span>
                    </div>
                    <div><span className="text-gray-500 block mb-1">Estado:</span>
                      {resultado.ticket.estado_pago === 'PAGADO' || resultado.ticket.estado_pago === 'EXENTO'
                        ? <span className="text-emerald-400 font-semibold px-2 py-1 bg-emerald-900/30 border border-emerald-500/30 rounded">{resultado.ticket.estado_pago}</span>
                        : <span className="text-amber-400 font-semibold px-2 py-1 bg-amber-900/30 border border-amber-500/30 rounded">{resultado.ticket.estado_pago || 'PENDIENTE'}</span>}
                    </div>
                    <div className="sm:col-span-2 md:col-span-2"><span className="text-gray-500 block mb-1">Monto a Pagar:</span><span className={`text-2xl font-bold ${resultado.esGratuito ? 'text-emerald-400' : 'text-blue-500'}`}>{resultado.esGratuito ? 'GRATIS (< 5 min)' : `$${resultado.montoCalculado.toLocaleString('es-MX')} MXN`}</span></div>
                  </div>
                  {(resultado.ticket.estado_pago === 'NO_PAGADO' || resultado.ticket.estado_pago === 'PENDIENTE') && !resultado.pagado && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-700/50">
                      <button onClick={simularPago} disabled={cargando} className="flex-1 flex justify-center items-center gap-2 bg-emerald-600/90 border border-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-500 transition-all disabled:opacity-50"><CreditCardIcon className="h-5 w-5" />Registrar Pago</button>
                      <button onClick={reportarPerdido} disabled={cargando} className="flex-1 flex justify-center items-center gap-2 bg-red-900/50 border border-red-500/80 text-red-200 py-3 rounded-lg font-semibold hover:bg-red-800 transition-all disabled:opacity-50"><ExclamationTriangleIcon className="h-5 w-5" />Reportar Perdido</button>
                    </div>
                  )}
                  {resultado.pagado && <div className="bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 px-4 py-4 rounded-lg text-center font-bold text-lg animate-pulse">Pago Registrado Exitosamente — ${(resultado.montoPagado || 0).toLocaleString('es-MX')} MXN</div>}
                </div>
              )}

              {resultado?.perdido && (
                <div className="bg-gray-800/40 rounded-xl p-8 text-center border border-red-900/50 backdrop-blur-md">
                  <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-100 mb-4">Ticket de Reemplazo Generado</h3>
                  <p className="text-red-300 font-medium mb-4">Penalización: <span className="font-bold text-red-400">$100 MXN</span></p>
                  <p className="text-gray-400 mb-2">Nuevo código para el cliente:</p>
                  <div className="inline-block bg-gray-900/80 border border-blue-500/50 px-8 py-4 rounded-xl"><span className="font-mono text-4xl font-bold text-blue-400 tracking-widest">{resultado.nuevoCodigo}</span></div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Emitir */}
              <div className="bg-gray-800/40 rounded-xl p-6 border border-gray-700/50 backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-100 flex items-center gap-2 mb-4"><PlusIcon className="h-5 w-5 text-blue-400" />Emitir Reposición</h3>
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">Cuando el cliente extravió su ticket. Se genera uno nuevo de tipo <strong className="text-blue-400">Reposicion</strong> con tarifa de $100 MXN.</p>
                  {ticketReposicion && (
                    <div className="bg-gray-900/60 border border-blue-500/30 rounded-xl p-5 mb-6 relative">
                      <div className="flex justify-between items-start mb-4">
                        <div><span className="text-[10px] text-gray-500 block uppercase tracking-wider">Código Generado</span><span className="font-mono font-bold text-2xl text-blue-400">{ticketReposicion.id_ticket}</span></div>
                        <button onClick={() => copiarAlPortapapeles(ticketReposicion.id_ticket)} className="text-gray-500 hover:text-blue-400 p-1.5 rounded-lg hover:bg-gray-800/50 transition-colors"><ClipboardDocumentIcon className="h-5 w-5" /></button>
                      </div>
                      <div className="text-xs border-t border-gray-800 pt-3 space-y-2">
                        <div className="flex justify-between"><span className="text-gray-500">Fecha/Hora:</span><span className="text-gray-300">{new Date(ticketReposicion.fecha_entrada).toLocaleString('es-MX')}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Penalización:</span><span className="text-blue-400 font-bold">$100.00 MXN</span></div>
                      </div>
                      {copiado && <div className="absolute bottom-2 right-2 bg-emerald-600/90 text-white text-[10px] px-2 py-0.5 rounded">¡Copiado!</div>}
                    </div>
                  )}
                  {errorReposicion && !resultadoReposicion && <div className="bg-red-900/40 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4 text-xs">{errorReposicion}</div>}
                </div>
                <button onClick={emitirTicketReposicion} disabled={cargandoReposicion} className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50">
                  {cargandoReposicion ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <><TicketIcon className="h-5 w-5" />Emitir Nueva Reposición</>}
                </button>
              </div>

              {/* Cobrar */}
              <div className="bg-gray-800/40 rounded-xl p-6 border border-gray-700/50 backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-100 flex items-center gap-2 mb-4"><CreditCardIcon className="h-5 w-5 text-emerald-400" />Cobrar Reposición</h3>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">ID del ticket de reposición</label>
                      <div className="flex gap-2">
                        <input type="text" value={codigoReposicion} onChange={e => setCodigoReposicion(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && buscarTicketReposicion()} placeholder="Ej: A1B2C3D4" className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none uppercase text-sm text-white" />
                        <button onClick={buscarTicketReposicion} disabled={cargandoReposicion || !codigoReposicion.trim()} className="bg-gray-700 text-gray-200 hover:bg-gray-600 px-4 rounded-lg text-sm font-medium transition-colors">Buscar</button>
                      </div>
                    </div>
                    {errorReposicion && <div className="bg-red-900/40 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-xs">{errorReposicion}</div>}
                    {resultadoReposicion && (
                      <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div><span className="text-gray-500 block">Ticket ID:</span><span className="font-mono font-semibold text-blue-400">{resultadoReposicion.ticket.id_ticket}</span></div>
                          <div><span className="text-gray-500 block">Estado:</span><span className={`font-semibold ${resultadoReposicion.ticket.estado_pago === 'PAGADO' ? 'text-emerald-400' : 'text-amber-400'}`}>{resultadoReposicion.ticket.estado_pago}</span></div>
                        </div>
                        <div className="border-t border-gray-800 pt-3 flex justify-between items-center"><span className="text-xs text-gray-500">Monto:</span><span className="text-xl font-bold text-emerald-400">$100.00 MXN</span></div>
                        {resultadoReposicion.pagado && <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 px-3 py-2 rounded text-center text-xs font-semibold animate-pulse">¡Pago registrado! Salida autorizada.</div>}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={cobrarTicketReposicion} disabled={cargandoReposicion || !resultadoReposicion || resultadoReposicion.pagado || resultadoReposicion.ticket?.estado_pago === 'PAGADO'} className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  {cargandoReposicion ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <><CreditCardIcon className="h-5 w-5" />Registrar Pago de Penalización</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Login */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowLogin(false)}>
          <div className="bg-gray-900/95 p-8 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] w-full max-w-md border border-gray-700/50 relative">
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-200 transition-colors"><XMarkIcon className="h-5 w-5" /></button>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3"><div className="p-3 bg-blue-900/30 rounded-xl border border-blue-500/30"><UserCircleIcon className="h-10 w-10 text-blue-400" /></div></div>
              <h2 className="text-2xl font-bold text-gray-100">Acceso Admin</h2>
              <p className="text-gray-400 text-sm mt-1">Ingresa tus credenciales</p>
            </div>
            {loginError && <div className="bg-red-900/40 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">{loginError}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserCircleIcon className="h-5 w-5 text-gray-500" /></div><input type="text" value={loginUser} onChange={e => setLoginUser(e.target.value)} required placeholder="Usuario" className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500" /></div>
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><KeyIcon className="h-5 w-5 text-gray-500" /></div><input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required placeholder="Contraseña" className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-gray-500" /></div>
              <button type="submit" disabled={loginLoading} className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-500 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                {loginLoading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <><ArrowRightEndOnRectangleIcon className="h-5 w-5" />Iniciar Sesión</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
