const nodemailer = require('nodemailer');

// 1. Configurar el "transporter" de Nodemailer
// Usamos las variables de entorno para no exponer las credenciales en el código.
const transporter = nodemailer.createTransport({
  service: 'gmail', // Puedes usar otros servicios como SendGrid, Mailgun, etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verificar la conexión con el servidor de correo al iniciar
// Esto te avisará en la consola si las credenciales del .env son incorrectas
transporter.verify(function (error, success) {
  if (error) {
    console.error('Error de conexión con el servidor de correo:', error);
  } else {
    console.log('Servidor de correo listo para enviar mensajes');
  }
});

/**
 * Envía un correo electrónico.
 * @param {string} to - El destinatario del correo.
 * @param {string} subject - El asunto del correo.
 * @param {string} text - El cuerpo del correo en texto plano.
 * @param {string} html - El cuerpo del correo en formato HTML.
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: `"Mi App de Notas" <${process.env.EMAIL_USER}>`, // Nombre del remitente
      to: to,
      subject: subject,
      text: text,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado exitosamente:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    // Relanzamos el error original para que el llamador pueda ver los detalles.
    throw error;
  }
};

module.exports = { sendEmail };