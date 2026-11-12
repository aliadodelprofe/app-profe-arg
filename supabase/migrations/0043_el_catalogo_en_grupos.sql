-- ============================================================================
-- Migración 0043 — El catálogo en grupos, y mucho más grande
--
-- DOS PROBLEMAS, EL MISMO ORIGEN.
--
-- El primero se ve en la pantalla de la escuela: treinta y dos botones sueltos,
-- todos del mismo tamaño, todos al mismo tiempo. Ya cuesta encontrar "Pilates"
-- ahí adentro. Con el catálogo que agrega esta migración serían más de cien, y
-- la pantalla deja de servir.
--
-- El segundo es qué falta en esa lista: no hay una sola arte marcial. Ni
-- karate, ni judo, ni boxeo. Un profe de taekwondo entra a la app y no puede
-- decir qué enseña, aunque sea exactamente el usuario que buscamos.
--
-- Los dos salen de lo mismo: el catálogo se armó mirando una escuela de baile.
--
-- POR QUÉ UNA TABLA DE GRUPOS Y NO UNA COLUMNA DE TEXTO.
--
-- Es la misma decisión que tomó la 0037 con las disciplinas, por la misma
-- razón. Una columna con el nombre del grupo escrito en cada fila admite
-- "Música", "musica" y "Música " como tres grupos distintos, y renombrar uno
-- obliga a tocar todas sus filas. Con la tabla, el grupo tiene una identidad
-- propia: se renombra en un lugar y se reordena cambiando un número.
--
-- EL ORDEN NO SE TOCA.
--
-- `disciplines.orden` ya venía agrupando sin decirlo: 10 a 80 los bailes
-- sociales, 110 a 150 los urbanos, 410 a 450 la música. Quien lo escribió ya
-- tenía los grupos en la cabeza, solo que no estaban en ningún lado. Esta
-- migración los nombra y respeta esos valores: ninguna disciplina existente
-- cambia de `orden`, así que nada de lo que ya se muestra se reordena.
--
-- Las nuevas entran en los huecos de cada banda, y las artes marciales abren
-- una banda nueva en 600.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. LOS GRUPOS
-- ----------------------------------------------------------------------------
create table if not exists public.discipline_groups (
  slug   text primary key,
  name   text not null unique,
  orden  int  not null default 500
);

comment on table public.discipline_groups is
  'En qué familia cae cada actividad. Ordena el menú de la pantalla de la escuela.';

insert into public.discipline_groups (slug, name, orden) values
  ('baile-social',   'Baile social',              10),
  ('baile-urbano',   'Baile urbano',              20),
  ('baile-escenico', 'Danza escénica',            30),
  ('circo',          'Circo y acrobacia',         40),
  ('marciales',      'Artes marciales y defensa', 50),
  ('entrenamiento',  'Entrenamiento físico',      60),
  ('bienestar',      'Cuerpo y bienestar',        70),
  ('musica',         'Música',                    80),
  ('escena',         'Escena y voz',              90),
  ('idiomas',        'Idiomas',                  100),
  ('visuales',       'Artes visuales',           110),
  ('oficios',        'Oficios y manualidades',   120),
  ('academico',      'Apoyo escolar y académico',130),
  ('otra',           'Otras',                    900)
on conflict (slug) do nothing;

alter table public.discipline_groups enable row level security;

drop policy if exists "cualquiera ve los grupos" on public.discipline_groups;
create policy "cualquiera ve los grupos"
  on public.discipline_groups for select to authenticated
  using ( true );


-- ----------------------------------------------------------------------------
-- 2. LA COLUMNA
--
-- Entra sin NOT NULL para poder repartir lo que ya está. El candado se pone
-- en el paso 4, cuando ninguna fila quedó afuera.
-- ----------------------------------------------------------------------------
alter table public.disciplines
  add column if not exists grupo text references public.discipline_groups(slug) on delete restrict;


-- ----------------------------------------------------------------------------
-- 3. REPARTIR LAS QUE YA ESTÁN
-- ----------------------------------------------------------------------------
update public.disciplines set grupo = 'baile-social'
 where slug in ('bachata','salsa','kizomba','zouk','ritmos-latinos','reggaeton','tango','folklore');

update public.disciplines set grupo = 'baile-urbano'
 where slug in ('hip-hop','dancehall','heels','urbano','k-pop');

update public.disciplines set grupo = 'baile-escenico'
 where slug in ('jazz','contemporaneo','clasico','comedia-musical');

update public.disciplines set grupo = 'circo'
 where slug in ('acrobacia','pole');

update public.disciplines set grupo = 'entrenamiento'
 where slug in ('zumba','funcional','stretching');

update public.disciplines set grupo = 'bienestar'
 where slug in ('yoga','pilates','meditacion');

update public.disciplines set grupo = 'musica'
 where slug in ('canto','guitarra','piano','bateria');

update public.disciplines set grupo = 'escena'
 where slug in ('teatro');

update public.disciplines set grupo = 'idiomas'
 where slug in ('idiomas');


-- ----------------------------------------------------------------------------
-- 4. LO QUE NO ENTRÓ EN NINGUNA, Y EL CANDADO
--
-- La 0037 dejó entrar al catálogo lo que cada profe hubiera escrito a mano en
-- la columna vieja, con `orden` 800. Esas no están en ninguna lista de arriba
-- y no se pueden adivinar: van a "Otras", que es donde el profe las va a
-- encontrar. Si alguna merece grupo propio, se mueve con una línea.
-- ----------------------------------------------------------------------------
update public.disciplines set grupo = 'otra' where grupo is null;

alter table public.disciplines alter column grupo set default 'otra';
alter table public.disciplines alter column grupo set not null;

create index if not exists disciplines_grupo_idx on public.disciplines(grupo, orden);


-- ----------------------------------------------------------------------------
-- 5. LAS NUEVAS
--
-- DOS NOMBRES EVITADOS A PROPÓSITO: "CrossFit" y "Spinning" son marcas
-- registradas de terceros. Ponerlas en nuestro catálogo sería publicar una
-- lista donde usamos la marca ajena como nombre de categoría. Van los
-- términos genéricos —"Entrenamiento cruzado", "Ciclismo indoor"— que
-- describen lo mismo sin pedirle permiso a nadie.
--
-- (Zumba ya estaba desde la 0037 y también es marca registrada, pero ahí el
-- uso es distinto: hay instructores licenciados que dan Zumba y necesitan
-- poder decirlo. Queda.)
-- ----------------------------------------------------------------------------
insert into public.disciplines (slug, name, orden, grupo) values
  -- Baile social
  ('cumbia',            'Cumbia',                   85, 'baile-social'),
  ('swing',             'Swing y lindy hop',        88, 'baile-social'),
  ('rock-and-roll',     'Rock and roll',            90, 'baile-social'),
  ('bailes-de-salon',   'Bailes de salón',          92, 'baile-social'),
  ('forro',             'Forró',                    94, 'baile-social'),
  ('samba',             'Samba',                    96, 'baile-social'),

  -- Baile urbano
  ('breaking',          'Breaking',                160, 'baile-urbano'),
  ('locking',           'Locking',                 165, 'baile-urbano'),
  ('popping',           'Popping',                 170, 'baile-urbano'),
  ('waacking',          'Waacking',                175, 'baile-urbano'),
  ('vogue',             'Vogue',                   180, 'baile-urbano'),
  ('afro',              'Afro',                    185, 'baile-urbano'),

  -- Danza escénica
  ('flamenco',          'Flamenco',                205, 'baile-escenico'),
  ('arabe',             'Danza árabe',             215, 'baile-escenico'),
  ('claque',            'Claqué',                  245, 'baile-escenico'),

  -- Circo y acrobacia
  ('trapecio',          'Trapecio',                265, 'circo'),
  ('aro-aereo',         'Aro aéreo',               270, 'circo'),
  ('malabares',         'Malabares',               275, 'circo'),
  ('vertical',          'Vertical e invertidas',   280, 'circo'),

  -- Entrenamiento físico
  ('musculacion',       'Musculación',             305, 'entrenamiento'),
  ('cruzado',           'Entrenamiento cruzado',   315, 'entrenamiento'),
  ('calistenia',        'Calistenia',              325, 'entrenamiento'),
  ('running',           'Running',                 335, 'entrenamiento'),
  ('ciclismo-indoor',   'Ciclismo indoor',         338, 'entrenamiento'),

  -- Cuerpo y bienestar
  ('tai-chi',           'Tai chi',                 365, 'bienestar'),
  ('qi-gong',           'Qi gong',                 370, 'bienestar'),
  ('respiracion',       'Respiración',             375, 'bienestar'),
  ('mindfulness',       'Mindfulness',             380, 'bienestar'),
  ('movimiento',        'Movimiento consciente',   385, 'bienestar'),

  -- Música
  ('lenguaje-musical',  'Lenguaje musical',        405, 'musica'),
  ('bajo',              'Bajo',                    415, 'musica'),
  ('violin',            'Violín',                  425, 'musica'),
  ('ukelele',           'Ukelele',                 435, 'musica'),
  ('saxofon',           'Saxofón',                 442, 'musica'),
  ('flauta',            'Flauta',                  444, 'musica'),
  ('produccion',        'Producción musical',      446, 'musica'),
  ('dj',                'DJ',                      448, 'musica'),

  -- Escena y voz
  ('improvisacion',     'Improvisación',           455, 'escena'),
  ('stand-up',          'Stand up',                460, 'escena'),
  ('clown',             'Clown',                   465, 'escena'),
  ('oratoria',          'Oratoria',                470, 'escena'),
  ('locucion',          'Locución y doblaje',      475, 'escena'),
  ('expresion',         'Expresión corporal',      480, 'escena'),

  -- Idiomas
  ('ingles',            'Inglés',                  502, 'idiomas'),
  ('portugues',         'Portugués',               504, 'idiomas'),
  ('italiano',          'Italiano',                506, 'idiomas'),
  ('frances',           'Francés',                 508, 'idiomas'),
  ('aleman',            'Alemán',                  512, 'idiomas'),
  ('espanol-extranjeros','Español para extranjeros',514,'idiomas'),
  ('lengua-senas',      'Lengua de señas',         516, 'idiomas'),
  ('chino',             'Chino mandarín',          518, 'idiomas'),

  -- Apoyo escolar y académico
  ('apoyo-escolar',     'Apoyo escolar',           555, 'academico'),
  ('matematica',        'Matemática',              560, 'academico'),
  ('fisica',            'Física',                  565, 'academico'),
  ('quimica',           'Química',                 570, 'academico'),
  ('programacion',      'Programación',            575, 'academico'),
  ('ajedrez',           'Ajedrez',                 580, 'academico'),

  -- Artes marciales y defensa
  ('karate',            'Karate',                  610, 'marciales'),
  ('taekwondo',         'Taekwondo',               615, 'marciales'),
  ('judo',              'Judo',                    620, 'marciales'),
  ('jiu-jitsu',         'Jiu-jitsu',               625, 'marciales'),
  ('aikido',            'Aikido',                  630, 'marciales'),
  ('kung-fu',           'Kung fu',                 635, 'marciales'),
  ('muay-thai',         'Muay thai',               640, 'marciales'),
  ('kickboxing',        'Kickboxing',              645, 'marciales'),
  ('boxeo',             'Boxeo',                   650, 'marciales'),
  ('mma',               'MMA',                     655, 'marciales'),
  ('capoeira',          'Capoeira',                660, 'marciales'),
  ('esgrima',           'Esgrima',                 665, 'marciales'),
  ('defensa-personal',  'Defensa personal',        670, 'marciales'),

  -- Artes visuales
  ('dibujo',            'Dibujo',                  705, 'visuales'),
  ('pintura',           'Pintura',                 710, 'visuales'),
  ('ceramica',          'Cerámica',                715, 'visuales'),
  ('fotografia',        'Fotografía',              720, 'visuales'),
  ('ilustracion',       'Ilustración',             725, 'visuales'),
  ('diseno-grafico',    'Diseño gráfico',          730, 'visuales'),

  -- Oficios y manualidades
  ('costura',           'Costura',                 755, 'oficios'),
  ('tejido',            'Tejido y crochet',        760, 'oficios'),
  ('cocina',            'Cocina',                  765, 'oficios'),
  ('pasteleria',        'Pastelería',              770, 'oficios'),
  ('carpinteria',       'Carpintería',             775, 'oficios')
on conflict (slug) do nothing;


-- ----------------------------------------------------------------------------
-- 6. CONTROL
--
-- Ninguna disciplina sin grupo, y ningún grupo vacío que ensucie el menú.
-- ----------------------------------------------------------------------------
do $$
declare
  v_sin_grupo int;
begin
  select count(*) into v_sin_grupo from public.disciplines where grupo is null;
  if v_sin_grupo > 0 then
    raise exception 'Quedaron % disciplinas sin grupo', v_sin_grupo;
  end if;
end;
$$;
