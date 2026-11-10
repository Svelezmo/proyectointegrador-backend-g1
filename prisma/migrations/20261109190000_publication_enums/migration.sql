CREATE TYPE "etiqueta_publicacion" AS ENUM ('Comunidad', 'Eventos', 'Salud', 'Consejos');
CREATE TYPE "proposito_publicacion" AS ENUM (
    'Informar a la comunidad',
    'Educar y compartir conocimientos',
    'Promover la salud y el bienestar',
    'Invitar a participar en actividades',
    'Sensibilizar sobre una causa',
    'Compartir recursos y conocimiento'
);

ALTER TABLE "publicacion"
ALTER COLUMN "etiqueta" TYPE "etiqueta_publicacion"
USING (
    CASE
        WHEN "etiqueta" IN ('Comunidad', 'Eventos', 'Salud', 'Consejos')
            THEN "etiqueta"::"etiqueta_publicacion"
        ELSE NULL
    END
);

ALTER TABLE "publicacion"
ALTER COLUMN "proposito" TYPE "proposito_publicacion"
USING (
    CASE
        WHEN "proposito" IN (
            'Informar a la comunidad',
            'Educar y compartir conocimientos',
            'Promover la salud y el bienestar',
            'Invitar a participar en actividades',
            'Sensibilizar sobre una causa',
            'Compartir recursos y conocimiento'
        ) THEN "proposito"::"proposito_publicacion"
        ELSE NULL
    END
);
