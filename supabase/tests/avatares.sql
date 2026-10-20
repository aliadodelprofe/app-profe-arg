-- ============================================================================
-- PRUEBA DEL DEPÓSITO DE FOTOS  (migraciones 0027 y 0028)
--
-- La carpeta es el USUARIO, no la ficha ni el espacio: una ficha es por
-- escuela, pero la cara es de la persona. Lo que se prueba es que esa frontera
-- aguante — cada uno escribe en la suya y en ninguna otra.
--
-- El depósito es público para LEER, y eso no se prueba porque no es una falla:
-- una foto de perfil existe para que la vean. Lo que se prueba es escribir.
--
-- Y el BORRADO tampoco se prueba, por un motivo que no es nuestro: Supabase
-- tiene un disparador que prohíbe borrar de storage.objects desde SQL, sea
-- quien sea. Eso se hace por la Storage API. Lo único honesto que queda es
-- comprobar que la regla está puesta, y la fila lo dice con todas las letras
-- en vez de hacerse pasar por una prueba de comportamiento.
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

-- El id sale de la anotación de arriba y no de auth.users: con el rol
-- "authenticated" puesto, esa tabla está prohibida. Todo lo que haya que
-- leer de auth.users se lee ANTES de cambiar de rol.
insert into storage.objects (bucket_id, name, owner)
values (
  'avatares',
  nullif(current_setting('prueba.otro_usuario', true), '') || '/la-de-profe1.jpg',
  nullif(current_setting('prueba.otro_usuario', true), '')::uuid
);


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

  -- Esta fila es la que descubrió que faltaba la regla de lectura (0028):
  -- sin ella el update no ve la fila que tiene que cambiar y devuelve cero,
  -- sin error.
  perform set_config('prueba.v3',
    case when v_n = 1 then 'PASA'
         else 'FALLA - no pudo reemplazar su propia foto (falta la regla de select?)' end, false);

  -- ---------------------------------------------------------------------- 4
  -- La de la otra persona existe —la dejó la Parte 1— y aun así no la toca.
  update storage.objects set name = auth.uid()::text || '/me-la-llevo.jpg'
   where bucket_id = 'avatares' and name = v_otro::text || '/la-de-profe1.jpg';
  get diagnostics v_n = row_count;

  perform set_config('prueba.v4',
    case when v_n = 0 then 'PASA'
         else 'FALLA - se apropio de la foto de otra persona' end, false);

  -- ---------------------------------------------------------------------- 5
  -- El borrado NO se prueba acá, y conviene decir por qué en vez de dejar una
  -- fila que parezca que sí: Supabase tiene un disparador —
  -- storage.protect_delete()— que prohíbe borrar de storage.objects desde SQL,
  -- sea quien sea. Borrar un archivo se hace por la Storage API y punto.
  --
  -- Entonces lo único honesto que se puede comprobar desde acá es que la regla
  -- de borrado EXISTE. No prueba que funcione: prueba que está puesta. Una
  -- fila que dijera "el alumno no borra la foto de otro" sería mentira, porque
  -- nadie borra nada desde SQL y pasaría siempre.
  select count(*) into v_n
    from pg_policies
   where schemaname = 'storage'
     and tablename  = 'objects'
     and policyname in (
       'cada uno sube su propia foto',
       'cada uno reemplaza su propia foto',
       'cada uno borra su propia foto'
     );

  perform set_config('prueba.v5',
    case when v_n = 3 then 'PASA - las tres reglas estan puestas'
         else 'FALLA - faltan reglas del deposito: hay ' || v_n || ' de 3' end, false);
end $$;

reset role;

select * from (values
  ('Sube su propia foto',              current_setting('prueba.v1', true)),
  ('NO sube en la carpeta de otro',    current_setting('prueba.v2', true)),
  ('Reemplaza la suya',                current_setting('prueba.v3', true)),
  ('NO se apropia de la de otro',      current_setting('prueba.v4', true)),
  ('Las 3 reglas estan puestas (el borrado va por la Storage API)',
                                       current_setting('prueba.v5', true))
) as r(prueba, resultado);

rollback;
