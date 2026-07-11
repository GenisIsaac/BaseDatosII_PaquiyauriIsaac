// =============================================
// SERVICIO DE DATOS SUPABASE
// =============================================
// Este módulo reemplaza localStorage con Supabase.
// Proporciona las mismas funciones que el sistema
// basado en localStorage, pero con persistencia remota.
//
// IMPORTANTE: Configura tus credenciales en
// supabase-config.js antes de usar.

// Cargar Supabase JS desde CDN
let supabaseClient = null;
let isReady = false;

function getConfig() {
  const cfg = window.__SUPABASE_CONFIG;
  if (cfg && cfg.url && cfg.anonKey) return cfg;
  return null;
}

export function isConfigured() {
  return !!getConfig();
}

// Inicializa el cliente de Supabase
export async function initSupabase() {
  if (supabaseClient) return supabaseClient;

  const cfg = getConfig();
  if (!cfg) {
    console.warn('[Supabase] No configurado. Usando localStorage.');
    return null;
  }

  try {
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      console.warn('[Supabase] Librería no cargada. Asegúrate de incluir el script en el HTML.');
      return null;
    }
    supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false }
    });

    // Verificar conexión
    const { error } = await supabaseClient.from('unidades').select('count', { count: 'exact', head: true });
    if (error) throw error;

    isReady = true;
    console.log('[Supabase] Conectado exitosamente');
    return supabaseClient;
  } catch (e) {
    console.error('[Supabase] Error de conexión:', e.message);
    return null;
  }
}

export function getClient() {
  return supabaseClient;
}

// =============================================
// OPERACIONES CRUD
// =============================================

// Cargar todos los datos (reemplaza loadData())
export async function loadData() {
  if (!isReady || !supabaseClient) return null;

  try {
    const { data: unidades, error: errUnidades } = await supabaseClient
      .from('unidades')
      .select('*')
      .order('orden');

    if (errUnidades) throw errUnidades;
    if (!unidades) return null;

    const { data: semanas, error: errSemanas } = await supabaseClient
      .from('semanas')
      .select('*')
      .order('orden');

    if (errSemanas) throw errSemanas;

    const { data: archivos, error: errArchivos } = await supabaseClient
      .from('archivos')
      .select('*');

    if (errArchivos) throw errArchivos;

    const { data: podcasts, error: errPodcasts } = await supabaseClient
      .from('podcasts')
      .select('*');

    if (errPodcasts) throw errPodcasts;

    // Armar la estructura del state
    const semanasMap = {};
    (semanas || []).forEach(s => {
      const sem = {
        id: s.id,
        nombre: s.nombre,
        desc: s.descripcion,
        archivos: [],
        podcast: null
      };

      // Vincular archivos
      (archivos || []).filter(a => a.semana_id === s.id).forEach(a => {
        sem.archivos.push({
          id: a.id,
          nombre: a.nombre,
          tamaño: a.tamaño,
          tipo: a.tipo,
          url: a.url
        });
      });

      // Vincular podcast
      const pod = (podcasts || []).find(p => p.semana_id === s.id);
      if (pod) {
        sem.podcast = {
          url: pod.url,
          nombre: pod.nombre,
          tipo: pod.tipo
        };
      }

      semanasMap[s.id] = sem;
    });

    const result = {
      unidades: (unidades || []).map(u => ({
        id: u.id,
        nombre: u.nombre,
        descripcion: u.descripcion,
        icon: u.icono,
        semanas: (semanas || [])
          .filter(s => s.unidad_id === u.id)
          .map(s => semanasMap[s.id])
      }))
    };

    return result;
  } catch (e) {
    console.error('[Supabase] Error cargando datos:', e.message);
    return null;
  }
}

// Actualizar una unidad
export async function updateUnidad(ui, field, val) {
  if (!isReady || !supabaseClient) return false;
  const id = getUnitId(ui);
  if (!id) return false;

  const dbField = field === 'icon' ? 'icono' : field;
  try {
    const { error } = await supabaseClient
      .from('unidades')
      .update({ [dbField]: val })
      .eq('id', id);
    return !error;
  } catch (e) {
    console.error('[Supabase] Error actualizando unidad:', e.message);
    return false;
  }
}

// Actualizar una semana
export async function updateSemana(ui, si, field, val) {
  if (!isReady || !supabaseClient) return false;
  const id = getWeekId(ui, si);
  if (!id) return false;

  const dbField = field === 'desc' ? 'descripcion' : field;
  try {
    const { error } = await supabaseClient
      .from('semanas')
      .update({ [dbField]: val })
      .eq('id', id);
    return !error;
  } catch (e) {
    console.error('[Supabase] Error actualizando semana:', e.message);
    return false;
  }
}

// Agregar archivo
export async function addArchivo(semanaId, entry) {
  if (!isReady || !supabaseClient) return false;

  try {
    const { error } = await supabaseClient
      .from('archivos')
      .insert([{
        id: entry.id,
        semana_id: semanaId,
        nombre: entry.nombre,
        tamaño: entry.tamaño,
        tipo: entry.tipo,
        url: entry.url,
        storage_path: entry.storage_path || ''
      }]);
    return !error;
  } catch (e) {
    console.error('[Supabase] Error agregando archivo:', e.message);
    return false;
  }
}

// Eliminar archivo
export async function deleteArchivo(fid) {
  if (!isReady || !supabaseClient) return false;

  try {
    // Buscar el archivo para obtener storage_path
    const { data: fileData, error: findError } = await supabaseClient
      .from('archivos')
      .select('storage_path')
      .eq('id', fid)
      .single();

    if (!findError && fileData?.storage_path) {
      await supabaseClient.storage
        .from('archivos')
        .remove([fileData.storage_path]);
    }

    const { error } = await supabaseClient
      .from('archivos')
      .delete()
      .eq('id', fid);
    return !error;
  } catch (e) {
    console.error('[Supabase] Error eliminando archivo:', e.message);
    return false;
  }
}

// Guardar podcast
export async function savePodcast(semanaId, podcast) {
  if (!isReady || !supabaseClient) return false;

  try {
    const { data: existing } = await supabaseClient
      .from('podcasts')
      .select('id')
      .eq('semana_id', semanaId)
      .single();

    if (existing) {
      const { error } = await supabaseClient
        .from('podcasts')
        .update({
          url: podcast.url,
          nombre: podcast.nombre,
          tipo: podcast.tipo
        })
        .eq('semana_id', semanaId);
      return !error;
    } else {
      const { error } = await supabaseClient
        .from('podcasts')
        .insert([{
          semana_id: semanaId,
          url: podcast.url,
          nombre: podcast.nombre,
          tipo: podcast.tipo
        }]);
      return !error;
    }
  } catch (e) {
    console.error('[Supabase] Error guardando podcast:', e.message);
    return false;
  }
}

// Eliminar podcast
export async function removePodcast(semanaId) {
  if (!isReady || !supabaseClient) return false;

  try {
    const { error } = await supabaseClient
      .from('podcasts')
      .delete()
      .eq('semana_id', semanaId);
    return !error;
  } catch (e) {
    console.error('[Supabase] Error eliminando podcast:', e.message);
    return false;
  }
}

// Subir archivo a Storage
export async function uploadFileToStorage(file, semanaId, onProgress) {
  if (!isReady || !supabaseClient) return null;

  const bucketName = 'archivos';
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${semanaId}/${timestamp}_${sanitizedName}`;

  try {
    const options = {
      cacheControl: '3600',
      upsert: false
    };
    if (typeof onProgress === 'function') {
      options.onUploadProgress = onProgress;
    }
    const { error: uploadError, data } = await supabaseClient.storage
      .from(bucketName)
      .upload(filePath, file, options);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      url: publicUrlData.publicUrl,
      storage_path: filePath
    };
  } catch (e) {
    console.error('[Supabase] Error subiendo archivo:', e.message);
    return null;
  }
}

// Subir podcast a Storage
export async function uploadPodcastToStorage(file, semanaId) {
  return uploadFileToStorage(file, `podcast_${semanaId}`);
}

// Eliminar archivo de Storage
export async function deleteFileFromStorage(storagePath) {
  if (!isReady || !supabaseClient || !storagePath) return false;

  try {
    const { error } = await supabaseClient.storage
      .from('archivos')
      .remove([storagePath]);
    return !error;
  } catch (e) {
    console.error('[Supabase] Error eliminando archivo de storage:', e.message);
    return false;
  }
}

// =============================================
// SINCRONIZACIÓN COMPLETA DEL ESTADO
// =============================================

// Sincroniza los metadatos (unidades y semanas) a Supabase.
// Se llama desde saveData() en app.js.
export async function syncState(state) {
  if (!isReady || !supabaseClient) {
    console.warn('[Supabase] No conectado, no se puede sincronizar');
    return;
  }

  try {
    // 1. Sincronizar unidades
    for (const [i, u] of (state.unidades || []).entries()) {
      const { error: errU } = await supabaseClient
        .from('unidades')
        .upsert({
          id: u.id,
          orden: i,
          nombre: u.nombre,
          descripcion: u.descripcion || '',
          icono: u.icon || 'fa-database'
        }, { onConflict: 'id' });
      if (errU) console.warn('[Supabase] Error upsert unidad:', errU.message);

      // 2. Sincronizar semanas de esta unidad
      for (const [j, s] of (u.semanas || []).entries()) {
        const { error: errS } = await supabaseClient
          .from('semanas')
          .upsert({
            id: s.id,
            unidad_id: u.id,
            orden: j,
            nombre: s.nombre,
            descripcion: s.descripcion || s.desc || ''
          }, { onConflict: 'id' });
        if (errS) console.warn('[Supabase] Error upsert semana:', errS.message);

        // 3. Sincronizar archivos de esta semana
        if (s.archivos && s.archivos.length > 0) {
          for (const a of s.archivos) {
            const { error: errA } = await supabaseClient
              .from('archivos')
              .upsert({
                id: a.id,
                semana_id: s.id,
                nombre: a.nombre,
                tamaño: a.tamaño || '',
                tipo: a.tipo || 'file',
                url: a.url || '',
                storage_path: a.storage_path || ''
              }, { onConflict: 'id' });
            if (errA) console.warn('[Supabase] Error upsert archivo:', errA.message);
          }
        }

        // 4. Sincronizar podcast de esta semana
        if (s.podcast) {
          const { data: existingPod } = await supabaseClient
            .from('podcasts')
            .select('id')
            .eq('semana_id', s.id)
            .single();

          if (existingPod) {
            await supabaseClient
              .from('podcasts')
              .update({
                url: s.podcast.url || '',
                nombre: s.podcast.nombre || 'Podcast',
                tipo: s.podcast.tipo || 'url',
                storage_path: s.podcast.storage_path || ''
              })
              .eq('semana_id', s.id);
          } else {
            await supabaseClient
              .from('podcasts')
              .insert([{
                semana_id: s.id,
                url: s.podcast.url || '',
                nombre: s.podcast.nombre || 'Podcast',
                tipo: s.podcast.tipo || 'url',
                storage_path: s.podcast.storage_path || ''
              }]);
          }
        }
      }
    }
  } catch (e) {
    console.error('[Supabase] Error en syncState:', e.message);
  }
}

// =============================================
// HELPERS
// =============================================

let cachedState = null;

export function setCachedState(state) {
  cachedState = state;
}

function getUnitId(ui) {
  if (!cachedState) return null;
  const unit = cachedState.unidades[ui];
  return unit ? unit.id : null;
}

function getWeekId(ui, si) {
  if (!cachedState) return null;
  const unit = cachedState.unidades[ui];
  if (!unit) return null;
  const week = unit.semanas[si];
  return week ? week.id : null;
}
