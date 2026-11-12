-- ============================================================================
-- Migración 0044 — El reggaetón es urbano
--
-- La 0043 lo dejó en "Baile social", y no es ahí. En las escuelas de acá el
-- reggaetón se agrupa con el hip hop y el dancehall: es urbano. Lo que sí es
-- social —la versión de pareja, la que se baila en una milonga de ritmos— ya
-- tiene su lugar propio en el catálogo, que es "Ritmos latinos".
--
-- POR QUÉ UNA MIGRACIÓN NUEVA Y NO UNA CORRECCIÓN DE LA 0043.
--
-- Porque la 0043 ya corrió. Editarla haría que `aliado-dev` y `aliado-prod`
-- queden distintas según cuándo se aplicó cada una: la que ya pasó por la 0043
-- vieja se quedaría con el reggaetón en social para siempre, porque nadie
-- vuelve a correr una migración que ya está aplicada. Con dos archivos, las
-- dos bases terminan igual sin importar por dónde vengan.
--
-- EL ORDEN TAMBIÉN SE MUEVE.
--
-- Tenía 60, que cae en la banda de los bailes sociales (10 a 99). Dejarlo ahí
-- rompería lo único que hace legible a `orden`: que la banda diga de qué grupo
-- es. Pasa a 105, el primer lugar de la banda urbana, que además es donde
-- conviene que esté: de ese grupo, es el que más gente busca.
-- ============================================================================

update public.disciplines
   set grupo = 'baile-urbano',
       orden = 105
 where slug = 'reggaeton';


-- ----------------------------------------------------------------------------
-- CONTROL
--
-- Que haya quedado donde queríamos, y que ninguna otra se haya movido de
-- banda sin que nos diéramos cuenta.
-- ----------------------------------------------------------------------------
do $$
declare
  v_grupo text;
  v_orden int;
begin
  select grupo, orden into v_grupo, v_orden
    from public.disciplines where slug = 'reggaeton';

  if v_grupo is distinct from 'baile-urbano' or v_orden is distinct from 105 then
    raise exception 'El reggaetón quedó en % con orden %, y tenía que quedar en baile-urbano con 105',
      v_grupo, v_orden;
  end if;
end;
$$;
