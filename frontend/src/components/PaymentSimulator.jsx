import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCardIcon, 
  ExclamationTriangleIcon, 
  MagnifyingGlassIcon,
  PlusIcon,
  ClipboardDocumentIcon,
  TicketIcon
} from '@heroicons/react/24/outline';

export default function PaymentSimulator() {
  const { token } = useAuth();
  
  // Tab selector: 'normal' | 'reposicion'
  const [activeTab, setActiveTab] = useState('normal');

  // --- Normal Tab State ---
  const [idTicket, setIdTicket] = useState('');
  const [codigoDescuento, setCodigoDescuento] = useState('');
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // --- Reposicion Tab State ---
  const [ticketReposicion, setTicketReposicion] = useState(null);
  const [codigoReposicion, setCodigoReposicion] = useState('');
  const [resultadoReposicion, setResultadoReposicion] = useState(null);
  const [cargandoReposicion, setCargandoReposicion] = useState(false);
  const [errorReposicion, setErrorReposicion] = useState('');
  const [copiado, setCopiado] = useState(false);

  // --- Normal Tab Handlers ---
  const buscarTicket = async () => {
    if (!idTicket.trim()) return;
    setError('');
    setResultado(null);
    setCargando(true);

    try {
      const res = await fetch(`/api/tickets/${idTicket.trim().toUpperCase()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ticket no encontrado');
        return;
      }

      const ahora = new Date();
      const entrada = new Date(data.fecha_entrada);
      const minutosTranscurridos = Math.round((ahora - entrada) / 60000);
      
      let monto = 0;
      if (data.tipo === 'Reposicion') {
        monto = 100; // Tarifa plana para reposiciones
      } else {
        const horas = Math.ceil(minutosTranscurridos / 60);
        monto = minutosTranscurridos <= 5 ? 0 : horas * 15;
      }

      setResultado({
        ticket: data,
        minutosTranscurridos,
        montoCalculado: monto,
        esGratuito: monto === 0 && data.tipo !== 'Reposicion',
      });
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  };

  const simularPago = async () => {
    setCargando(true);
    setError('');

    try {
      const res = await fetch('/api/pagos/simular-pago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticket_id: idTicket.trim().toUpperCase(),
          codigo_descuento: codigoDescuento.trim().toUpperCase() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al simular pago');
        return;
      }

      setResultado((prev) => ({
        ...prev,
        ticket: data.ticket,
        pagado: true,
        montoPagado: data.monto_pagado,
      }));
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  };

  const reportarPerdido = async () => {
    setCargando(true);
    setError('');

    try {
      const res = await fetch('/api/pagos/reportar-perdido', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticket_id_original: idTicket.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al reportar ticket perdido');
        return;
      }

      setResultado({
        ticket: data.ticket_reemplazo,
        perdido: true,
        penalizacion: data.penalizacion,
        nuevoCodigo: data.ticket_reemplazo?.id_ticket,
      });
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  };

  // --- Reposicion Tab Handlers ---
  const emitirTicketReposicion = async () => {
    setErrorReposicion('');
    setTicketReposicion(null);
    setCargandoReposicion(true);
    try {
      const res = await fetch('/api/tickets/reposicion', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorReposicion(data.error || 'Error al emitir ticket de reposición');
        return;
      }
      setTicketReposicion(data);
      // Auto-cargar el código en la sección de cobro para mayor comodidad
      setCodigoReposicion(data.id_ticket);
    } catch {
      setErrorReposicion('Error al conectar con el servidor');
    } finally {
      setCargandoReposicion(false);
    }
  };

  const buscarTicketReposicion = async () => {
    if (!codigoReposicion.trim()) return;
    setErrorReposicion('');
    setResultadoReposicion(null);
    setCargandoReposicion(true);

    try {
      const res = await fetch(`/api/tickets/${codigoReposicion.trim().toUpperCase()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorReposicion(data.error || 'Ticket no encontrado');
        return;
      }

      if (data.tipo !== 'Reposicion') {
        setErrorReposicion('El ticket ingresado no es de tipo Reposición. Use la pestaña de Caja Estándar.');
        return;
      }

      setResultadoReposicion({
        ticket: data,
        montoCalculado: 100, // Penalización fija
      });
    } catch {
      setErrorReposicion('Error de conexión con el servidor');
    } finally {
      setCargandoReposicion(false);
    }
  };

  const cobrarTicketReposicion = async () => {
    if (!codigoReposicion.trim()) return;
    setErrorReposicion('');
    setCargandoReposicion(true);

    try {
      const res = await fetch('/api/pagos/simular-pago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticket_id: codigoReposicion.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorReposicion(data.error || 'Error al procesar pago');
        return;
      }

      setResultadoReposicion((prev) => ({
        ...prev,
        ticket: data.ticket,
        pagado: true,
        montoPagado: data.monto_pagado,
      }));
      
      // Limpiar ticket de reposición emitido para evitar confusiones
      if (ticketReposicion && ticketReposicion.id_ticket === codigoReposicion.trim().toUpperCase()) {
        setTicketReposicion(prev => prev ? { ...prev, estado_pago: 'PAGADO' } : null);
      }
    } catch {
      setErrorReposicion('Error de conexión con el servidor');
    } finally {
      setCargandoReposicion(false);
    }
  };

  const copiarAlPortapapeles = (texto) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">Caja <span className="text-blue-500">Virtual</span></h1>
        <p className="text-gray-400 text-sm mt-1">Simula el cobro, reporta extravíos y gestiona reposiciones</p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-700/50 mb-6">
        <button
          onClick={() => setActiveTab('normal')}
          className={`flex-1 py-3 text-center font-medium transition-all duration-200 border-b-2 text-sm ${
            activeTab === 'normal'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Caja Estándar (Tickets Normales)
        </button>
        <button
          onClick={() => setActiveTab('reposicion')}
          className={`flex-1 py-3 text-center font-medium transition-all duration-200 border-b-2 text-sm ${
            activeTab === 'reposicion'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Módulo de Reposición (Tickets Perdidos)
        </button>
      </div>

      {activeTab === 'normal' ? (
        // --- NORMAL TAB LAYOUT ---
        <div className="space-y-6">
          <div className="bg-gray-800/40 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] p-6 border border-gray-700/50 backdrop-blur-md">
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="idTicket">
              Ingrese el ID del Ticket
            </label>
            <div className="flex gap-3">
              <input
                id="idTicket"
                type="text"
                value={idTicket}
                onChange={(e) => setIdTicket(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && buscarTicket()}
                placeholder="Ej: A1B2C3D4"
                className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase text-white shadow-inner placeholder-gray-500 transition-all"
              />
              <button
                onClick={buscarTicket}
                disabled={cargando || !idTicket.trim()}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(59,130,246,0.4)]"
              >
                {cargando ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> : <MagnifyingGlassIcon className="h-5 w-5" />}
                Buscar
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg backdrop-blur-sm flex items-center gap-3 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              {error}
            </div>
          )}

          {resultado && !resultado.perdido && (
            <div className="bg-gray-800/40 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] p-6 space-y-6 border border-gray-700/50 backdrop-blur-md">
              <h3 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                Información del Ticket
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                <div>
                  <span className="text-gray-500 block mb-1">ID Ticket:</span>
                  <span className="font-mono font-bold text-blue-400 text-lg">{resultado.ticket.id_ticket}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Entrada:</span>
                  <span className="text-gray-200">
                    {new Date(resultado.ticket.fecha_entrada).toLocaleString('es-MX')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Tipo de Ticket:</span>
                  <span className={`px-2 py-0.5 rounded font-semibold text-xs border inline-block ${
                    resultado.ticket.tipo === 'Reposicion' 
                      ? 'bg-purple-900/30 border-purple-500/30 text-purple-400' 
                      : 'bg-blue-900/30 border-blue-500/30 text-blue-400'
                  }`}>
                    {resultado.ticket.tipo || 'Normal'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Estado de Pago:</span>
                  {resultado.ticket.estado_pago === 'PAGADO' || resultado.ticket.estado_pago === 'EXENTO' ? (
                    <span className="text-emerald-400 font-semibold px-2 py-1 bg-emerald-900/30 border border-emerald-500/30 rounded">{resultado.ticket.estado_pago}</span>
                  ) : (
                    <span className="text-amber-400 font-semibold px-2 py-1 bg-amber-900/30 border border-amber-500/30 rounded">{resultado.ticket.estado_pago || 'PENDIENTE'}</span>
                  )}
                </div>
                {resultado.ticket.tipo !== 'Reposicion' && (
                  <div>
                    <span className="text-gray-500 block mb-1">Tiempo Transcurrido:</span>
                    <span className="text-gray-200 font-semibold">{resultado.minutosTranscurridos} min</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 block mb-1">Código de Descuento:</span>
                  <input
                    type="text"
                    value={codigoDescuento}
                    onChange={(e) => setCodigoDescuento(e.target.value.toUpperCase())}
                    placeholder="Ingrese código"
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase text-white text-sm shadow-inner placeholder-gray-500 transition-all"
                  />
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Monto a Pagar:</span>
                  {(() => {
                    let porcentajeDescuento = 0;
                    if (codigoDescuento === '50OFF') porcentajeDescuento = 50;
                    else if (codigoDescuento === '25OFF') porcentajeDescuento = 25;
                    
                    const montoConDescuento = resultado.montoCalculado * (1 - porcentajeDescuento / 100);
                    
                    return (
                      <div className="space-y-2">
                        <div>
                          <span className={`text-2xl font-bold ${resultado.esGratuito ? 'text-emerald-400' : 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`}>
                            {resultado.esGratuito ? 'GRATIS (< 5 min)' : `$${montoConDescuento.toLocaleString('es-MX')} MXN`}
                          </span>
                        </div>
                        {porcentajeDescuento > 0 && !resultado.esGratuito && (
                          <div className="text-xs space-y-1">
                            <div className="text-gray-400">
                              Monto Original: <span className="text-gray-300 line-through">${resultado.montoCalculado.toLocaleString('es-MX')}</span>
                            </div>
                            <div className="text-emerald-400 font-semibold">
                              Descuento ({porcentajeDescuento}%): -${(resultado.montoCalculado * porcentajeDescuento / 100).toLocaleString('es-MX')}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {(resultado.ticket.estado_pago === 'NO_PAGADO' || resultado.ticket.estado_pago === 'PENDIENTE') && !resultado.pagado && (
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-700/50">
                  <button
                    onClick={simularPago}
                    disabled={cargando}
                    className="flex-1 flex justify-center items-center gap-2 bg-emerald-600/90 border border-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-500 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    <CreditCardIcon className="h-5 w-5" />
                    Registrar Pago
                  </button>
                  <button
                    onClick={reportarPerdido}
                    disabled={cargando}
                    className="flex-1 flex justify-center items-center gap-2 bg-red-900/50 border border-red-500/80 text-red-200 py-3 rounded-lg font-semibold hover:bg-red-800 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  >
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    Reportar Perdido
                  </button>
                </div>
              )}

              {(() => {
                let porcentajeDescuento = 0;
                if (codigoDescuento === '50OFF') porcentajeDescuento = 50;
                else if (codigoDescuento === '25OFF') porcentajeDescuento = 25;
                
                const montoConDescuento = resultado.montoCalculado * (1 - porcentajeDescuento / 100);
                
                return (resultado.pagado || porcentajeDescuento > 0) ? (
                  <div className="bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 px-4 py-4 rounded-lg text-center font-bold text-lg shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse space-y-2">
                    {resultado.pagado && (
                      <div>Pago Registrado Exitosamente - ${(resultado.montoPagado || 0).toLocaleString('es-MX')} MXN</div>
                    )}
                    {porcentajeDescuento > 0 && !resultado.esGratuito && (
                      <div>Descuento ({porcentajeDescuento}%) Aplicado - Nuevo Total: ${montoConDescuento.toLocaleString('es-MX')} MXN</div>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {resultado && resultado.perdido && (
            <div className="bg-gray-800/40 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.2)] p-8 text-center border border-red-900/50 backdrop-blur-md">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              <h3 className="text-2xl font-bold text-gray-100 mb-6">Ticket de Reemplazo Generado</h3>
              
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6 inline-block">
                <p className="text-red-300 font-medium">Penalización por ticket perdido: <span className="font-bold text-red-400">$100 MXN</span></p>
              </div>
              
              <p className="text-gray-400 mb-2">Nuevo Código a entregar al cliente:</p>
              <div className="inline-block bg-gray-900/80 border border-blue-500/50 px-8 py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <span className="font-mono text-4xl font-bold text-blue-400 tracking-widest">{resultado.nuevoCodigo}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        // --- REPOSICION TAB LAYOUT ---
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Emitir Reposicion */}
          <div className="bg-gray-800/40 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] p-6 border border-gray-700/50 backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-100 flex items-center gap-2 mb-4">
                <PlusIcon className="h-5 w-5 text-blue-400" />
                Emitir Reposición
              </h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Use esta sección cuando el cliente haya extraviado su ticket por completo y no cuente con su código. 
                Se generará un ticket nuevo de tipo <strong className="text-blue-400">Reposicion</strong> con tarifa plana de penalización.
              </p>

              {ticketReposicion && (
                <div className="bg-gray-900/60 border border-blue-500/30 rounded-xl p-5 mb-6 relative overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                  <div className="absolute top-0 right-0 bg-blue-600/20 text-blue-400 border-l border-b border-blue-500/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                    {ticketReposicion.tipo}
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Código Generado</span>
                      <span className="font-mono font-bold text-2xl text-blue-400 tracking-wider">{ticketReposicion.id_ticket}</span>
                    </div>
                    <button
                      onClick={() => copiarAlPortapapeles(ticketReposicion.id_ticket)}
                      className="text-gray-500 hover:text-blue-400 p-1.5 rounded-lg hover:bg-gray-800/50 transition-colors"
                      title="Copiar código"
                    >
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs border-t border-gray-800 pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fecha/Hora:</span>
                      <span className="text-gray-300 font-medium">{new Date(ticketReposicion.fecha_entrada).toLocaleString('es-MX')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Costo Penalización:</span>
                      <span className="text-blue-400 font-bold">$100.00 MXN</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Estado de Pago:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ticketReposicion.estado_pago === 'PAGADO'
                          ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-950/30 border border-amber-500/30 text-amber-400'
                      }`}>
                        {ticketReposicion.estado_pago}
                      </span>
                    </div>
                  </div>

                  {copiado && (
                    <div className="absolute bottom-2 right-2 bg-emerald-600/90 text-white text-[10px] px-2 py-0.5 rounded shadow">
                      Copiado!
                    </div>
                  )}
                </div>
              )}

              {errorReposicion && !resultadoReposicion && (
                <div className="bg-red-900/40 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4 text-xs">
                  {errorReposicion}
                </div>
              )}
            </div>

            <button
              onClick={emitirTicketReposicion}
              disabled={cargandoReposicion}
              className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              {cargandoReposicion ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <TicketIcon className="h-5 w-5" />
                  Emitir Nueva Reposición
                </>
              )}
            </button>
          </div>

          {/* Card 2: Cobrar Reposicion */}
          <div className="bg-gray-800/40 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] p-6 border border-gray-700/50 backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-100 flex items-center gap-2 mb-4">
                <CreditCardIcon className="h-5 w-5 text-emerald-400" />
                Cobrar Reposición
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="codigoReposicion">
                    Ingrese el ID del ticket de reposición
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="codigoReposicion"
                      type="text"
                      value={codigoReposicion}
                      onChange={(e) => setCodigoReposicion(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && buscarTicketReposicion()}
                      placeholder="Ej: A1B2C3D4"
                      className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase text-sm text-white shadow-inner"
                    />
                    <button
                      onClick={buscarTicketReposicion}
                      disabled={cargandoReposicion || !codigoReposicion.trim()}
                      className="bg-gray-700 text-gray-200 hover:bg-gray-600 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Buscar
                    </button>
                  </div>
                </div>

                {errorReposicion && resultadoReposicion && (
                  <div className="bg-red-900/40 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-xs">
                    {errorReposicion}
                  </div>
                )}

                {resultadoReposicion && (
                  <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-500 block mb-0.5">Ticket ID:</span>
                        <span className="font-mono font-semibold text-blue-400 text-sm">{resultadoReposicion.ticket.id_ticket}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">Entrada:</span>
                        <span className="text-gray-300 font-medium">
                          {new Date(resultadoReposicion.ticket.fecha_entrada).toLocaleString('es-MX')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">Tipo:</span>
                        <span className="text-purple-400 font-semibold">Reposición</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">Estado:</span>
                        <span className={`font-semibold ${
                          resultadoReposicion.ticket.estado_pago === 'PAGADO' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {resultadoReposicion.ticket.estado_pago}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
                      <span className="text-xs text-gray-500">Monto Penalización:</span>
                      <span className="text-xl font-bold text-emerald-400">$100.00 MXN</span>
                    </div>

                    {resultadoReposicion.pagado && (
                      <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 px-3 py-2 rounded text-center text-xs font-semibold animate-pulse">
                        Pago registrado. ¡La salida está autorizada!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={cobrarTicketReposicion}
              disabled={
                cargandoReposicion || 
                !resultadoReposicion || 
                resultadoReposicion.pagado || 
                resultadoReposicion.ticket.estado_pago === 'PAGADO'
              }
              className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              {cargandoReposicion ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <CreditCardIcon className="h-5 w-5" />
                  Registrar Pago de Penalización
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}