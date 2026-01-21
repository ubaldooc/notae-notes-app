const nodemailer = require('nodemailer');

// 1. Configurar el "transporter" de Nodemailer
let transporter;

// Si existen credenciales de OAuth2, usamos ese método (más seguro y recomendado por Google)
// Si existen credenciales de OAuth2, usamos ese método (más seguro y recomendado por Google)
if (process.env.MAIL_GOOGLE_CLIENT_ID && process.env.MAIL_GOOGLE_CLIENT_SECRET && process.env.MAIL_GOOGLE_REFRESH_TOKEN) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.MAIL_GOOGLE_CLIENT_ID,
      clientSecret: process.env.MAIL_GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.MAIL_GOOGLE_REFRESH_TOKEN,
    },
  });
  console.log('EmailService: Usando autenticación OAuth2 con Gmail segun variables MAIL_*.');
} else {
  // Fallback a autenticación por contraseña de aplicación
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
  console.log('EmailService: Usando autenticación simple (User/Pass) con variables MAIL_*.');
}


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
      from: `"Mi App de Notas" <${process.env.MAIL_USER}>`, // Nombre del remitente
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

/**
 * Envía un correo electrónico con opciones personalizadas.
 * @param {object} options - Opciones de correo (to, subject, html, replyTo, etc.).
 */
const sendCustomEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"Mi App de Notas" <${process.env.MAIL_USER}>`,
      ...options
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo personalizado enviado exitosamente:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error al enviar el correo personalizado:', error);
    throw error;
  }
};

module.exports = { sendEmail, sendCustomEmail };
