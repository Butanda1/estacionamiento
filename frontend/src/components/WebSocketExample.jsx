import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

/**
 * Componente de ejemplo que demuestra cómo usar WebSocket
 * para recibir actualizaciones en tiempo real de la base de datos
 */
export function WebSocketExample() {
  const { socket, isConnected, subscribe } = useSocket();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Suscribirse a eventos de tickets
    const unsub1 = subscribe('ticket:created', (data) => {
      addEvent('Nuevo Ticket', data);
    });

    const unsub2 = subscribe('ticket:updated', (data) => {
      addEvent('Ticket Actualizado', data);
    });

    // Suscribirse a eventos de pagos
    const unsub3 = subscribe('pago:created', (data) => {
      addEvent('Nuevo Pago', data);
    });

    // Suscribirse a eventos de tickets perdidos
    const unsub4 = subscribe('ticket:lost', (data) => {
      addEvent('Ticket Perdido', data);
    });

    return () => {
      unsub1?.();
      unsub2?.();
      unsub3?.();
      unsub4?.();
    };
  }, [socket, subscribe]);

  const addEvent = (type, data) => {
    const newEvent = {
      id: Date.now(),
      type,
      data,
      timestamp: new Date().toLocaleTimeString(),
    };
    setEvents((prev) => [newEvent, ...prev].slice(0, 10)); // Mantener últimos 10 eventos
  };

  return (
    <div className="p-6 border rounded-lg bg-gray-50">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">WebSocket Demo</h2>
        <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {isConnected ? '● Conectado' : '● Desconectado'}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Últimos Eventos:</h3>
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">Esperando eventos...</p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {events.map((event) => (
              <li
                key={event.id}
                className="text-sm p-2 bg-white border rounded border-gray-200"
              >
                <div className="font-medium text-gray-900">{event.type}</div>
                <div className="text-gray-500 text-xs">{event.timestamp}</div>
                <div className="text-gray-600 text-xs mt-1 break-words">
                  {JSON.stringify(event.data).substring(0, 100)}...
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default WebSocketExample;
