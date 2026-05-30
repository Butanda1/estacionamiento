const mongoose = require('mongoose');

const pagoSchema = new mongoose.Schema(
  {
    ticket_id: {
      type: String,
      required: true,
      ref: 'Ticket',
    },
    fecha_pago: {
      type: Date,
      required: true,
      default: Date.now,
    },
    monto: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Pago', pagoSchema);
