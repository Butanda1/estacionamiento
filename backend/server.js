const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const connectDB = require('./config/db');
const { checkExpiredTickets } = require('./utils/expiryScheduler');
const { initializeSocket } = require('./socket/socketHandler');
const path = require('path'); // <-- NUEVO: Para manejar rutas de archivos

dotenv.config();

const app = express();
const server = http.createServer(app);

connectDB();

// Inicializar WebSocket
initializeSocket(server);

// Control de tickets vencidos (Pasar a Perdido_Sistema después de 24 horas)
checkExpiredTickets();
setInterval(checkExpiredTickets, 5 * 60 * 1000);

app.use(cors());
app.use(express.json());

// Tus rutas de la API se quedan exactamente igual
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/pagos', require('./routes/pagos'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => {
  res.json({ estado: 'OK', servicio: 'Estacionamiento Inteligente API' });
});

// ==========================================
// UNIFICACIÓN DEL FRONTEND CON EL BACKEND
// ==========================================

// 1. Le decimos a Express dónde están los archivos estáticos que genera React (Vite)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 2. Cualquier ruta que no sea de la API (ej. si entran a la raíz "/"), renderiza el HTML de React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// ==========================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});