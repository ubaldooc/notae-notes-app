const { google } = require('googleapis');

// Configuración de OAuth2
const oAuth2Client = new google.auth.OAuth2(
  process.env.MAIL_GOOGLE_CLIENT_ID,
  process.env.MAIL_GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground' // O tu URL de redirección
);

oAuth2Client.setCredentials({
  refresh_token: process.env.MAIL_GOOGLE_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

/**
 * Codifica el mensaje en base64 para la API de Gmail.
 */
const encodeMessage = (message) => {
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Crea el contenido del correo en formato RAW.
 */
const createRawMessage = ({ to, subject, html, replyTo }) => {
  const senderName = "Notae";
  const from = process.env.MAIL_USER || 'me';

  // Codificar el asunto para que soporte UTF-8 (emojis, acentos) en las cabeceras
  const encodedSubject = Buffer.from(subject).toString('base64');

  const messageParts = [
    `From: "${senderName}" <${from}>`,
    `To: ${to}`,
    `Subject: =?utf-8?B?${encodedSubject}?=`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
  ];

  if (replyTo) {
    messageParts.push(`Reply-To: ${replyTo}`);
  }

  messageParts.push('', html);

  // Usar CRLF (\r\n) que es el estándar para protocolos de correo
  return messageParts.join('\r\n');
};

/**
 * Envía un correo electrónico usando la API de Gmail (HTTP).
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const rawContent = createRawMessage({ to, subject, html });
    const encodedMessage = encodeMessage(rawContent);

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('Correo enviado exitosamente vía Gmail API:', res.data.id);
    return res.data;
  } catch (error) {
    console.error('Error al enviar el correo vía Gmail API:', error);
    throw error;
  }
};

/**
 * Envía un correo electrónico con opciones personalizadas usando la API de Gmail (HTTP).
 */
const sendCustomEmail = async (options) => {
  try {
    const rawContent = createRawMessage(options);
    const encodedMessage = encodeMessage(rawContent);

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('Correo personalizado enviado exitosamente vía Gmail API:', res.data.id);
    return res.data;
  } catch (error) {
    console.error('Error al enviar el correo personalizado vía Gmail API:', error);
    throw error;
  }
};

module.exports = { sendEmail, sendCustomEmail };
