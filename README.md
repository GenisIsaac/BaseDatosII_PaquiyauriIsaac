# Repositorio Digital - Base de Datos II

Plataforma educativa estática para el curso de Base de Datos II de la Universidad Peruana Los Andes (UPLA).

## Despliegue en GitHub Pages

1. Sube este repositorio a GitHub
2. Ve a **Settings > Pages**
3. En **Source**, selecciona **Deploy from a branch**
4. Elige la rama `main` y la carpeta `/ (root)`
5. Guarda — en ~2 minutos el sitio estará en `https://<tu-usuario>.github.io/<repo>/`

## Configurar Supabase

1. Crea un proyecto gratuito en https://supabase.com
2. Ve a **SQL Editor** y ejecuta `supabase/migration.sql` (crea tablas + políticas)
3. (Opcional) Ejecuta `supabase/seed.sql` para cargar datos iniciales
4. Ve a **Storage** y crea un bucket público llamado `archivos`
5. Copia el archivo `js/supabase-config.example.js` como `js/supabase-config.js`
6. Completa las credenciales (Project URL + Anon Key) en `supabase-config.js`

### Chatbot con HuggingFace (opcional)

1. Crea un token en https://huggingface.co/settings/tokens
2. Pega el token en `window.__HF_KEY` dentro de `js/supabase-config.js`

## Estructura del Proyecto

```
├── index.html              # Página principal
├── js/
│   ├── app.js              # Lógica principal (estado, renderizado, administración)
│   ├── chatbot.js          # Chatbot con HuggingFace
│   ├── supabase.js         # Conexión y sincronización con Supabase
│   └── supabase-config.js  # Credenciales (no subir a GitHub)
├── css/
│   └── style.css           # Estilos
├── supabase/
│   ├── migration.sql       # Esquema de base de datos
│   └── seed.sql            # Datos iniciales
└── README.md
```

## Administración

Accede a `/admin` en la URL del sitio para gestionar:
- Contenido de unidades y semanas
- Subida de archivos (PDF, guías, imágenes)
- Podcasts por semana
