const express = require('express');
const cors = require('cors');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');

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

// 3. ENDPOINT DE ALERTAS POR CORREO
app.post('/api/alerta', async (req, res) => {
  const { nombre_y_orden, calificacion_trato, comentario_trato, rechazo } = req.body;

  if (calificacion_trato === '¡Malo!' || rechazo === 'Si') {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: `"Alertas Logística" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_DESTINO,
        subject: `🚨 ALERTA LOGÍSTICA - Orden: ${nombre_y_orden || 'Sin especificar'}`,
        html: `
          <h2>Se registró una incidencia en entrega</h2>
          <p><strong>Nombre y Orden:</strong> ${nombre_y_orden || 'N/A'}</p>
          <p><strong>Calificación del trato:</strong> ${calificacion_trato || 'N/A'}</p>
          <p><strong>Comentario:</strong> ${comentario_trato || 'Sin comentarios'}</p>
          <p><strong>¿Hubo rechazo?:</strong> ${rechazo || 'No'}</p>
        `
      });

      console.log('Correo de alerta enviado.');
    } catch (error) {
      console.error('Error enviando correo:', error);
    }
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