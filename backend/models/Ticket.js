const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    fecha_entrada: {
      type: Date,
      required: true,
      default: Date.now,
    },
    fecha_salida: {
      type: Date,
      default: null,
    },
    estado_pago: {
      type: String,
      enum: ['NO_PAGADO', 'PAGADO', 'EXENTO', 'PERDIDO', 'Perdido_Sistema'],
      default: 'NO_PAGADO',
      required: true,
    },
    pago_realizado: {
      type: Boolean,
      default: false,
    },
    tipo: {
      type: String,
      enum: ['Normal', 'Reposicion'],
      default: 'Normal',
      required: true,
    },
    activo: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Ticket', ticketSchema);
