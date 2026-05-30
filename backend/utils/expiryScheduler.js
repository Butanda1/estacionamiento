const Ticket = require('../models/Ticket');

async function checkExpiredTickets() {
  try {
    const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Buscar tickets de más de 24 horas que no tengan fecha de salida y no estén en estado Perdido_Sistema
    const ticketsVencidos = await Ticket.find({
      fecha_entrada: { $lt: hace24Horas },
      fecha_salida: null,
      estado_pago: { $ne: 'Perdido_Sistema' }
    });
    
    if (ticketsVencidos.length > 0) {
      console.log(`[Expiry Scheduler] Encontrados ${ticketsVencidos.length} tickets vencidos. Pasando a Perdido_Sistema...`);
      for (const ticket of ticketsVencidos) {
        // Guardar auditoría: si ya estaba pagado o exento al momento de expirar
        const pagado = ticket.estado_pago === 'PAGADO' || ticket.estado_pago === 'EXENTO';
        
        ticket.estado_pago = 'Perdido_Sistema';
        ticket.pago_realizado = pagado;
        ticket.activo = false; // Desactivar el ticket para que no cuente como "dentro"
        
        await ticket.save();
      }
    }
  } catch (error) {
    console.error('[Expiry Scheduler] Error al procesar tickets vencidos:', error);
  }
}

module.exports = { checkExpiredTickets };
