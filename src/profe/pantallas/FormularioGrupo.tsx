// ============================================================================
// Alta y edición de un grupo — el mismo formulario para las dos cosas.
//
// Son el mismo formulario a propósito: si crear y editar fueran dos pantallas
// distintas, cualquier campo nuevo habría que acordarse de agregarlo dos veces,
// y tarde o temprano uno de los dos se queda atrás.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { crearGrupo, editarGrupo, NOMBRE_DIA, plata } from '../datos';
import type { Espacio, Grupo, Formato, DatosGrupo } from '../datos';
import { Aviso, Campo, Texto, Opciones, Boton, BotonSecundario } from '../../comun/ui';
import { compararFormas, MESES_POR_ANIO } from '../../comun/precios';

export default function FormularioGrupo({
  espacio,
  grupo,
  alCerrar,
  alGuardar,
}: {
  espacio: Espacio;
  // Sin grupo, es un alta.
  grupo?: Grupo;
  alCerrar: () => void;
  alGuardar: (g: Grupo) => void;
}) {
  const [nombre, setNombre] = useState(grupo?.name ?? '');
  const [formato, setFormato] = useState<Formato>(grupo?.format ?? 'regular');
  const [nivel, setNivel] = useState(grupo?.level ?? '');
  const [estudio, setEstudio] = useState(grupo?.venue ?? '');
  const [direccion, setDireccion] = useState(grupo?.address ?? '');
  const [cupo, setCupo] = useState(grupo?.capacity?.toString() ?? '');
  const [desde, setDesde] = useState(grupo?.start_date ?? '');
  const [hasta, setHasta] = useState(grupo?.end_date ?? '');
  const [porClase, setPorClase] = useState(grupo?.price_per_session?.toString() ?? '');
  const [porMes, setPorMes] = useState(grupo?.price_per_period?.toString() ?? '');
  const [pagoUnico, setPagoUnico] = useState(grupo?.price_one_time?.toString() ?? '');
  const [dia, setDia] = useState<string>(grupo?.weekday?.toString() ?? '');
  const [hora, setHora] = useState(grupo?.default_start_time?.slice(0, 5) ?? '');
  const [duracion, setDuracion] = useState(grupo?.default_duration_min?.toString() ?? '');
  const [online, setOnline] = useState(grupo?.online ?? false);
  const [enlace, setEnlace] = useState(grupo?.meeting_url ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // --------------------------------------------------------------------
  // CÓMO SE ARMAN LAS FECHAS
  //
  // No es una columna nueva: es cómo se lee la combinación de día fijo y
  // fecha de fin, que ya existen. Se expone como una pregunta porque es LA
  // pregunta de una formación —"¿esto es un workshop, un taller de cuatro
  // semanas, o fechas sueltas?"— y pedirla como "día fijo (opcional)" obliga
  // al profesor a traducir él su propio producto.
  //
  //   encuentro → un solo día.           sin día fijo, arranca = termina
  //   semanal   → todas las semanas.     con día fijo, con fin
  //   sueltas   → fechas a dedo.         sin día fijo, con fin
  // --------------------------------------------------------------------
  type Forma = 'encuentro' | 'semanal' | 'sueltas';
  const formaInicial: Forma = !grupo
    ? 'semanal'
    : grupo.weekday !== null
      ? 'semanal'
      : grupo.start_date && grupo.start_date === grupo.end_date
        ? 'encuentro'
        : 'sueltas';
  const [forma, setForma] = useState<Forma>(formaInicial);

  const esRegular = formato === 'regular';
  const esFormacion = formato === 'cycle';
  const esParticular = formato === 'private';

  // El día fijo lo pide el regular siempre, y la formación solo si es semanal.
  // La particular lo ofrece: "todos los martes" se agenda solo, "dos miércoles
  // al mes" se carga a mano.
  const pideDiaFijo = esRegular || (esFormacion && forma === 'semanal') || esParticular;
  const conDiaFijo = pideDiaFijo && dia !== '';

  // Dónde se da. Una particular online no tiene sala; las demás sí, y es un
  // dato que el alumno necesita para llegar.
  const pideLugar = !esParticular || !online;
  const lugarObligatorio = esRegular || esFormacion;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    // Las validaciones que no puede hacer el navegador solo, con el mensaje
    // diciendo QUÉ falta y no "completá los campos obligatorios".
    const falta = (() => {
      if (esFormacion && forma === 'encuentro' && !desde) {
        return 'Un encuentro único necesita la fecha del día que se da.';
      }
      if (esFormacion && forma !== 'encuentro' && !hasta) {
        return 'Una formación necesita fecha de término: es lo que define cuánto dura.';
      }
      if (esFormacion && forma === 'semanal' && dia === '') {
        return 'Elegí el día de la semana: es lo que hace que las clases se creen solas.';
      }
      if (esRegular && dia === '') {
        return 'Un grupo regular necesita día fijo. Sin eso habría que cargar cada clase a mano, todas las semanas, para siempre.';
      }
      if (conDiaFijo && !hora) return 'Falta la hora de la clase.';
      return null;
    })();

    if (falta) {
      setError(falta);
      setGuardando(false);
      return;
    }

    // Un encuentro único empieza y termina el mismo día: eso es lo que hace
    // que no se le genere nada después.
    const arranca = esFormacion && forma === 'encuentro' ? desde : (desde || null);
    const termina = esFormacion
      ? (forma === 'encuentro' ? desde : hasta || null)
      : null;

    const datos: DatosGrupo = {
      name: nombre.trim(),
      format: formato,
      level: esParticular ? null : (nivel.trim() || null),
      capacity: cupo ? Number(cupo) : null,
      start_date: arranca,
      end_date: termina,
      venue: pideLugar ? (estudio.trim() || null) : null,
      address: pideLugar ? (direccion.trim() || null) : null,
      weekday: conDiaFijo ? Number(dia) : null,
      default_start_time: conDiaFijo ? hora || null : null,
      default_duration_min: conDiaFijo ? (duracion ? Number(duracion) : null) : null,
      price_per_session: porClase ? Number(porClase) : null,
      price_per_period: porMes ? Number(porMes) : null,
      price_one_time: formato === 'cycle' && pagoUnico ? Number(pagoUnico) : null,
      online: esParticular && online,
      meeting_url: esParticular && online ? (enlace.trim() || null) : null,
    };

    try {
      const g = grupo
        ? await editarGrupo(grupo.id, datos)
        : await crearGrupo(espacio.id, datos);
      alGuardar(g);
    } catch (err) {
      setError((err as Error).message);
      setGuardando(false);
    }
  }

  // La comparación que el profesor no hace de cabeza.
  //
  // SOBRE EL TONO: acá no se le muestra cuánto "deja de facturar" con el
  // descuento. Es verdad y es inútil: lo único que logra es desalentarlo de
  // usar la herramienta que hace que el alumno se comprometa. Lo que sí se le
  // muestra es el precio por clase —que es lo que necesita para fijar el
  // número— y lo que recibe a cambio: cobros en fecha, todo el año, de alguien
  // que ya decidió quedarse.
  const comparacion = compararFormas(Number(porClase) || null, Number(porMes) || null);

  const ayudaDelMes = (() => {
    if (!comparacion) {
      return 'Con el descuento ya aplicado. Es el precio final, no un porcentaje.';
    }
    // Cuando el precio no funciona, decirle cuál sí — no solo que está mal.
    if (!comparacion.conviene) {
      return 'Con este precio la cuota le sale más que venir suelto, así que nadie la va '
        + `a elegir. Para que tenga sentido tiene que quedar por debajo de `
        + `${plata(comparacion.cuotaSinDescuento)}.`;
    }
    return `Con tu cuota cada clase le sale ${plata(comparacion.porClaseConCuota)} en vez de `
      + `${plata(Number(porClase))}: un ${comparacion.porcentaje}% menos para él. A cambio te `
      + `deja ${MESES_POR_ANIO} cobros al año en fecha fija, de alguien que decidió quedarse `
      + 'una vez en vez de decidirlo cada semana.';
  })();

  return (
    <form
      onSubmit={guardar}
      className="flex flex-col gap-3"
    >
      <Campo etiqueta="Nombre">
        <Texto
          required value={nombre} placeholder="Bachata principiantes, martes"
          onChange={(e) => setNombre(e.target.value)}
        />
      </Campo>

      <Campo
        etiqueta="Formato"
        ayuda={
          esRegular
            ? 'Recurrente y abierta: la gente entra y sale, y no tiene fin hasta que vos lo decidas.'
            : esFormacion
              ? 'Programa cerrado con principio y fin. Un workshop, un taller de cuatro semanas, un ciclo de dos meses.'
              : 'Una ficha por arreglo: "Particular — Juan", los martes a las 15. Cada alumno tiene su horario y su precio, así que cada uno es su propia ficha.'
        }
      >
        <Opciones<Formato>
          valor={formato}
          alElegir={setFormato}
          opciones={[
            { valor: 'regular', texto: 'Regular' },
            { valor: 'cycle', texto: 'Formación' },
            { valor: 'private', texto: 'Particular' },
          ]}
        />
      </Campo>

      {/* ------------------------------------------------------------------
          CÓMO SE DICTA — solo en formación.

          Es la pregunta que define el producto, y antes había que deducirla
          llenando "día fijo (opcional)" y dos fechas. Un profesor que arma un
          workshop no piensa "sin día fijo, arranca y termina el mismo día":
          piensa "es un encuentro".
         ------------------------------------------------------------------ */}
      {esFormacion && (
        <Campo
          etiqueta="Cómo se dicta"
          ayuda={
            forma === 'encuentro'
              ? 'Un solo día. Se carga esa clase y nada más.'
              : forma === 'semanal'
                ? 'El mismo día cada semana, hasta la fecha de término. Las clases se crean solas.'
                : 'Fechas y horarios distintos. Las cargás vos, y desde la pestaña Clases podés agregar varias de una.'
          }
        >
          <Opciones<Forma>
            valor={forma}
            alElegir={setForma}
            opciones={[
              { valor: 'encuentro', texto: 'Un encuentro' },
              { valor: 'semanal', texto: 'Semanal' },
              { valor: 'sueltas', texto: 'Fechas sueltas' },
            ]}
          />
        </Campo>
      )}

      {/* ------------------------------------------------------------------
          El horario fijo. Con un día elegido, las clases se crean solas y no
          hay que cargarlas nunca más; el feriado se resuelve cancelando esa
          clase puntual, no dejando el grupo sin horario.

          En un regular es obligatorio: sin día fijo habría que cargar cada
          clase a mano, todas las semanas, para siempre. En una particular es
          una opción, porque "todos los martes" y "dos miércoles al mes" son
          los dos arreglos normales.
         ------------------------------------------------------------------ */}
      {pideDiaFijo && (
        <Campo
          etiqueta={esRegular ? 'Día de la clase' : 'Día fijo'}
          ayuda={
            dia === ''
              ? 'Sin día fijo vas cargando cada clase cuando la acordás con el alumno.'
              : 'Las clases de los próximos dos meses se crean solas. Si un día no se da, se cancela esa clase.'
          }
        >
          <select
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="w-full rounded-xl border border-linea bg-campo px-3.5 py-2.5 text-tinta placeholder:text-tenue/50 outline-none transition focus:border-acento focus:ring-4 focus:ring-acento/15"
          >
            <option value="">{esParticular ? 'Sin día fijo (las agendo yo)' : 'Elegí un día'}</option>
            {NOMBRE_DIA.map((n, i) => (
              <option key={i} value={i}>{n}</option>
            ))}
          </select>
        </Campo>
      )}

      {conDiaFijo && (
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Hora">
            <Texto type="time" required value={hora} onChange={(e) => setHora(e.target.value)} />
          </Campo>
          <Campo etiqueta="Duración (min)">
            <Texto
              type="number" min="15" step="15" value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
            />
          </Campo>
        </div>
      )}

      {/* ------------------------------------------------------------------
          Los precios son del grupo, no de cada alumno. Lo que elige el alumno
          al inscribirse es cuál de estas dos formas usa.
         ------------------------------------------------------------------ */}
      <p className="rounded-xl border border-contorno bg-panel px-3.5 py-2.5 text-xs leading-relaxed text-tenue shadow-apoyo">
        El alumno elige cómo paga. Si la cuota mensual le conviene, se compromete al mes
        entero y vos sabés con cuánto contás; si no, va a venir suelto cuando tenga ganas.
        El descuento del mes es tu herramienta para eso.
      </p>

      <Campo etiqueta="Precio por clase">
        <Texto
          type="number" min="0" step="any" value={porClase}
          onChange={(e) => setPorClase(e.target.value)}
        />
      </Campo>

      <Campo etiqueta="Precio del mes" ayuda={ayudaDelMes}>
        <Texto
          type="number" min="0" step="any" value={porMes}
          onChange={(e) => setPorMes(e.target.value)}
        />
      </Campo>

      {formato === 'cycle' && (
        <Campo etiqueta="Pago único (workshop)" ayuda="Para un ciclo de una sola clase.">
          <Texto
            type="number" min="0" step="any" value={pagoUnico}
            onChange={(e) => setPagoUnico(e.target.value)}
          />
        </Campo>
      )}

      {/* Las fechas van ACÁ y no al final del formulario. En una formación son
          lo que define el producto —un programa de dos meses— y además lo que
          hace que las clases dejen de generarse solas cuando termina. Estaban
          abajo de "Cupo (opcional)", tratadas como un detalle. */}
      {esFormacion && forma === 'encuentro' && (
        <Campo etiqueta="Qué día es" ayuda="Empieza y termina el mismo día, así no se le genera nada después.">
          <Texto type="date" required value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Campo>
      )}

      {esFormacion && forma !== 'encuentro' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Arranca">
              <Texto
                type="date" required value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Termina">
              <Texto
                type="date" required value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </Campo>
          </div>
          <p className="-mt-1 rounded-xl border border-contorno bg-panel px-3.5 py-2.5 text-xs leading-relaxed text-tenue shadow-apoyo">
            Una formación es un programa con principio y fin. Después de la fecha de término
            dejan de generarse clases solas, y a nadie se le genera una cuota por un mes que
            el grupo ya no cursa.
          </p>
        </>
      )}

      {!esFormacion && (
        <Campo etiqueta="Empieza (opcional)" ayuda="Dejalo vacío si ya viene andando.">
          <Texto type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Campo>
      )}

      {/* El nivel no va en particulares: depende del alumno que la tome, no de
          la clase. Un profesor que da una particular a un avanzado y otra a un
          principiante no tiene dos niveles en la misma ficha — tiene dos
          fichas. */}
      {!esParticular && (
        <Campo etiqueta="Nivel">
          <Texto
            required value={nivel} placeholder="Principiante"
            onChange={(e) => setNivel(e.target.value)}
          />
        </Campo>
      )}

      {/* ------------------------------------------------------------------
          DÓNDE. Una particular puede ser online y entonces no hay sala que
          poner: la base rechaza una clase online con dirección (migración
          0032), así que el formulario deja de pedirla en vez de pedir algo
          que no va a entrar.
         ------------------------------------------------------------------ */}
      {esParticular && (
        <Campo
          etiqueta="Dónde se da"
          ayuda={online
            ? 'Tu alumno va a ver el enlace en vez del mapa.'
            : 'Tu alumno va a ver la dirección y el mapa.'}
        >
          <Opciones<'sala' | 'online'>
            valor={online ? 'online' : 'sala'}
            alElegir={(v) => setOnline(v === 'online')}
            opciones={[
              { valor: 'sala', texto: 'En una sala' },
              { valor: 'online', texto: 'Online' },
            ]}
          />
        </Campo>
      )}

      {esParticular && online && (
        <Campo etiqueta="Enlace de la clase (opcional)" ayuda="Meet, Zoom, lo que uses. Podés ponerlo después.">
          <Texto
            type="url" value={enlace} placeholder="https://meet.google.com/…"
            onChange={(e) => setEnlace(e.target.value)}
          />
        </Campo>
      )}

      {pideLugar && (
        <>
          <Campo etiqueta={lugarObligatorio ? 'Estudio' : 'Estudio (opcional)'} ayuda="Como le dicen al lugar: Vibras, Bunker.">
            <Texto
              required={lugarObligatorio} value={estudio} placeholder="Vibras"
              onChange={(e) => setEstudio(e.target.value)}
            />
          </Campo>

          <Campo
            etiqueta={lugarObligatorio ? 'Dirección' : 'Dirección (opcional)'}
            ayuda="Con esto tus alumnos abren el mapa y llegan."
          >
            <Texto
              required={lugarObligatorio} value={direccion}
              placeholder="Av. Corrientes 1234, CABA"
              onChange={(e) => setDireccion(e.target.value)}
            />
          </Campo>
        </>
      )}

      <Campo
        etiqueta={esParticular ? 'Cupo (opcional)' : 'Cupo'}
        ayuda={esParticular
          ? 'Dejalo en 1 si es uno a uno. Poné más si es un grupo reducido.'
          : 'Cuántos entran. Te avisa antes de pasarte.'}
      >
        <Texto
          type="number" min="1" required={!esParticular} value={cupo}
          placeholder={esParticular ? '1' : undefined}
          onChange={(e) => setCupo(e.target.value)}
        />
      </Campo>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : grupo ? 'Guardar cambios' : 'Crear grupo'}
        </Boton>
        <BotonSecundario type="button" onClick={alCerrar}>Cancelar</BotonSecundario>
      </div>
    </form>
  );
}
