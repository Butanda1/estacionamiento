const mongoose = require('mongoose');

const descuentoSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    porcentaje: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    descripcion: {
      type: String,
      default: '',
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Descuento', descuentoSchema);
