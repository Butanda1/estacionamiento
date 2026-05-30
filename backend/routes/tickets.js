const express = require('express');
const Ticket = require('../models/Ticket');
const verificarToken = require('../middleware/auth');
const { checkExpiredTickets } = require('../utils/expiryScheduler');

const router = express.Router();

function generarCodigo() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let resultado = '';
  for (let i = 0; i < 8; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
}

// POST /api/tickets/entrada
// Endpoint usado por el Arduino de entrada via ESP8266
router.post('/entrada', async (req, res) => {
  try {
    let codigo;
    let existe = true;
    while (existe) {
      codigo = generarCodigo();
      const ticketExistente = await Ticket.findById(codigo);
      if (!ticketExistente) {
        existe = false;
      }
    }

    const nuevoTicket = await Ticket.create({
      _id: codigo,
      fecha_entrada: new Date(),
      fecha_salida: null,
      estado_pago: 'NO_PAGADO',
      activo: true,
    });

    return res.status(201).json({
      _id: nuevoTicket._id,
      id_ticket: nuevoTicket._id,
      fecha_entrada: nuevoTicket.fecha_entrada,
      estado_pago: nuevoTicket.estado_pago,
      activo: nuevoTicket.activo,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar la entrada', detalle: error.message });
  }
});

// POST /api/tickets/validar-salida
// Endpoint usado por el Arduino de salida via ESP8266
router.post('/validar-salida', async (req, res) => {
  try {
    // Asegurar que los tickets vencidos se actualicen antes de validar la salida
    await checkExpiredTickets();

    const { id_ticket, ticket_id, _id } = req.body;
    const codigoInput = (_id || id_ticket || ticket_id || '').trim().toUpperCase();

    if (!codigoInput) {
      return res.status(400).json({ error: 'Código de ticket es requerido' });
    }

    const ticket = await Ticket.findById(codigoInput);

    if (!ticket) {
      return res.status(404).json({ autorizado: false, mensaje: 'Ticket no encontrado' });
    }

    if (!ticket.activo && ticket.fecha_salida) {
      return res.status(400).json({ autorizado: false, mensaje: 'Este ticket ya fue usado para salir' });
    }

    if (ticket.estado_pago === 'PAGADO' || ticket.estado_pago === 'EXENTO') {
      ticket.activo = false;
      ticket.fecha_salida = new Date();
      await ticket.save();

      return res.json({
        autorizado: true,
        abrir_barrera: true,
        mensaje: 'Salida autorizada. Barrera abierta.',
        ticket: {
          ...ticket.toObject(),
          id_ticket: ticket._id
        },
      });
    }

    if (ticket.estado_pago === 'NO_PAGADO' || ticket.estado_pago === 'PERDIDO' || ticket.estado_pago === 'Perdido_Sistema') {
      return res.json({
        autorizado: false,
        abrir_barrera: false,
        mensaje: 'Salida denegada. Ticket pendiente de pago, perdido o vencido por el sistema.',
      });
    }

    return res.status(400).json({ autorizado: false, mensaje: 'Estado de pago inválido' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al validar la salida', detalle: error.message });
  }
});

// GET /api/tickets/historial
// Devuelve todos los tickets para la tabla del Frontend, permitiendo filtrar por estado_pago
router.get('/historial', verificarToken, async (req, res) => {
  try {
    // Asegurar que los tickets vencidos se actualicen antes de listar historial
    await checkExpiredTickets();

    const { estado_pago, estado, perdido } = req.query;
    const filtro = {};

    if (estado_pago) {
      filtro.estado_pago = estado_pago;
    } else {
      if (estado === 'dentro') {
        filtro.activo = true;
        filtro.fecha_salida = null;
      } else if (estado === 'pagado') {
        filtro.estado_pago = { $in: ['PAGADO', 'EXENTO'] };
      } else if (estado === 'pendiente') {
        filtro.estado_pago = 'NO_PAGADO';
      }
      
      if (perdido === 'true') {
        filtro.estado_pago = { $in: ['PERDIDO', 'Perdido_Sistema'] };
      }
    }

    const tickets = await Ticket.aggregate([
      { $match: filtro },
      {
        $lookup: {
          from: 'pagos',
          localField: '_id',
          foreignField: 'ticket_id',
          as: 'pagos_info'
        }
      },
      {
        $addFields: {
          monto_pagado: { $sum: '$pagos_info.monto' }
        }
      },
      { $sort: { fecha_entrada: -1 } }
    ]);
    
    // Mapeo para compatibilidad
    const ticketsMapeados = tickets.map(t => ({
      ...t,
      id_ticket: t._id,
      ticket_perdido: t.estado_pago === 'PERDIDO' || t.estado_pago === 'Perdido_Sistema'
    }));

    return res.json(ticketsMapeados);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener historial de tickets', detalle: error.message });
  }
});

// GET /api/tickets/:id
router.get('/:id', verificarToken, async (req, res) => {
  try {
    // Asegurar que los tickets vencidos se actualicen antes de buscar
    await checkExpiredTickets();

    const ticketId = req.params.id.trim().toUpperCase();
    
    const tickets = await Ticket.aggregate([
      { $match: { _id: ticketId } },
      {
        $lookup: {
          from: 'pagos',
          localField: '_id',
          foreignField: 'ticket_id',
          as: 'pagos_info'
        }
      },
      {
        $addFields: {
          monto_pagado: { $sum: '$pagos_info.monto' }
        }
      }
    ]);

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const ticket = tickets[0];

    return res.json({
      ...ticket,
      id_ticket: ticket._id,
      ticket_perdido: ticket.estado_pago === 'PERDIDO' || ticket.estado_pago === 'Perdido_Sistema'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al buscar ticket', detalle: error.message });
  }
});

// GET /api/tickets (Compatibilidad)
router.get('/', verificarToken, async (req, res) => {
  try {
    // Asegurar que los tickets vencidos se actualicen antes de listar
    await checkExpiredTickets();

    const { estado, perdido } = req.query;
    const filtro = {};

    if (estado === 'dentro') {
      filtro.activo = true;
    } else if (estado === 'pagado') {
      filtro.estado_pago = { $in: ['PAGADO', 'EXENTO'] };
    } else if (estado === 'pendiente') {
      filtro.estado_pago = 'NO_PAGADO';
    }
    if (perdido === 'true') {
      filtro.estado_pago = { $in: ['PERDIDO', 'Perdido_Sistema'] };
    }

    const tickets = await Ticket.aggregate([
      { $match: filtro },
      {
        $lookup: {
          from: 'pagos',
          localField: '_id',
          foreignField: 'ticket_id',
          as: 'pagos_info'
        }
      },
      {
        $addFields: {
          monto_pagado: { $sum: '$pagos_info.monto' }
        }
      },
      { $sort: { fecha_entrada: -1 } }
    ]);

    const ticketsMapeados = tickets.map(t => ({
      ...t,
      id_ticket: t._id,
      ticket_perdido: t.estado_pago === 'PERDIDO' || t.estado_pago === 'Perdido_Sistema'
    }));

    return res.json(ticketsMapeados);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener tickets', detalle: error.message });
  }
});

// POST /api/tickets/reposicion
// Generar un nuevo ticket de reposición desde cero sin pedir datos
router.post('/reposicion', verificarToken, async (req, res) => {
  try {
    let codigo;
    let existe = true;
    while (existe) {
      codigo = generarCodigo();
      const ticketExistente = await Ticket.findById(codigo);
      if (!ticketExistente) {
        existe = false;
      }
    }

    const nuevoTicket = await Ticket.create({
      _id: codigo,
      fecha_entrada: new Date(),
      fecha_salida: null,
      estado_pago: 'NO_PAGADO',
      activo: true,
      tipo: 'Reposicion',
    });

    return res.status(201).json({
      _id: nuevoTicket._id,
      id_ticket: nuevoTicket._id,
      fecha_entrada: nuevoTicket.fecha_entrada,
      estado_pago: nuevoTicket.estado_pago,
      activo: nuevoTicket.activo,
      tipo: nuevoTicket.tipo,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar ticket de reposición', detalle: error.message });
  }
});

module.exports = router;
