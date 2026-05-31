const path = require('path');
// Añadir node_modules de backend para resolver módulos al ejecutar desde la raíz
module.paths.push(path.join(__dirname, 'backend', 'node_modules'));

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Configuración de dotenv buscando en la raíz y en la carpeta backend
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const Ticket = require(path.join(__dirname, 'backend', 'models', 'Ticket'));
const Pago = require(path.join(__dirname, 'backend', 'models', 'Pago'));
const { generarCodigo } = require(path.join(__dirname, 'backend', 'utils', 'codigoGenerator'));

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/estacionamiento';
    console.log(`Conectando a MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('Limpiando colecciones de tickets y pagos...');
    try {
      await Ticket.collection.dropIndexes();
      console.log('Índices antiguos eliminados de la colección tickets.');
    } catch (err) {
      console.log('No se pudieron eliminar los índices antiguos (probablemente no existían).');
    }
    await Ticket.deleteMany({});
    await Pago.deleteMany({});

    const ahora = new Date();

    const haceHoras = (horas) => {
      const d = new Date();
      d.setHours(d.getHours() - horas);
      return d;
    };

    console.log('Insertando datos de prueba históricos...');

    // Helper para generar tickets pagados o perdidos con fecha exacta en el pasado
    const crearTicketConPago = async (año, mes, dia, horasEstacionado, esPerdido = false) => {
      const ticketId = generarCodigo();
      const fechaEntrada = new Date(año, mes, dia, 8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
      const fechaSalida = new Date(fechaEntrada);
      fechaSalida.setHours(fechaSalida.getHours() + Math.floor(horasEstacionado));
      fechaSalida.setMinutes(fechaSalida.getMinutes() + Math.floor(Math.random() * 59));

      const estado = esPerdido ? 'PERDIDO' : 'PAGADO';
      const monto = esPerdido ? 100 : Math.ceil(horasEstacionado) * 15;

      await Ticket.create({
        _id: ticketId,
        fecha_entrada: fechaEntrada,
        fecha_salida: fechaSalida,
        estado_pago: estado,
        activo: false
      });

      await Pago.create({
        ticket_id: ticketId,
        fecha_pago: fechaSalida,
        monto: monto
      });
    };

    // 1. Datos históricos con ingresos crecientes para que la gráfica mensual se vea poblada
    // Diciembre 2025 (Mes 11) - 12 pagos
    for (let i = 0; i < 12; i++) {
      await crearTicketConPago(2025, 11, 1 + i * 2, 1 + Math.random() * 4);
    }
    // Enero 2026 (Mes 0) - 15 pagos
    for (let i = 0; i < 15; i++) {
      await crearTicketConPago(2026, 0, 1 + i * 2, 1 + Math.random() * 4);
    }
    // Febrero 2026 (Mes 1) - 18 pagos
    for (let i = 0; i < 18; i++) {
      await crearTicketConPago(2026, 1, 1 + i * 1.5, 1 + Math.random() * 5);
    }
    // Marzo 2026 (Mes 2) - 22 pagos (incluye 1 perdido)
    for (let i = 0; i < 22; i++) {
      await crearTicketConPago(2026, 2, 1 + i * 1.2, 1 + Math.random() * 5, i === 5);
    }
    // Abril 2026 (Mes 3) - 28 pagos (incluye 2 perdidos)
    for (let i = 0; i < 28; i++) {
      await crearTicketConPago(2026, 3, 1 + i, 1 + Math.random() * 5, i === 10 || i === 20);
    }
    // Mayo 2026 (Mes 4 - mes actual hasta el día 26) - 35 pagos (incluye 1 perdido)
    for (let i = 0; i < 35; i++) {
      const dia = Math.min(26, Math.floor(1 + i * 0.7));
      await crearTicketConPago(2026, 4, dia, 1 + Math.random() * 5, i === 15);
    }

    // 2. Autos con salidas exentas (< 5 min) en Mayo (12 tickets)
    for (let i = 0; i < 12; i++) {
      const ticketId = generarCodigo();
      const dia = Math.min(26, 1 + i * 2);
      const entrada = new Date(2026, 4, dia, 9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
      const salida = new Date(entrada);
      salida.setMinutes(salida.getMinutes() + 1 + Math.floor(Math.random() * 4));

      await Ticket.create({
        _id: ticketId,
        fecha_entrada: entrada,
        fecha_salida: salida,
        estado_pago: 'EXENTO',
        activo: false
      });
    }

    // 3. Autos actualmente dentro (activo: true, fecha_salida: null)
    const activos = [
      haceHoras(3),
      haceHoras(2),
      haceHoras(1),
      haceHoras(0.5)
    ];

    for (const entrada of activos) {
      const ticketId = generarCodigo();
      await Ticket.create({
        _id: ticketId,
        fecha_entrada: entrada,
        fecha_salida: null,
        estado_pago: 'NO_PAGADO',
        activo: true
      });
    }

    console.log('Se han insertado exitosamente los registros de prueba.');
    const countTickets = await Ticket.countDocuments();
    const countPagos = await Pago.countDocuments();
    console.log(`Total Tickets en BD: ${countTickets}`);
    console.log(`Total Pagos en BD: ${countPagos}`);

    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada limpiamente.');
  } catch (error) {
    console.error('Error al poblar la base de datos:', error);
    process.exit(1);
  }
};

seed();
