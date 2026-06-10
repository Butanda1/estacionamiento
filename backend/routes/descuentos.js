const express = require('express');
const Descuento = require('../models/Descuento');
const verificarToken = require('../middleware/auth');

const router = express.Router();

// GET /api/descuentos/validar/:codigo
// Endpoint público: valida un código y devuelve el porcentaje de descuento
router.get('/validar/:codigo', async (req, res) => {
  try {
    const codigo = req.params.codigo.trim().toUpperCase();
    const descuento = await Descuento.findOne({ codigo, activo: true });

    if (!descuento) {
      return res.status(404).json({ error: 'Código de descuento inválido o no activo' });
    }

    return res.json({
      codigo: descuento.codigo,
      porcentaje: descuento.porcentaje,
      descripcion: descuento.descripcion,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al validar descuento', detalle: error.message });
  }
});

// GET /api/descuentos
// Admin: listar todos los códigos de descuento
router.get('/', verificarToken, async (req, res) => {
  try {
    const descuentos = await Descuento.find().sort({ createdAt: -1 });
    return res.json(descuentos);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener descuentos', detalle: error.message });
  }
});

// POST /api/descuentos
// Admin: crear un nuevo código de descuento
router.post('/', verificarToken, async (req, res) => {
  try {
    const { codigo, porcentaje, descripcion } = req.body;

    if (!codigo || porcentaje === undefined || porcentaje === null) {
      return res.status(400).json({ error: 'Código y porcentaje son requeridos' });
    }

    if (porcentaje < 1 || porcentaje > 100) {
      return res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 100' });
    }

    const existe = await Descuento.findOne({ codigo: codigo.trim().toUpperCase() });
    if (existe) {
      return res.status(409).json({ error: 'Ya existe un descuento con ese código' });
    }

    const nuevoDescuento = await Descuento.create({
      codigo: codigo.trim().toUpperCase(),
      porcentaje,
      descripcion: descripcion || '',
      activo: true,
    });

    return res.status(201).json(nuevoDescuento);
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear descuento', detalle: error.message });
  }
});

// PATCH /api/descuentos/:id
// Admin: activar/desactivar o actualizar un código
router.patch('/:id', verificarToken, async (req, res) => {
  try {
    const camposPermitidos = {};
    if (req.body.activo !== undefined) camposPermitidos.activo = req.body.activo;
    if (req.body.porcentaje !== undefined) {
      if (req.body.porcentaje < 1 || req.body.porcentaje > 100) {
        return res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 100' });
      }
      camposPermitidos.porcentaje = req.body.porcentaje;
    }
    if (req.body.descripcion !== undefined) camposPermitidos.descripcion = req.body.descripcion;

    const descuento = await Descuento.findByIdAndUpdate(req.params.id, camposPermitidos, { new: true });
    if (!descuento) return res.status(404).json({ error: 'Descuento no encontrado' });
    return res.json(descuento);
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar descuento', detalle: error.message });
  }
});

// DELETE /api/descuentos/:id
// Admin: eliminar un código de descuento
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const descuento = await Descuento.findByIdAndDelete(req.params.id);
    if (!descuento) return res.status(404).json({ error: 'Descuento no encontrado' });
    return res.json({ mensaje: 'Descuento eliminado correctamente' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar descuento', detalle: error.message });
  }
});

module.exports = router;
