
// ESTE ES EL ARCHIVO QUE CONTIENE LAS FUNCIONES PARA MANEJAR LAS NOTAS CON INDEXEDDB

import Dexie from 'dexie';
import {
  syncNoteWithBackend, deleteNoteFromBackend, moveNoteToTrashInBackend, restoreNoteFromBackend, emptyTrashInBackend, updateNotesOrderInBackend,
  createGroupInBackend, deleteGroupFromBackend, updateGroupInBackend, updateGroupsOrderInBackend
} from './api.js';
import { validarORestauraNotaJSON } from '../utils.js';

const dbName = 'miAppDeNotas';
const notesStoreName = 'notas';
const groupsStoreName = 'groups';
let db = null; // Variable para contener la instancia de la BD actual

/**
 * Inicializa o cambia la conexión a la base de datos para un usuario específico.
 * Esto aísla completamente los datos entre usuarios y sesiones de invitado.
 * @param {string | null} userId - El ID del usuario, o null para una sesión de invitado.
 */
export const initDb = async (userId) => {
  if (db) {
    // Si hay una conexión existente, la cerramos antes de cambiar.
    db.close();
  }

  // Usamos un nombre de base de datos dinámico para cada usuario para asegurar el aislamiento.
  const dynamicDbName = userId ? `${dbName}_${userId}` : `${dbName}_guest`;
  console.log(`Inicializando base de datos: ${dynamicDbName}`);

  db = new Dexie(dynamicDbName);

  // Definimos el esquema. Añadimos índices para los campos por los que consultamos u ordenamos.
  db.version(1).stores({
    [notesStoreName]: 'id, groupId, status, updatedAt, customOrder', // 'id' es la clave primaria, los demás son índices
    [groupsStoreName]: 'id, order' // 'id' es la clave primaria, 'order' es para ordenar
  });

  try {
    await db.open();
    console.log(`Base de datos "${dynamicDbName}" inicializada correctamente.`);
  } catch (error) {
    console.error(`Error al inicializar la base de datos "${dynamicDbName}":`, error);
    db = null; // Reiniciar en caso de fallo
    throw error;
  }
};

/**
 * Elimina la base de datos de un usuario específico.
 * @param {string} userId - El ID del usuario cuya base de datos será eliminada.
 */
export const deleteDb = async (userId) => {
  if (!userId) return;
  const dynamicDbName = `${dbName}_${userId}`;
  try {
    await Dexie.delete(dynamicDbName);
    console.log(`Base de datos "${dynamicDbName}" eliminada correctamente.`);
  } catch (error) {
    console.error(`Error al eliminar la base de datos "${dynamicDbName}":`, error);
  }
};
/**
 * Cierra la conexión actual a la base de datos y limpia la instancia.
 */
export const closeDb = () => {
  if (db) {
    db.close();
    db = null;
    console.log('Conexión a la base de datos cerrada.');
  }
};

/**
 * Comprueba si existen datos en la base de datos de invitado.
 * @returns {Promise<boolean>} True si hay notas o grupos, false en caso contrario.
 */
export const hasGuestData = async () => {
  const guestDbName = `${dbName}_guest`;
  try {
    const exists = await Dexie.exists(guestDbName);
    if (!exists) {
      return false;
    }

    const guestDb = new Dexie(guestDbName);
    guestDb.version(1).stores({
      [notesStoreName]: 'id',
      [groupsStoreName]: 'id'
    });

    await guestDb.open();
    const noteCount = await guestDb.table(notesStoreName).count();
    const groupCount = await guestDb.table(groupsStoreName).count();
    guestDb.close();

    return noteCount > 0 || groupCount > 0;
  } catch (error) {
    console.error("Error al comprobar los datos de invitado:", error);
    return false;
  }
};

/**
 * Importa todos los datos de la base de datos de invitado a la del usuario actual
 * y luego limpia la base de datos de invitado.
 */
export const importGuestData = async () => {
  const guestDbName = `${dbName}_guest`;
  const guestDb = new Dexie(guestDbName);
  guestDb.version(1).stores({
    [notesStoreName]: 'id, groupId, status, updatedAt',
    [groupsStoreName]: 'id, order'
  });

  try {
    await guestDb.open();
    const guestNotes = await guestDb.table(notesStoreName).toArray();
    const guestGroups = await guestDb.table(groupsStoreName).toArray();

    if (guestNotes.length === 0 && guestGroups.length === 0) {
      guestDb.close();
      console.log("No hay datos de invitado para importar.");
      return;
    }

    const userDb = getDb(); // Asume que la DB del usuario ya está abierta
    if (!userDb) throw new Error("La base de datos del usuario no está abierta para la importación.");

    await userDb.transaction('rw', userDb[notesStoreName], userDb[groupsStoreName], async () => {
      if (guestNotes.length > 0) await userDb[notesStoreName].bulkPut(guestNotes);
      if (guestGroups.length > 0) await userDb[groupsStoreName].bulkPut(guestGroups);
    });
    console.log(`Se importaron ${guestNotes.length} notas y ${guestGroups.length} grupos.`);

    await Dexie.delete(guestDbName);
    console.log("Base de datos de invitado eliminada después de la importación.");
  } catch (error) {
    console.error("Error durante la importación de datos de invitado:", error);
    if (guestDb.isOpen()) guestDb.close();
    throw error;
  }
};

const getDb = () => {
  if (!db) throw new Error('La base de datos no está inicializada. Llama a initDb(userId) primero.');
  return db;
};

const guardarNotaEnDB = async (nota, sincronizar = true) => {
  try {
    const db = getDb();
    // Validamos la nota antes de guardarla para asegurar la integridad de los datos.
    const notaValida = validarORestauraNotaJSON(nota);
    if (!notaValida) {
      console.error("Se intentó guardar una nota con formato inválido, la operación fue cancelada.", nota);
      return;
    }

    await db[notesStoreName].put(notaValida);
    console.log(`Nota con ID ${notaValida.id} guardada/actualizada en la base de datos.`);
    // Solo sincronizar con el backend si hay una sesión activa.
    const user = localStorage.getItem('user');
    if (sincronizar && user) {
      await syncNoteWithBackend(notaValida); // Sincronizar con el backend
    }
  } catch (error) {
    console.error('Error al guardar/actualizar la nota:', error);
  }
};

const cargarNotasDesdeDB = async (status = 'active') => {
  try {
    const db = getDb();
    if (status === 'all') {
      return await db[notesStoreName].toArray();
    }
    return await db[notesStoreName].where('status').equals(status).toArray();
  } catch (error) {
    console.error('Error al cargar las notas:', error);
    return []; // Devuelve un array vacío en caso de error
  }
};

const moverNotaAPapeleraEnDB = async (id) => {
  try {
    const db = getDb();
    // Actualiza el estado en IndexedDB
    await db[notesStoreName].update(id, { status: 'trashed' });
    console.log(`Nota con ID ${id} movida a la papelera en la base de datos local.`);
    // Sincroniza con el backend solo si hay sesión
    const user = localStorage.getItem('user');
    if (user) {
      await moveNoteToTrashInBackend(id);
    }
  } catch (error) {
    console.error('Error al mover la nota a la papelera:', error);
    throw error;
  }
};

/**
 * Mueve un lote de notas a la papelera en una sola transacción.
 * @param {string[]} noteIds - Un array de IDs de las notas a mover.
 */
export const moverNotasAPapeleraEnDB = async (noteIds) => {
  if (!noteIds || noteIds.length === 0) return;
  try {
    const db = getDb();
    // Actualiza el estado de todas las notas a 'trashed' en una sola operación.
    await db[notesStoreName].where('id').anyOf(noteIds).modify({ status: 'trashed' });
    console.log(`${noteIds.length} notas movidas a la papelera en la base de datos local.`);

    const user = localStorage.getItem('user');
    if (user) {
      // Idealmente, el backend también tendría un endpoint para mover notas en lote.
      // Por ahora, las movemos una por una. Promise.all asegura que se hagan en paralelo.
      await Promise.all(noteIds.map(id => moveNoteToTrashInBackend(id)));
    }
  } catch (error) {
    console.error('Error al mover notas a la papelera en lote:', error);
    throw error;
  }
};

const restaurarNotaEnDB = async (id) => {
  try {
    const db = getDb();
    const user = localStorage.getItem('user');

    if (user) {
      // Online: obtener la versión definitiva del backend
      const backendResponse = await restoreNoteFromBackend(id);
      const notaRestaurada = backendResponse.note;
      if (!notaRestaurada) {
        throw new Error('La respuesta del backend no contenía la nota restaurada.');
      }
      await db[notesStoreName].put(notaRestaurada);
      console.log(`Nota con ID ${id} restaurada y actualizada en la base de datos local desde el backend.`);
      return notaRestaurada;
    } else {
      // Offline: solo actualizar el estado localmente
      await db[notesStoreName].update(id, { status: 'active', updatedAt: new Date().toISOString() });
      console.log(`Nota con ID ${id} restaurada en la base de datos local (modo offline).`);
      // Devolver la versión local para que la UI la pueda renderizar
      return await db[notesStoreName].get(id);
    }
  } catch (error) {
    console.error('Error al restaurar la nota:', error);
    throw error;
  }
};

const eliminarNotaPermanentementeDeDB = async (id) => {
  try {
    const db = getDb();
    // Elimina de IndexedDB
    await db[notesStoreName].delete(id);
    console.log(`Nota con ID ${id} eliminada permanentemente de la base de datos local.`);
    // Sincroniza con el backend solo si hay sesión
    const user = localStorage.getItem('user');
    if (user) {
      await deleteNoteFromBackend(id);
    }
  } catch (error) {
    console.error('Error al eliminar la nota permanentemente:', error);
    throw error;
  }
};

const vaciarPapeleraEnDB = async () => {
  try {
    const db = getDb();
    // Elimina de IndexedDB
    const deletedCount = await db[notesStoreName].where('status').equals('trashed').delete();
    console.log(`${deletedCount} notas eliminadas de la papelera local.`);
    // Sincroniza con el backend solo si hay sesión
    const user = localStorage.getItem('user');
    if (user) {
      await emptyTrashInBackend();
    }
    return deletedCount;
  } catch (error) {
    console.error('Error al vaciar la papelera:', error);
    throw error;
  }
};



// OPCIONAL
// Opcional: Función para buscar notas por grupo (si necesitas)
const obtenerNotasPorGrupoDesdeDB = async (groupId) => {
  try {
    const db = getDb();
    return await db[notesStoreName].where('groupId').equals(groupId).toArray();
  } catch (error) {
    console.error(`Error al obtener notas del grupo ${groupId}:`, error);
    return [];
  }
};

// 3. Funciones para interactuar con los GRUPOS
const guardarGrupoEnDB = async (group, sincronizar = true) => {
  try {
    const db = getDb();
    await db[groupsStoreName].put(group);
    console.log(`Grupo con ID ${group.id} guardado/actualizado en la base de datos.`);
    // Solo sincronizar con el backend si hay una sesión activa.
    const user = localStorage.getItem('user');
    if (sincronizar && user) {
      await createGroupInBackend(group); // Sincronizar con el backend
    }
  } catch (error) {
    console.error('Error al guardar/actualizar el grupo:', error);
    throw error; // Relanzamos el error para que el llamador pueda manejarlo.
  }
};

const cargarGruposDesdeDB = async () => {
  try {
    const db = getDb();
    // Ordenamos por el campo 'order' al cargar
    return await db[groupsStoreName].orderBy('order').toArray();
  } catch (error) {
    console.error('Error al cargar los grupos:', error);
    return [];
  }
};

const eliminarGrupoDeDB = async (id) => {
  try {
    const db = getDb();
    let updatedNoteIds = [];
    // Usamos una transacción para asegurar que ambas operaciones (actualizar notas y eliminar grupo)
    // se completen exitosamente o ninguna lo haga. Esto mantiene la integridad de los datos.
    await db.transaction('rw', db[groupsStoreName], db[notesStoreName], async () => {
      // 1. Obtenemos los IDs de las notas a modificar ANTES de hacerlo.
      updatedNoteIds = await db[notesStoreName].where('groupId').equals(id).primaryKeys();

      if (updatedNoteIds.length > 0) {
        // 2. Actualizamos las notas para que no tengan grupo.
        await db[notesStoreName].where('groupId').equals(id).modify({ groupId: null });
        console.log(`${updatedNoteIds.length} nota(s) del grupo ${id} reasignada(s) a 'Sin grupo'.`);
      }

      // 3. Eliminar el grupo de la base de datos local.
      await db[groupsStoreName].delete(id);
      console.log(`Grupo con ID ${id} eliminado de la base de datos local.`);
    });

    // 4. Sincronizar la eliminación con el backend solo si hay sesión.
    const user = localStorage.getItem('user');
    if (user) {
      await deleteGroupFromBackend(id);
    }

    // 5. Devolvemos los IDs de las notas que fueron modificadas para actualizar la UI.
    return updatedNoteIds;
  } catch (error) {
    console.error('Error al eliminar el grupo y reasignar notas:', error);
    // Es importante relanzar el error para que el código que llama a esta función sepa que algo salió mal.
    throw error;
  }
};

const actualizarPropiedadesGrupoEnDB = async (id, cambios) => {
  try {
    const db = getDb();
    // Añadimos automáticamente la fecha de actualización a cualquier cambio.
    // Esto es crucial para que la lógica de sincronización funcione correctamente.
    const cambiosConTimestamp = {
      ...cambios,
      updatedAt: new Date().toISOString()
    };

    // El método update() de Dexie modifica solo las propiedades especificadas.
    await db[groupsStoreName].update(id, cambiosConTimestamp);
    console.log(`Grupo con ID ${id} actualizado con:`, cambiosConTimestamp)
    // Sincronizar con el backend solo si hay sesión
    const user = localStorage.getItem('user');
    if (user) {
      await updateGroupInBackend(id, cambiosConTimestamp); // Sincronizar con el backend;
    }
  } catch (error) {
    console.error(`Error al actualizar propiedades del grupo ${id}:`, error);
    throw error; // Relanzamos el error para que el llamador pueda manejarlo.
  }
};

// 5. Nueva función para actualizar el orden de los grupos en bloque
const actualizarOrdenGruposEnDB = async (gruposActualizados) => {
  try {
    const db = getDb();
    // bulkUpdate es perfecto para actualizar múltiples registros a la vez
    await db[groupsStoreName].bulkUpdate(gruposActualizados.map(g => ({ key: g.id, changes: { order: g.order } })));
    console.log('Orden de los grupos actualizado en la base de datos local.');
    // Sincronizar el nuevo orden con el backend solo si hay sesión
    const user = localStorage.getItem('user');
    if (user) {
      await updateGroupsOrderInBackend(gruposActualizados);
    }
  } catch (error) {
    console.error('Error al actualizar el orden de los grupos:', error);
    throw error;
  }
};

const obtenerNotaPorIdDesdeDB = async (id) => {
  try {
    const db = getDb();
    return await db[notesStoreName].get(id);
  } catch (error) {
    console.error(`Error al obtener la nota con ID ${id}:`, error);
    return null;
  }
};

/**
 * Actualiza el campo `customOrder` para múltiples notas a la vez.
 * @param {Array<{id: string, order: number}>} notasActualizadas - Un array de objetos con el id de la nota y su nuevo orden.
 */
export const actualizarOrdenNotasEnDB = async (notasActualizadas) => {
  try {
    const db = getDb();
    // bulkUpdate es la forma más eficiente de actualizar múltiples registros.
    await db[notesStoreName].bulkUpdate(notasActualizadas.map(n => ({ key: n.id, changes: { customOrder: n.order } })));
    console.log('Orden personalizado de las notas actualizado en la base de datos local.');
    // Sincronizar el nuevo orden con el backend solo si hay sesión
    const user = localStorage.getItem('user');
    if (user) {
      // No esperamos la respuesta para no bloquear la UI.
      updateNotesOrderInBackend(notasActualizadas).catch(err => console.error("Fallo al sincronizar el orden de las notas con el backend:", err));
    }
  } catch (error) {
    console.error('Error al actualizar el orden de las notas:', error);
    throw error;
  }
};

/**
 * Busca y corrige registros duplicados en una tabla, conservando el más reciente.
 * Esta función es útil como una herramienta de mantenimiento para asegurar la integridad de los datos.
 * @param {string} storeName El nombre de la tabla a revisar (ej. 'notas' o 'groups').
 */
const buscarYCorregirDuplicados = async (storeName) => {
  try {
    const db = getDb();
    const table = db[storeName];

    console.log(`Iniciando la búsqueda de duplicados en la tabla "${storeName}"...`);

    const todosLosItems = await table.toArray();
    const itemsAgrupadosPorId = new Map();

    // 1. Agrupar todos los items por su 'id'
    for (const item of todosLosItems) {
      if (!itemsAgrupadosPorId.has(item.id)) {
        itemsAgrupadosPorId.set(item.id, []);
      }
      itemsAgrupadosPorId.get(item.id).push(item);
    }

    const idsParaEliminar = [];

    // 2. Encontrar los duplicados y decidir cuáles eliminar
    for (const [id, items] of itemsAgrupadosPorId.entries()) {
      if (items.length > 1) {
        console.warn(`Se encontró un ID duplicado: "${id}" con ${items.length} entradas.`);

        // Ordenar por fecha de creación para encontrar el más antiguo.
        items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        // Conservamos el último elemento (el más reciente) y marcamos los otros para eliminar.
        const itemsAEliminar = items.slice(0, -1);
        idsParaEliminar.push(...itemsAEliminar.map(item => item.id));

        console.log(` - Se conservará la versión de: ${new Date(items[items.length - 1].createdAt).toLocaleString()}`);
        console.log(` - Se eliminarán ${itemsAEliminar.length} versiones antiguas.`);
      }
    }

    // 3. Eliminar los duplicados antiguos si se encontraron
    if (idsParaEliminar.length > 0) {
      console.log(`Eliminando ${idsParaEliminar.length} registros duplicados antiguos...`);
      await table.bulkDelete(idsParaEliminar);
      console.log('¡Corrección de duplicados completada!');
    } else {
    }
  } catch (error) {
    console.error(`Error al buscar y corregir duplicados en "${storeName}":`, error);
  }
};



export {
  guardarNotaEnDB, cargarNotasDesdeDB, obtenerNotasPorGrupoDesdeDB,
  guardarGrupoEnDB, cargarGruposDesdeDB, eliminarGrupoDeDB, actualizarPropiedadesGrupoEnDB, actualizarOrdenGruposEnDB, buscarYCorregirDuplicados,
  obtenerNotaPorIdDesdeDB,
  moverNotaAPapeleraEnDB, restaurarNotaEnDB, eliminarNotaPermanentementeDeDB,
  vaciarPapeleraEnDB
};

















// AGREGAR 20 NOTAS RANDOM AL INDEXEDDB PARA PRUEBAS
// AGREGAR 20 NOTAS RANDOM AL INDEXEDDB PARA PRUEBAS
// AGREGAR 20 NOTAS RANDOM AL INDEXEDDB PARA PRUEBAS
// AGREGAR 20 NOTAS RANDOM AL INDEXEDDB PARA PRUEBAS


// Función para añadir 20 notas de ejemplo a la base de datos
const agregar20NotasEjemplo = async () => {
  try {
    const db = await getDb();
    const notasParaAgregar = [];

    for (let i = 1; i <= 20; i++) {
      const notaEjemplo = {
        // id: `id-${Date.now()}-${i}`, // Genera un ID único para cada nota
        id: `note-test-${Date.now()}-${i}`, // Genera un ID único para cada nota
        title: `Mi nota prrona ${i}`,
        body: `Texto aquí texto allá, muévelo alv para la nota número ${i}.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        charCount: 20 + i,
        pinned: i % 2 === 0,
        groupId: "group-test-99999"
      };
      notasParaAgregar.push(notaEjemplo);
    }

    // Usa bulkPut() para añadir todas las notas de golpe
    await db[notesStoreName].bulkPut(notasParaAgregar);

  } catch (error) {
    console.error('Error al añadir las notas de ejemplo:', error);
  }
};

// Puedes llamar a la función para probarla
// agregar20NotasEjemplo();




// PARA ELIMINAR TODOS LOS ELEMENTOS DE INDEXEDdb
// Función para eliminar todas las notas de la base de datos
const eliminarTodasLasNotasDeDB = async () => {
  try {
    const db = await getDb();
    await db[notesStoreName].clear();
  } catch (error) {
    console.error('Error al eliminar todas las notas:', error);
  }
};

// Puedes llamar a esta función cuando quieras limpiar la base de datos
// Por ejemplo:
// eliminarTodasLasNotasDeDB();
