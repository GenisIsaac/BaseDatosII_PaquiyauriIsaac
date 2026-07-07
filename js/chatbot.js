// =============================================
// BD2 BOT - Chatbot con Hugging Face API
// =============================================

const HF_API_KEY = window.__HF_KEY || '';
const HF_BASE_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
const FALLBACK_MODELS = [
  'meta-llama/Llama-4-Scout-17B-16E-Instruct',
  'meta-llama/Llama-3.2-1B-Instruct',
];

// ─── Dynamic state summary ──────────────────────────────
function getStateSummary() {
  const u = window.state?.unidades;
  if (!u || !u.length) return '\n\nCONTENIDO DEL REPOSITORIO: (sin datos cargados)';
  let s = '\n\nCONTENIDO ACTUAL DEL REPOSITORIO:\n';
  s += `Total de unidades: ${u.length}\n`;
  u.forEach((unidad, ui) => {
    s += `\nUnidad ${ui+1}: "${unidad.nombre}"`;
    if (unidad.descripcion) s += ` — ${unidad.descripcion}`;
    s += '\n';
    unidad.semanas.forEach((semana, si) => {
      s += `  Semana ${si+1}: "${semana.nombre}"`;
      const desc = semana.descripcion || semana.desc || '';
      if (desc) s += ` — ${desc}`;
      s += '\n';
      const archivos = semana.archivos || [];
      if (archivos.length) {
        s += `    Archivos (${archivos.length}):\n`;
        archivos.forEach(a => s += `      - ${a.nombre} (${a.tamaño || '?'})\n`);
      }
    });
  });
  return s;
}

function getSystemPrompt() {
  return `Eres "BD2 Bot", el asistente virtual del repositorio académico "Base de Datos II" de la Universidad Peruana Los Andes (UPLA).

DATOS DEL CREADOR:
- Creador: Paquiyauri Vivanco Genis Isaac
- Carnet: t01303c
- Universidad: Universidad Peruana Los Andes (UPLA)
- Carrera: Ingeniería de Sistemas
- Email: T01303c@ms.upla.edu.pe

REGLAS:
1. Responde SIEMPRE en español.
2. Mantén las respuestas CORTAS (2-4 líneas máximo). SOLO cuando pidan código o sintaxis SQL puedes extenderte.
3. Usa **negrita** para términos clave y \`código\` para SQL.
4. Si preguntan quién te creó, responde que fue Paquiyauri Vivanco Genis Isaac.
5. Si preguntan por el contenido del repositorio, usa la siguiente información actualizada.
6. Si preguntan por sintaxis SQL, responde SIEMPRE con código completo de SQL Server (T-SQL).
7. Si la pregunta no es sobre BD2 ni el repositorio, responde brevemente que solo ayudas con temas del curso.${getStateSummary()}

SINTAXIS SQL SERVER — debes responder con ejemplos COMPLETOS cuando te pregunten:

=== SELECT BÁSICO ===
\`\`\`sql
SELECT columna1, columna2
FROM nombre_tabla
WHERE condicion
ORDER BY columna ASC|DESC;
\`\`\`

=== SELECT CON JOIN ===
\`\`\`sql
SELECT t1.columna, t2.columna
FROM tabla1 t1
INNER JOIN tabla2 t2 ON t1.id = t2.fk
LEFT JOIN tabla3 t3 ON t1.id = t3.fk
WHERE condicion;
\`\`\`

=== INSERT ===
\`\`\`sql
INSERT INTO tabla (col1, col2, col3)
VALUES (valor1, valor2, valor3);
-- Insertar múltiples filas:
INSERT INTO tabla (col1, col2)
VALUES (v1, v2), (v3, v4), (v5, v6);
-- Insertar desde SELECT:
INSERT INTO destino (col1, col2)
SELECT col1, col2 FROM origen WHERE condicion;
\`\`\`

=== UPDATE ===
\`\`\`sql
UPDATE tabla
SET columna1 = valor1, columna2 = valor2
WHERE condicion;
-- UPDATE con JOIN:
UPDATE t1
SET t1.columna = t2.columna
FROM tabla1 t1
INNER JOIN tabla2 t2 ON t1.id = t2.fk
WHERE t2.condicion;
\`\`\`

=== DELETE ===
\`\`\`sql
DELETE FROM tabla WHERE condicion;
-- DELETE con JOIN:
DELETE t1
FROM tabla1 t1
INNER JOIN tabla2 t2 ON t1.id = t2.fk
WHERE t2.condicion;
\`\`\`

=== CREATE TABLE ===
\`\`\`sql
CREATE TABLE nombre_tabla (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    activo BIT DEFAULT 1,
    CONSTRAINT FK_tabla_rel FOREIGN KEY (id_rel) REFERENCES otra_tabla(id)
);
\`\`\`

=== ALTER TABLE ===
\`\`\`sql
ALTER TABLE tabla ADD columna VARCHAR(50);
ALTER TABLE tabla ALTER COLUMN columna INT NOT NULL;
ALTER TABLE tabla DROP COLUMN columna;
ALTER TABLE tabla ADD CONSTRAINT PK_nombre PRIMARY KEY (columna);
ALTER TABLE tabla ADD CONSTRAINT FK_nombre FOREIGN KEY (col) REFERENCES otra(id);
\`\`\`

=== ÍNDICES ===
\`\`\`sql
CREATE INDEX IX_nombre ON tabla (columna);
CREATE UNIQUE INDEX IX_unico ON tabla (columna);
CREATE CLUSTERED INDEX IX_clust ON tabla (columna);
DROP INDEX IX_nombre ON tabla;
\`\`\`

=== VISTAS ===
\`\`\`sql
CREATE VIEW nombre_vista AS
SELECT t1.col1, t2.col2
FROM tabla1 t1
INNER JOIN tabla2 t2 ON t1.id = t2.fk;
-- Consultar vista:
SELECT * FROM nombre_vista WHERE condicion;
\`\`\`

=== STORED PROCEDURE ===
\`\`\`sql
CREATE PROCEDURE usp_Nombre
    @param1 INT,
    @param2 VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM tabla WHERE id = @param1;
    IF @param2 IS NOT NULL
        SELECT * FROM otra WHERE nombre = @param2;
END;
-- Ejecutar:
EXEC usp_Nombre @param1 = 1, @param2 = 'valor';
\`\`\`

=== FUNCIÓN ESCALAR ===
\`\`\`sql
CREATE FUNCTION fn_Nombre (@param INT)
RETURNS VARCHAR(100)
AS
BEGIN
    DECLARE @resultado VARCHAR(100);
    SELECT @resultado = nombre FROM tabla WHERE id = @param;
    RETURN @resultado;
END;
-- Usar:
SELECT dbo.fn_Nombre(1);
\`\`\`

=== FUNCIÓN TABLE-VALUED ===
\`\`\`sql
CREATE FUNCTION fn_Tabla (@param INT)
RETURNS TABLE
AS
RETURN (
    SELECT * FROM tabla WHERE id_rel = @param
);
-- Usar:
SELECT * FROM dbo.fn_Tabla(1);
\`\`\`

=== TRIGGER ===
\`\`\`sql
CREATE TRIGGER trg_Nombre
ON nombre_tabla
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    -- inserted / deleted tablas virtuales
    INSERT INTO auditoria (tabla, accion, fecha)
    SELECT 'nombre_tabla',
           CASE WHEN EXISTS(SELECT 1 FROM inserted) AND EXISTS(SELECT 1 FROM deleted) THEN 'UPDATE'
                WHEN EXISTS(SELECT 1 FROM inserted) THEN 'INSERT'
                ELSE 'DELETE' END,
           GETDATE();
END;
\`\`\`

=== TRANSACCIONES ===
\`\`\`sql
BEGIN TRANSACTION;
BEGIN TRY
    UPDATE cuenta SET saldo = saldo - 100 WHERE id = 1;
    UPDATE cuenta SET saldo = saldo + 100 WHERE id = 2;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    SELECT ERROR_MESSAGE() AS ErrorMsg;
END CATCH;
\`\`\`

=== CTE (Common Table Expression) ===
\`\`\`sql
WITH CTE_Nombre AS (
    SELECT id, nombre, padre_id
    FROM jerarquia
    WHERE padre_id IS NULL
    UNION ALL
    SELECT j.id, j.nombre, j.padre_id
    FROM jerarquia j
    INNER JOIN CTE_Nombre c ON j.padre_id = c.id
)
SELECT * FROM CTE_Nombre;
\`\`\`

=== WINDOW FUNCTIONS ===
\`\`\`sql
SELECT nombre, departamento, salario,
       ROW_NUMBER() OVER (PARTITION BY departamento ORDER BY salario DESC) AS fila,
       RANK() OVER (PARTITION BY departamento ORDER BY salario DESC) AS ranking,
       DENSE_RANK() OVER (PARTITION BY departamento ORDER BY salario DESC) AS dense_ranking,
       NTILE(4) OVER (ORDER BY salario DESC) AS cuartil,
       LAG(salario) OVER (ORDER BY id) AS salario_anterior,
       LEAD(salario) OVER (ORDER BY id) AS salario_siguiente,
       SUM(salario) OVER (PARTITION BY departamento) AS total_departamento,
       AVG(salario) OVER (PARTITION BY departamento) AS promedio_departamento
FROM empleados;
\`\`\`

=== GROUP BY / HAVING ===
\`\`\`sql
SELECT departamento, COUNT(*) AS total, AVG(salario) AS promedio, SUM(salario) AS suma
FROM empleados
WHERE activo = 1
GROUP BY departamento
HAVING COUNT(*) > 5
ORDER BY total DESC;
\`\`\`

=== SUBCONSULTAS ===
\`\`\`sql
-- En WHERE:
SELECT * FROM empleados WHERE salario > (SELECT AVG(salario) FROM empleados);
-- En FROM:
SELECT dep, promedio FROM (SELECT departamento AS dep, AVG(salario) AS promedio FROM empleados GROUP BY departamento) AS sub;
-- En SELECT:
SELECT nombre, (SELECT MAX(salario) FROM empleados) AS max_salario FROM empleados;
-- EXISTS:
SELECT * FROM departamentos d WHERE EXISTS (SELECT 1 FROM empleados e WHERE e.dep_id = d.id);
\`\`\`

=== PIVOT ===
\`\`\`sql
SELECT * FROM (
    SELECT departamento, vendedor, monto FROM ventas
) AS fuente
PIVOT (
    SUM(monto) FOR departamento IN ([Ventas], [Marketing], [IT])
) AS pivote;
\`\`\`

=== MERGE (UPSERT) ===
\`\`\`sql
MERGE destino AS d
USING origen AS o ON d.id = o.id
WHEN MATCHED THEN UPDATE SET d.nombre = o.nombre, d.monto = o.monto
WHEN NOT MATCHED THEN INSERT (id, nombre, monto) VALUES (o.id, o.nombre, o.monto)
WHEN NOT MATCHED BY SOURCE THEN DELETE;
\`\`\`

=== TEMPORAL TABLES ===
\`\`\`sql
CREATE TABLE historico_empleados (
    id INT PRIMARY KEY,
    nombre VARCHAR(100),
    salario DECIMAL(10,2),
    valido_desde DATETIME2 GENERATED ALWAYS AS ROW START NOT NULL,
    valido_hasta DATETIME2 GENERATED ALWAYS AS ROW END NOT NULL,
    PERIOD FOR SYSTEM_TIME (valido_desde, valido_hasta)
) WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.empleados_historial));
-- Consultar datos históricos:
SELECT * FROM historico_empleados FOR SYSTEM_TIME ALL WHERE id = 1;
SELECT * FROM historico_empleados FOR SYSTEM_TIME BETWEEN '2024-01-01' AND '2024-12-31';
\`\`\`

=== ERROR HANDLING ===
\`\`\`sql
BEGIN TRY
    -- código que puede fallar
    SELECT 1/0;
END TRY
BEGIN CATCH
    SELECT
        ERROR_NUMBER() AS ErrorNumero,
        ERROR_MESSAGE() AS Mensaje,
        ERROR_SEVERITY() AS Severidad,
        ERROR_STATE() AS Estado,
        ERROR_LINE() AS Linea,
        ERROR_PROCEDURE() AS Procedimiento;
END CATCH;
\`\`\`

=== DINÁMICO ===
\`\`\`sql
DECLARE @sql NVARCHAR(MAX);
DECLARE @tabla NVARCHAR(100) = 'empleados';
SET @sql = N'SELECT * FROM ' + QUOTENAME(@tabla) + ' WHERE activo = 1';
EXEC sp_executesql @sql;
\`\`\`

=== NORMALIZACIÓN ===
- 1FN: Atributos atómicos, sin grupos repetitivos.
- 2FN: Cumple 1FN y todo atributo no clave depende de la clave completa.
- 3FN: Cumple 2FN y no hay dependencias transitivas.
- BCNF: Cumple 3FN y toda dependencia funcional X→Y, X es superclave.`;
}

function markdownToHtml(text) {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="chat-code"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

export function toggleChat() {
  const modal = document.getElementById('chatModal');
  if (!modal) return;
  const open = modal.classList.contains('show');
  modal.classList.toggle('show');
  document.getElementById('chatFab')?.classList.toggle('open');
  const canvas = document.getElementById('splineCanvas');
  const close = document.getElementById('chatFabClose');
  if (canvas && close) {
    canvas.style.display = open ? 'block' : 'none';
    close.style.display = open ? 'none' : 'block';
  }
  if (!open) {
    document.getElementById('chatInput')?.focus();
  }
}

export async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const msg = input?.value.trim();
  if (!msg) return;

  input.value = '';
  addMessage(msg, 'user');
  showTyping();

  try {
    const reply = await queryHF(msg);
    hideTyping();
    addMessage(reply, 'bot');
  } catch (e) {
    hideTyping();
    const fallback = getLocalReply(msg);
    addMessage(fallback, 'bot');
  }
}

function addMessage(text, role) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (role === 'user' ? 'chat-user' : 'chat-bot');
  if (role === 'bot') {
    div.innerHTML = markdownToHtml(text);
  } else {
    div.textContent = text;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'chat-msg chat-bot chat-typing';
  div.id = 'chatTyping';
  div.textContent = '...';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('chatTyping');
  if (el) el.remove();
}

async function queryHF(message) {
  if (!HF_API_KEY) throw new Error('No hay llave de HuggingFace configurada en supabase-config.js');
  const modelsToTry = [HF_MODEL, ...FALLBACK_MODELS];
  let lastError = '';

  for (const model of modelsToTry) {
    try {
      const res = await fetch(HF_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + HF_API_KEY,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: message },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        if (res.status === 401) break;
        continue;
      }

      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  throw new Error(lastError || 'No disponible');
}

function getLocalReply(message) {
  const m = message.toLowerCase();
  const u = window.state?.unidades;

  // ── Creador / dueño ──
  if (/quien.*creo|quien.*hizo|dueño|autor|creador|genis|paquiyauri/i.test(m))
    return 'Esta página fue creada por **Paquiyauri Vivanco Genis Isaac** (carnet: **t01303c**), estudiante de **Ingeniería de Sistemas** en la **Universidad Peruana Los Andes (UPLA)**. ✉️ T01303c@ms.upla.edu.pe';

  // ── Universidad / carrera ──
  if (/universidad|upla|que estudias|donde estudias|carrera|ingenieria/i.test(m))
    return 'Estudio en la **Universidad Peruana Los Andes (UPLA)** la carrera de **Ingeniería de Sistemas**. Mi carnet es **t01303c**.';

  // ── Qué es la página ──
  if (/que es|de que trata|que es esto|esta pagina|repositorio/i.test(m))
    return 'Este es el **Repositorio Digital de Base de Datos II** de la UPLA. Contiene unidades, semanas, recursos descargables, podcasts, infografías, guías en PDF y ejemplos de código SQL del curso.';

  // ── Unidades (dinámico) ──
  if (/unidades?|cuantas unidades|que unidades/i.test(m)) {
    if (!u || !u.length) return 'No hay unidades cargadas actualmente en el repositorio.';
    let r = `El curso tiene **${u.length} unidad${u.length !== 1 ? 'es' : ''}**:\n`;
    u.forEach((un, i) => {
      r += `**U${i+1}.** ${un.nombre}`;
      if (un.descripcion) r += ` — ${un.descripcion}`;
      r += '\n';
    });
    return r;
  }

  // ── Tema específico de unidad ──
  const unitMatch = m.match(/unidad\s*(\d+)/i);
  if (unitMatch && u && u.length) {
    const ui = parseInt(unitMatch[1]) - 1;
    if (u[ui]) {
      const un = u[ui];
      let r = `**${un.nombre}**`;
      if (un.descripcion) r += `: ${un.descripcion}`;
      r += ` (${un.semanas.length} semana${un.semanas.length !== 1 ? 's' : ''})`;
      un.semanas.forEach((s, si) => {
        r += `\n  **S${si+1}.** ${s.nombre}`;
        const desc = s.descripcion || s.desc || '';
        if (desc) r += ` — ${desc}`;
      });
      return r;
    }
  }

  // ── Semanas ──
  if (/semanas?|cuantas semanas/i.test(m)) {
    if (!u || !u.length) return 'No hay datos de semanas cargados.';
    let total = 0;
    u.forEach(un => total += un.semanas.length);
    let r = `El curso tiene **${total} semanas** en total:\n`;
    u.forEach((un, ui) => r += `  U${ui+1} (${un.semanas.length} sem): ${un.nombre}\n`);
    return r;
  }

  // ── Archivos / recursos (dinámico) ──
  if (/archivos?|recursos?|cuantos archivos|pdf|documentos?|descargar/i.test(m)) {
    if (!u || !u.length) return 'No hay datos de archivos cargados actualmente.';
    let total = 0;
    const lines = [];
    u.forEach((un, ui) => {
      un.semanas.forEach((s, si) => {
        const archs = s.archivos || [];
        if (archs.length) {
          total += archs.length;
          lines.push(`  S${si+1} (${un.nombre}): ${archs.length} archivo${archs.length !== 1 ? 's' : ''}`);
          archs.forEach(a => lines.push(`    • ${a.nombre}`));
        }
      });
    });
    if (!total) return 'Actualmente no hay archivos subidos en el repositorio.';
    return `Hay **${total} archivos** en total:\n` + lines.join('\n');
  }

  // ── Archivos por semana específica ──
  if (/archivos.*semana|semana.*archivos|que archivos/i.test(m) && u) {
    const weekMatch = m.match(/semana\s*(\d+)/i);
    let r = '';
    u.forEach((un, ui) => {
      un.semanas.forEach((s, si) => {
        const wi = weekMatch ? parseInt(weekMatch[1]) : -1;
        if (wi === -1 || si + 1 === wi) {
          const archs = s.archivos || [];
          if (archs.length) {
            r += `**Semana ${si+1}** (${un.nombre}):\n`;
            archs.forEach(a => r += `  • ${a.nombre} (${a.tamaño || '?'})\n`);
          }
        }
      });
    });
    if (r) return r;
    return 'No encontré archivos para esa semana.';
  }

  // ── Temas de semanas ──
  if (/temas?|contenido|que.*enseña|que.*ve|que.*da|silabo/i.test(m)) {
    if (!u || !u.length) return 'No hay datos del curso cargados.';
    let r = '**Contenido del curso por semana:**\n';
    u.forEach((un, ui) => {
      un.semanas.forEach((s, si) => {
        r += `\n**U${ui+1} - S${si+1}:** ${s.nombre}`;
        if (s.desc) r += `\n  ${s.desc}`;
      });
    });
    return r;
  }

  // ── Podcast ──
  if (/podcast|audio|escuchar/i.test(m))
    return 'Los podcasts del curso se pueden escuchar desde cada semana en la página. Algunas semanas tienen un reproductor de vinilo integrado.';

  // ── SQL / código ──
  if (/select|from|where|join|insert|update|delete|create|alter|sql|consulta|sintaxis/i.test(m)) {
    if (/join/i.test(m)) {
      return '**JOIN en SQL Server:**\n```sql\nSELECT t1.col, t2.col\nFROM Tabla1 t1\nINNER JOIN Tabla2 t2 ON t1.id = t2.fk\nLEFT JOIN Tabla3 t3 ON t1.id = t3.fk\nWHERE condicion\nORDER BY t1.col;\n```\nTipos: `INNER`, `LEFT`, `RIGHT`, `FULL`, `CROSS JOIN`.';
    }
    if (/insert/i.test(m)) {
      return '**INSERT en SQL Server:**\n```sql\n-- Simple\nINSERT INTO tabla (col1, col2) VALUES (v1, v2);\n-- Múltiple\nINSERT INTO tabla (col1) VALUES (v1), (v2), (v3);\n-- Desde SELECT\nINSERT INTO destino (col1, col2) SELECT col1, col2 FROM origen WHERE condicion;\n```';
    }
    if (/update/i.test(m)) {
      return '**UPDATE en SQL Server:**\n```sql\nUPDATE tabla SET columna = valor WHERE condicion;\n-- Con JOIN\nUPDATE t1 SET t1.col = t2.col\nFROM tabla1 t1\nINNER JOIN tabla2 t2 ON t1.id = t2.fk\nWHERE t2.condicion;\n```';
    }
    if (/delete/i.test(m)) {
      return '**DELETE en SQL Server:**\n```sql\nDELETE FROM tabla WHERE condicion;\n-- Con JOIN\nDELETE t1 FROM tabla1 t1 INNER JOIN tabla2 t2 ON t1.id = t2.fk WHERE t2.condicion;\n```';
    }
    if (/create.*table|crear.*tabla/i.test(m)) {
      return '**CREATE TABLE en SQL Server:**\n```sql\nCREATE TABLE ejemplo (\n    id INT IDENTITY(1,1) PRIMARY KEY,\n    nombre VARCHAR(100) NOT NULL,\n    email VARCHAR(150) UNIQUE,\n    fecha DATETIME DEFAULT GETDATE(),\n    activo BIT DEFAULT 1,\n    CONSTRAINT FK_ejemplo FOREIGN KEY (id_rel) REFERENCES otra(id)\n);\n```';
    }
    if (/stored|procedimiento/i.test(m)) {
      return '**Stored Procedure en SQL Server:**\n```sql\nCREATE PROCEDURE usp_Ejemplo\n    @id INT,\n    @nombre VARCHAR(50) = NULL\nAS\nBEGIN\n    SET NOCOUNT ON;\n    SELECT * FROM tabla WHERE id = @id;\n    IF @nombre IS NOT NULL\n        SELECT * FROM otra WHERE nombre = @nombre;\nEND;\n-- Ejecutar:\nEXEC usp_Ejemplo @id = 1, @nombre = \'Juan\';\n```';
    }
    if (/trigger/i.test(m)) {
      return '**Trigger en SQL Server:**\n```sql\nCREATE TRIGGER trg_Auditoria\nON tabla\nAFTER INSERT, UPDATE, DELETE\nAS\nBEGIN\n    SET NOCOUNT ON;\n    INSERT INTO log (tabla, accion, fecha)\n    SELECT \'tabla\',\n        CASE WHEN EXISTS(SELECT 1 FROM inserted) AND EXISTS(SELECT 1 FROM deleted) THEN \'UPDATE\'\n             WHEN EXISTS(SELECT 1 FROM inserted) THEN \'INSERT\'\n             ELSE \'DELETE\' END,\n        GETDATE();\nEND;\n```';
    }
    if (/function|funcion/i.test(m)) {
      return '**Funciones en SQL Server:**\n```sql\n-- Escalar\nCREATE FUNCTION fn_Sumar(@a INT, @b INT) RETURNS INT\nAS BEGIN RETURN @a + @b; END;\n-- Table-Valued\nCREATE FUNCTION fn_Empleados(@dep INT) RETURNS TABLE\nAS RETURN (SELECT * FROM empleados WHERE departamento_id = @dep);\n```\nUso: `SELECT dbo.fn_Sumar(1,2)`, `SELECT * FROM dbo.fn_Empleados(1)`';
    }
    if (/view|vista/i.test(m)) {
      return '**CREATE VIEW en SQL Server:**\n```sql\nCREATE VIEW v_Empleados AS\nSELECT e.nombre, d.nombre AS departamento\nFROM empleados e\nINNER JOIN departamentos d ON e.dep_id = d.id;\n-- Consultar:\nSELECT * FROM v_Empleados WHERE departamento = \'IT\';\n```';
    }
    if (/cte|with.*as|recursivo/i.test(m)) {
      return '**CTE en SQL Server:**\n```sql\nWITH CTE_Recursivo AS (\n    SELECT id, nombre, padre_id, 1 AS nivel\n    FROM jerarquia WHERE padre_id IS NULL\n    UNION ALL\n    SELECT j.id, j.nombre, j.padre_id, c.nivel + 1\n    FROM jerarquia j INNER JOIN CTE_Recursivo c ON j.padre_id = c.id\n)\nSELECT * FROM CTE_Recursivo;\n```';
    }
    if (/window|over|partition|rank|row_number|lag|lead/i.test(m)) {
      return '**Window Functions en SQL Server:**\n```sql\nSELECT nombre, salario, departamento,\n    ROW_NUMBER() OVER (PARTITION BY dep ORDER BY salario DESC) AS fila,\n    RANK() OVER (PARTITION BY dep ORDER BY salario DESC) AS ranking,\n    DENSE_RANK() OVER (PARTITION BY dep ORDER BY salario DESC) AS dense,\n    LAG(salario, 1) OVER (ORDER BY id) AS anterior,\n    LEAD(salario, 1) OVER (ORDER BY id) AS siguiente,\n    SUM(salario) OVER (PARTITION BY dep) AS total_dep\nFROM empleados;\n```';
    }
    if (/group|having/i.test(m)) {
      return '**GROUP BY / HAVING en SQL Server:**\n```sql\nSELECT departamento, COUNT(*) AS total, AVG(salario) AS promedio\nFROM empleados\nWHERE activo = 1\nGROUP BY departamento\nHAVING COUNT(*) > 5\nORDER BY total DESC;\n```';
    }
    if (/subconsulta|subquery|exist|in.*select|not.*in/i.test(m)) {
      return '**Subconsultas en SQL Server:**\n```sql\n-- En WHERE:\nSELECT * FROM empleados WHERE salario > (SELECT AVG(salario) FROM empleados);\n-- En FROM:\nSELECT * FROM (SELECT dep, AVG(salario) AS prom FROM empleados GROUP BY dep) AS sub;\n-- EXISTS:\nSELECT * FROM dep d WHERE EXISTS (SELECT 1 FROM emp e WHERE e.dep_id = d.id);\n```';
    }
    if (/pivot|unpivot/i.test(m)) {
      return '**PIVOT en SQL Server:**\n```sql\nSELECT * FROM (\n    SELECT departamento, vendedor, monto FROM ventas\n) AS src\nPIVOT (\n    SUM(monto) FOR departamento IN ([Ventas], [IT], [Marketing])\n) AS piv;\n```';
    }
    if (/merge|upsert/i.test(m)) {
      return '**MERGE en SQL Server:**\n```sql\nMERGE destino AS d\nUSING origen AS o ON d.id = o.id\nWHEN MATCHED THEN UPDATE SET d.nombre = o.nombre\nWHEN NOT MATCHED THEN INSERT (id, nombre) VALUES (o.id, o.nombre)\nWHEN NOT MATCHED BY SOURCE THEN DELETE;\n```';
    }
    if (/transaccion|acid|commit|rollback|begin.*tran/i.test(m)) {
      return '**Transacciones en SQL Server:**\n```sql\nBEGIN TRANSACTION;\nBEGIN TRY\n    UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;\n    UPDATE cuentas SET saldo = saldo + 100 WHERE id = 2;\n    COMMIT TRANSACTION;\nEND TRY\nBEGIN CATCH\n    ROLLBACK TRANSACTION;\n    SELECT ERROR_MESSAGE() AS Error;\nEND CATCH;\n```\n**ACID:** Atomicidad, Consistencia, Aislamiento, Durabilidad.';
    }
    if (/normaliz|1fn|2fn|3fn|bcnf|forma normal/i.test(m)) {
      return '**Normalización en BD:**\n- **1FN:** Atributos atómicos, sin grupos repetitivos.\n- **2FN:** Cumple 1FN + todo atributo no clave depende de la clave COMPLETA.\n- **3FN:** Cumple 2FN + sin dependencias transitivas.\n- **BCNF:** Cumple 3FN + toda dependencia X→Y, X es superclave.';
    }
    if (/indice|index|rendimiento|opimi|performance|explain/i.test(m)) {
      return '**Índices en SQL Server:**\n```sql\nCREATE INDEX IX_nombre ON tabla (col1, col2);\nCREATE UNIQUE INDEX IX_unico ON tabla (columna);\nCREATE CLUSTERED INDEX IX_orden ON tabla (columna);\nDROP INDEX IX_nombre ON tabla;\n```\nUsa `INCLUDE (col)` para cubrir consultas. Revisa fragmentación con `sys.dm_db_index_physical_stats`.';
    }
    return '**Sintaxis SELECT básica en SQL Server:**\n```sql\nSELECT columna1, columna2\nFROM nombre_tabla\nWHERE condicion\nGROUP BY columna\nHAVING condicion_grupo\nORDER BY columna ASC|DESC\nOFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;\n```\n¿Quieres que te explique JOIN, INSERT, CREATE TABLE, stored procedures o algún otro tema en específico?';
  }

  // ── Normalización (también catch suelto) ──
  if (/normaliz|1fn|2fn|3fn|bcnf|forma normal/i.test(m))
    return '**Normalización:** 1FN elimina grupos repetitivos, 2FN elimina dependencias parciales, 3FN elimina dependencias transitivas, BCNF es más estricta que 3FN.';

  // ── Saludos ──
  if (/^(hola|hi|hey|buenas|saludos|que tal|buen[oa]s?)/i.test(m))
    return '¡Hola! Soy **BD2 Bot** 🤖 Pregúntame sobre SQL Server, normalización, el contenido del repositorio, o cualquier tema del curso Base de Datos II.';

  if (/gracias|thanks|ty|thx|agradec/i.test(m))
    return '¡De nada! Siempre que necesites ayuda con SQL Server o el curso, aquí estoy.';

  return 'Soy **BD2 Bot**, el asistente de Base de Datos II. Puedo ayudarte con:\n• **SQL Server** (sintaxis completa: SELECT, JOIN, procedures, triggers, functions, CTE, window functions, PIVOT, MERGE)\n• **Normalización** (1FN, 2FN, 3FN, BCNF)\n• **Transacciones y ACID**\n• **Índices y optimización**\n• **Contenido del repositorio** (unidades, semanas, archivos)\n• **Datos del creador** (Paquiyauri Vivanco Genis Isaac, UPLA)\n\n¿En qué puedo ayudarte?';
}

// Enter key to send
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.getElementById('chatModal')?.classList.contains('show')) {
      const input = document.getElementById('chatInput');
      if (document.activeElement === input) {
        e.preventDefault();
        sendChatMessage();
      }
    }
  });
});
