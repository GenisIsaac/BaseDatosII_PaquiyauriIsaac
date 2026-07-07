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

// Llave de HuggingFace para el chatbot (https://huggingface.co/settings/tokens)
// Déjala vacía si no quieres usar el chatbot
window.__HF_KEY = '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';
