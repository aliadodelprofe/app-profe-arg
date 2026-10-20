-- ============================================================================
-- PRUEBA DEL DEPÓSITO DE FOTOS  (migración 0027)
--
-- La carpeta es el USUARIO, no la ficha ni el espacio: una ficha es por
-- escuela, pero la cara es de la persona. Lo que se prueba es que esa frontera
-- aguante — cada uno escribe en la suya y en ninguna otra.
--
-- El depósito es público para LEER, y eso no se prueba porque no es una falla:
-- una foto de perfil existe para que la vean. Lo que se prueba es escribir.
--
-- Todo corre dentro de una transacción que se DESHACE al final.
-- REQUISITOS: aislamiento.sql y aislamiento_alumno.sql ya corridos.
-- AVISO: dispara la alerta de Supabase.
-- ============================================================================

begin;

select set_config('prueba.otro_usuario',
  (select id::text from auth.users where email = 'profe1@prueba.com' limit 1), false);


-- ----------------------------------------------------------------------------
-- PARTE 1 — Otra persona deja su foto en SU carpeta
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'profe1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

insert into storage.objects (bucket_id, name, owner)
values ('avatares', (select id from auth.users where email = 'profe1@prueba.com')::text
                    || '/la-de-profe1.jpg',
        (select id from auth.users where email = 'profe1@prueba.com'));


-- ----------------------------------------------------------------------------
-- PARTE 2 — El alumno, en la suya y solo en la suya
-- ----------------------------------------------------------------------------
reset role;

select set_config('request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'alumno1@prueba.com'),
    'role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_otro uuid := nullif(current_setting('prueba.otro_usuario', true), '')::uuid;
  v_n    int;
begin
  -- ---------------------------------------------------------------------- 1
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('avatares', auth.uid()::text || '/yo.jpg', auth.uid());
    perform set_config('prueba.v1', 'PASA', false);
  exception when others then
    perform set_config('prueba.v1',
      'FALLA - no pudo subir su propia foto (' || sqlstate || ')', false);
  end;

  -- ---------------------------------------------------------------------- 2
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('avatares', v_otro::text || '/robada.jpg', auth.uid());
    perform set_config('prueba.v2',
      'FALLA - subio una foto en la carpeta de otra persona', false);
  exception when insufficient_privilege or others then
    perform set_config('prueba.v2',
      'PASA - la base le devolvio error (' || sqlstate || ')', false);
  end;

  -- ---------------------------------------------------------------------- 3
  update storage.objects set name = auth.uid()::text || '/yo2.jpg'
   where bucket_id = 'avatares' and name = auth.uid()::text || '/yo.jpg';
  get diagnostics v_n = row_count;

  perform set_config('prueba.v3',
    case when v_n = 1 then 'PASA'
         else 'FALLA - no pudo reemplazar su propia foto' end, false);

  -- ---------------------------------------------------------------------- 4
  -- La de la otra persona existe —la dejó la Parte 1— y aun así no la toca.
  update storage.objects set name = auth.uid()::text || '/me-la-llevo.jpg'
   where bucket_id = 'avatares' and name = v_otro::text || '/la-de-profe1.jpg';
  get diagnostics v_n = row_count;

  perform set_config('prueba.v4',
    case when v_n = 0 then 'PASA'
         else 'FALLA - se apropio de la foto de otra persona' end, false);

  -- ---------------------------------------------------------------------- 5
  delete from storage.objects
   where bucket_id = 'avatares' and name = v_otro::text || '/la-de-profe1.jpg';
  get diagnostics v_n = row_count;

  perform set_config('prueba.v5',
    case when v_n = 0 then 'PASA'
         else 'FALLA - borro la foto de otra persona' end, false);

  -- ---------------------------------------------------------------------- 6
  delete from storage.objects
   where bucket_id = 'avatares' and name = auth.uid()::text || '/yo2.jpg';
  get diagnostics v_n = row_count;

  perform set_config('prueba.v6',
    case when v_n = 1 then 'PASA' else 'FALLA - no pudo borrar su propia foto' end, false);
end $$;

reset role;

select * from (values
  ('Sube su propia foto',              current_setting('prueba.v1', true)),
  ('NO sube en la carpeta de otro',    current_setting('prueba.v2', true)),
  ('Reemplaza la suya',                current_setting('prueba.v3', true)),
  ('NO se apropia de la de otro',      current_setting('prueba.v4', true)),
  ('NO borra la de otro',              current_setting('prueba.v5', true)),
  ('Borra la suya',                    current_setting('prueba.v6', true))
) as r(prueba, resultado);

rollback;
