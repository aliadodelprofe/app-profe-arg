-- ============================================================================
-- Migración 0025 — Un CBU o CVU tiene 22 dígitos, siempre
--
-- La 0024 guarda el número sin mirarlo. Un CBU cortado al copiar —20 dígitos
-- en vez de 22— se guarda igual, y el alumno lo copia y transfiere a la nada,
-- o a la cuenta de otra persona. Es de los pocos errores de esta app que
-- cuestan plata de verdad, y es de los más fáciles de impedir.
--
-- CBU y CVU son el mismo formato: 22 dígitos. El CVU es el de las billeteras
-- (Mercado Pago, Ualá, Brubank); la columna se llama "cbu" por brevedad pero
-- guarda cualquiera de los dos, y las pantallas dicen "CBU o CVU".
--
-- La regla va en la base y no solo en el formulario a propósito: una
-- validación que solo vive en la pantalla se saltea con una pestaña del
-- navegador, y acá lo que está del otro lado es plata.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Normalizar lo que ya está cargado
--
-- Alguien pudo haberlo pegado con espacios o guiones, que es como lo muestran
-- los bancos. Eso no es un número inválido: es el mismo número escrito para
-- leer. Se le sacan los separadores antes de exigir el formato.
--
-- Si después de esto queda alguno que no tiene 22 dígitos, el "add constraint"
-- de abajo va a fallar y va a decir cuál. Eso es lo correcto: significa que
-- hay un CBU mal cargado en la base, y enterarse ahora es mejor que enterarse
-- por un alumno que transfirió a cualquier lado.
-- ----------------------------------------------------------------------------
update public.payment_methods
   set cbu = nullif(regexp_replace(cbu, '[^0-9]', '', 'g'), '')
 where cbu is not null;


-- ----------------------------------------------------------------------------
-- 2. La regla
--
-- "cbu is null or ..." porque el CBU sigue siendo opcional: con el alias
-- alcanza para transferir. Lo que no se admite es un CBU a medias.
-- ----------------------------------------------------------------------------
alter table public.payment_methods
  add constraint payment_methods_cbu_valido
  check (cbu is null or cbu ~ '^[0-9]{22}$');

comment on constraint payment_methods_cbu_valido on public.payment_methods is
  'Un CBU o CVU son 22 dígitos. Menos que eso es un número cortado al copiar.';
