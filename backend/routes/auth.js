const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

router.post('/login', (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y password son requeridos.' });
  }

  if (usuario !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Credenciales invalidas.' });
  }

  const token = jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '8h' });

  return res.json({ mensaje: 'Login exitoso', token });
});

module.exports = router;
