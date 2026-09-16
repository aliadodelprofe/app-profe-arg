# Estado del proyecto

> Actualizado: 4 de septiembre de 2026

Este archivo dice **dónde estamos parados y cuál es el próximo paso**.
El contexto del producto (qué es, precios, modelo de datos, reglas de seguridad)
está en `CLAUDE.md`, en la raíz.

---

## Infraestructura

| Qué | Dónde |
|---|---|
| Repositorio | `github.com/aliadodelprofe/app-profe-arg` (privado) |
| Base de datos | Supabase, org propia, proyectos `aliado-dev` y `aliado-prod`, región São Paulo |
| App vieja (en producción) | tabachata-academy.com — Firebase. **Congelada**, solo bugs críticos |

**Seguridad de los proyectos Supabase:** Data API, expose new tables y automatic RLS activados en ambos. La integración con GitHub NO está conectada, a propósito.

**Usuarios de prueba en `aliado-dev`:** `profe1@prueba.com`, `profe2@prueba.com` y `alumno1@prueba.com`.

---

## Cómo se levanta la app

```
cd ~/Documents/GitHub/app-profe-arg
npm run dev
```

| Dirección | Qué carga |
|---|---|
| `localhost:3000/profe` | La app del profesor, contra Supabase |
| `localhost:3000/alumno` | El portal del alumno, contra Supabase |
| cualquier otra | La app de la comunidad, contra Firebase (producción) |

`src/main.tsx` decide cuál montar según la dirección, con import dinámico: entrando
por `/profe` el código de Firebase **no se descarga**, así que no hay forma de tocar
la base de producción mientras se desarrolla.

Las credenciales viven en `.env.local` (fuera de git). Vite las lee **una sola vez al
arrancar**: si se tocan, hay que cortar con `Ctrl+C` y volver a levantar.

Node.js LTS instalado y `@supabase/supabase-js` como dependencia. El proyecto usa
npm; `bun.lock` fue eliminado para no tener dos archivos de candado.

---

## Migraciones aplicadas en `aliado-dev`

| Archivo | Qué hace | Estado |
|---|---|---|
| `0001_fundacion_multitenant.sql` | `tenants`, `tenant_members`, función `my_tenant_ids()`, RLS y políticas, `create_tenant()` | Aplicada |
| `0002_corrige_recursion_politicas.sql` | Fix de recursión infinita (error 42P17). Agrega `my_owned_tenant_ids()` | Aplicada |
| `0003_nucleo_academico.sql` | `students`, `groups`, `sessions`, `enrollments`, `attendance` | Aplicada |
| `0004_cargos_y_pagos.sql` | `charges`, `payments`, `payment_allocations`, vista `student_account` | Aplicada |
| `0005_portal_del_alumno.sql` | Políticas del alumno: cuatro funciones `my_student_*`, nueve reglas de lectura y la de declarar un pago | Aplicada |
| `0006_confirmar_pago.sql` | Función `confirmar_pago()`: marca el pago e imputa el monto a los cargos abiertos, del más viejo al más nuevo | Aplicada |
| `0007_lugar_y_cancelar_clase.sql` | `location` en `groups` y `sessions`, y `sessions.status` para cancelar sin borrar | Aplicada |
| `0008_estudio_y_direccion.sql` | `location` pasa a `address` y se agrega `venue` (nombre del estudio) en los dos niveles | Aplicada |
| `0009_horario_del_grupo.sql` | `weekday`, `default_start_time` y `default_duration_min` en `groups`: el horario fijo | Aplicada |
| `0010_precios_del_grupo.sql` | Los tres precios en `groups`, uno por forma de pago. Corrige tener el precio en la inscripción | Aplicada |
| `0011_cargos_automaticos.sql` | Elimina `enrollments.agreed_price` y agrega `asegurar_cargos()`: toda inscripción activa tiene un cargo por lo que viene | Aplicada |
| `0012_cargos_respetan_el_fin.sql` | `asegurar_cargos()` deja de generar después de la fecha de fin de la inscripción | Aplicada |
| `0013_enlazar_alumno_con_usuario.sql` | `reclamar_ficha()`: enlaza al alumno registrado con las fichas que tengan su correo **confirmado** | Aplicada |
| `0014_comprobantes.sql` | Depósito privado `comprobantes` y sus reglas: el alumno sube y ve los suyos, el profesor ve los de sus espacios, nadie borra | Aplicada |
| `0015_invitaciones.sql` | El alumno acepta antes de quedar anotado. Reemplaza `reclamar_ficha()` por invitaciones que se aceptan o se rechazan | Aplicada |

**Nada se aplicó todavía en `aliado-prod`.**

---

## Cómo se corre una migración

1. Abrir el `.sql` de `supabase/migrations/`
2. Supabase → proyecto `aliado-dev` → **SQL Editor** → **New query** → *Create a new snippet*
3. Pegar todo y **Run**
4. Correr después `supabase/tests/control_general.sql`

**Regla:** una migración ya aplicada **nunca se edita**. Las correcciones van en un archivo nuevo y numerado.

---

## Pruebas

| Archivo | Cuándo correrlo |
|---|---|
| `supabase/tests/control_general.sql` | Después de **cada** migración. Ninguna tabla puede decir `ABIERTA` |
| `supabase/tests/aislamiento.sql` | La prueba de los dos profesores sobre `tenants` y `tenant_members`. La Parte 1 se corre una sola vez; la Parte 2 es repetible |
| `supabase/tests/aislamiento_cargos.sql` | La misma prueba sobre las tablas de plata (`charges`, `payments`, `payment_allocations`) y la vista `student_account`. Intenta leer **y escribir** en el espacio ajeno. Repetible |
| `supabase/tests/aislamiento_alumno.sql` | El portal del alumno: que un alumno vea lo suyo y **no lo de su compañero de grupo**. Requiere `alumno1@prueba.com`. Dispara la alerta de Supabase a propósito. Repetible |
| `supabase/tests/confirmar_pago.sql` | La función que mueve plata: que solo la use el profesor dueño, que impute bien y que el doble toque no impute dos veces. Corre dentro de una transacción que se deshace. Repetible |
| `supabase/tests/invitaciones.sql` | Que cada uno vea solo las invitaciones dirigidas a su correo, que aceptar enganche, que no se acepte dos veces y que una rechazada no se pueda aceptar. En una transacción que se deshace. Repetible |
| `supabase/tests/cargos_automaticos.sql` | `asegurar_cargos()`: que genere lo que falta, que llamarla de nuevo no duplique, que respete la baja y la fecha de fin, y que nadie genere cargos en un espacio ajeno. En una transacción que se deshace. Repetible |
| `npm run prueba:fechas` | Las cuentas de fechas del horario fijo (`src/profe/fechas.ts`). No toca la base ni el navegador. Correr después de cualquier cambio ahí |

Últimos resultados (4 de septiembre de 2026):
- `aislamiento.sql` Parte 2 → **3 de 3 PASA**
- `aislamiento_cargos.sql` → **5 de 5 PASA**
- `aislamiento_alumno.sql` → **16 de 16 PASA**
- `confirmar_pago.sql` → **6 de 6 PASA**
- `cargos_automaticos.sql` → **7 de 7 PASA**
- `npm run prueba:fechas` → **18 de 18 PASA**
- `control_general.sql` → **10 tablas en `ok`**

---

## Próximo paso exacto

**El circuito está cerrado de punta a punta, con las dos personas.** El profesor crea su
espacio, sus grupos con horario fijo, anota alumnos y les da de baja, deja que las clases
se generen solas, toma asistencia, escribe el recap y confirma transferencias. El alumno
se registra con su correo, ve sus clases con el lugar y el mapa, lee los recaps, ve lo que
debe, avisa que transfirió y adjunta el comprobante. Los cargos se generan solos. Nada de
esto necesita el SQL Editor.

**Lo que queda, en orden de tamaño:**

| Qué | Tamaño | Nota |
|---|---|---|
| Ingreso con Google para el alumno | Chico | Casi todo configuración en Google Cloud. Google ya verifica el correo, así que entra derecho |
| Imputación dirigida | Chico | Elegir a qué cuota va un pago, en vez del orden automático |
| Tarea programada (`pg_cron`) | Mediano | Resuelve dos de una: generar clases sin depender de que el profe abra la app, y borrar comprobantes a los 6 meses |
| Saldo a favor | Mediano | Toca el modelo. Destraba el pago adelantado, el pack de 4 clases y el sobrante que hoy se informa pero no se guarda |
| Invitación por correo al alumno | Mediano | Necesita un servidor: la `service_role` no puede estar en el navegador |

Las pantallas hechas, en `src/profe/`:

| Pantalla | Qué hace |
|---|---|
| Ingreso | Email y contraseña contra Supabase Auth |
| Espacios | Solo aparece con más de un espacio, o con ninguno (ahí ofrece crear el primero). Con uno solo la app entra derecho a los grupos |
| Grupos | Los grupos del espacio, con su formato |
| Detalle del grupo | Alumnos con su precio y forma de pago (que salen de la inscripción, no del grupo) y las clases con su lugar y su recap. Da de alta alumnos y clases, edita la ficha de un alumno, genera clases en serie, y permite editar o cancelar una clase puntual |
| Asistencia | Presente / ausente / justificado, guardando en cada toque, **con la deuda de cada alumno a la vista**. Al pie, el recap de la clase |
| Quién me debe | Estado de cuenta del espacio sobre la vista `student_account`, separando lo que hay declarado y sin confirmar |
| Pagos por confirmar | Las transferencias declaradas. Un toque llama a `confirmar_pago()` e informa cuánto se imputó y cuánto quedó a favor |

Alta de cargos, en el detalle del grupo: **individual** (con el concepto escrito según
cómo paga ese alumno y el monto que le corresponde) y **la cuota del mes a todo el grupo
de una** — solo a quienes pagan por mes, mostrando a quién y cuánto antes de crear nada,
y sin cobrar dos veces el mismo mes. La cuota vence el **día 1** del mes que cubre.

Decisión tomada el 4/9/2026: **no se migra `AuthContext.tsx`.** Sus 2.929 líneas
manejan diez colecciones de Firestore (`users`, `merch_*`, `convocatorias`,
`notifications`…) que no se cruzan con el modelo nuevo, y nada de eso está en la ruta
a los tres profesores pagando. La app de la comunidad sigue viva en Firebase mientras
tanto, y por eso `announcements` y `benefits` tampoco se migran todavía.

**El portal del alumno existe, en `/alumno`** (13/9/2026). El alumno se registra con su
correo, confirma el mail, y `reclamar_ficha()` lo enlaza con las fichas que sus profesores
cargaron con ese mismo correo. Ve sus próximas clases con el lugar y el mapa, los recaps
de lo que vio, lo que debe, y puede avisar que transfirió.

La confirmación del correo (`Confirm email` en Supabase Auth) **está encendida y no es
opcional**: es el único candado que impide que alguien se registre con el correo de otro
alumno y se quede con su historial. Tiene que estar encendida también en `aliado-prod`.

Falta de los dos caminos de registro que planteó Tomás: el **ingreso con Google** (es
configuración en Google Cloud más un botón; además Google ya verifica el correo, así que
entra derecho) y la **invitación por correo** desde la app del profesor. Esta última
necesita la `service_role`, que no puede estar en el navegador, así que pide un servidor
con su propia protección: es trabajo aparte. Mientras tanto el profesor le dice al alumno
"entrá y registrate con tu mail", que es lo mismo que haría el correo automático.

Nota: `control_general.sql` lista 10 tablas. La vista `student_account` no aparece
ahí y está bien: no es una tabla.

---

## Orden de construcción del producto

1. ~~Multi-tenant con aislamiento probado~~ ✅
2. Formato `regular` — sin esto no hay producto para la mayoría del mercado
3. Conciliación de transferencias
4. Nada más hasta tener **tres profesores pagando**

---

## Decisiones de producto pendientes

Anotadas el 5 de septiembre de 2026, a partir del problema real: **un alumno toma
la clase y se va sin pagar.**

### 1. Saldo a favor del alumno — pieza faltante del modelo

Hoy un pago se imputa a un cargo. Eso deja dos situaciones sin lugar donde vivir:

- El alumno paga **antes** de que exista el cargo. El pago queda flotando, sin nada
  a qué imputarse, y el saldo no lo refleja.
- El **pack de 4 clases** pagado por adelantado. Tomó una, ¿dónde dice que le quedan
  tres? En ningún lado.

Las dos son el mismo concepto: el alumno tiene plata a favor todavía no consumida.
Resolverlo una vez habilita el pago anticipado, el pack y el crédito por una clase
suspendida. Hacerlos por separado deja tres parches sobre un modelo que no los
contempla.

### 2. QR en la puerta — versión dos, no ahora

Idea: que el profe escanee al alumno al entrar y la app diga si pagó o si tiene pack
vigente. La credencial con QR **ya existe** en la app vieja (`DigitalPassModal`,
`QRCodeRenderer`, `PublicMemberVerification`), así que no se arranca de cero.

Lo que le falta para servir: que las fichas estén enlazadas a usuarios
(`students.user_id` sigue vacío) y que exista el saldo a favor del punto 1.

Límite a tener presente: el software no puede impedir que alguien baile. Bloquear es
teatro salvo que haya molinete. Lo que sí puede es que el profe tenga el número
adelante en el momento de tomar asistencia — **eso ya está hecho**.

### 3. Cobro por adelantado con corte antes de la clase — no se adopta por ahora

Idea evaluada: exigir la clase paga hasta una hora antes, para liberar el cupo y ver
anticipadamente cuánta gente viene. Se descartó para esta etapa por tres motivos:

- El corte automático se apoya en una **confirmación manual** del profe. Si el alumno
  transfiere a las 19:00 y el profe confirma a las 19:45, el reloj corre contra el
  alumno por una demora ajena. Un corte duro necesita cobro instantáneo, y el producto
  decidió a propósito no procesar pagos.
- Introduce un concepto que el modelo no tiene: *anotarse a una clase*.
- `CLAUDE.md` posiciona el producto como software de formaciones y grupos, **no de
  reservas**, y la regla 4 dice "nada más hasta tener tres profesores pagando".

### 4. Generación automática de cargos — RESUELTO (8/9/2026), y no por asistencia

Quedó en pausa esperando definir si el cargo nacía al anotarse o al asistir. La respuesta
terminó siendo ninguna de las dos, y es mejor: **no nace de un evento, se verifica como
una regla.**

> Toda inscripción activa tiene un cargo pendiente por lo que viene.

Por clase, el de la próxima clase programada; por mes, el del mes en curso, venciendo el
día 1. La función `asegurar_cargos()` la hace cumplir, y se puede llamar mil veces
seguidas sin duplicar nada.

Por qué así y no por eventos: un evento perdido —se cortó la conexión, el profe no abrió
la app ese día— deja un cargo que no existe y nadie se entera nunca. Verificando, cada vez
que alguien mira se completa lo que falte, y un día sin abrir la app no rompe nada.

**Regla para quien se suma a mitad de mes** (Tomás, 8/9/2026): si el mes ya arrancó, al
que quiere pagar por mes no se le cobra la cuota entera por clases que ya pasaron. Se le
arma lo que queda del mes por clase, y la cuota le empieza el 1 del siguiente. Son dos
inscripciones —una por clase que termina el 30, otra por mes que empieza el 1— y el
modelo ya lo soportaba: una inscripción tiene forma de pago, inicio y fin. El alta de
alumno ofrece las dos opciones y explica qué implica cada una.

Los botones de cobro manual quedan para la excepción: cobrar un mes por adelantado, o un
cargo suelto que no sale de la regla (un workshop, una clase de recuperación).

### 5. Clases en serie para grupos regulares — HECHO (8/9/2026)

Idea de Tomás (5/9/2026): un grupo regular sucede siempre el mismo día, a la misma
hora y en el mismo lugar. El profe debería cargar eso **una sola vez** y que las
clases se creen solas, con la posibilidad de corregir alguna puntual.

Es correcto y aplica justo a `regular`, que es el formato que sí es fijo. Las dos
piezas que faltaban ya están hechas (migraciones 0007 y 0008 más las pantallas):
corregir o cancelar una clase puntual, y el lugar en sus dos niveles.

**Decidido el 7/9/2026: un grupo se junta una sola vez por semana.** Se evaluó guardar
un patrón de repetición con varios días —"Principiantes, martes y jueves"— y se
descartó: si los del martes y los del jueves pueden ser gente distinta, entonces son
dos grupos, porque un grupo es *quiénes cursan juntos*, no el contenido. No hace falta
ninguna tabla de horarios; el generador pregunta día y hora cada vez.

Consecuencia, confirmada por Tomás el 7/9/2026: un alumno que va a los dos días queda
inscripto en los dos grupos y, con cobro mensual, **paga dos cuotas**. Está bien que sea
así. Lo que tiene que poder hacer es pagarlas de una sola vez, o por separado — ver
"Cómo se paga cuando hay varias cuotas", abajo.

**El grupo tiene horario fijo y las clases se mantienen solas.** El profesor carga una
vez día, hora y duración en el grupo (migración 0009), y al abrir el grupo la app
completa lo que falte hasta fin del mes que viene. No hay tarea mensual: cargar clases
todos los meses seguía siendo una tarea mensual aunque fuera con un botón.

Queda además el generador manual, en `DetalleGrupo`, para grupos sin día fijo o para
agregar algo fuera del horario. Pide primera clase, hora, duración y cuántas, y
**muestra las fechas antes de crear nada**: una función que escribe cuatro filas sin que
veas cuáles es una función en la que no se confía.

Dos protecciones: si en alguna de esas fechas ya hay una clase cargada, se marca tachada
y se saltea —generar dos veces el mismo mes es el error más fácil de cometer, y duplicar
clases arrastraría asistencias y cargos duplicados—; y las cuentas de fechas se hacen en
UTC, porque sumar días en hora local corre una fecha cuando cambia el horario de verano
y aparece una clase el lunes que tenía que ser martes.

**Límite conocido: lo que dispara la creación es abrir el grupo en la app**, no un reloj
en un servidor. Hoy alcanza, porque el profesor abre el grupo igual para tomar asistencia
y porque las clases se mantienen hasta fin del *mes que viene* — el 8 de septiembre ya
están todas hasta el 31 de octubre.

Se va a notar cuando exista el **portal del alumno**: si el profesor no abre la app en
mucho tiempo, un alumno podría entrar y no ver sus próximas clases. El alumno no puede
crearlas —no tiene permiso de escritura sobre `sessions`, y está bien que así sea—, así
que ahí va a hacer falta una tarea programada en Postgres (`pg_cron`, que Supabase
soporta) que complete una vez por mes todos los grupos con horario fijo. No se hace antes:
es infraestructura que hay que monitorear, y hasta que no exista el portal del alumno
nadie se choca con el problema.

El aviso de la quinta semana cambió de propósito. Con las clases manteniéndose solas ya
no hace falta para cargarlas; sirve para **el cobro**: un mes con 5 clases al mismo precio
mensual no es lo mismo que uno con 4. El detalle del grupo avisa "este mes tenés 5
clases" para que el profesor decida si las cobra o cancela una — el cobro no se ajusta
solo. En el generador manual el aviso sigue ofreciendo agregar la quinta.

Detalle de diseño, resuelto con Tomás: se generan **4 clases por defecto**, una por
semana. Si en ese mes el día elegido cae 5 veces, la app **se da cuenta y le avisa al
profe**, ofreciéndole agregar la quinta con los mismos datos en vez de hacérsela cargar
a mano. El profe decide; el sistema no inventa una clase de más ni se hace el
distraído.

### 6. Cómo se paga cuando hay varias cuotas

Planteado por Tomás el 7/9/2026. Son tres casos y no corren la misma suerte:

**Un pago que cubre varias cuotas del mismo profesor — ya funciona.** Es lo que hace
`confirmar_pago` (migración 0006): reparte el monto entre todos los cargos abiertos del
alumno, del más viejo al más nuevo, sin importar de qué grupo venga cada uno.

**Un pago que se reparta entre profesores distintos — no es posible.** No es una
limitación de la app sino del medio de cobro: una transferencia va a una cuenta
bancaria. Si el alumno cursa con dos profesores, su plata sale hacia dos CBU distintos.
Partir una transferencia exigiría que el producto procese los pagos y después reparta,
que es justamente lo que `CLAUDE.md` decidió no hacer y lo que sostiene el "sin comisión
por transacción".

Lo viable y valioso es lo otro: que el **portal del alumno** le muestre todo junto —
"le debés $8.000 a Tomás y $6.000 a Carla"— con un botón para pagar cada una. Un tablero
unificado, no una billetera unificada.

**Pagar una cuota puntual — falta, y es chico.** Hoy la imputación es automática y
siempre al cargo más viejo. El alumno no tiene forma de decir "estos $6.000 son la cuota
de jueves". Se resuelve dándole a `confirmar_pago` un cargo objetivo opcional: si viene,
se imputa primero ahí y el resto sigue el orden de siempre.

### 7. Dar de baja a un alumno de un grupo — hecho, con una atadura pendiente

Hecho el 8/9/2026. Son dos acciones distintas y no son intercambiables: **dar de baja**
(cursó y se fue: la inscripción queda terminada con fecha, deja de aparecer para tomar
asistencia, y su historia y su deuda quedan enteras) y **quitar** (fue un error de carga:
se borra). La regla que las separa no es la intención sino el rastro: si de la inscripción
cuelga aunque sea un cargo, no se borra.

**Resuelto el 8/9/2026:** el alta de cargos guarda `enrollment_id`, así que la protección
dejó de ser decorativa. Los cargos viejos, los que vinieron de archivos SQL de prueba, no
lo tienen y por eso no la disparan.

### 8. Pagos parciales: se permiten, no se bloquean (13/9/2026)

Tomás planteó que en regulares y particulares el alumno debería pagar la cuota completa
de una, pero que en Formación tiene sentido señar el cupo con el 50%.

Esa segunda mitad decide la primera: si la seña es válida, los pagos parciales existen y
el sistema tiene que manejarlos — y ya los maneja, porque `confirmar_pago` reparte lo que
venga entre los cargos abiertos. Bloquear montos parciales dejaría afuera la seña y
también al alumno que paga la mitad porque es lo que tiene.

Lo que hace la app en cambio: el total viene puesto por defecto, y si el alumno avisa
menos de lo que debe, se lo dice antes de enviar. Guía, no bloquea.

### 9. Los comprobantes se borran a los 6 meses de confirmado el pago

Decidido por Tomás el 13/9/2026. Hoy el archivo queda en el depósito para siempre, salvo
que alguien lo borre a mano desde el panel.

Por qué conviene borrarlos: ocupan y cuestan —unos 180 MB por año por profesor con 50
alumnos, acumulativos, contra 1 GB del plan gratuito— y son datos personales (nombre,
banco, a veces CBU y CUIT) que dejan de hacer falta.

Por qué se puede sin perder nada: **el registro contable no depende del archivo.** Cuánto
pagó, cuándo, quién lo confirmó y contra qué cargos se imputó vive en las tablas para
siempre. El comprobante sirve para discutir un pago puesto en duda, y esa discusión tiene
fecha de vencimiento.

Qué falta para hacerlo: una tarea programada que borre del depósito los comprobantes de
pagos confirmados hace más de 6 meses y vacíe su `receipt_url`. Es la **misma
infraestructura pendiente** que la generación mensual de clases (`pg_cron`), así que
conviene resolver las dos de una vez.

### 10. Quién crea al alumno, y quién acepta (16/9/2026)

Tomás planteó que el profesor no debería poder crear usuarios de alumno, que el alumno se
registre primero y que el profesor lo busque en un directorio por @usuario, con aceptación
del alumno.

**Aclaración que resolvió la mitad:** el profesor nunca creó usuarios. Al "anotar un
alumno" se crea un **renglón en su lista** —un nombre y, si lo tiene, un correo—, no una
cuenta: no tiene contraseña y nadie puede entrar con eso. La cuenta la crea siempre la
persona. La confusión venía del botón, que decía "alumno" y hacía pensar en una cuenta.

**Lo que se adoptó: la aceptación.** Antes, quien se registraba con un correo que
coincidía quedaba anotado en silencio, con cargos generándose a su nombre. Ahora la app le
muestra quién lo anotó, con qué nombre y en qué grupos, y espera un sí. Migración 0015.

**Lo que NO se adoptó, y por qué:**

- *Que el alumno tenga que registrarse antes de que el profesor pueda anotarlo.* Dejaría al
  profesor con la lista vacía la primera noche, sin poder tomar asistencia ni ver quién le
  debe hasta que veinte personas se registren. Un profesor que no pudo usar la app la
  primera noche difícilmente vuelva la segunda, y el objetivo son tres profesores pagando.
- *El directorio de @usuarios.* Un buscador global de personas es una superficie que hoy no
  existe, en una app que guarda historiales de pago: cualquiera registrado como profesor
  podría recorrer la base de usuarios. Además suma un paso al registro. Si algún día la
  fricción del correo se vuelve un problema medible, se revisa.

En su lugar, para encontrar a alguien que ya existe alcanza con el **correo exacto**, que
el profesor ya conoce porque es su alumno, y la app responde "existe" o "no existe" sin
devolver nunca una lista de personas.

---

## Errores encontrados y qué enseñaron

### Una prueba que leía a través del candado que estaba probando (16/9/2026)

`invitaciones.sql` verificaba que rechazar una invitación dejara la marca
`invite_rejected_at`, leyéndola **desde la sesión del alumno**. Dio FALLA. La función
estaba bien: una ficha rechazada tiene `user_id` vacío, así que ya no es del alumno y la
política de la 0005 no lo deja leerla. La consulta no devolvió filas, la variable quedó en
nulo, y la prueba lo interpretó como que la marca no se había guardado.

Se notaba en la propia línea de error: decía "marca vacía" y a la vez "quedan 0
invitaciones" — si el rechazo no hubiera funcionado, esa invitación seguiría en la lista.

**La lección:** una prueba que verifica un dato mirándolo a través del mismo candado que
está probando se miente a sí misma, y en la dirección más peligrosa — también podría dar
PASA por no ver nada. Lo que se comprueba desde la sesión de alguien es lo que esa persona
**puede** o **no puede** hacer; el estado que quedó en la base se mira sin candado.

### RLS protege filas, no columnas (16/9/2026)

Al armar la edición de la ficha se agregó un campo de **notas** con la leyenda "Para vos.
El alumno no las ve". Era falso. La política `un alumno ve su propia ficha` (migración
0005) le permite leer **toda la fila** de `students`: Postgres decide por fila, no por
columna. Que la app del alumno pida solo nombre y escuela es cortesía del código, no
protección de la base — con la consola del navegador abierta se leen todas las columnas.

El campo se sacó antes de usarlo. Un campo que promete privacidad sin tenerla es peor que
no tenerlo: invita a escribir ahí justo lo que no hay que escribir.

**Si algún día hacen falta notas privadas del profesor**, van en su propia tabla
(`student_notes` o similar) con una política que solo mire `my_tenant_ids()` y sin ninguna
política para el alumno. No alcanza con quitar permisos sobre la columna: profesor y
alumno son el mismo rol de Postgres (`authenticated`), y lo que se le quita a uno se le
quita al otro. La separación tiene que ser por fila, porque es lo único que RLS sabe hacer.

**La lección general:** cada vez que una pantalla promete "esto no lo ve el otro", hay que
poder señalar la regla que lo garantiza. Si la garantía es que la consulta no pide ese
campo, no hay garantía.

### El precio estaba en la persona y era del grupo (8/9/2026)

Se construyó el alta de cargos con `enrollments.agreed_price` como el precio de cada
alumno, y se escribió "cada uno con su precio" como si fuera una virtud del modelo. Tomás
lo corrigió antes de commitear: **el precio es del grupo**, y tiene dos valores —por
clase y por mes con descuento—. Lo que cambia entre alumnos es cuál de los dos eligen,
no cuánto se les cobra.

Corregido con la migración 0010. `agreed_price` sobrevive como excepción documentada
(vacío = precio del grupo), sin que la app la pida.

La lección: el modelo tenía razón a medias. `CLAUDE.md` decía —y sigue diciendo— que la
forma de pago es de la inscripción, y eso era cierto. De ahí se dedujo que el precio
también, y eso no. Que una parte del diseño sea correcta no valida lo que se le cuelga al
lado.

### La app del profesor le mostraba la interfaz de profesor a un alumno (5/9/2026)

`traerEspacios()` le preguntaba a `tenants` **qué espacios puede ver** el usuario. La
0005 le da al alumno permiso para ver su escuela —lo necesita, si no el portal no
puede decirle de quién es su clase—, así que un alumno logueado en `/profe` contaba
un espacio y entraba derecho al panel del profesor.

**No hubo fuga de datos.** Lo que veía era suyo: su ficha, su grupo, su propia deuda.
Y no podía escribir nada: crear grupos, anotar alumnos, marcar asistencia y confirmar
pagos le daban error, tal como dicen las pruebas. Lo que falló fue la interfaz, no el
candado.

La corrección: preguntarle a `tenant_members` —de qué espacios sos parte del equipo—
en vez de a `tenants` —qué espacios alcanzás a ver—.

**La lección, que vale para todo lo que sigue:** todas las pruebas preguntaban "¿puede
alguien ver datos ajenos?". Ninguna preguntaba "¿la app asume que su usuario es
profesor?". Row Level Security protege los datos; no protege de un front-end que le
muestra el tablero equivocado a la persona equivocada. Quedó agregada a
`aislamiento_alumno.sql` la fila que lo detecta: un alumno no puede figurar en
`tenant_members`.

**Coletazo: ¿quién puede crear un espacio?** Con el arreglo, un alumno sin espacios
caía en el formulario de "creá tu espacio". La regla intuitiva —"que solo los
profesores puedan crear espacios"— se muerde la cola: alguien es profesor porque está
en `tenant_members`, y entra ahí al crear su espacio. Con esa regla nadie llegaría a
ser profesor nunca. Y las dos condiciones no se excluyen: un profesor puede ser alumno
de otro.

Lo que se hizo: sin espacios, la app se fija si la persona es alumno de alguien
(`students.user_id`). Si lo es, le dice que esta es la app del profesor y que el portal
del alumno está en construcción, con un enlace discreto por si además da clases. Si no
es nada, es un profesor nuevo registrándose y se le ofrece crear su espacio de una.
**Decide qué se ofrece, no qué se permite.**

---

## Pendientes sueltos

- [x] Instalar Node.js — hecho (v24.20.0, npm 11.19.0)
- [ ] Cambiar la contraseña del admin en la app vieja (hoy es `admin`, en texto plano)
- [ ] No tocar el proyecto Supabase `axzyhjprterixsgqhddv` — sirve los videos de la app en producción
- [ ] La app vieja tiene `firestore.rules` con `allow read, write: if true` (base abierta). Se resuelve solo con la migración a Supabase
