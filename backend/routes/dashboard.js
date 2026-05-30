const express = require('express');
const Ticket = require('../models/Ticket');
const Pago = require('../models/Pago');
const verificarToken = require('../middleware/auth');
const { checkExpiredTickets } = require('../utils/expiryScheduler');

const router = express.Router();

const obtenerMetricasDashboard = async () => {
  // Asegurar que los tickets vencidos se actualicen antes de calcular métricas
  await checkExpiredTickets();

  const gananciasTotalesResult = await Pago.aggregate([
    { $group: { _id: null, total: { $sum: '$monto' } } },
  ]);
  const gananciasTotales = gananciasTotalesResult.length > 0 ? gananciasTotalesResult[0].total : 0;

  const salidasGratis = await Ticket.countDocuments({ estado_pago: 'EXENTO' });
  const ticketsPerdidos = await Ticket.countDocuments({ estado_pago: { $in: ['PERDIDO', 'Perdido_Sistema'] } });
  const vehiculosActuales = await Ticket.countDocuments({ activo: true });

  const ticketsPagados = await Ticket.countDocuments({ estado_pago: 'PAGADO' });
  const estadisticas_pastel = [
    { name: 'Pagados', value: ticketsPagados },
    { name: 'Gratis (<5m)', value: salidasGratis },
    { name: 'Perdidos', value: ticketsPerdidos }
  ];

  const ingresosPorMesResult = await Pago.aggregate([
    {
      $group: {
        _id: { year: { $year: "$fecha_pago" }, month: { $month: "$fecha_pago" } },
        total: { $sum: "$monto" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    { $limit: 12 }
  ]);

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const ingresos_por_mes = ingresosPorMesResult.map(item => ({
    mes: item._id.month ? meses[item._id.month - 1] + ' ' + item._id.year : 'Desconocido',
    ingresos: item.total
  }));

  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 7);

  const autosPorDiaResult = await Ticket.aggregate([
    { $match: { fecha_entrada: { $gte: hace7Dias } } },
    {
      $group: {
        _id: { year: { $year: "$fecha_entrada" }, month: { $month: "$fecha_entrada" }, day: { $dayOfMonth: "$fecha_entrada" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
  ]);

  const autos_por_dia = autosPorDiaResult.map(item => ({
    fecha: `${item._id.day}/${item._id.month}`,
    autos: item.count
  }));

  return {
    gananciasTotales,
    salidasGratis,
    ticketsPerdidos,
    vehiculosActuales,
    ganancias_totales: gananciasTotales,
    salidas_gratuitas: salidasGratis,
    tickets_perdidos: ticketsPerdidos,
    vehiculos_dentro: vehiculosActuales,
    estadisticas_pastel,
    ingresos_por_mes,
    autos_por_dia
  };
};

// GET /api/dashboard/metricas
router.get('/metricas', verificarToken, async (req, res) => {
  try {
    const metricas = await obtenerMetricasDashboard();
    return res.json(metricas);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener metricas del dashboard', detalle: error.message });
  }
});

// GET /api/dashboard (Compatibilidad)
router.get('/', verificarToken, async (req, res) => {
  try {
    const metricas = await obtenerMetricasDashboard();
    return res.json(metricas);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener metricas del dashboard', detalle: error.message });
  }
});

module.exports = router;
