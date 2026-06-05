const express = require('express');
const Ticket = require('../models/Ticket');
const Pago = require('../models/Pago');
const verificarToken = require('../middleware/auth');
const { generarCodigo } = require('../utils/codigoGenerator');
const { emitTicketUpdated, emitPagoCreated, emitTicketLost } = require('../socket/socketEvents');

const router = express.Router();

function calcularMontoAPagar(minutosTranscurridos) {
  if (minutosTranscurridos <= 5) return 0;
  const horas = Math.ceil(minutosTranscurridos / 60);
  return horas * 10;
}

// POST /api/pagos/simular-pago
router.post('/simular-pago', async (req, res) => {
  try {
    const { ticket_id, id_ticket, _id, codigo_descuento } = req.body;
    const codigoInput = (ticket_id || id_ticket || _id || '').trim().toUpperCase();

    if (!codigoInput) {
      return res.status(400).json({ error: 'Código de ticket es requerido' });
    }

    const ticket = await Ticket.findById(codigoInput);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (ticket.estado_pago === 'PAGADO' || ticket.estado_pago === 'EXENTO') {
      return res.status(400).json({ error: 'Este ticket ya fue pagado o es exento' });
    }

    if (ticket.estado_pago === 'PERDIDO' || ticket.estado_pago === 'Perdido_Sistema') {
      return res.status(400).json({ error: `Este ticket está en estado ${ticket.estado_pago} y no puede ser pagado.` });
    }

    if (!ticket.activo) {
      return res.status(400).json({ error: 'Este ticket ya no está activo' });
    }

    // Procesar descuento
    let porcentajeDescuento = 0;
    let montoDescuento = 0;
    let codigoDescuentoAplicado = null;

    if (codigo_descuento) {
      const descuento = codigo_descuento.trim().toUpperCase();
      if (descuento === '50OFF') {
        porcentajeDescuento = 50;
        codigoDescuentoAplicado = '50OFF';
      } else if (descuento === '25OFF') {
        porcentajeDescuento = 25;
        codigoDescuentoAplicado = '25OFF';
      }
    }

    const ahora = new Date();
    
    if (ticket.tipo === 'Reposicion') {
      const monto = 150;
      ticket.estado_pago = 'PAGADO';
      await ticket.save();

      const nuevoPago = await Pago.create({
        ticket_id: ticket._id,
        fecha_pago: ahora,
        monto: monto,
        codigo_descuento: codigoDescuentoAplicado,
        porcentaje_descuento: porcentajeDescuento,
        monto_descuento: montoDescuento,
      });

      emitTicketUpdated(ticket);
      emitPagoCreated(nuevoPago);

      return res.json({
        mensaje: 'Pago de reposición registrado exitosamente',
        ticket: {
          ...ticket.toObject(),
          id_ticket: ticket._id,
        },
        tiempo_estacionado_minutos: 0,
        monto_pagado: monto,
        pago: nuevoPago,
      });
    } else {
      const minutosTranscurridos = Math.round((ahora - ticket.fecha_entrada) / 60000);
      let monto = calcularMontoAPagar(minutosTranscurridos);

      if (minutosTranscurridos <= 5) {
        ticket.estado_pago = 'EXENTO';
        await ticket.save();

        emitTicketUpdated(ticket);

        return res.json({
          mensaje: 'Pago simulado como EXENTO (menor o igual a 5 minutos)',
          ticket: {
            ...ticket.toObject(),
            id_ticket: ticket._id,
          },
          tiempo_estacionado_minutos: minutosTranscurridos,
          monto_pagado: 0,
        });
      } else {
        montoDescuento = monto * (porcentajeDescuento / 100);
        monto = monto - montoDescuento;

        ticket.estado_pago = 'PAGADO';
        await ticket.save();

        const nuevoPago = await Pago.create({
          ticket_id: ticket._id,
          fecha_pago: ahora,
          monto: monto,
          codigo_descuento: codigoDescuentoAplicado,
          porcentaje_descuento: porcentajeDescuento,
          monto_descuento: montoDescuento,
        });

        emitTicketUpdated(ticket);
        emitPagoCreated(nuevoPago);

        return res.json({
          mensaje: 'Pago simulado exitosamente',
          ticket: {
            ...ticket.toObject(),
            id_ticket: ticket._id,
          },
          tiempo_estacionado_minutos: minutosTranscurridos,
          monto_pagado: monto,
          pago: nuevoPago,
        });
      }
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error al procesar el pago', detalle: error.message });
  }
});

// POST /api/pagos/reportar-perdido
router.post('/reportar-perdido', async (req, res) => {
  try {
    const { ticket_id_original, id_ticket_original, ticket_id, _id } = req.body;
    const codigoInput = (ticket_id_original || id_ticket_original || ticket_id || _id || '').trim().toUpperCase();

    if (!codigoInput) {
      return res.status(400).json({ error: 'Código de ticket original es requerido' });
    }

    const ticketOriginal = await Ticket.findById(codigoInput);

    if (!ticketOriginal) {
      return res.status(404).json({ error: 'Ticket original no encontrado' });
    }

    if (ticketOriginal.estado_pago === 'PERDIDO' || !ticketOriginal.activo) {
      return res.status(400).json({ error: 'Este ticket ya no está activo o ya fue reportado como perdido' });
    }

    // Actualizar ticket original
    ticketOriginal.estado_pago = 'PERDIDO';
    ticketOriginal.activo = false;
    await ticketOriginal.save();

    // Crear pago de penalización ($150)
    const PENALIZACION_PERDIDA = 150;
    const pagoPenalizacion = await Pago.create({
      ticket_id: ticketOriginal._id,
      fecha_pago: new Date(),
      monto: PENALIZACION_PERDIDA,
    });

    // Generar ticket de reemplazo exento y activo
    let nuevoCodigo;
    let existe = true;
    while (existe) {
      nuevoCodigo = generarCodigo();
      const ticketExistente = await Ticket.findById(nuevoCodigo);
      if (!ticketExistente) {
        existe = false;
      }
    }

    const ticketReemplazo = await Ticket.create({
      _id: nuevoCodigo,
      fecha_entrada: new Date(),
      fecha_salida: null,
      estado_pago: 'EXENTO',
      activo: true,
    });

    emitTicketUpdated(ticketOriginal);
    emitPagoCreated(pagoPenalizacion);
    emitTicketLost(ticketOriginal, ticketReemplazo);

    return res.json({
      mensaje: 'Ticket de reemplazo generado. Penalizacion aplicada: $150 MXN.',
      ticket_original: {
        ...ticketOriginal.toObject(),
        id_ticket: ticketOriginal._id,
      },
      ticket_reemplazo: {
        ...ticketReemplazo.toObject(),
        id_ticket: ticketReemplazo._id,
      },
      penalizacion: PENALIZACION_PERDIDA,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al reportar ticket perdido', detalle: error.message });
  }
});

module.exports = router;
