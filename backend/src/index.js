
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path'); // Añadir path para resolver rutas de archivos
const { sendEmail } = require('./services/emailService.js');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true, // Permite que el frontend envíe cookies
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser()); // Usa el middleware de cookie-parser

// Cliente de Google Auth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.cookies.sessionToken; // Lee la cookie en lugar del header

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};

// Middleware de autenticación de administrador
const adminAuthMiddleware = async (req, res, next) => {
  const token = req.cookies.sessionToken;

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso prohibido. Se requieren permisos de administrador.' });
    }

    req.user = { userId: decoded.userId, role: user.role };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error al conectar a MongoDB', err));

// Esquema y Modelo de Usuario
const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  picture: String,
  theme: { type: String, default: 'light', enum: ['light', 'dark'] },
  noteView: { type: String, default: 'grid', enum: ['grid', 'list'] },
  noteSortOrder: { type: String, default: 'newest', enum: ['newest', 'oldest', 'custom', 'title-asc', 'title-desc'] },
  role: { type: String, default: 'user', enum: ['user', 'admin'] }
}, { timestamps: true, versionKey: false });

const User = mongoose.model('User', userSchema);


// --- Rutas de Autenticación ---

// Endpoint para verificar el token de Google y crear/iniciar sesión
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'No se proporcionó ningún token.' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });

    if (!user) {
      user = new User({ googleId, email, name, picture });
      await user.save();
    }

    const sessionToken = jwt.sign(
      { userId: user._id, googleId: user.googleId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // En lugar de enviar el token en el cuerpo, lo establecemos como una cookie HttpOnly
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true, // La cookie no es accesible desde JavaScript en el cliente
      secure: process.env.NODE_ENV === 'production', // Usar solo en HTTPS en producción
      sameSite: 'lax', // 'strict' o 'lax' para protección CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días, igual que el token
    });

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        picture: user.picture, 
        theme: user.theme,
        noteView: user.noteView,
        noteSortOrder: user.noteSortOrder,
        role: user.role
      },
    });
  } catch (error) {
    console.error('Error en la autenticación de Google:', error);
    res.status(401).json({ message: 'Token de Google inválido o expirado.' });
  }
});

// Endpoint para cerrar sesión
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('sessionToken');
  res.status(200).json({ message: 'Sesión cerrada correctamente.' });
});

// Esquema y Modelo de Nota
const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  id: { type: String, required: true },
  title: String,
  body: String,
  charCount: Number,
  pinned: Boolean,
  groupId: String,
  status: { type: String, default: 'active', enum: ['active', 'trashed'] },
  customOrder: { type: Number, default: -1 }
}, { 
  versionKey: false,
  timestamps: true // Mongoose gestionará createdAt y updatedAt automáticamente
});

// Añadimos un índice compuesto para asegurar que el 'id' de la nota sea único POR USUARIO.
noteSchema.index({ userId: 1, id: 1 }, { unique: true });

const Note = mongoose.model('Note', noteSchema);


// Esquema y Modelo de Grupo
const groupSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  color: String,
  order: Number
}, {
  versionKey: false,
  timestamps: true
});

// Hacemos lo mismo para los grupos.
groupSchema.index({ userId: 1, id: 1 }, { unique: true });

const Group = mongoose.model('Group', groupSchema);

// Esquema y Modelo de Feedback
const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, required: true },
  feedbackText: { type: String, required: true, maxLength: 5000 },
  isResolved: { type: Boolean, default: false },
  isReplied: { type: Boolean, default: false } // Nuevo campo para el estado de respuesta
}, { timestamps: true, versionKey: false });

const Feedback = mongoose.model('Feedback', feedbackSchema);


// Aplicamos el middleware de autenticación a todas las rutas de notas y grupos.
app.use('/api/notes', authMiddleware);
app.use('/api/groups', authMiddleware);
app.use('/api/user', authMiddleware);
// La ruta de feedback también requiere autenticación.
app.use('/api/feedback', authMiddleware);
// Las rutas de admin requieren el middleware de admin.
app.use('/api/admin', adminAuthMiddleware);

// --- Rutas de la API para Usuario ---

// Actualizar la preferencia de tema del usuario
app.put('/api/user/theme', async (req, res) => {
  const { theme } = req.body;
  if (!theme || (theme !== 'light' && theme !== 'dark')) {
    return res.status(400).json({ message: 'Tema inválido. Debe ser "light" o "dark".' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { theme: theme } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.status(200).json({ message: 'Tema actualizado correctamente.', user: { theme: user.theme } });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el tema del usuario.' });
  }
});

// Actualizar las preferencias de vista y orden del usuario
app.put('/api/user/preferences', async (req, res) => {
  const { noteView, noteSortOrder } = req.body;
  const updateData = {};

  if (noteView && ['grid', 'list'].includes(noteView)) {
    updateData.noteView = noteView;
  }
  if (noteSortOrder && ['newest', 'oldest', 'custom', 'title-asc', 'title-desc'].includes(noteSortOrder)) {
    updateData.noteSortOrder = noteSortOrder;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'No se proporcionaron preferencias válidas para actualizar.' });
  }

  try {
    await User.findByIdAndUpdate(req.user.userId, { $set: updateData });
    res.status(200).json({ message: 'Preferencias actualizadas correctamente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar las preferencias del usuario.' });
  }
});

// --- Ruta de la API para Feedback ---

// Ruta para recibir feedback de los usuarios
app.post('/api/feedback', async (req, res) => {
  const { feedbackText } = req.body;
  const userId = req.user.userId;

  if (!feedbackText || feedbackText.trim().length === 0) {
    return res.status(400).json({ message: 'El texto del comentario no puede estar vacío.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const newFeedback = new Feedback({
      userId: userId,
      userEmail: user.email,
      feedbackText: feedbackText,
    });

    await newFeedback.save();
    res.status(201).json({ message: '¡Gracias por tus comentarios!' });
  } catch (error) {
    console.error('Error al guardar el feedback:', error);
    res.status(500).json({ message: 'Error interno al procesar tu comentario.' });
  }
});

// --- Rutas de la API para Administrador ---

// Obtener todos los comentarios (solo para administradores)
app.get('/api/admin/feedback', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const status = req.query.status || 'all'; // 'all', 'pending', 'resolved'
  const search = req.query.search || ''; // Nuevo parámetro de búsqueda
  const skip = (page - 1) * limit;

  const filter = {};
  if (status === 'pending') {
    filter.isResolved = false;
  } else if (status === 'resolved') {
    filter.isResolved = true;
  }

  // Si hay un término de búsqueda, lo añadimos al filtro
  if (search) {
    const searchRegex = new RegExp(search, 'i'); // 'i' para case-insensitive
    filter.$or = [
      { userEmail: { $regex: searchRegex } },
      { feedbackText: { $regex: searchRegex } }
    ];
  }

  try {
    // Ejecutamos dos consultas en paralelo para mayor eficiencia
    const [feedbacks, totalCount] = await Promise.all([
      Feedback.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Feedback.countDocuments(filter)
    ]);

    res.json({
      feedbacks,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount
    });
  } catch (error) {
    console.error('Error al obtener los comentarios para el administrador:', error);
    res.status(500).json({ message: 'Error al obtener los comentarios.' });
  }
});

// Marcar un comentario como resuelto (solo para administradores)
app.put('/api/admin/feedback/:id/resolve', async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { $set: { isResolved: true } },
      { new: true } // Devuelve el documento actualizado
    );
    if (!feedback) {
      return res.status(404).json({ message: 'Comentario no encontrado.' });
    }
    res.status(200).json({ message: 'Comentario marcado como resuelto.', feedback });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el comentario.' });
  }
});

// Responder a un comentario (solo para administradores)
app.post('/api/admin/feedback/:id/reply', async (req, res) => {
  const { replyText } = req.body;
  if (!replyText) {
    return res.status(400).json({ message: 'El texto de la respuesta no puede estar vacío.' });
  }

  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Comentario original no encontrado.' });
    }

    const subject = 'Respuesta a tu comentario en Mi App de Notas';
    const textBody = `Hola,\n\nGracias por tus comentarios. Aquí tienes una respuesta de nuestro equipo:\n\n"${replyText}"\n\nTu comentario original fue:\n"${feedback.feedbackText}"\n\nSaludos,\nEl equipo de Mi App de Notas`;
    const htmlBody = `
      <p>Hola,</p>
      <p>Gracias por tus comentarios. Aquí tienes una respuesta de nuestro equipo:</p>
      <blockquote style="border-left: 2px solid #ccc; padding-left: 1em; margin-left: 1em; font-style: italic;">${replyText}</blockquote>
      <p>Tu comentario original fue:</p>
      <blockquote style="border-left: 2px solid #ccc; padding-left: 1em; margin-left: 1em;">${feedback.feedbackText}</blockquote>
      <p>Saludos,<br>El equipo de Mi App de Notas</p>
    `;

    await sendEmail(feedback.userEmail, subject, textBody, htmlBody);

    // Marcar el comentario como respondido y resuelto
    feedback.isReplied = true;
    feedback.isResolved = true; // Asumimos que responder también resuelve el comentario
    const updatedFeedback = await feedback.save();

    res.status(200).json({ message: 'Respuesta enviada correctamente.', feedback: updatedFeedback });
  } catch (error) {
    console.error('Error detallado al enviar la respuesta por correo:', error);
    // Ahora enviamos un mensaje más específico al frontend
    res.status(500).json({ message: `Error al enviar el correo: ${error.message}` });
  }
});

// Eliminar un comentario (solo para administradores)
app.delete('/api/admin/feedback/:id', async (req, res) => {
  try {
    const result = await Feedback.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Comentario no encontrado.' });
    }
    res.status(200).json({ message: 'Comentario eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar el comentario:', error);
    res.status(500).json({ message: 'Error al eliminar el comentario.' });
  }
});

// --- Rutas de la API para Grupos ---

// Obtener todos los grupos
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await Group.find({ userId: req.user.userId });
    res.json(groups);
  } catch (error) {
    console.error('Error detallado al obtener los grupos:', error);
    res.status(500).json({ message: 'Error al obtener los grupos', error: error.message });
  }
});

// Crear un nuevo grupo
app.post('/api/groups', async (req, res) => {
  const groupData = req.body;
  try {
    const newGroup = new Group({ ...groupData, userId: req.user.userId });
    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error detallado al crear el grupo:', error);
    res.status(500).json({ message: 'Error al crear el grupo', error: error.message });
  }
});

// Actualizar el orden de múltiples grupos en una sola operación
app.put('/api/groups/order', async (req, res) => {
  const groupsOrder = req.body; // Espera un array: [{ id: '...', order: 0 }, ...]
  if (!Array.isArray(groupsOrder)) {
    return res.status(400).json({ message: 'El cuerpo de la solicitud debe ser un array de grupos.' });
  }

  try {
    // Preparamos las operaciones para bulkWrite
    const bulkOps = groupsOrder.map(group => ({
      updateOne: {
        filter: { id: group.id, userId: req.user.userId },
        update: { $set: { order: group.order } }
      }
    }));

    if (bulkOps.length === 0) {
      return res.status(200).json({ message: 'No hay grupos para actualizar.' });
    }

    const result = await Group.bulkWrite(bulkOps);
    res.status(200).json({ message: 'Orden de los grupos actualizado correctamente', result });
  } catch (error) {
    console.error('Error detallado al actualizar el orden de los grupos:', error);
    res.status(500).json({ message: 'Error al actualizar el orden de los grupos', error: error.message });
  }
});

// Actualizar un grupo
app.put('/api/groups/:id', async (req, res) => {
  try {
    const group = await Group.findOneAndUpdate(
      { id: req.params.id, userId: req.user.userId },
      req.body,
      { 
        new: true,
        // Respetar el timestamp que viene del frontend
        timestamps: false
      }
    );
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }
    res.json(group);
  } catch (error) {
    console.error('Error detallado al actualizar el grupo:', error);
    res.status(500).json({ message: 'Error al actualizar el grupo', error: error.message });
  }
});

// Eliminar un grupo
app.delete('/api/groups/:id', async (req, res) => {
  try {
    const result = await Group.findOneAndDelete({ id: req.params.id, userId: req.user.userId });
    if (!result) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }
    // Desasociar las notas del grupo eliminado, estableciendo groupId a null para consistencia con el frontend
    await Note.updateMany({ groupId: req.params.id, userId: req.user.userId }, { $set: { groupId: null } });
    res.status(200).json({ message: 'Grupo eliminado correctamente' });
  } catch (error) {
    console.error('Error detallado al eliminar el grupo:', error);
    res.status(500).json({ message: 'Error al eliminar el grupo', error: error.message });
  }
});


// --- Rutas de la API ---

// Obtener todas las notas (activas y en papelera)
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.userId });
    res.json(notes);
  } catch (error) {
    // Loguear el error completo en el servidor para depuración
    console.error('Error detallado al obtener las notas:', error);
    // Enviar solo el mensaje de error al cliente por seguridad
    res.status(500).json({ message: 'Error al obtener las notas', error: error.message });
  }
});

// Crear o Actualizar una nota (Upsert)
app.post('/api/notes', async (req, res) => {
  const noteData = req.body;
  try {
    // Mongoose se encargará del campo `updatedAt` gracias a `timestamps: true`
    // por lo que no es estrictamente necesario enviarlo desde el cliente, pero si se envía, se respeta.

    // Usamos el 'id' único que viene del frontend para buscar y actualizar/crear
    const note = await Note.findOneAndUpdate(
      { id: noteData.id, userId: req.user.userId }, // Filtro por ID de nota y de usuario
      { ...noteData, userId: req.user.userId }, // Aseguramos que el userId esté en los datos a insertar/actualizar
      { 
        new: true, 
        upsert: true, 
        setDefaultsOnInsert: true, 
        // Añadimos esta opción para que Mongoose no actualice `updatedAt` automáticamente.
        // De esta forma, respetará el valor que viene del frontend.
        timestamps: false }
    );
    res.status(201).json(note);
  } catch (error) {
    // Loguear el error completo en el servidor para depuración
    console.error('Error detallado al guardar la nota:', error);
    // Enviar solo el mensaje de error al cliente por seguridad
    res.status(500).json({ message: 'Error al guardar la nota', error: error.message });
  }
});

// Actualizar el orden de múltiples notas en una sola operación
app.put('/api/notes/order', async (req, res) => {
  const notesOrder = req.body; // Espera un array: [{ id: '...', order: 0 }, ...]
  if (!Array.isArray(notesOrder)) {
    return res.status(400).json({ message: 'El cuerpo de la solicitud debe ser un array de notas.' });
  }

  try {
    const bulkOps = notesOrder.map(note => ({
      updateOne: {
        filter: { id: note.id, userId: req.user.userId },
        update: { $set: { customOrder: note.order } }
      }
    }));

    if (bulkOps.length > 0) {
      await Note.bulkWrite(bulkOps);
    }
    res.status(200).json({ message: 'Orden de las notas actualizado correctamente' });
  } catch (error) {
    console.error('Error detallado al actualizar el orden de las notas:', error);
    res.status(500).json({ message: 'Error al actualizar el orden de las notas', error: error.message });
  }
});

// Vaciar toda la papelera
app.delete('/api/notes/trashed', async (req, res) => {
  try {
    const result = await Note.deleteMany({ status: 'trashed', userId: req.user.userId });
    res.status(200).json({ message: `Se eliminaron ${result.deletedCount} notas de la papelera.`, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error al vaciar la papelera:', error);
    res.status(500).json({ message: 'Error al vaciar la papelera', error: error.message });
  }
});

// Eliminar una nota PERMANENTEMENTE
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const result = await Note.findOneAndDelete({ id: req.params.id, userId: req.user.userId });
    if (!result) {
      return res.status(404).json({ message: 'Nota no encontrada' });
    }
    res.status(200).json({ message: 'Nota eliminada correctamente' });
  } catch (error) {
    // Loguear el error completo en el servidor para depuración
    console.error('Error detallado al eliminar la nota:', error);
    // Enviar solo el mensaje de error al cliente por seguridad
    res.status(500).json({ message: 'Error al eliminar la nota', error: error.message });
  }
});

// Mover una nota a la papelera (soft delete)
app.put('/api/notes/:id/trash', async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { id: req.params.id, userId: req.user.userId },
      { $set: { status: 'trashed' } },
      { new: true }
    );
    if (!note) {
      return res.status(404).json({ message: 'Nota no encontrada' });
    }
    res.status(200).json({ message: 'Nota movida a la papelera', note });
  } catch (error) {
    console.error('Error al mover la nota a la papelera:', error);
    res.status(500).json({ message: 'Error al mover la nota a la papelera', error: error.message });
  }
});

// Restaurar una nota desde la papelera
app.put('/api/notes/:id/restore', async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { id: req.params.id, userId: req.user.userId },
      { $set: { status: 'active' } },
      { new: true }
    );
    if (!note) {
      return res.status(404).json({ message: 'Nota no encontrada' });
    }
    res.status(200).json({ message: 'Nota restaurada', note });
  } catch (error) {
    console.error('Error al restaurar la nota:', error);
    res.status(500).json({ message: 'Error al restaurar la nota', error: error.message });
  }
});

// Ruta de prueba para verificar el estado de la conexión a la base de datos
app.get('/api/status', (req, res) => {
  const dbState = mongoose.connection.readyState;
  let statusMessage = 'Desconocido';
  let isConnected = false;

  switch (dbState) {
    case 0:
      statusMessage = 'Desconectado';
      break;
    case 1:
      statusMessage = 'Conectado';
      isConnected = true;
      break;
    case 2:
      statusMessage = 'Conectando';
      break;
    case 3:
      statusMessage = 'Desconectando';
      break;
  }

  if (isConnected) {
    res.status(200).json({
      serverStatus: 'ok',
      dbStatus: statusMessage,
    });
  } else {
    // 503 Service Unavailable
    res.status(503).json({
      serverStatus: 'error',
      dbStatus: statusMessage,
    });
  }
});

// --- Servidor de archivos de Frontend ---
// Esta sección debe ir DESPUÉS de todas las rutas de la API.

// 1. Ruta protegida para servir el panel de administración.
app.get('/admin', adminAuthMiddleware, (req, res) => {
  // Si el middleware pasa, el usuario es un admin y le servimos la página.
  res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-panel.html'));
});

// 1.5: Bloquear el acceso directo al archivo del panel de admin
app.get('/admin-panel.html', (req, res) => {
  // Esta ruta previene que alguien acceda al archivo HTML directamente.
  // Solo la ruta '/admin' (que tiene el middleware de admin) debe servirlo.
  res.status(403).send('Acceso Prohibido');
});

// 2. Servir los archivos estáticos del frontend (JS, CSS, imágenes, etc.)
// Esto es necesario para que index.html y admin-panel.html puedan cargar sus recursos.
app.use(express.static(path.resolve(__dirname, '..', '..', 'frontend')));

// 3. Ruta "catch-all" para la aplicación principal (Single Page Application).
// Cualquier otra petición GET que no sea una API o un archivo estático, servirá index.html.
app.get('/{*path}', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'index.html'));
});

const deleteOldTrashedNotes = async () => {
  console.log('Ejecutando tarea de limpieza de papelera...');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
      const result = await Note.deleteMany({
          status: 'trashed', // Se podría añadir userId aquí, pero es menos crítico si las rutas ya están protegidas.
          updatedAt: { $lt: thirtyDaysAgo } // $lt significa "less than" (menor que)
      });

      if (result.deletedCount > 0) {
          console.log(`Limpieza de papelera: Se eliminaron ${result.deletedCount} notas con más de 30 días.`);
      } else {
          console.log('Limpieza de papelera: No se encontraron notas antiguas para eliminar.');
      }
  } catch (error) {
      console.error('Error durante la limpieza automática de la papelera:', error);
  }
};

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);

  // Ejecutar la limpieza una vez al iniciar el servidor
  deleteOldTrashedNotes();

  // Programar la tarea para que se ejecute cada 24 horas (86,400,000 ms)
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
  setInterval(deleteOldTrashedNotes, twentyFourHoursInMs);
});
