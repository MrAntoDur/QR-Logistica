const express = require('express');
const cors = require('cors');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// 1. Leer credenciales: en Vercel usa variable de entorno; en tu PC usa el archivo local
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('./serviceAccountKey.json');

// Evita error si Vercel reutiliza una instancia que ya estaba iniciada
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const app = express();
app.use(cors());
app.use(express.json());

// Reemplaza con tu URL real de Firebase Hosting
const URL_ENCUESTA = 'https://pruebas-locales-2e352.web.app/';

// 2. ENDPOINT DEL QR DINÁMICO
app.get('/qr/logistica', async (req, res) => {
  try {
    await db.collection('estadisticas_qr').add({
      campana: 'encuesta_transporte',
      fecha_escaneo: new Date().toISOString(),
      dispositivo: req.headers['user-agent'] || 'Desconocido'
    });
  } catch (error) {
    console.error('Error registrando escaneo:', error);
  } finally {
    res.redirect(URL_ENCUESTA);
  }
});

// 3. ENDPOINT DE ALERTAS
app.post('/api/alerta', (req, res) => {
  const { nombre_y_orden, calificacion_trato, rechazo } = req.body;

  if (calificacion_trato === '¡Malo!' || rechazo === 'Si') {
    const mensaje = `ALERTA LOGISTICA - Orden: ${nombre_y_orden} | Trato: ${calificacion_trato} | Rechazo: ${rechazo}`;
    console.log('Despachando alerta:', mensaje);
  }

  res.status(200).json({ ok: true });
});

// Exportación obligatoria para Vercel
module.exports = app;

// Solo levanta el puerto local si lo ejecutas en tu computadora
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Ruta QR lista en: http://localhost:${PORT}/qr/logistica`);
  });
}