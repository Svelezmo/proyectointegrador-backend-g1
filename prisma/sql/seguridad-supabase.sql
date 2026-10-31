-- ════════════════════════════════════════════════════════════════
-- Seguridad de UP News en Supabase
-- Ejecutar en Supabase → SQL Editor DESPUÉS de `npm run db:migrate`
-- (y de nuevo cada vez que una migración cree tablas nuevas).
--
-- Por qué: Supabase expone el esquema `public` a cualquiera que tenga la
-- SUPABASE_ANON_KEY (que va en el frontend). Sin RLS, esa llave podría leer
-- y ESCRIBIR todas las tablas. El backend usa el usuario `postgres`, que
-- ignora RLS, así que activarlo no afecta a Prisma.
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Activar RLS en todas las tablas del esquema public (sin políticas = nadie entra con anon).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- 2. Quitar cualquier permiso de escritura a los roles públicos de Supabase.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 3. Única excepción: el frontend puede LEER publicaciones ya publicadas (para Realtime).
DROP POLICY IF EXISTS "web lee publicaciones publicadas" ON public.publicacion;
CREATE POLICY "web lee publicaciones publicadas"
  ON public.publicacion FOR SELECT
  TO anon
  USING (estado = 'publicada');

-- 4. Avisar en tiempo real al frontend cuando se inserta o actualiza una publicación.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'publicacion'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.publicacion;
  END IF;
END $$;

COMMIT;

-- Verificación: todas las filas deben mostrar rls = true
-- SELECT tablename, rowsecurity AS rls FROM pg_tables WHERE schemaname = 'public';
