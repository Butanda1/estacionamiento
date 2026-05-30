const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { checkExpiredTickets } = require('./utils/expiryScheduler');

dotenv.config();

const app = express();

connectDB();

// Control de tickets vencidos (Pasar a Perdido_Sistema después de 24 horas)
checkExpiredTickets();
setInterval(checkExpiredTickets, 5 * 60 * 1000);

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/pagos', require('./routes/pagos'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => {
  res.json({ estado: 'OK', servicio: 'Estacionamiento Inteligente API' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
