const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Descuento = require('./models/Descuento');

dotenv.config();

const seedDiscounts = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/estacionamiento';
    console.log(`Conectando a MongoDB para insertar códigos de descuento de prueba...`);
    await mongoose.connect(mongoUri);

    // Limpiar descuentos antiguos si existen para evitar duplicaciones
    await Descuento.deleteMany({});

    const descuentosDemo = [
      {
        codigo: '10OFF',
        porcentaje: 10,
        descripcion: '10% de descuento',
        activo: true,
      },
      {
        codigo: '25OFF',
        porcentaje: 25,
        descripcion: '25% de descuento',
        activo: true,
      },
      {
        codigo: '50OFF',
        porcentaje: 50,
        descripcion: '50% de descuento',
        activo: true,
      },
      {
        codigo: '100OFF',
        porcentaje: 100,
        descripcion: '100% de descuento (Boleto gratis)',
        activo: true,
      }
    ];

    const creados = await Descuento.create(descuentosDemo);
    console.log('Códigos de descuento de ejemplo creados exitosamente:');
    creados.forEach(d => {
      console.log(`- Código: ${d.codigo} (${d.porcentaje}% de descuento) - ${d.descripcion}`);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error al insertar códigos de descuento:', error);
    process.exit(1);
  }
};

seedDiscounts();
