-- =====================================================
-- DATOS INICIALES DEL CURSO BD-II
-- =====================================================

-- Insertar unidades
INSERT INTO unidades (id, orden, nombre, descripcion, icono) VALUES
  ('u1', 1, 'Fundamentos Avanzados', 'Consultas SQL complejas, joins, subconsultas y funciones analíticas.', 'fa-database'),
  ('u2', 2, 'Optimización y Rendimiento', 'Índices, planes de ejecución y tuning de consultas.', 'fa-gauge-high'),
  ('u3', 3, 'Bases de Datos Distribuidas', 'Replicación, sharding y sistemas distribuidos.', 'fa-network-wired'),
  ('u4', 4, 'NoSQL y Big Data', 'MongoDB, Redis, Cassandra y ecosistema Big Data.', 'fa-brain')
ON CONFLICT (id) DO NOTHING;

-- Insertar semanas
INSERT INTO semanas (id, unidad_id, orden, nombre, descripcion) VALUES
  ('u1s1', 'u1', 1, 'Introducción y Repaso', 'Repaso de conceptos de BD-I y introducción al curso.'),
  ('u1s2', 'u1', 2, 'Consultas Multitabla', 'JOINs avanzados, uniones y combinaciones complejas.'),
  ('u1s3', 'u1', 3, 'Subconsultas', 'Subconsultas correlacionadas y no correlacionadas.'),
  ('u1s4', 'u1', 4, 'Funciones Analíticas', 'Window functions, CTEs y cláusulas avanzadas.'),
  ('u2s1', 'u2', 1, 'Índices y Estructuras', 'B-Tree, Hash, Bitmap y estrategias de indexación.'),
  ('u2s2', 'u2', 2, 'Planes de Ejecución', 'Análisis y lectura de planes de ejecución.'),
  ('u2s3', 'u2', 3, 'Tuning de Consultas', 'Optimización de queries pesadas y refactoring.'),
  ('u2s4', 'u2', 4, 'Transacciones', 'ACID, bloqueos, deadlocks y concurrencia.'),
  ('u3s1', 'u3', 1, 'Replicación', 'Master-slave, multi-master y replicación síncrona.'),
  ('u3s2', 'u3', 2, 'Sharding', 'Particionamiento horizontal y estrategias.'),
  ('u3s3', 'u3', 3, 'Consistencia Distribuida', 'Teorema CAP y modelos de consistencia.'),
  ('u3s4', 'u3', 4, 'Alta Disponibilidad', 'Clustering, failover y disaster recovery.'),
  ('u4s1', 'u4', 1, 'MongoDB', 'Documentos, agregaciones y modelado NoSQL.'),
  ('u4s2', 'u4', 2, 'Redis y Caché', 'Key-value stores, pub/sub y caching strategies.'),
  ('u4s3', 'u4', 3, 'Cassandra', 'Column-family stores y wide-column databases.'),
  ('u4s4', 'u4', 4, 'Big Data', 'Hadoop, Spark y ecosistema de procesamiento masivo.')
ON CONFLICT (id) DO NOTHING;
