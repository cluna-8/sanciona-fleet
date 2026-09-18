CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- [RS-3] Eliminado el UPDATE que fijaba una contraseña en claro para una
-- cuenta personal concreta. Una migración versionada no debe tocar
-- credenciales de personas: el reseteo de contraseña se hace desde Supabase
-- Auth o por el flujo de recuperación de la app. Esta migración queda como
-- no-op; el contenido sensible se quitó antes de publicar el repositorio.