# WebSocket - Cambios en Tiempo Real de la Base de Datos

Este proyecto incluye WebSocket para notificar cambios en la base de datos en tiempo real.

## Eventos Disponibles

### Backend → Frontend

El servidor emite los siguientes eventos cuando hay cambios en la base de datos:

#### `ticket:created`
Se emite cuando se crea un nuevo ticket.

**Payload:**
```javascript
{
  _id: string,           // ID del ticket
  id_ticket: string,     // Alias para _id
  fecha_entrada: Date,   // Fecha de entrada
  estado_pago: string,   // Estado de pago (NO_PAGADO, PAGADO, EXENTO, PERDIDO, Perdido_Sistema)
  activo: boolean,       // Si el ticket está activo
  timestamp: Date        // Fecha del evento
}
```

#### `ticket:updated`
Se emite cuando se actualiza un ticket (cambios de estado, fecha de salida, etc.).

**Payload:**
```javascript
{
  _id: string,           // ID del ticket
  id_ticket: string,     // Alias para _id
  fecha_entrada: Date,   // Fecha de entrada
  fecha_salida: Date,    // Fecha de salida (null si aún no sale)
  estado_pago: string,   // Estado de pago
  activo: boolean,       // Si el ticket está activo
  timestamp: Date        // Fecha del evento
}
```

#### `pago:created`
Se emite cuando se registra un nuevo pago.

**Payload:**
```javascript
{
  _id: string,           // ID del pago (ObjectId de MongoDB)
  ticket_id: string,     // ID del ticket asociado
  fecha_pago: Date,      // Fecha del pago
  monto: number,         // Monto del pago
  timestamp: Date        // Fecha del evento
}
```

#### `ticket:lost`
Se emite cuando un ticket se reporta como perdido y se genera un ticket de reemplazo.

**Payload:**
```javascript
{
  ticket_original: {
    _id: string,        // ID del ticket original
    id_ticket: string,  // Alias para _id
    estado_pago: string // Estado (PERDIDO)
  },
  ticket_reemplazo: {
    _id: string,        // ID del nuevo ticket
    id_ticket: string,  // Alias para _id
    estado_pago: string // Estado (EXENTO)
  },
  timestamp: Date       // Fecha del evento
}
```

## Cómo Usar en el Frontend

### 1. Importar el Hook

```javascript
import { useSocket } from '@/hooks/useSocket';
```

### 2. Usar el Hook en un Componente

```javascript
import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

function MiComponente() {
  const { socket, isConnected, subscribe } = useSocket();
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Suscribirse a nuevos tickets
    const unsubscribe = subscribe('ticket:created', (data) => {
      console.log('Nuevo ticket:', data);
      setTickets(prev => [data, ...prev]);
    });

    return unsubscribe;
  }, [socket, subscribe]);

  return (
    <div>
      {isConnected ? <p>✓ Conectado</p> : <p>✗ Desconectado</p>}
      <div>
        {tickets.map(ticket => (
          <div key={ticket._id}>
            {ticket.id_ticket} - {ticket.estado_pago}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Escuchar Múltiples Eventos

```javascript
useEffect(() => {
  if (!socket) return;

  const unsub1 = subscribe('ticket:created', (data) => {
    // Manejar nuevo ticket
  });

  const unsub2 = subscribe('ticket:updated', (data) => {
    // Manejar actualización de ticket
  });

  const unsub3 = subscribe('pago:created', (data) => {
    // Manejar nuevo pago
  });

  return () => {
    unsub1?.();
    unsub2?.();
    unsub3?.();
  };
}, [socket, subscribe]);
```

## Integración con el Dashboard

Para que el dashboard se actualice automáticamente cuando hay cambios:

```javascript
function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const { subscribe } = useSocket();

  useEffect(() => {
    // Obtener tickets iniciales
    fetchTickets();

    // Actualizar en tiempo real
    const unsub1 = subscribe('ticket:created', (data) => {
      setTickets(prev => [data, ...prev]);
    });

    const unsub2 = subscribe('ticket:updated', (data) => {
      setTickets(prev =>
        prev.map(t => t._id === data._id ? data : t)
      );
    });

    return () => {
      unsub1?.();
      unsub2?.();
    };
  }, [subscribe]);

  // ... resto del componente
}
```

## Características del Hook `useSocket`

### `socket`
La instancia de Socket.io (o null si no está conectado aún).

### `isConnected`
Boolean indicando si está conectado al servidor.

### `subscribe(event, callback)`
Función para suscribirse a eventos.
- Retorna una función de desuscripción.
- Automáticamente se desuscribe al desmontar el componente.

## Configuración del Servidor

El servidor WebSocket está configurado en `backend/socket/socketHandler.js` y se inicializa en `backend/server.js`:

```javascript
const http = require('http');
const { initializeSocket } = require('./socket/socketHandler');

const server = http.createServer(app);
initializeSocket(server);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
```

Los eventos se emiten desde las rutas usando funciones en `backend/socket/socketEvents.js`:

```javascript
const { 
  emitTicketCreated, 
  emitTicketUpdated, 
  emitPagoCreated, 
  emitTicketLost 
} = require('../socket/socketEvents');

// En una ruta:
const nuevoTicket = await Ticket.create({...});
emitTicketCreated(nuevoTicket);
```

## Debugging

Para ver los eventos que se emiten y reciben, puedes habilitare logs adicionales:

### En el Backend
```javascript
// En socketHandler.js
io.on('connection', (socket) => {
  socket.onAny((event, ...args) => {
    console.log(`Evento: ${event}`, args);
  });
});
```

### En el Frontend
```javascript
// Los logs ya están habilitados en useSocket.js
// Abre la consola del navegador (F12) para ver:
console.log('Conectado al servidor WebSocket');
console.log('Desconectado del servidor WebSocket');
```
