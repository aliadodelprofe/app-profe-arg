-- ============================================================================
-- Migración 0037 — Lo que enseña cada escuela
--
-- `tenants.discipline` existe desde la 0001 y es TEXTO LIBRE. Para mostrarlo
-- debajo del nombre de la escuela alcanzaba. Para que un alumno pueda buscar
-- "salsa" y encontrar a los que la dan, no: "Salsa", "salsa ", "Salsa y
-- Bachata" y "SALSA" son cuatro cosas distintas para la base, y ninguna
-- búsqueda las junta.
--
-- Y hay un problema anterior: la columna es UNA sola. El profe independiente
-- que da bachata también da salsa, la profe de yoga también da pilates.
-- Obligarlo a elegir una lo fuerza a mentir, y el día del buscador la mitad
-- de los que dan salsa no van a aparecer.
--
-- SON DOS TABLAS Y NO UNA LISTA DE PALABRAS.
--
-- El catálogo (`disciplines`) dice qué actividades existen; la tabla de
-- cruce (`tenant_disciplines`) dice cuáles da cada escuela. La alternativa
-- —una columna con una lista de etiquetas validada contra un conjunto fijo—
-- parece más simple hasta el día que alguien da kizomba: ahí hace falta una
-- migración nueva. Con el catálogo, sumar una actividad es insertar una fila.
--
-- QUIÉN LO VE: por ahora, los mismos de siempre. El profe las de sus
-- espacios y el alumno las de las escuelas donde tiene ficha. Abrir esto al
-- público es lo que va a necesitar el buscador, y es una decisión aparte
-- para el día que exista esa pantalla: hasta entonces, no se expone una
-- lista de quién enseña qué.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. EL CATÁLOGO
--
-- La clave es el `slug` y no un uuid, a propósito: 'bachata' se lee en
-- cualquier consulta sin tener que ir a buscar a qué corresponde ese número,
-- y es lo que va a viajar en la dirección del buscador el día que exista.
--
-- `orden` agrupa para el menú: las que un profe de baile busca primero arriba,
-- y no alfabético, que pondría "acrobacia" antes que "bachata" sin que eso le
-- sirva a nadie.
-- ----------------------------------------------------------------------------
create table if not exists public.disciplines (
  slug   text primary key,
  name   text not null unique,
  orden  int  not null default 500
);

comment on table public.disciplines is
  'Qué actividades existen. La lista del menú, y lo que un buscador agrupa.';

insert into public.disciplines (slug, name, orden) values
  ('bachata',        'Bachata',               10),
  ('salsa',          'Salsa',                 20),
  ('kizomba',        'Kizomba',               30),
  ('zouk',           'Zouk',                  40),
  ('ritmos-latinos', 'Ritmos latinos',        50),
  ('reggaeton',      'Reggaetón',             60),
  ('tango',          'Tango',                 70),
  ('folklore',       'Folklore',              80),
  ('hip-hop',        'Hip hop',              110),
  ('dancehall',      'Dancehall',            120),
  ('heels',          'Heels',                130),
  ('urbano',         'Urbano',               140),
  ('k-pop',          'K-pop',                150),
  ('jazz',           'Jazz',                 210),
  ('contemporaneo',  'Contemporáneo',        220),
  ('clasico',        'Danza clásica',        230),
  ('comedia-musical','Comedia musical',      240),
  ('acrobacia',      'Acrobacia y telas',    250),
  ('pole',           'Pole dance',           260),
  ('zumba',          'Zumba',                310),
  ('funcional',      'Entrenamiento funcional', 320),
  ('stretching',     'Elongación',           330),
  ('yoga',           'Yoga',                 340),
  ('pilates',        'Pilates',              350),
  ('meditacion',     'Meditación',           360),
  ('canto',          'Canto',                410),
  ('guitarra',       'Guitarra',             420),
  ('piano',          'Piano',                430),
  ('bateria',        'Batería',              440),
  ('teatro',         'Teatro',               450),
  ('idiomas',        'Idiomas',              510),
  ('otra',           'Otra',                 900)
on conflict (slug) do nothing;


-- ----------------------------------------------------------------------------
-- 2. QUÉ DA CADA ESCUELA
-- ----------------------------------------------------------------------------
create table if not exists public.tenant_disciplines (
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  slug       text not null references public.disciplines(slug) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (tenant_id, slug)
);

create index if not exists tenant_disciplines_slug_idx
  on public.tenant_disciplines(slug);

comment on table public.tenant_disciplines is
  'Qué enseña cada escuela. Varias por escuela: el que da bachata también da salsa.';


-- ----------------------------------------------------------------------------
-- 3. LOS CANDADOS
--
-- El catálogo lo lee cualquiera que entró a la app —es la lista del menú— y no
-- lo escribe nadie desde el front: no hay política de insert, update ni delete,
-- y sin política RLS no deja pasar nada. Se cambia desde acá, con una migración.
-- ----------------------------------------------------------------------------
alter table public.disciplines        enable row level security;
alter table public.tenant_disciplines enable row level security;

drop policy if exists "cualquiera ve la lista de actividades" on public.disciplines;
create policy "cualquiera ve la lista de actividades"
  on public.disciplines for select to authenticated
  using ( true );

drop policy if exists "acceso a las actividades de mis espacios" on public.tenant_disciplines;
create policy "acceso a las actividades de mis espacios"
  on public.tenant_disciplines for all to authenticated
  using      ( tenant_id in (select public.my_tenant_ids()) )
  with check ( tenant_id in (select public.my_tenant_ids()) );

drop policy if exists "un alumno ve que ensena su escuela" on public.tenant_disciplines;
create policy "un alumno ve que ensena su escuela"
  on public.tenant_disciplines for select to authenticated
  using ( tenant_id in (select public.my_student_tenant_ids()) );


-- ----------------------------------------------------------------------------
-- 4. MUDAR LO QUE YA ESTÁ, SIN PERDER NADA
--
-- Lo que haya escrito a mano en `discipline` se intenta emparejar con el
-- catálogo por nombre. Lo que no empareje NO se tira: entra al catálogo como
-- una entrada propia, con el texto tal cual lo escribió el profesor. Perder
-- el dato de alguien porque no coincidía con nuestra lista sería cobrarle a
-- él nuestro ordenamiento.
--
-- El slug se arma sacando lo que no sea letra o número. No traduce acentos
-- —'Baile árabe' queda 'baile-rabe'— y está bien: el slug es una llave
-- interna, y lo que se muestra es `name`, que queda intacto.
-- ----------------------------------------------------------------------------
insert into public.disciplines (slug, name, orden)
select distinct
       nullif(regexp_replace(lower(btrim(t.discipline)), '[^a-z0-9]+', '-', 'g'), ''),
       btrim(t.discipline),
       800
  from public.tenants t
 where coalesce(btrim(t.discipline), '') <> ''
   and not exists (
     select 1 from public.disciplines d
      where lower(d.name) = lower(btrim(t.discipline))
   )
on conflict do nothing;

insert into public.tenant_disciplines (tenant_id, slug)
select t.id, d.slug
  from public.tenants t
  join public.disciplines d on lower(d.name) = lower(btrim(t.discipline))
 where coalesce(btrim(t.discipline), '') <> ''
on conflict do nothing;


-- ----------------------------------------------------------------------------
-- 5. LA FUNCIÓN DE LAS INVITACIONES
--
-- Devolvía `t.discipline`. Ahora arma la frase con lo que da la escuela:
-- "Bachata · Salsa". Mismo lugar en la pantalla, mismo tipo de dato, otra
-- fuente.
--
-- Es un drop y un create porque cambiar el cuerpo de una función que devuelve
-- una tabla no se puede hacer con `create or replace` si algo de la firma se
-- mueve, y acá preferimos reescribirla entera antes que dejar dos versiones
-- parecidas dando vueltas. El `drop` se lleva los permisos, así que se vuelven
-- a dar abajo.
-- ----------------------------------------------------------------------------
drop function if exists public.invitaciones_pendientes();

create function public.invitaciones_pendientes()
returns table (
  student_id      uuid,
  escuela         text,
  disciplina      text,
  anotado_como    text,
  grupos          text,
  formas_de_pago  jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_correo text;
begin
  select u.email into v_correo
    from auth.users u
   where u.id = auth.uid()
     and u.email_confirmed_at is not null;

  if v_correo is null then
    return;
  end if;

  return query
    select s.id,
           t.name,
           -- Las actividades de esa escuela, en el orden del catálogo.
           (select string_agg(d.name, ' · ' order by d.orden, d.name)
              from public.tenant_disciplines td
              join public.disciplines d on d.slug = td.slug
             where td.tenant_id = t.id),
           s.full_name,
           coalesce(string_agg(distinct g.name, ', '), 'sin grupo todavía'),
           coalesce(
             jsonb_agg(
               jsonb_build_object(
                 'grupo',  g.name,
                 'modo',   e.billing_mode,
                 'precio', case e.billing_mode
                             when 'per_session' then g.price_per_session
                             when 'per_period'  then g.price_per_period
                             else                    g.price_one_time
                           end,
                 'desde',  e.start_date,
                 'hasta',  e.end_date
               )
               order by e.start_date
             ) filter (where e.id is not null),
             '[]'::jsonb
           )
      from public.students s
      join public.tenants t on t.id = s.tenant_id
      left join public.enrollments e on e.student_id = s.id and e.status = 'active'
      left join public.groups g on g.id = e.group_id
     where lower(s.email) = lower(v_correo)
       and s.user_id is null
       and s.invite_rejected_at is null
     group by s.id, t.id, t.name, s.full_name;
end;
$$;

revoke all on function public.invitaciones_pendientes() from public;
grant execute on function public.invitaciones_pendientes() to authenticated;


-- ----------------------------------------------------------------------------
-- 6. Y AHORA SÍ, LA COLUMNA VIEJA SE VA
--
-- Con los datos mudados y la función leyendo del lugar nuevo. Dejarla sería
-- dejar dos verdades sobre lo mismo: tarde o temprano una se actualiza, la
-- otra no, y nadie sabe cuál manda. Es la misma decisión que tomamos en la
-- 0034 con `groups.weekday`.
-- ----------------------------------------------------------------------------
alter table public.tenants drop column if exists discipline;

-- ----------------------------------------------------------------------------
-- 7. CREAR UN ESPACIO YA NO PIDE LA DISCIPLINA
--
-- `create_tenant` la recibía como segundo parámetro y la escribía en la
-- columna que acabamos de borrar. Pasa a recibir solo el nombre: las
-- actividades se eligen después, en la pantalla de la escuela, que es donde
-- se editan y donde ya se puede marcar más de una.
--
-- La vieja se borra. Dejar las dos conviviendo haría que una llamada que
-- manda dos parámetros siga funcionando y siga escribiendo en una columna que
-- no existe, que es la clase de error que no avisa hasta que alguien lo usa.
-- ----------------------------------------------------------------------------
drop function if exists public.create_tenant(text, text);

create or replace function public.create_tenant(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Hay que estar logueado para crear un espacio';
  end if;

  insert into public.tenants (name)
  values (p_name)
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, auth.uid(), 'owner');

  return v_tenant_id;
end;
$$;

revoke all on function public.create_tenant(text) from public;
grant execute on function public.create_tenant(text) to authenticated;
