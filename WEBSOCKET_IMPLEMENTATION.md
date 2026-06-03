# Implementación de WebSocket - Notificaciones en Tiempo Real

Este documento describe los cambios realizados para agregar WebSocket y notificaciones en tiempo real cuando hay cambios en la base de datos.

## Resumen de Cambios

### Backend

#### Archivos Nuevos:
- **`backend/socket/socketHandler.js`**: Configuración principal de Socket.io
  - `initializeSocket(server)`: Inicializa Socket.io en el servidor HTTP
  - `getIO()`: Obtiene la instancia de Socket.io

- **`backend/socket/socketEvents.js`**: Funciones para emitir eventos
  - `emitTicketCreated(ticket)`: Emite cuando se crea un ticket
  - `emitTicketUpdated(ticket)`: Emite cuando se actualiza un ticket
  - `emitPagoCreated(pago)`: Emite cuando se crea un pago
  - `emitTicketLost(ticketOriginal, ticketReemplazo)`: Emite cuando se reporta un ticket como perdido

#### Archivos Modificados:
- **`backend/server.js`**:
  - Agregado: `const http = require('http');`
  - Agregado: `const { initializeSocket } = require('./socket/socketHandler');`
  - Cambio: Usar `http.createServer(app)` en lugar de solo `app.listen()`
  - Cambio: Llamar a `initializeSocket(server)` después de conectar a la base de datos
  - Cambio: Usar `server.listen()` en lugar de `app.listen()`

- **`backend/routes/tickets.js`**:
  - Agregado: Import de `emitTicketCreated` y `emitTicketUpdated`
  - POST `/entrada`: Emite `ticket:created` cuando se crea un ticket
  - POST `/validar-salida`: Emite `ticket:updated` cuando se actualiza el ticket
  - POST `/reposicion`: Emite `ticket:created` cuando se crea un ticket de reposición

- **`backend/routes/pagos.js`**:
  - Agregado: Imports de `emitTicketUpdated`, `emitPagoCreated`, `emitTicketLost`
  - POST `/simular-pago`: Emite eventos cuando se procesa un pago
  - POST `/reportar-perdido`: Emite `ticket:lost` cuando se reporta un ticket como perdido

#### Dependencias Instaladas:
- `socket.io`: ^4.x (comunicación WebSocket bidireccional)

### Frontend

#### Archivos Nuevos:
- **`frontend/src/hooks/useSocket.js`**: Hook personalizado para usar WebSocket
  - `useSocket()`: Hook que maneja la conexión WebSocket
    - `socket`: Instancia de Socket.io
    - `isConnected`: Estado de conexión
    - `subscribe(event, callback)`: Función para suscribirse a eventos

- **`frontend/src/components/WebSocketExample.jsx`**: Componente de ejemplo
  - Demuestra cómo usar el hook `useSocket()`
  - Muestra estado de conexión
  - Registra eventos en tiempo real

#### Dependencias Instaladas:
- `socket.io-client`: ^4.x (cliente WebSocket para React)

## Eventos Disponibles

### ticket:created
Emitido cuando se crea un nuevo ticket (entrada o reposición).

### ticket:updated
Emitido cuando se actualiza un ticket (salida, cambio de estado de pago).

### pago:created
Emitido cuando se registra un pago.

### ticket:lost
Emitido cuando se reporta un ticket como perdido y se genera un reemplazo.

Para más detalles sobre el payload de cada evento, ver `WEBSOCKET_GUIDE.md`.

## Cómo Usar

### En el Backend

1. Importar las funciones de emisión:
```javascript
const { emitTicketCreated, emitTicketUpdated, emitPagoCreated, emitTicketLost } = require('../socket/socketEvents');
```

2. Emitir eventos después de cambios en la base de datos:
```javascript
const nuevoTicket = await Ticket.create({...});
emitTicketCreated(nuevoTicket);
```

### En el Frontend

1. Importar el hook:
```javascript
import { useSocket } from '@/hooks/useSocket';
```

2. Usar en un componente:
```javascript
function MiComponente() {
  const { socket, isConnected, subscribe } = useSocket();

  useEffect(() => {
    const unsub = subscribe('ticket:created', (data) => {
      console.log('Nuevo ticket:', data);
    });
    return unsub;
  }, [subscribe]);

  return <div>{isConnected ? 'Conectado' : 'Desconectado'}</div>;
}
```

Ver `WEBSOCKET_GUIDE.md` para documentación completa y ejemplos avanzados.

## Integración Automática

### Reconexión
El cliente WebSocket automáticamente:
- Se reconecta si la conexión se cae
- Intenta reconectarse cada 1 segundo
- Después de 10 intentos, detiene los intentos
- Usa WebSocket como transporte principal

### Manejo de Errores
- Los errores en la emisión de eventos se registran en la consola
- Los errores de desconexión se manejan automáticamente
- El componente se desmonta correctamente cuando se cierra la conexión

## Testing

Para probar los WebSockets:

1. Iniciar el backend:
```bash
cd backend
npm run dev
```

2. Iniciar el frontend:
```bash
cd frontend
npm run dev
```

3. Agregar el componente de ejemplo a una página:
```javascript
import { WebSocketExample } from '@/components/WebSocketExample';

// En tu componente
<WebSocketExample />
```

4. Realizar operaciones que emitan eventos (crear/actualizar tickets, pagar, reportar perdidos)

5. Ver los eventos en tiempo real en el componente de ejemplo

## Notas Importantes

- WebSocket funciona en la misma instancia de servidor que Express
- Los eventos se emiten a TODOS los clientes conectados
- No hay autenticación por WebSocket (utiliza la misma CORS que Express)
- Los eventos se pierden si no hay clientes conectados (no hay persistencia)

Para agregar persistencia o cambiar el comportamiento de los eventos, consulta la documentación de Socket.io.
