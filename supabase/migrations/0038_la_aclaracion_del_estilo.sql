-- ============================================================================
-- Migración 0038 — La aclaración, al lado de la actividad
--
-- La mudanza de la 0037 hizo lo que tenía que hacer —no tirar el texto que
-- cada profesor había escrito— y eso dejó en el catálogo entradas como
-- "Bachata Influence". Guardar el dato estuvo bien; dejarlo como una
-- actividad propia, no.
--
-- POR QUÉ NO ALCANZA CON BORRARLA.
--
-- "Bachata Influence" no es una actividad distinta de "Bachata": es bachata
-- con un estilo. Si entra al catálogo, mañana entran "Bachata sensual",
-- "Bachata dominicana" y "Bachata moderna", y el día del buscador el alumno
-- que escribe "bachata" no encuentra a ninguno de los cuatro. Abrir
-- subcategorías es una discusión que no tiene fondo y que hoy no le resuelve
-- nada a nadie.
--
-- Y borrarla a secas le saca al profesor una aclaración que para él importa:
-- el que da Bachata Influence quiere que su alumno lo lea.
--
-- La respuesta es separar las dos cosas. La ACTIVIDAD es del catálogo, es la
-- misma para todos y es lo que un día se va a poder buscar. La ACLARACIÓN es
-- texto libre del profesor, vive al lado y no se busca. "Bachata" + "Influence".
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. LA COLUMNA
--
-- Va en el cruce y no en la escuela: una escuela que da bachata y salsa puede
-- querer aclarar el estilo de una y no de la otra.
--
-- El tope de 40 no es un capricho: es lo que entra al lado del nombre sin
-- empujar el resto de la línea. Un campo libre sin tope termina con la
-- biografía del profesor metida ahí adentro.
-- ----------------------------------------------------------------------------
alter table public.tenant_disciplines
  add column if not exists nota text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.tenant_disciplines'::regclass
       and conname = 'tenant_disciplines_nota_corta'
  ) then
    alter table public.tenant_disciplines
      add constraint tenant_disciplines_nota_corta
      check (nota is null or (btrim(nota) <> '' and length(nota) <= 40));
  end if;
end $$;

comment on column public.tenant_disciplines.nota is
  'El estilo, en palabras del profesor: "Influence", "On2", "Hatha". '
  'No es una categoría y no se busca: aclara la que sí lo es.';


-- ----------------------------------------------------------------------------
-- 2. DESARMAR LO QUE LA MUDANZA DEJÓ JUNTO
--
-- Las entradas que creó la 0037 con texto de los profesores quedaron marcadas
-- con orden 800. De cada una se busca una actividad REAL del catálogo con la
-- que empiece: "Bachata Influence" empieza con "Bachata", así que la escuela
-- pasa a dar Bachata con la aclaración "Influence".
--
-- Si la escuela ya daba Bachata por otro lado, no se duplica: se le pone la
-- aclaración a la que ya tenía, salvo que ya tuviera una.
--
-- Lo que no empiece con ninguna actividad conocida se queda como está. Antes
-- que adivinar mal, que quede visible y el profesor lo acomode desde la
-- pantalla en diez segundos.
-- ----------------------------------------------------------------------------
with libres as (
  select td.tenant_id,
         td.slug       as slug_viejo,
         d.name        as texto
    from public.tenant_disciplines td
    join public.disciplines d on d.slug = td.slug
   where d.orden = 800
),
partidas as (
  select l.tenant_id,
         l.slug_viejo,
         real.slug                                        as slug_nuevo,
         nullif(btrim(substr(l.texto, length(real.name) + 1)), '') as nota
    from libres l
    join lateral (
      select d2.slug, d2.name
        from public.disciplines d2
       where d2.orden <> 800
         and lower(l.texto) like lower(d2.name) || ' %'
       order by length(d2.name) desc        -- la coincidencia más larga manda
       limit 1
    ) as real on true
)
insert into public.tenant_disciplines (tenant_id, slug, nota)
select tenant_id, slug_nuevo, nota from partidas
on conflict (tenant_id, slug)
do update set nota = coalesce(public.tenant_disciplines.nota, excluded.nota);

-- Y se sacan las filas viejas, ya reemplazadas.
delete from public.tenant_disciplines td
 using public.disciplines d
 where d.slug = td.slug
   and d.orden = 800
   and exists (
     select 1
       from public.disciplines d2
      where d2.orden <> 800
        and lower(d.name) like lower(d2.name) || ' %'
        and exists (
          select 1 from public.tenant_disciplines td2
           where td2.tenant_id = td.tenant_id and td2.slug = d2.slug
        )
   );

-- Y del catálogo se van las entradas sueltas que ya no usa nadie.
delete from public.disciplines d
 where d.orden = 800
   and not exists (
     select 1 from public.tenant_disciplines td where td.slug = d.slug
   );


-- ----------------------------------------------------------------------------
-- 3. LA FUNCIÓN DE LAS INVITACIONES, QUE TAMBIÉN LA MUESTRA
--
-- Le pasa lo mismo que a la pantalla del alumno: la actividad y, si el profe
-- la aclaró, su estilo, leídos como una sola cosa. El resto es la 0037 tal
-- cual.
-- ----------------------------------------------------------------------------
create or replace function public.invitaciones_pendientes()
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
           (select string_agg(
                     d.name || coalesce(' ' || td.nota, ''),
                     ' · ' order by d.orden, d.name)
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
