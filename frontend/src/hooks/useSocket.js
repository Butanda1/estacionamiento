import { useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // En dev: Vite hace proxy de /socket.io → puerto 5000.
    // En prod: el frontend y el backend corren en el mismo origen.
    const newSocket = io(window.location.origin, {
      path: '/socket.io',
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 10,
      // Sin restringir transports: Socket.IO intenta WebSocket y hace fallback a polling
    });

    newSocket.on('connect', () => {
      console.log('Conectado al servidor WebSocket');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado del servidor WebSocket');
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Error en WebSocket:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const subscribe = useCallback(
    (event, callback) => {
      if (!socket) return;

      socket.on(event, callback);

      return () => {
        socket.off(event, callback);
      };
    },
    [socket]
  );

  return {
    socket,
    isConnected,
    subscribe,
  };
}
