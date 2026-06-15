const express = require('express');
const Ticket = require('../models/Ticket');
const Descuento = require('../models/Descuento');
const verificarToken = require('../middleware/auth');
const { checkExpiredTickets } = require('../utils/expiryScheduler');
const { generarCodigo } = require('../utils/codigoGenerator');
const { emitTicketCreated, emitTicketUpdated } = require('../socket/socketEvents');

const router = express.Router();

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

    emitTicketCreated(nuevoTicket);

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
// Lógica:
//  - < 5 min estacionado  -> auto-exento, abre barrera
//  - >= 5 min y PAGADO/EXENTO -> abre barrera
//  - >= 5 min y NO_PAGADO  -> denegado
router.post('/validar-salida', async (req, res) => {
  try {
    await checkExpiredTickets();

    const { id_ticket, ticket_id, _id } = req.body;
    const codigoInput = (_id || id_ticket || ticket_id || '').trim().toUpperCase();

    if (!codigoInput) {
      return res.status(400).json({ autorizado: false, mensaje: 'Codigo de ticket requerido' });
    }

    const ticket = await Ticket.findById(codigoInput);

    if (!ticket) {
      return res.status(404).json({ autorizado: false, mensaje: 'Ticket no encontrado' });
    }

    if (!ticket.activo && ticket.fecha_salida) {
      return res.json({ autorizado: false, mensaje: 'Ticket ya utilizado' });
    }

    if (ticket.estado_pago === 'PERDIDO' || ticket.estado_pago === 'Perdido_Sistema') {
      return res.json({ autorizado: false, mensaje: 'Ticket perdido o vencido por el sistema' });
    }

    const ahora = new Date();
    const minutosTranscurridos = Math.round((ahora - ticket.fecha_entrada) / 60000);

    if (minutosTranscurridos <= 5) {
      ticket.estado_pago = 'EXENTO';
      ticket.activo = false;
      ticket.fecha_salida = ahora;
      await ticket.save();

      emitTicketUpdated(ticket);

      return res.json({
        autorizado: true,
        abrir_barrera: true,
        mensaje: 'Excelente, muy bien',
        estado: 'EXENTO',
        tiempo_estacionado_minutos: minutosTranscurridos,
      });
    }

    if (ticket.estado_pago === 'PAGADO' || ticket.estado_pago === 'EXENTO') {
      ticket.activo = false;
      ticket.fecha_salida = ahora;
      await ticket.save();

      emitTicketUpdated(ticket);

      return res.json({
        autorizado: true,
        abrir_barrera: true,
        mensaje: 'Excelente, muy bien',
        estado: ticket.estado_pago,
      });
    }

    return res.json({
      autorizado: false,
      abrir_barrera: false,
      mensaje: 'Ticket sin pagar. Tiempo excedido de 5 minutos.',
      estado: 'NO_PAGADO',
    });
  } catch (error) {
    return res.status(500).json({ autorizado: false, error: 'Error al validar la salida', detalle: error.message });
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
router.get('/:id', async (req, res) => {
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
router.post('/reposicion', async (req, res) => {
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

    emitTicketCreated(nuevoTicket);

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

// POST /api/tickets/generar
// Genera un ticket de prueba desde el Dashboard (solo admins)
router.post('/generar', verificarToken, async (req, res) => {
  try {
    let codigo;
    let existe = true;
    while (existe) {
      codigo = generarCodigo();
      const ticketExistente = await Ticket.findById(codigo);
      if (!ticketExistente) existe = false;
    }

    const nuevoTicket = await Ticket.create({
      _id: codigo,
      fecha_entrada: new Date(),
      fecha_salida: null,
      estado_pago: 'NO_PAGADO',
      activo: true,
      tipo: 'Normal',
    });

    emitTicketCreated(nuevoTicket);

    return res.status(201).json({
      _id: nuevoTicket._id,
      id_ticket: nuevoTicket._id,
      fecha_entrada: nuevoTicket.fecha_entrada,
      estado_pago: nuevoTicket.estado_pago,
      activo: nuevoTicket.activo,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al generar ticket de prueba', detalle: error.message });
  }
});

// POST /api/tickets/:id/aplicar-descuento
// Asocia un código de descuento válido al ticket antes del pago
router.post('/:id/aplicar-descuento', async (req, res) => {
  try {
    const ticketId = req.params.id.trim().toUpperCase();
    const { codigo_descuento } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    if (ticket.estado_pago === 'PAGADO' || ticket.estado_pago === 'EXENTO') {
      return res.status(400).json({ error: 'El ticket ya está pagado o es exento' });
    }

    console.log("Se paro aqui")

    const descuento = await Descuento.findOne({ codigo: codigo_descuento.trim().toUpperCase(), activo: true });
    if (!descuento) {
      console.log("No hay descuento")
      return res.status(404).json({ error: 'Código de descuento inválido o no activo' });
    }

    ticket.codigo_descuento = descuento.codigo;
    ticket.porcentaje_descuento = descuento.porcentaje;

    // Calcular el monto descuento actual
    const ahora = new Date();
    const minutos = Math.max(0, Math.round((ahora - ticket.fecha_entrada) / 60000));
    const montoOriginal = ticket.tipo === 'Reposicion' ? 150 : (minutos <= 5 ? 0 : Math.ceil(minutos / 60) * 10);
    ticket.monto_descuento = montoOriginal * (descuento.porcentaje / 100);

    await ticket.save();
    emitTicketUpdated(ticket);

    return res.json({
      mensaje: 'Descuento aplicado al ticket',
      ticket
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al aplicar descuento al ticket', detalle: error.message });
  }
});

// POST /api/tickets/:id/quitar-descuento
// Remueve cualquier código de descuento asociado al ticket antes del pago
router.post('/:id/quitar-descuento', async (req, res) => {
  try {
    const ticketId = req.params.id.trim().toUpperCase();

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    if (ticket.estado_pago === 'PAGADO' || ticket.estado_pago === 'EXENTO') {
      return res.status(400).json({ error: 'No se puede quitar el descuento de un ticket ya pagado' });
    }

    ticket.codigo_descuento = null;
    ticket.porcentaje_descuento = 0;
    ticket.monto_descuento = 0;

    await ticket.save();
    emitTicketUpdated(ticket);

    return res.json({
      mensaje: 'Descuento removido del ticket',
      ticket
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al remover descuento del ticket', detalle: error.message });
  }
});

module.exports = router;
