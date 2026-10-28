// ============================================================================
// Alta y edición de un grupo — el mismo formulario para las dos cosas.
//
// Son el mismo formulario a propósito: si crear y editar fueran dos pantallas
// distintas, cualquier campo nuevo habría que acordarse de agregarlo dos veces,
// y tarde o temprano uno de los dos se queda atrás.
// ============================================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  crearGrupo, editarGrupo, NOMBRE_DIA, plata,
  traerAlumnos, crearAlumno, inscribir, precioDelGrupo, crearClases,
} from '../datos';
import type { Espacio, Grupo, Formato, DatosGrupo, DatosHorario, ModoCobro } from '../datos';
import { Aviso, Campo, Texto, Opciones, Boton, BotonSecundario, useCarga } from '../../comun/ui';
import { compararFormas, clasesPorAnioDe, MESES_POR_ANIO } from '../../comun/precios';
import { duracionEnPalabras, diaSemana } from '../../comun/fechas';

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
  // El horario es una LISTA desde la 0034: un taller puede ser martes y jueves,
  // con horas distintas. Los tres campos de abajo son el renglón que se está
  // escribiendo; `horarios` es lo que ya se agregó.
  const [horarios, setHorarios] = useState<DatosHorario[]>(
    (grupo?.horarios ?? []).map((h) => ({
      weekday: h.weekday,
      start_time: h.start_time,
      duration_min: h.duration_min,
      por_mes: h.por_mes,
    })),
  );
  const [dia, setDia] = useState<string>('');
  const [hora, setHora] = useState('');
  const [duracion, setDuracion] = useState('');
  // Cuántas veces por mes se da ESE día. Vacío = todas las semanas, que es lo
  // normal y por eso es lo que viene puesto.
  const [cada, setCada] = useState('');
  const [online, setOnline] = useState(grupo?.online ?? false);
  const [enlace, setEnlace] = useState(grupo?.meeting_url ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // --------------------------------------------------------------------
  // EL ALUMNO DE LA PARTICULAR
  //
  // Una particular es una ficha por arreglo, así que crear la ficha y no
  // decir de quién es deja a la mitad algo que es una sola cosa. Se pregunta
  // acá y se anota en el mismo guardado.
  //
  // Solo al CREAR. Editar una particular es cambiarle el horario o el precio;
  // cambiar de alumno sería otra particular.
  // --------------------------------------------------------------------
  // Una particular puede ser uno a uno o un grupito: una pareja, un trío que
  // comparte la hora. Por eso es una LISTA y no un alumno. El cupo sale de
  // acá —es cuánta gente hay— y no de un número aparte que puede contradecirla.
  type Participante = { alumnoId: string | null; nombre: string; email: string };
  const alumnos = useCarga(() => traerAlumnos(espacio.id), [espacio.id]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');

  // "Juan", "Juan y María", "Juan, María y Pedro".
  function enLista(ps: Participante[]) {
    const ns = ps.map((x) => x.nombre.trim()).filter(Boolean);
    if (ns.length === 0) return '';
    if (ns.length === 1) return ns[0];
    return ns.slice(0, -1).join(', ') + ' y ' + ns[ns.length - 1];
  }

  // El nombre del grupo se arma solo mientras no lo toques a mano.
  function conParticipantes(siguiente: Participante[]) {
    setParticipantes(siguiente);
    setNombre((n) =>
      !n || n.startsWith('Particular — ')
        ? (siguiente.length ? `Particular — ${enLista(siguiente)}` : '')
        : n,
    );
  }

  function sumarExistente(id: string) {
    const a = (alumnos.datos ?? []).find((x) => x.id === id);
    if (!a || participantes.some((x) => x.alumnoId === a.id)) return;
    conParticipantes([...participantes, { alumnoId: a.id, nombre: a.full_name, email: '' }]);
  }

  function sumarNuevo() {
    if (!nuevoNombre.trim() || !nuevoEmail.trim()) return;
    conParticipantes([
      ...participantes,
      { alumnoId: null, nombre: nuevoNombre.trim(), email: nuevoEmail.trim() },
    ]);
    setNuevoNombre('');
    setNuevoEmail('');
  }

  // --------------------------------------------------------------------
  // CÓMO SE ARMAN LAS FECHAS
  //
  // No es una columna nueva: es cómo se lee la combinación de día fijo y
  // fecha de fin, que ya existen. Se expone como una pregunta porque es LA
  // pregunta de una formación —"¿esto es un workshop, un taller de cuatro
  // semanas, o fechas sueltas?"— y pedirla como "día fijo (opcional)" obliga
  // al profesor a traducir él su propio producto.
  //
  //   un taller      → un solo día.   sin día fijo, arranca = termina
  //   varias clases  → un programa.    con fin; con o sin día fijo
  //
  // Eran tres y ahora son dos, y la que se fue —"fechas sueltas"— no era una
  // tercera forma: era la misma de varias clases sin día fijo. Preguntarla
  // como opción propia obligaba a elegir entre dos cosas que no se excluyen
  // ("es semanal" y "son fechas sueltas" responden preguntas distintas).
  // Ahora el día fijo se pregunta adentro, que es donde vive: define si las
  // clases se crean solas o las cargás vos, no qué producto es.
  // --------------------------------------------------------------------
  // --------------------------------------------------------------------
  // CÓMO SE DA UNA PARTICULAR
  //
  // Son dos productos distintos y hasta ahora la app los trataba igual, con
  // un "días y horarios (opcional)" que el profesor tenía que interpretar:
  //
  //   fijas   — todos los martes de 15 a 16, sin fecha de fin. Las clases se
  //             generan solas, como un grupo regular.
  //   pedido  — "quiero cuatro clases". Las fechas se acuerdan y se cargan a
  //             mano, y NADA se genera solo: cuando se terminan, se terminan.
  //
  // Vacío-o-lleno decía lo mismo pero no lo preguntaba, y un campo opcional
  // no es una decisión: es un campo que te olvidás de llenar.
  // --------------------------------------------------------------------
  type Ritmo = 'fijas' | 'pedido';
  const [ritmo, setRitmo] = useState<Ritmo>(
    grupo ? ((grupo.horarios ?? []).length > 0 ? 'fijas' : 'pedido') : 'fijas',
  );
  // Las fechas sueltas del paquete, mientras se está creando.
  const [fechas, setFechas] = useState<string[]>([]);
  const [fecha1, setFecha1] = useState('');

  type Forma = 'unico' | 'varias';
  const formaInicial: Forma =
    grupo && grupo.start_date && grupo.start_date === grupo.end_date ? 'unico' : 'varias';
  const [forma, setForma] = useState<Forma>(formaInicial);

  const esRegular = formato === 'regular';
  const esFormacion = formato === 'cycle';
  const esParticular = formato === 'private';

  // El día fijo lo pide el regular siempre, la formación solo si es semanal, y
  // la particular solo si elegiste que sea fija.
  const pideDiaFijo = esRegular || (esFormacion && forma === 'varias')
    || (esParticular && ritmo === 'fijas');
  // Y las fechas a dedo, solo la particular por pedido mientras se crea.
  const pideFechas = esParticular && ritmo === 'pedido' && !grupo;
  // El precio del paquete: una formación, o una particular por pedido.
  const pidePaquete = esFormacion || (esParticular && ritmo === 'pedido');
  const conDiaFijo = pideDiaFijo && horarios.length > 0;

  // "mar 12/11" — corto porque son chips y entran varios en una fila.
  function fechaCorta(iso: string) {
    const [, m, d] = iso.split('-');
    return `${diaSemana(iso).slice(0, 3)} ${d}/${m}`;
  }

  function sumarFecha() {
    if (!fecha1 || fechas.includes(fecha1)) return;
    setFechas((xs) => [...xs, fecha1].sort());
    setFecha1('');
  }

  function agregarHorario() {
    if (dia === '' || !hora) return;
    const nuevo: DatosHorario = {
      weekday: Number(dia),
      start_time: hora,
      duration_min: duracion ? Number(duracion) : null,
      por_mes: cada ? Number(cada) : null,
    };
    if (horarios.some((h) => h.weekday === nuevo.weekday && h.start_time === nuevo.start_time)) {
      return;
    }
    setHorarios((hs) =>
      [...hs, nuevo].sort(
        (a, b) => a.weekday - b.weekday || (a.start_time ?? '').localeCompare(b.start_time ?? ''),
      ),
    );
    setDia('');
    setHora('');
  }

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
      if (esFormacion && forma === 'unico' && !desde) {
        return 'Un taller de un día necesita la fecha en que se da.';
      }
      if (esFormacion && forma === 'varias' && !hasta) {
        return 'Un taller de varias clases necesita fecha de término: es lo que define cuánto dura.';
      }
      if (esFormacion && forma === 'unico' && !pagoUnico) {
        return 'Un taller de un día se cobra entero: poné el precio del taller.';
      }
      if (esFormacion && forma === 'varias' && !porClase && !pagoUnico) {
        return 'Poné al menos un precio: por clase, el taller entero, o los dos.';
      }
      if (esParticular && ritmo === 'pedido' && !porClase && !pagoUnico) {
        return 'Poné al menos un precio: por clase, el paquete entero, o los dos.';
      }
      if (!pidePaquete && !porClase && !porMes) {
        return 'Poné al menos un precio: por clase, por mes, o los dos.';
      }
      if (!grupo && esParticular && participantes.length === 0) {
        return 'Una particular es de alguien: sumá al menos un alumno.';
      }
      if (!grupo && esParticular && nuevoNombre.trim() && !nuevoEmail.trim()) {
        return 'Falta el correo de ese alumno: es con lo que entra a ver sus clases y sus pagos.';
      }
      if (!grupo && esParticular && (nuevoNombre.trim() || nuevoEmail.trim())) {
        return 'Te quedó un alumno escrito sin sumar. Tocá "Sumar este alumno" o borralo.';
      }
      if (esRegular && horarios.length === 0) {
        return 'Un grupo regular necesita al menos un día fijo. Sin eso habría que cargar cada clase a mano, todas las semanas, para siempre.';
      }
      // Solo si el bloque está a la vista: un día a medio escribir que después
      // escondiste al cambiar de formato no es un error, es algo que ya no existe.
      if (pideDiaFijo && dia !== '' && !hora) {
        return 'Elegiste un día pero falta la hora. Completala y tocá "Sumar este día".';
      }
      if (pideDiaFijo && dia !== '' && hora) {
        return 'Te quedó un día sin sumar. Tocá "Sumar este día" o borrá el día.';
      }
      if (pideFechas && fecha1) {
        return 'Te quedó una fecha sin sumar. Tocá "Sumar esta fecha" o borrala.';
      }
      return null;
    })();

    if (falta) {
      setError(falta);
      setGuardando(false);
      return;
    }

    // Un encuentro único empieza y termina el mismo día: eso es lo que hace
    // que no se le genere nada después.
    const arranca = esFormacion && forma === 'unico' ? desde : (desde || null);
    const termina = esFormacion
      ? (forma === 'unico' ? desde : hasta || null)
      : null;

    const datos: DatosGrupo = {
      name: nombre.trim(),
      format: formato,
      level: esParticular ? null : (nivel.trim() || null),
      // En una particular el cupo ES la gente que estás anotando. Al editar
      // no se vuelve a preguntar, así que se respeta el que ya tenía.
      capacity: esParticular
        ? (grupo ? grupo.capacity : (participantes.length || null))
        : (cupo ? Number(cupo) : null),
      start_date: arranca,
      end_date: termina,
      venue: pideLugar ? (estudio.trim() || null) : null,
      address: pideLugar ? (direccion.trim() || null) : null,
      horarios: pideDiaFijo ? horarios : [],
      price_per_session: porClase ? Number(porClase) : null,
      // Lo que no se pregunta no se guarda. Una formación y una particular
      // por pedido no tienen cuota mensual: dejar un precio viejo ahí sería
      // ofrecerle al alumno una forma de pago que la pantalla no muestra.
      price_per_period: !pidePaquete && porMes ? Number(porMes) : null,
      price_one_time: pidePaquete && pagoUnico ? Number(pagoUnico) : null,
      online: esParticular && online,
      meeting_url: esParticular && online ? (enlace.trim() || null) : null,
    };

    try {
      const g = grupo
        ? await editarGrupo(grupo.id, datos)
        : await crearGrupo(espacio.id, datos);

      // Y si es una particular nueva, se anota a toda la gente de una. La
      // forma de cobro es la primera que tenga precio: en una particular hay
      // una sola cargada casi siempre, y preguntarla sería preguntar algo con
      // una sola respuesta posible.
      // Las fechas del paquete, antes de anotar a nadie: así el primer cargo
      // por clase ya tiene a qué clase apuntar.
      if (pideFechas && fechas.length > 0) {
        await crearClases(espacio.id, fechas.map((f) => ({
          group_id: g.id,
          date: f,
          start_time: hora || null,
          duration_min: duracion ? Number(duracion) : null,
          title: null,
        })));
      }

      if (!grupo && esParticular) {
        const modo = (['per_session', 'per_period', 'one_time'] as ModoCobro[])
          .find((m) => precioDelGrupo(g, m) !== null);

        for (const quien of participantes) {
          const alumnoId =
            quien.alumnoId ??
            (await crearAlumno(espacio.id, {
              full_name: quien.nombre,
              email: quien.email || null,
            })).id;

          if (alumnoId && modo) {
            await inscribir(espacio.id, {
              group_id: g.id,
              student_id: alumnoId,
              billing_mode: modo,
            });
          }
        }
      }

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
  //
  // Y cuántas clases hay de verdad al año, que es lo que estaba faltando: un
  // martes y jueves a $15.000 cuesta $30.000 por semana viniendo suelto, y
  // un martes por medio cuesta $30.000 por MES. La cuenta contra 52 clavado
  // le decía al profesor que una cuota de $100.000 era cara cuando era un
  // 23% de descuento, y en el caso quincenal le diría lo contrario.
  const clasesAlAnio = clasesPorAnioDe(horarios);
  const comparacion = compararFormas(
    Number(porClase) || null, Number(porMes) || null, clasesAlAnio,
  );
  const clasesAlMes = clasesAlAnio / MESES_POR_ANIO;

  // La cuenta que decide en un taller: ¿pagar el entero conviene o no? Si no
  // conviene, nadie lo va a elegir y el profesor no cobra nada por adelantado
  // — que es justamente para lo que puso ese precio.
  const ayudaDelTaller = (() => {
    const suelto = Number(porClase);
    const entero = Number(pagoUnico);
    const cosa = esFormacion ? 'el taller' : 'el paquete';
    if (!suelto || !entero) {
      return 'Opcional. Si lo ponés, el alumno puede pagar todo junto en vez de clase a clase.';
    }
    const clasesQueCubre = Math.round((entero / suelto) * 10) / 10;
    return `Con este precio, pagar ${cosa} entero le sale como ${clasesQueCubre} clases sueltas. `
      + `Si ${cosa} tiene más clases que eso, le conviene — y a vos te deja la plata por adelantado.`;
  })();

  const ayudaDelMes = (() => {
    if (!comparacion) {
      return 'Con el descuento ya aplicado. Es el precio final, no un porcentaje.';
    }
    // Cuando el horario no es "una vez por semana", decir cuántas clases son:
    // es de dónde sale el número que viene después, y sin eso parece sacado
    // de la galera.
    const base = clasesAlAnio !== 52
      ? `Con este horario son ${Math.round(clasesAlMes * 10) / 10} clases por mes, `
        + `así que suelto le saldrían ${plata(Number(porClase) * clasesAlMes)} al mes. `
      : '';
    // Cuando el precio no funciona, decirle cuál sí — no solo que está mal.
    if (!comparacion.conviene) {
      return base
        + 'Con este precio la cuota le sale más que venir suelto, así que nadie la va '
        + `a elegir. Para que tenga sentido tiene que quedar por debajo de `
        + `${plata(comparacion.cuotaSinDescuento)}.`;
    }
    return base
      + `Con tu cuota cada clase le sale ${plata(comparacion.porClaseConCuota)} en vez de `
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
            forma === 'unico'
              ? 'Un solo día. Se cobra entero y por adelantado.'
              : 'Un programa con principio y fin. Si tiene día fijo las clases se crean solas; si no, las cargás vos.'
          }
        >
          <Opciones<Forma>
            valor={forma}
            alElegir={setForma}
            opciones={[
              { valor: 'unico', texto: 'Un taller' },
              { valor: 'varias', texto: 'Taller de varias clases' },
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
      {/* ------------------------------------------------------------------
          DE QUIÉN ES ESTA PARTICULAR

          Va arriba, antes del horario y del precio, porque es lo primero que
          define la ficha: "Particular — Juan" es de Juan. Antes había que
          crear el grupo y después entrar a anotarlo, dos pasos para una cosa
          sola.
         ------------------------------------------------------------------ */}
      {!grupo && esParticular && (
        <div className="flex flex-col gap-3 rounded-xl border border-contorno bg-panel p-3.5 shadow-apoyo">
          <p className="text-sm font-medium text-tinta">¿Para quién es?</p>

          {participantes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {participantes.map((x, i) => (
                <button
                  key={x.alumnoId ?? `nuevo-${i}`}
                  type="button"
                  onClick={() => conParticipantes(participantes.filter((_, j) => j !== i))}
                  className="inline-flex items-center gap-1.5 rounded-full bg-acento-suave px-3 py-1.5 text-sm font-medium text-acento transition hover:brightness-[0.97]"
                >
                  {x.nombre}
                  {x.alumnoId === null ? ' (nuevo)' : ''}
                  <span aria-hidden="true" className="text-base leading-none">×</span>
                </button>
              ))}
            </div>
          )}

          {/* Los que ya están en tu escuela: un toque y entran a la lista.
              El select vuelve a "Elegí…" porque no es un valor elegido, es
              una acción. */}
          <Campo etiqueta="Alguien que ya tenés">
            <select
              value=""
              onChange={(e) => { if (e.target.value) sumarExistente(e.target.value); }}
              className="w-full rounded-xl border border-linea bg-campo px-3.5 py-2.5 text-tinta outline-none transition focus:border-acento focus:ring-4 focus:ring-acento/15"
            >
              <option value="">Elegí de tu escuela…</option>
              {(alumnos.datos ?? [])
                .filter((a) => !participantes.some((x) => x.alumnoId === a.id))
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
            </select>
          </Campo>

          {/* Y los que todavía no tenés. Mismo patrón que los horarios: se
              arma uno, se suma a la lista, y la lista es lo que se guarda. */}
          <div className="flex flex-col gap-3 rounded-xl border border-contorno bg-fondo p-3">
            <p className="text-sm text-tenue">O cargá uno que todavía no tenés:</p>
            <Campo etiqueta="Nombre">
              <Texto
                value={nuevoNombre}
                placeholder="Juan Pérez"
                onChange={(e) => setNuevoNombre(e.target.value)}
              />
            </Campo>
            <Campo
              etiqueta="Correo"
              ayuda="Es con lo que entra a su app a ver sus clases y lo que debe. Sin correo, la ficha existe pero la persona no puede entrar nunca."
            >
              <Texto
                type="email" value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sumarNuevo(); } }}
              />
            </Campo>
            <BotonSecundario
              type="button"
              onClick={sumarNuevo}
              disabled={!nuevoNombre.trim() || !nuevoEmail.trim()}
              className="w-full"
            >
              + Sumar este alumno
            </BotonSecundario>
          </div>

          <p className="text-xs leading-relaxed text-tenue">
            {participantes.length <= 1
              ? 'Uno a uno, o sumá a los que compartan la hora: una pareja, un trío. Todos pagan el mismo precio del grupo.'
              : `${participantes.length} personas comparten esta hora. A cada una se le genera su propio cargo con el precio de abajo.`}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------
          FIJAS O POR PEDIDO

          La pregunta que decide si esta particular se mantiene sola o se
          agota. Antes se deducía de si el profesor había llenado o no un
          campo opcional, que es pedirle que adivine qué significa dejarlo
          vacío.
         ------------------------------------------------------------------ */}
      {esParticular && (
        <Campo
          etiqueta="¿Cómo se dan?"
          ayuda={ritmo === 'fijas'
            ? 'Siempre el mismo día y la misma hora, sin fecha de fin. Las clases de los próximos dos meses se crean solas.'
            : 'El alumno pide una cantidad y acuerdan las fechas. No se genera nada solo: cuando se terminan las clases cargadas, se terminan.'}
        >
          <Opciones<Ritmo>
            valor={ritmo}
            alElegir={setRitmo}
            opciones={[
              { valor: 'fijas', texto: 'Fijas' },
              { valor: 'pedido', texto: 'Por pedido' },
            ]}
          />
        </Campo>
      )}

      {/* ------------------------------------------------------------------
          LAS FECHAS DEL PAQUETE

          Misma tarjeta, mismo patrón que los horarios: se arma una y se suma
          a la lista. La hora y la duración son las mismas para todas —si una
          va a otro horario, se corrige después desde el grupo— porque pedir
          tres campos por fecha para cuatro fechas es pedir doce campos.
         ------------------------------------------------------------------ */}
      {pideFechas && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-tinta">Las fechas</p>

          {fechas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {fechas.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFechas((xs) => xs.filter((x) => x !== f))}
                  className="inline-flex items-center gap-1.5 rounded-full bg-acento-suave px-3 py-1.5 text-sm font-medium text-acento transition hover:brightness-[0.97]"
                >
                  {fechaCorta(f)}
                  <span aria-hidden="true" className="text-base leading-none">×</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-2xl border border-contorno bg-panel p-3.5 shadow-apoyo">
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Hora">
                <Texto type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
              </Campo>
              <Campo
                etiqueta="Duración"
                ayuda={(() => {
                  const d = duracionEnPalabras(Number(duracion));
                  return d ? `Son ${d}.` : 'En minutos.';
                })()}
              >
                <Texto
                  type="number" min="15" step="15" value={duracion}
                  placeholder="60"
                  onChange={(e) => setDuracion(e.target.value)}
                />
              </Campo>
            </div>

            <Campo etiqueta="Fecha">
              <Texto
                type="date" value={fecha1}
                onChange={(e) => setFecha1(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sumarFecha(); } }}
              />
            </Campo>

            <BotonSecundario
              type="button" onClick={sumarFecha} disabled={!fecha1}
              className="w-full"
            >
              + Sumar esta fecha
            </BotonSecundario>
          </div>

          <p className="text-xs leading-relaxed text-tenue">
            {fechas.length === 0
              ? 'Si todavía no las acordaron, creala igual y cargalas después desde el grupo, con "Agregar fechas".'
              : `${fechas.length} ${fechas.length === 1 ? 'clase' : 'clases'}. Se crean junto con la particular, y no aparece ninguna más sola.`}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------
          EL HORARIO, QUE ES UNA LISTA

          Un taller de martes y jueves no es "un día fijo con una excepción":
          son dos encuentros semanales, cada uno con su hora. Por eso se
          agregan de a uno a una lista en vez de llenar un solo renglón.

          Vacía, el grupo no genera nada solo y las clases se cargan a mano.
          Para un regular eso no se permite: sería cargar cada clase, todas
          las semanas, para siempre.
         ------------------------------------------------------------------ */}
      {pideDiaFijo && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-tinta">
            {esRegular ? 'Días y horarios' : 'Días y horarios (opcional)'}
          </p>

          {horarios.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {horarios.map((h) => (
                <button
                  key={`${h.weekday}-${h.start_time}`}
                  type="button"
                  onClick={() =>
                    setHorarios((hs) =>
                      hs.filter((x) => !(x.weekday === h.weekday && x.start_time === h.start_time)),
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-acento-suave px-3 py-1.5 text-sm font-medium text-acento transition hover:brightness-[0.97]"
                >
                  {NOMBRE_DIA[h.weekday]} {h.start_time?.slice(0, 5)}
                  {h.duration_min ? ` · ${h.duration_min}min` : ''}
                  {h.por_mes ? ` · ${h.por_mes}/mes` : ''}
                  <span aria-hidden="true" className="text-base leading-none">×</span>
                </button>
              ))}
            </div>
          )}

          {/* Los tres campos y el botón viven dentro de la misma tarjeta: son
              UN horario que se está armando, no tres campos sueltos del
              formulario. Al lado de "Duración" el botón parecía agregar la
              duración; abajo y a lo ancho de la tarjeta, lo que agrega es la
              tarjeta entera, y el texto lo dice. */}
          <div className="flex flex-col gap-3 rounded-2xl border border-contorno bg-panel p-3.5 shadow-apoyo">
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Día">
                <select
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  className="w-full rounded-xl border border-linea bg-campo px-3.5 py-2.5 text-tinta outline-none transition focus:border-acento focus:ring-4 focus:ring-acento/15"
                >
                  <option value="">Elegí</option>
                  {NOMBRE_DIA.map((n, i) => (
                    <option key={i} value={i}>{n}</option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Hora">
                <Texto type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
              </Campo>
            </div>

            {/* La ayuda traduce mientras escribís: "90" es un número, "1
                hora y media" es la clase. Así el profe se da cuenta ahí mismo
                si puso 90 queriendo decir 9 y media. */}
            <Campo
              etiqueta="Duración"
              ayuda={(() => {
                const p = duracionEnPalabras(Number(duracion));
                return p ? `Son ${p}.` : 'En minutos.';
              })()}
            >
              <Texto
                type="number" min="15" step="15" value={duracion}
                placeholder="90"
                onChange={(e) => setDuracion(e.target.value)}
              />
            </Campo>

            {/* CUÁNTAS VECES POR MES, que es lo tercero que define un día
                fijo y hasta ahora se daba por sentado. "Los martes de 15 a 16"
                y "un martes por medio" son el mismo día y la misma hora, y la
                app las trataba igual: generaba los cuatro martes. Al alumno
                que pactó dos le aparecían cuatro clases y cuatro cargos. */}
            <Campo
              etiqueta="Cada cuánto"
              ayuda={cada === '2'
                ? 'El 1º y el 3º del mes: un día por medio.'
                : cada === '1'
                  ? 'Solo el 1º del mes.'
                  : cada === '4'
                    ? 'Los primeros 4 del mes. Cuando el mes tiene un quinto, ese no se da.'
                    : cada === '3'
                      ? 'Los primeros 3 del mes.'
                      : 'Todas las semanas, sin saltearse ninguna.'}
            >
              <select
                value={cada}
                onChange={(e) => setCada(e.target.value)}
                className="w-full rounded-xl border border-linea bg-campo px-3.5 py-2.5 text-tinta outline-none transition focus:border-acento focus:ring-4 focus:ring-acento/15"
              >
                <option value="">Todas las semanas</option>
                <option value="4">4 veces por mes</option>
                <option value="3">3 veces por mes</option>
                <option value="2">2 veces por mes</option>
                <option value="1">1 vez por mes</option>
              </select>
            </Campo>

            <BotonSecundario
              type="button"
              onClick={agregarHorario}
              disabled={dia === '' || !hora}
              className="w-full"
            >
              + Sumar este día a la lista
            </BotonSecundario>
          </div>

          <p className="text-xs leading-relaxed text-tenue">
            {horarios.length === 0
              ? esParticular
                ? 'Sin horario fijo vas cargando cada clase cuando la acordás con el alumno.'
                : 'Agregá al menos uno. Las clases de los próximos dos meses se crean solas.'
              : 'Las clases de los próximos dos meses se crean solas. Si un día no se da, se cancela esa clase.'}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------
          Los precios son del grupo, no de cada alumno. Lo que elige el alumno
          al inscribirse es cuál de estas dos formas usa.
         ------------------------------------------------------------------ */}
      {!(esFormacion && forma === 'unico') && (
        <p className="rounded-xl border border-contorno bg-panel px-3.5 py-2.5 text-xs leading-relaxed text-tenue shadow-apoyo">
          {esFormacion
            ? 'Si ponés los dos precios, el alumno elige: paga clase a clase o el taller entero. Que el entero convenga es lo que hace que elija eso, y vos cobrás por adelantado.'
            : esParticular && ritmo === 'pedido'
              ? 'Si ponés los dos precios, el alumno elige: paga cada clase o el paquete entero. Que el paquete convenga es lo que hace que elija eso, y vos cobrás por adelantado.'
              : 'El alumno elige cómo paga. Si la cuota mensual le conviene, se compromete al mes entero y vos sabés con cuánto contás; si no, va a venir suelto cuando tenga ganas. El descuento del mes es tu herramienta para eso.'}
        </p>
      )}

      {/* ------------------------------------------------------------------
          LOS PRECIOS, SEGÚN QUÉ SE VENDE

          No son tres casilleros que se llenan siempre. Cada formato se cobra
          de una manera y las otras no aplican:

            Taller de un día  → entero. Por clase o por mes no quieren decir
                                nada cuando hay una sola clase y un solo mes.
            Taller de varias  → por clase, o el taller entero. NO por mes: un
                                programa de seis semanas no se factura en
                                meses, y cobrarlo entero es lo que le asegura
                                al profesor la plata por adelantado.
            Regular / particular → por clase o por mes, que es la decisión que
                                después toma el alumno.
         ------------------------------------------------------------------ */}
      {esFormacion && forma === 'unico' ? (
        <Campo
          etiqueta="Precio del taller"
          ayuda="Se cobra entero y vence el día que el alumno se anota."
        >
          <Texto
            type="number" min="0" step="any" required value={pagoUnico}
            onChange={(e) => setPagoUnico(e.target.value)}
          />
        </Campo>
      ) : (
        <>
          <Campo
            etiqueta="Precio por clase"
            ayuda={esFormacion ? 'Para quien prefiere pagar clase a clase.' : undefined}
          >
            <Texto
              type="number" min="0" step="any" value={porClase}
              onChange={(e) => setPorClase(e.target.value)}
            />
          </Campo>

          {pidePaquete ? (
            <Campo
              etiqueta={esFormacion
                ? 'Precio del taller entero (opcional)'
                : 'Precio del paquete entero (opcional)'}
              ayuda={ayudaDelTaller}
            >
              <Texto
                type="number" min="0" step="any" value={pagoUnico}
                onChange={(e) => setPagoUnico(e.target.value)}
              />
            </Campo>
          ) : (
            <Campo etiqueta="Precio del mes" ayuda={ayudaDelMes}>
              <Texto
                type="number" min="0" step="any" value={porMes}
                onChange={(e) => setPorMes(e.target.value)}
              />
            </Campo>
          )}
        </>
      )}

      {/* Las fechas van ACÁ y no al final del formulario. En una formación son
          lo que define el producto —un programa de dos meses— y además lo que
          hace que las clases dejen de generarse solas cuando termina. Estaban
          abajo de "Cupo (opcional)", tratadas como un detalle. */}
      {esFormacion && forma === 'unico' && (
        <Campo etiqueta="Qué día es" ayuda="Empieza y termina el mismo día, así no se le genera nada después.">
          <Texto type="date" required value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Campo>
      )}

      {esFormacion && forma === 'varias' && (
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

      {/* En una particular no se pregunta: el cupo es la gente que anotaste
          arriba. Un número aparte podía contradecir a la lista, y entre los
          dos no hay forma de saber cuál manda. */}
      {!esParticular && (
        <Campo etiqueta="Cupo" ayuda="Cuántos entran. Al anotar a alguien con el grupo lleno, la app te avisa.">
          <Texto
            type="number" min="1" required value={cupo}
            onChange={(e) => setCupo(e.target.value)}
          />
        </Campo>
      )}

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
