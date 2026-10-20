-- ============================================================================
-- Migración 0029 — Sacarse la foto también es cambiarla
--
-- La función de la 0023 guarda la foto así:
--
--     avatar_url = coalesce(p_avatar_url, avatar_url)
--
-- Ese coalesce estaba pensado para que llamar a la función solo con el nombre
-- no borrara la foto sin querer. Pero tiene un efecto que no se buscaba: NO
-- HAY FORMA DE SACARSE LA FOTO. Mandar nulo quiere decir "no la toques", así
-- que el botón "Sacar la foto" de la app no hacía nada, y lo peor es que no
-- fallaba: guardaba, decía que sí, y la foto seguía ahí.
--
-- La solución no es sacar el coalesce —eso rompería a quien llame la función
-- solo con el nombre— sino darle a "borrar" una forma de decirse. La cadena
-- vacía es esa forma: nulo es "no la toques", vacío es "sacala".
--
-- No se agrega un parámetro nuevo a propósito: cambiar la firma de una función
-- obliga a borrarla y recrearla, y mientras tanto la app que ya está andando
-- se queda sin ella.
-- ============================================================================
create or replace function public.actualizar_mi_ficha(
  p_nombre     text,
  p_avatar_url text default null
)
returns integer                      -- cuántas fichas actualizó
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuantas int;
begin
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'El nombre no puede quedar vacío';
  end if;

  -- Una persona puede tener ficha en varias escuelas. El nombre y la foto son
  -- de la persona, no de la relación con cada profesor: se actualizan todas.
  --
  --   nulo   -> no se toca la foto
  --   ''     -> se saca la foto
  --   algo   -> esa es la foto
  update public.students
     set full_name  = trim(p_nombre),
         avatar_url = case
                        when p_avatar_url is null     then avatar_url
                        when trim(p_avatar_url) = ''  then null
                        else trim(p_avatar_url)
                      end
   where user_id = auth.uid();

  get diagnostics v_cuantas = row_count;
  return v_cuantas;
end;
$$;

revoke all on function public.actualizar_mi_ficha(text, text) from public;
grant execute on function public.actualizar_mi_ficha(text, text) to authenticated;
