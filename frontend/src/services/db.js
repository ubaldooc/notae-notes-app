
// ESTE ES EL ARCHIVO QUE CONTIENE LAS FUNCIONES PARA MANEJAR LAS NOTAS CON INDEXEDDB

import Dexie from 'dexie';

const dbName = 'miAppDeNotas';
const notesStoreName = 'notas';
const groupsStoreName = 'groups';

// 1. Define la estructura de la base de datos con Dexie
class MiAppDeNotasDB extends Dexie {
  constructor() {
    super(dbName);
    // 1. Incrementamos la versión a 3 para añadir el campo 'order'
    this.version(4).stores({
      [notesStoreName]: 'id, groupId',
      // 2. Añadimos '&order' como un índice único.
      [groupsStoreName]: 'id, name, order'
    }).upgrade(async (tx) => {
      // 3. Código de migración para añadir 'order' a los grupos existentes
      const groups = await tx.table(groupsStoreName).toArray();
      if (groups.length > 0 && groups[0].order === undefined) {
        console.log('Migrando grupos para añadir campo "order"...');
        const updates = groups.map((group, index) => ({ ...group, order: index }));
        await tx.table(groupsStoreName).bulkPut(updates);
      }
    });
  }
}

let db;

// Función para inicializar la base de datos y devolver la instancia
const getDb = async () => {
    if (!db) {
        db = new MiAppDeNotasDB();
        try {
            await db.open();
            console.log('Base de datos Dexie inicializada correctamente.');
        } catch (error) {
            console.error('Error al inicializar la base de datos Dexie:', error);
            throw error; // Re-lanza el error para que el llamador lo maneje
        }
    }
    return db;
};





// 2. Funciones para interactuar con la base de datos
const guardarNotaEnDB = async (nota) => {
  try {
    const db = await getDb();
    await db[notesStoreName].put(nota);
    console.log(`Nota con ID ${nota.id} guardada/actualizada en la base de datos.`);
  } catch (error) {
    console.error('Error al guardar/actualizar la nota:', error);
  }
};

const cargarNotasDesdeDB = async () => {
  try {
    const db = await getDb();
    return await db[notesStoreName].toArray();
  } catch (error) {
    console.error('Error al cargar las notas:', error);
    return []; // Devuelve un array vacío en caso de error
  }
};

const eliminarNotaDeDB = async (id) => {
  try {
    const db = await getDb();
    await db[notesStoreName].delete(id);
    console.log(`Nota con ID ${id} eliminada de la base de datos.`);
  } catch (error) {
    console.error('Error al eliminar la nota:', error);
  }
};




// Opcional: Función para buscar notas por grupo (si necesitas)
const obtenerNotasPorGrupoDesdeDB = async (groupId) => {
    try {
        const db = await getDb();
        return await db[notesStoreName].where('groupId').equals(groupId).toArray();
    } catch (error) {
        console.error(`Error al obtener notas del grupo ${groupId}:`, error);
        return [];
    }
};





// 3. Funciones para interactuar con los GRUPOS
const guardarGrupoEnDB = async (group) => {
  try {
    const db = await getDb();
    await db[groupsStoreName].put(group);
    console.log(`Grupo con ID ${group.id} guardado/actualizado en la base de datos.`);
  } catch (error) {
    console.error('Error al guardar/actualizar el grupo:', error);
  }
};

const cargarGruposDesdeDB = async () => {
  try {
    const db = await getDb();
    // 4. Ordenamos por el nuevo campo 'order' al cargar
    return await db[groupsStoreName].orderBy('order').toArray();
  } catch (error) {
    console.error('Error al cargar los grupos:', error);
    return [];
  }
};

const eliminarGrupoDeDB = async (id) => {
  try {
    const db = await getDb();
    // Usamos una transacción para asegurar que ambas operaciones (actualizar notas y eliminar grupo)
    // se completen exitosamente o ninguna lo haga. Esto mantiene la integridad de los datos.
    await db.transaction('rw', db[groupsStoreName], db[notesStoreName], async () => {
      // 1. Encontrar todas las notas que pertenecen al grupo y actualizar su groupId a null.
      // `modify` es una operación de Dexie que actualiza los registros que coinciden.
      const updatedCount = await db[notesStoreName]
        .where('groupId')
        .equals(id)
        .modify({ groupId: null });
      console.log(`${updatedCount} nota(s) del grupo ${id} reasignada(s) a 'Sin grupo'.`);

      // 2. Eliminar el grupo.
      await db[groupsStoreName].delete(id);
      console.log(`Grupo con ID ${id} eliminado de la base de datos.`);
    });
  } catch (error) {
    console.error('Error al eliminar el grupo y reasignar notas:', error);
    // Es importante relanzar el error para que el código que llama a esta función sepa que algo salió mal.
    throw error;
  }
};

const actualizarPropiedadesGrupoEnDB = async (id, cambios) => {
  try {
    const db = await getDb();
    // El método update() de Dexie modifica solo las propiedades especificadas.
    await db[groupsStoreName].update(id, cambios);
    console.log(`Grupo con ID ${id} actualizado con:`, cambios);
  } catch (error) {
    console.error(`Error al actualizar propiedades del grupo ${id}:`, error);
  }
};

// 5. Nueva función para actualizar el orden de los grupos en bloque
const actualizarOrdenGruposEnDB = async (gruposActualizados) => {
  try {
    const db = await getDb();
    // bulkUpdate es perfecto para actualizar múltiples registros a la vez
    await db[groupsStoreName].bulkUpdate(gruposActualizados.map(g => ({ key: g.id, changes: { order: g.order } })));
    console.log('Orden de los grupos actualizado en la base de datos.');
  } catch (error) {
    console.error('Error al actualizar el orden de los grupos:', error);
    throw error;
  }
};


const obtenerNotaPorIdDesdeDB = async (id) => {
  try {
    const db = await getDb();
    return await db[notesStoreName].get(id);
  } catch (error) {
    console.error(`Error al obtener la nota con ID ${id}:`, error);
    return null;
  }
};

/**
 * Busca y corrige registros duplicados en una tabla, conservando el más reciente.
 * Esta función es útil como una herramienta de mantenimiento para asegurar la integridad de los datos.
 * @param {string} storeName El nombre de la tabla a revisar (ej. 'notas' o 'groups').
 */
const buscarYCorregirDuplicados = async (storeName) => {
  try {
      const db = await getDb();
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
          console.log(`No se encontraron duplicados en "${storeName}". ¡Todo en orden!`);
      }
  } catch (error) {
      console.error(`Error al buscar y corregir duplicados en "${storeName}":`, error);
  }
};



export { 
  getDb, 
  guardarNotaEnDB, cargarNotasDesdeDB, eliminarNotaDeDB, obtenerNotasPorGrupoDesdeDB,
  guardarGrupoEnDB, cargarGruposDesdeDB, eliminarGrupoDeDB, actualizarPropiedadesGrupoEnDB, actualizarOrdenGruposEnDB, buscarYCorregirDuplicados,
  obtenerNotaPorIdDesdeDB 
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
      console.log('20 notas añadidas exitosamente a la base de datos.');

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
      console.log('Todas las notas han sido eliminadas exitosamente de la base de datos.');
  } catch (error) {
      console.error('Error al eliminar todas las notas:', error);
  }
};

// Puedes llamar a esta función cuando quieras limpiar la base de datos
// Por ejemplo:
// eliminarTodasLasNotasDeDB();
