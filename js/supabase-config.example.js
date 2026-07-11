// =============================================
// CONFIGURACIÓN DE SUPABASE (EJEMPLO)
// =============================================
// 1. Crea un proyecto gratuito en https://supabase.com
// 2. Ve a Project Settings > API
// 3. Copia tu Project URL y Anon Key aquí
// 4. Ejecuta el script supabase/migration.sql en SQL Editor
// 5. (Opcional) Ejecuta supabase/seed.sql para datos iniciales
//
// Renombra este archivo a supabase-config.js
// y completa tus credenciales

const SUPABASE_CONFIG = {
  url: 'https://tuproyecto.supabase.co',   // Project URL
  anonKey: 'eyJhbGciOiJIUzI1NiIs...'       // Anon Key
};

window.__SUPABASE_CONFIG = SUPABASE_CONFIG;

// La API key de HuggingFace ahora va como secreto de la Edge Function de Supabase.
// Para configurarla (después de desplegar la función):
//   supabase secrets set HF_TOKEN=hf_tu_token_aqui
