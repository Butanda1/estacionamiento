const { getIO } = require('./socketHandler');

function emitTicketCreated(ticket) {
  try {
    const io = getIO();
    io.emit('ticket:created', {
      _id: ticket._id,
      id_ticket: ticket._id,
      fecha_entrada: ticket.fecha_entrada,
      estado_pago: ticket.estado_pago,
      activo: ticket.activo,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error emitiendo ticket:created:', error.message);
  }
}

function emitTicketUpdated(ticket) {
  try {
    const io = getIO();
    io.emit('ticket:updated', {
      _id: ticket._id,
      id_ticket: ticket._id,
      fecha_entrada: ticket.fecha_entrada,
      fecha_salida: ticket.fecha_salida,
      estado_pago: ticket.estado_pago,
      activo: ticket.activo,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error emitiendo ticket:updated:', error.message);
  }
}

function emitPagoCreated(pago) {
  try {
    const io = getIO();
    io.emit('pago:created', {
      _id: pago._id,
      ticket_id: pago.ticket_id,
      fecha_pago: pago.fecha_pago,
      monto: pago.monto,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error emitiendo pago:created:', error.message);
  }
}

function emitTicketLost(ticketOriginal, ticketReemplazo) {
  try {
    const io = getIO();
    io.emit('ticket:lost', {
      ticket_original: {
        _id: ticketOriginal._id,
        id_ticket: ticketOriginal._id,
        estado_pago: ticketOriginal.estado_pago,
      },
      ticket_reemplazo: {
        _id: ticketReemplazo._id,
        id_ticket: ticketReemplazo._id,
        estado_pago: ticketReemplazo.estado_pago,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error emitiendo ticket:lost:', error.message);
  }
}

module.exports = {
  emitTicketCreated,
  emitTicketUpdated,
  emitPagoCreated,
  emitTicketLost,
};
