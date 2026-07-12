// =============================================
// CONFIGURACIÓN DE SUPABASE
// =============================================
// 1. Crea un proyecto gratuito en https://supabase.com
// 2. Ve a Project Settings > API
// 3. Copia tu Project URL y Anon Key aquí
// 4. Ejecuta el script supabase/migration.sql en SQL Editor
// 5. (Opcional) Ejecuta supabase/seed.sql para datos iniciales

const SUPABASE_CONFIG = {
  url: 'https://llrkcgtvihdipbwdygku.supabase.co',       // Ej: 'https://tuproyecto.supabase.co'
  anonKey: 'sb_publishable_-qsFMgy9VUDkF770eNh7xA_de76fJDS'    // Ej: 'eyJhbGciOiJIUzI1NiIs...'
};

// Si está configurado, estará disponible globalmente
window.__SUPABASE_CONFIG = SUPABASE_CONFIG;

// La API key de HuggingFace ahora se maneja desde la Edge Function de Supabase
// (supabase/functions/chat/index.ts), configurada como variable de entorno HF_TOKEN
