-- =====================================================
-- ESQUEMA PARA REPOSITORIO BD-II (Supabase)
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. TABLA UNIDADES
CREATE TABLE IF NOT EXISTS unidades (
  id TEXT PRIMARY KEY,
  orden INTEGER NOT NULL DEFAULT 0,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  icono TEXT DEFAULT 'fa-database',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA SEMANAS
CREATE TABLE IF NOT EXISTS semanas (
  id TEXT PRIMARY KEY,
  unidad_id TEXT NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA ARCHIVOS
CREATE TABLE IF NOT EXISTS archivos (
  id TEXT PRIMARY KEY,
  semana_id TEXT NOT NULL REFERENCES semanas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tamaño TEXT DEFAULT '',
  tipo TEXT DEFAULT 'file',
  url TEXT DEFAULT '',
  storage_path TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA PODCASTS
CREATE TABLE IF NOT EXISTS podcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_id TEXT NOT NULL UNIQUE REFERENCES semanas(id) ON DELETE CASCADE,
  url TEXT NOT NULL DEFAULT '',
  nombre TEXT DEFAULT 'Podcast',
  tipo TEXT DEFAULT 'url',
  storage_path TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BUCKET DE STORAGE PARA ARCHIVOS
-- Ejecutar en Storage > Create bucket > "archivos" (público)
-- o con SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('archivos', 'archivos', true);

-- 6. POLÍTICAS RLS (Row Level Security)
-- Habilitar RLS en cada tabla
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE semanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;

-- Permitir lectura anónima (pública)
CREATE POLICY "Lectura pública unidades" ON unidades FOR SELECT USING (true);
CREATE POLICY "Lectura pública semanas" ON semanas FOR SELECT USING (true);
CREATE POLICY "Lectura pública archivos" ON archivos FOR SELECT USING (true);
CREATE POLICY "Lectura pública podcasts" ON podcasts FOR SELECT USING (true);

-- Permitir escritura solo con clave (admin) - usando una columna de autenticación
-- O simplemente abrir escritura si es admin:
CREATE POLICY "Escritura pública unidades" ON unidades FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización pública unidades" ON unidades FOR UPDATE USING (true);
CREATE POLICY "Eliminación pública unidades" ON unidades FOR DELETE USING (true);

CREATE POLICY "Escritura pública semanas" ON semanas FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización pública semanas" ON semanas FOR UPDATE USING (true);
CREATE POLICY "Eliminación pública semanas" ON semanas FOR DELETE USING (true);

CREATE POLICY "Escritura pública archivos" ON archivos FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización pública archivos" ON archivos FOR UPDATE USING (true);
CREATE POLICY "Eliminación pública archivos" ON archivos FOR DELETE USING (true);

CREATE POLICY "Escritura pública podcasts" ON podcasts FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización pública podcasts" ON podcasts FOR UPDATE USING (true);
CREATE POLICY "Eliminación pública podcasts" ON podcasts FOR DELETE USING (true);

-- 7. FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_unidades BEFORE UPDATE ON unidades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_semanas BEFORE UPDATE ON semanas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_podcasts BEFORE UPDATE ON podcasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. POLÍTICAS PARA STORAGE
-- Permitir lectura pública de archivos
CREATE POLICY "Lectura pública storage" ON storage.objects FOR SELECT USING (bucket_id = 'archivos');
-- Permitir subida pública (para admin)
CREATE POLICY "Escritura pública storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'archivos');
CREATE POLICY "Eliminación pública storage" ON storage.objects FOR DELETE USING (bucket_id = 'archivos');
