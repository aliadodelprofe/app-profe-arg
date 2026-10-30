# Estado del proyecto

> Actualizado: 30 de octubre de 2026

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
| App nueva (sin publicar) | Vercel, dominio propio a definir. `vercel.json` es su configuración |

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
| `localhost:3000/` | La landing del producto nuevo |
| `localhost:3000/profe` | La app del profesor, contra Supabase |
| `localhost:3000/alumno` | El portal del alumno, contra Supabase |
| `localhost:3000/comunidad` | La app de la comunidad, contra Firebase (producción) |

`src/main.tsx` decide cuál montar con import dinámico: entrando por `/profe` el código
de Firebase **no se descarga**, así que no hay forma de tocar la base de producción
mientras se desarrolla.

**La raíz es del producto nuevo desde el 29/10/2026**, y la app de la comunidad se
reconoce **por dominio**, no por una variable de entorno. El porqué está en la sección
siguiente.

Las credenciales viven en `.env.local` (fuera de git). Vite las lee **una sola vez al
arrancar**: si se tocan, hay que cortar con `Ctrl+C` y volver a levantar.

Node.js LTS instalado y `@supabase/supabase-js` como dependencia. El proyecto usa
npm; `bun.lock` fue eliminado para no tener dos archivos de candado.

---

## Dos apps, dos despliegues (29/10/2026)

El repositorio tiene dos productos adentro, y hasta el 29/10 compartían la raíz. Eso no
era solo desprolijo: cuando Supabase rechazó una redirección de autenticación y cayó a su
destino de respaldo, dejó al alumno **adentro del producto equivocado**, con el token
colgando en la dirección. Una raíz es de una sola app.

| | App de la comunidad | App nueva |
|---|---|---|
| Dominio | `tabachata-academy.com` + los `.web.app` de Firebase | el dominio nuevo, a definir |
| Hosting | Firebase Hosting | Vercel |
| Configuración | `firebase.json` | `vercel.json` |
| Base | Firebase (producción, congelada) | Supabase |

**Se decide por dominio y no por una variable de entorno, a propósito.** Una variable hay
que acordarse de ponerla en cada despliegue, y el día que uno se olvide, el dominio nuevo
serviría la app de la comunidad contra el Firebase de producción — exactamente el accidente
que esto viene a evitar. Con el dominio, el que tiene que acordarse de algo es el que
publica la app **vieja**, que está congelada y vive en un lugar que ya existe.

La lista está en `DOMINIOS_COMUNIDAD`, en `src/main.tsx`. `/comunidad` es la puerta de
servicio: sirve para abrirla en localhost el día que haya que arreglarle un bug.

**`vercel.json` traía una bomba.** Su CSP nombraba un proyecto de Supabase que no es este.
Publicado así, el navegador habría bloqueado **todas** las llamadas a la base y la app
nueva no habría cargado un solo dato — sin un error que lo explique, porque un bloqueo de
CSP no dice "te falta el dominio en la política", dice que la conexión falló. Quedó
corregido y apuntando a `umyqsvbctvalfivyfjas.supabase.co`.

**La regla:** cada vez que cambie el proyecto de Supabase, hay que cambiar también el
`connect-src` del `vercel.json`. Son dos lugares y el segundo no se rompe hasta que se
publica.

### Lo que falta para publicar

| Paso | Dónde |
|---|---|
| Conectar el repo y desplegar | Vercel |
| Apuntar el dominio nuevo | el registrador + Vercel |
| Agregar `https://<dominio>/alumno` a las *Redirect URLs* | Supabase → Authentication → URL Configuration |
| Poner el Site URL en el dominio nuevo | Supabase, mismo lugar |
| Agregar `https://<dominio>` a *Authorized JavaScript origins* | Google Cloud → Clients |
| **Sacar `http://localhost:3000`** de esos orígenes | Google Cloud, mismo lugar |
| Correr las migraciones 0001 → 0042 en `aliado-prod` | SQL Editor |
| Encender `Confirm email` en `aliado-prod` | Supabase → Authentication |

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
| `0016_cuota_del_mes_en_curso.sql` | La cuota es del mes en curso, no del que viene. Y la invitación dice cómo le van a cobrar | Aplicada |
| `0017_el_alumno_elige_como_paga.sql` | `cambiar_forma_de_pago()`: el alumno pasa de por clase a por mes (o al revés) desde el 1 del mes que viene | Aplicada |
| `0018_las_clases_se_generan_en_la_base.sql` | `asegurar_clases()`: la regla de qué clases faltan se muda de TypeScript a la base, para que una tarea programada pueda correrla | Aplicada |
| `0019_tarea_programada.sql` | `pg_cron` todas las noches a las 03:00: genera clases y cargos de todos los grupos sin que nadie abra la app | Aplicada |
| `0020_borrar_comprobantes_viejos.sql` | Los comprobantes se borran a los 6 meses de confirmado el pago. Necesita `pg_net` y dos secretos en Vault | Aplicada |
| `0021_saldo_a_favor.sql` | La vista expone `a_favor` y `asegurar_imputaciones()` aplica esa plata a los cargos que aparezcan. La tarea nocturna la llama | Aplicada |
| `0022_el_saldo_no_se_contradice.sql` | Corrige la 0021: `saldo` y `a_favor` son las dos caras de la misma resta, recortadas en cero. No pueden ser positivas a la vez | Aplicada |
| `0023_el_alumno_es_dueno_de_su_ficha.sql` | `avatar_url` y `actualizar_mi_ficha()`. El profesor crea la ficha y la corrige solo mientras nadie la reclamó | Aplicada |
| `0024_donde_transferirle_al_profe.sql` | Tabla `payment_methods`: dónde le transfieren al profesor. El profesor la escribe, sus alumnos la leen y nadie más | Aplicada |
| `0025_el_cbu_tiene_22_digitos.sql` | Un CBU o CVU cortado al copiar se guardaba igual. Ahora la base exige 22 dígitos | Aplicada |
| `0026_la_escuela_tiene_cara.sql` | `tenants.avatar_url` y el depósito público `logos`. El logo lo sube solo el dueño, en la carpeta de su espacio | Aplicada |
| `0027_la_foto_del_alumno.sql` | Depósito público `avatares`, con la carpeta por usuario: la ficha es por escuela, la cara es de la persona | Aplicada |
| `0028_el_dueno_ve_sus_imagenes.sql` | Reglas de `select` en `logos` y `avatares`: sin ellas un `update` no encuentra la fila y devuelve cero sin error | Aplicada |
| `0029_sacar_la_foto.sql` | `actualizar_mi_ficha` distingue "no la toques" (nulo) de "sacala" (vacío). Antes no había forma de borrar la foto | Aplicada |
| `0030_el_correo_es_del_alumno.sql` | `sincronizar_mi_correo()` copia a las fichas el correo que el alumno ya verificó. Lo lee del JWT, no de un parámetro | Aplicada |
| `0031_lo_que_vencio_y_lo_que_viene.sql` | `student_account.saldo` pasa a ser **solo lo vencido**; lo que no venció va en `por_vencer`. Una clase que no pasó no es una deuda | Aplicada |
| `0032_una_clase_puede_ser_online.sql` | `groups.online` y `groups.meeting_url`. Una clase online no tiene sala, y un check impide que convivan con una dirección | Aplicada |
| `0033_el_pago_unico_se_cobra.sql` | `asegurar_cargos()` gana la rama de pago único. Existía la forma de pago pero nunca generaba un cargo: el alumno figuraba al día debiendo el taller entero | Aplicada |
| `0034_un_grupo_puede_tener_dos_dias.sql` | El horario pasa de tres columnas en `groups` a la tabla `group_schedule`: un grupo puede juntarse martes y jueves, con horas distintas. Las columnas viejas se borran | Aplicada |
| `0035_una_ficha_sin_correo_no_sirve.sql` | `students.email` pasa a ser obligatorio. Una ficha sin correo no se puede reclamar nunca: el alumno no tiene forma de llegar a ella | Aplicada |
| `0036_no_todas_las_semanas.sql` | `group_schedule.por_mes`: cada día del horario dice si es todas las semanas (nulo) o 1, 2, 3 o 4 veces por mes. `asegurar_clases()` lo respeta | Aplicada |
| `0037_lo_que_ensena_cada_escuela.sql` | Catálogo `disciplines` (32 actividades) y `tenant_disciplines`: la escuela dice qué enseña, y puede enseñar más de una cosa. `tenants.discipline` se borra | Aplicada |
| `0038_la_aclaracion_del_estilo.sql` | `tenant_disciplines.nota`: "Bachata" + "Influence" en vez de una categoría "Bachata Influence". Parte lo que el backfill había pegado junto | Aplicada |
| `0039_de_que_es_este_grupo.sql` | `groups.discipline_slug`: una escuela de Bachata puede tener un grupo de Salsa, y el alumno ve de qué es cada grupo | Aplicada |
| `0040_dejar_la_escuela.sql` | `dejar_la_escuela()` y `volver_a_la_escuela()`: archivar a un alumno de la escuela entera, distinto de darlo de baja de un grupo. Más el check de `students.status` | Aplicada |
| `0041_fotos_que_no_usa_nadie.sql` | `archivos_sueltos` y `limpiar_archivos_sueltos()`: las fotos que nadie usa se anotan todas las noches, y se borran solo después de siete días seguidos de no usarse. **Arranca en modo mirar, sin borrar** | Aplicada |
| `0042_las_tareas_son_de_la_noche.sql` | Les quita el `execute` a `anon` y `authenticated` sobre las tres tareas nocturnas. Supabase se lo da solo a toda función nueva de `public`, y `revoke … from public` **no** lo saca | Aplicada |

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
| `supabase/tests/aislamiento_alumno.sql` | El portal del alumno, **verificado por propiedad y no por cantidad**: que un alumno vea lo suyo y **no lo de su compañero de grupo**. Requiere `alumno1@prueba.com`. Dispara la alerta de Supabase a propósito. Repetible |
| `supabase/tests/confirmar_pago.sql` | La función que mueve plata: que solo la use el profesor dueño, que impute bien y que el doble toque no impute dos veces. Corre dentro de una transacción que se deshace. Repetible |
| `supabase/tests/invitaciones.sql` | Que cada uno vea solo las invitaciones dirigidas a su correo, que aceptar enganche, que no se acepte dos veces y que una rechazada no se pueda aceptar. En una transacción que se deshace. Repetible |
| `supabase/tests/cargos_automaticos.sql` | `asegurar_cargos()`: que genere lo que falta, que llamarla de nuevo no duplique, que respete la baja y la fecha de fin, y que nadie genere cargos en un espacio ajeno. En una transacción que se deshace. Repetible |
| `supabase/tests/ficha_del_alumno.sql` | Quién puede tocar la ficha: que el alumno cambie su nombre y su foto, que la función **no** le toque el correo, que **no** pueda mudarse de escuela, que un nombre vacío no se guarde, y que el profesor corrija solo lo que nadie reclamó. En una transacción que se deshace. Repetible |
| `supabase/tests/saldo_a_favor.sql` | El saldo a favor: que la vista lo muestre, que se aplique a un cargo nuevo, que correrla de nuevo no impute nada, que **nunca impute más de lo que el alumno pagó**, y que nadie impute en un espacio ajeno. En una transacción que se deshace. Repetible |
| `supabase/tests/comprobantes_viejos.sql` | A quién toca y a quién no el borrado de comprobantes: que cierre el de 7 meses, que no toque el de 2, que no toque uno sin confirmar, que los secretos estén, y que ningún profesor pueda ejecutarlo. Correr como `postgres`. **No prueba el borrado real** — eso se verifica a mano, ver el pie del archivo. Repetible |
| `supabase/tests/mantenimiento.sql` | La tarea programada: que esté agendada, que corra sin errores, que recorra los grupos de **todos** los profesores, que correrla de nuevo no genere nada, y que ningún profesor pueda ejecutarla ni leer su registro. Correr como `postgres`. Repetible |
| `supabase/tests/clases_automaticas.sql` | `asegurar_clases()`: que cree todos los días fijos hasta fin del mes que viene, que no duplique, que no vaya hacia atrás, que no resucite una clase cancelada, que respete el fin del grupo y que nadie genere clases en un espacio ajeno. En una transacción que se deshace. Repetible |
| `supabase/tests/forma_de_pago.sql` | `cambiar_forma_de_pago()`: que valga desde el 1 del mes que viene, que cierre lo vigente a fin de mes, que cambiar de opinión corrija en vez de apilar, que no se elija una forma sin precio y que nadie toque el arreglo de un espacio ajeno. En una transacción que se deshace. Repetible |
| `supabase/tests/medios_de_pago.sql` | Los medios de pago (0024, 0025): que el profesor cargue los suyos y ninguno ajeno, que el alumno los vea y **no** los pueda cambiar, que lo archivado no le llegue, y que un CBU cortado no entre. En una transacción que se deshace. Repetible |
| `supabase/tests/logo_de_la_escuela.sql` | El logo (0026): que lo ponga solo el dueño, que el alumno lo vea y no lo toque, y que nadie suba archivos a la carpeta de otro espacio. En una transacción que se deshace. Repetible |
| `supabase/tests/avatares.sql` | El depósito de fotos (0027, 0028): que cada uno escriba en su carpeta y en ninguna otra. **No prueba el borrado**: Supabase lo prohíbe desde SQL, va por la Storage API. En una transacción que se deshace. Repetible |
| `supabase/tests/pago_unico.sql` | El pago único (0033): que el taller con precio total genere su cargo, que venza el día de la inscripción, que no se cobre dos veces, y que un cargo suelto no lo tape. En una transacción que se deshace. Repetible |
| `supabase/tests/lo_que_vencio.sql` | La frontera entre vencido y por vencer (0031): que un cargo de mañana no entre en el saldo, que uno sin fecha sí, y que pagar por adelantado no mueva lo vencido. En una transacción que se deshace. Repetible |
| `supabase/tests/mi_correo.sql` | `sincronizar_mi_correo()` (0030): que copie el correo **del JWT**, que sea idempotente, y que otra persona con ese mismo correo en su token no se lleve las fichas. En una transacción que se deshace. Repetible |
| `supabase/tests/clases_cada_tanto.sql` | `por_mes` (0036): que un día "2 por mes" genere la 1ª y la 3ª semana y no dos seguidas, que "todas las semanas" siga generando las cinco cuando el mes tiene cinco, y que dos días del mismo grupo puedan tener frecuencias distintas. En una transacción que se deshace. Repetible |
| `supabase/tests/lo_que_ensena.sql` | Las actividades (0037, 0038, 0039): que el catálogo se lea y no se escriba, que cada escuela solo toque las suyas, que el alumno vea las de su escuela y no las de otra, que la nota no entre vacía ni larga, y que un grupo no apunte a una actividad que no existe. En una transacción que se deshace. Repetible |
| `supabase/tests/grupo_online.sql` | Una clase online (0032) en cualquier formato: que el enlace y la dirección no convivan, y que el alumno vea el enlace de su grupo y no el de otro. En una transacción que se deshace. Repetible |
| `supabase/tests/dejar_la_escuela.sql` | `dejar_la_escuela()` (0040): que cierre todas las inscripciones activas, que no toque las ya cerradas, que el alumno archivado no aparezca en el listado, que volver **no** reabra las inscripciones, y que nadie archive una ficha de un espacio ajeno. En una transacción que se deshace. Repetible |
| `supabase/tests/archivos_sueltos.sql` | El barrido de fotos (0041): que anote la huérfana, que no anote la que está en uso, que contar de nuevo sume sin duplicar la fila, que no borre antes de los siete días, y que ningún profesor pueda ejecutarla. Correr como `postgres`. Repetible |
| `npm run prueba:fechas` | Las cuentas de fechas y de precios del front (`src/comun/fechas.ts`, `src/comun/precios.ts`). **56 casos.** No toca la base ni el navegador. Correr después de cualquier cambio ahí |
| **`npm run prueba:base`** | **Corre las veinticuatro de la base, en orden, y dice al final si algo falló.** Necesita `DATABASE_URL` en `.env.local` (Session pooler, puerto 5432). El orden está fijo en `supabase/tests/correr.mjs`: una prueba nueva se agrega ahí |

Últimos resultados (30 de octubre de 2026) — **la batería completa, 24 de 24 en verde**,
corrida de una con `npm run prueba:base`.

Esa corrida fue la primera que se hizo entera de una sola vez, y destapó cuatro pruebas
frágiles que venían pasando por casualidad. **Ninguna era un bug de la app**: las cuatro
miraban el estado total de la base en vez de lo que ellas mismas habían puesto, así que
funcionaban con la base vacía y empezaron a fallar justo cuando la app se empezó a usar
de verdad.

| Prueba | Qué miraba antes | Qué mira ahora |
|---|---|---|
| `confirmar_pago.sql` | El saldo TOTAL del alumno en cero | Que el cargo que creó la prueba quede saldado |
| `cargos_automaticos.sql` | Que creara exactamente 2 cargos | Que ninguna inscripción activa con precio quede sin su cargo |
| `clases_automaticas.sql` | Un grupo ajeno que ya existiera | Un grupo ajeno que crea ella misma |
| `logo_de_la_escuela.sql` | La primera escuela con logo | La escuela que la prueba creó |

Es la tercera vez que aparece la misma lección y conviene dejarla escrita de una vez:
**una prueba tiene que afirmar sobre lo que ella puso, no sobre lo que hay.** Contar filas,
pedir totales o buscar "el primero que cumpla" son todas formas de escribir una prueba que
depende del azar de los datos — y que el día que falla no dice nada útil, porque no falló
por lo que decía probar.

### La variante: filtrar bien no alcanza si después elegís con un empate (30/10/2026)

`forma_de_pago.sql` falló tres veces seguidas, y las tres por la misma raíz con distinto
disfraz. Primero buscaba la ficha del alumno con `limit 1` sobre todas sus fichas, y cuando
apareció una cuarta eligió la equivocada. Después la buscaba por el nombre de la escuela,
que no es como la busca la función que está probando — así que la prueba y la función
miraban dos filas distintas. Y una vez arreglado eso, la última fila seguía leyendo
`order by start_date desc limit 1`, que **empataba** con una inscripción vieja de la misma
fecha: el orden entre dos filas empatadas lo decide Postgres, o sea el azar.

Dos reglas, entonces:

1. **La prueba tiene que buscar su objeto igual que lo busca la función.** Si la función
   usa `user_id` + `tenant_id`, la prueba no puede usar el nombre: en el momento en que
   difieran, la prueba va a estar afirmando sobre otra fila.
2. **Guardá el `id` de lo que creaste y leé por ese `id`.** Un `order by` sobre un campo
   que puede repetirse no es una forma de elegir una fila, es una forma de elegir
   *alguna* fila.

### Una prueba que aceptaba cualquier error (30/10/2026)

Las tres pruebas de tareas nocturnas tienen una fila que dice "un profesor NO puede
ejecutarla". Las tres la verificaban así: intentar ejecutarla, y si salta **cualquier**
excepción, dar por buena la fila.

Cuando se escribió `archivos_sueltos.sql` esa fila falló — "un profesor pudo ejecutarla" —
y al investigar apareció que el problema no era de la prueba nueva, sino de las dos viejas:
**Supabase le da `execute` a `anon` y `authenticated` sobre toda función nueva de `public`**,
y `revoke all … from public` no saca esos permisos, porque son concesiones nombradas a esos
dos roles. O sea que cualquier usuario logueado podía llamar a las tres tareas de
mantenimiento. No pasaba nada visible porque la función fallaba más adentro — por RLS o por
no poder leer Vault — y la prueba aceptaba ese error como si fuera el candado.

Las tres pruebas **venían pasando en verde desde hacía meses por el motivo equivocado.** El
candado no existía; lo que existía era un tropiezo más abajo que daba un error parecido.

Lo que cambió: la migración 0042 revoca el `execute` de verdad, y las tres filas ahora
exigen el error específico (`insufficient_privilege`, SQLSTATE `42501`) en vez de cualquiera.

**La regla:** una prueba que afirma que algo está prohibido tiene que exigir **el** error de
permisos, no un error. "Falló" y "falló por lo que yo quería probar" son dos cosas
distintas, y la diferencia entre las dos es justamente la que la prueba existe para medir.

---

## Próximo paso exacto

**El circuito está cerrado de punta a punta, con las dos personas.** El profesor crea su
espacio, sus grupos con horario fijo, anota alumnos y les da de baja, deja que las clases
se generen solas, toma asistencia, escribe el recap y confirma transferencias. El alumno
se registra con su correo, ve sus clases con el lugar y el mapa, lee los recaps, ve lo que
debe, avisa que transfirió y adjunta el comprobante. Los cargos se generan solos. Nada de
esto necesita el SQL Editor.

**Lo que queda, en orden:**

| Qué | Tamaño | Nota |
|---|---|---|
| **Publicar** | Mediano | Vercel, dominio, y los cinco ajustes de Supabase y Google Cloud de la sección "Dos apps, dos despliegues" |
| Correr 0001 → 0042 en `aliado-prod` | Mediano | En orden, una por una, con `control_general.sql` después de cada una |
| El nombre y el logo | Chico | "Aria" es provisorio desde el 9/10. Falta una tanda de nombres y decidir |
| Imputación dirigida | Chico | Elegir a qué cuota va un pago, en vez del orden automático |
| Encender el borrado de `archivos_sueltos` | Chico | Alrededor del 6/11/2026: mirar la tabla y, si lo que anotó es lo esperable, re-agendar la tarea con `limpiar_archivos_sueltos(true)` |
| El `limit` que le falta a `cambiar_forma_de_pago` | Chico | Si un alumno llegara a tener dos fichas reclamadas en la misma escuela, el `select` de la ficha devuelve dos filas y la función tira un error de Postgres sin explicación. No pasa hoy, pero no está atado |
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

## Ingreso con Google (el alumno)

El botón está en `src/alumno/pantallas/Entrar.tsx` y va **arriba** del formulario de correo
y contraseña, a propósito: ese camino obliga al alumno a inventar una contraseña, salir de
la app, abrir el mail, confirmar y volver. Cada paso pierde gente, y el que se cae nunca
llega a ver las clases que su profe ya le cargó.

El botón **no lleva el logo de Google**. Es una marca ajena y no la dibujamos nosotros.

### Configuración, que es casi todo el trabajo

1. **Google Cloud** → proyecto → *Clients* → crear cliente OAuth de tipo *Web application*.
   - *Authorized JavaScript origins*: `http://localhost:3000` (y el dominio real cuando se
     despliegue)
   - *Authorized redirect URIs*: la dirección de callback que muestra la página del
     proveedor Google en Supabase, con la forma
     `https://<proyecto>.supabase.co/auth/v1/callback`
   - Scopes: `openid`, `userinfo.email`, `userinfo.profile`
2. **Supabase** → Authentication → Providers → Google → pegar Client ID y Client Secret.
3. **Supabase** → Authentication → URL Configuration → agregar `http://localhost:3000/alumno`
   a las *Redirect URLs*. Sin esto, Supabase devuelve al alumno al Site URL, y el Site URL
   es la raíz — o sea, **la app vieja de la comunidad**.
4. **Antes del deploy:** sacar las direcciones de localhost de Google Cloud.

### Probar desde el celular, y por qué Google no funciona ahí (29/10/2026)

Para abrir la app desde el celular alcanza con levantar Vite escuchando en la red
(`npm run dev -- --host`) y entrar a `http://<IP-de-la-Mac>:3000/alumno`. La app carga bien
y el ingreso con correo y contraseña funciona.

**El ingreso con Google no**, y el motivo no es configuración olvidada: **Supabase acepta
redirecciones `http://` solamente para `localhost`.** Cualquier otro host tiene que ser
`https://`. Una IP de la red local no puede ser ninguna de las dos cosas, así que Supabase
descarta el `redirect_to` y manda al alumno al **Site URL** del proyecto — con el token
colgando en la dirección, y en el producto equivocado si la raíz no es de la app nueva.

Se perdió un rato buscándolo en las *Redirect URLs*, que estaban bien cargadas. Lo que lo
destapó fue repetirlo desde la Mac: ahí también caía al Site URL, o sea que no era el
celular.

**Cómo probarlo igual:** apuntar el Site URL a la IP, y **devolverlo cuando se termina**
(está en la lista de pendientes sueltos para no olvidarlo). Es manotazo de prueba, no una
configuración que se deja puesta.

De paso apareció otro bug de red local: `crypto.randomUUID()` **no existe fuera de un
contexto seguro**, y una IP por `http://` no lo es. El aviso de transferencia se rompía con
"`crypto.randomUUID is not a function`" solo desde el celular. `src/comun/id.ts` ahora prueba
`randomUUID`, después arma el UUID v4 con `crypto.getRandomValues` (que sí funciona sin
contexto seguro) y recién al final cae en `Math.random`.

### El riesgo que se verificó — y quedó descartado (6/10/2026)

Las tres funciones de la 0015 exigen `u.email_confirmed_at is not null` antes de mostrar o
aceptar una invitación. La documentación de Supabase **no aclara** si el login con un
proveedor OAuth marca el correo como confirmado. Si no lo marcara, un alumno que entra con
Google nunca vería su invitación, y no habría ningún error en pantalla que lo explicara.

Se verificó después del primer login con Google, y la respuesta es que **sí lo marca**:

```
email                    correo_confirmado   proveedores
tomaselmore1@gmail.com   true                ["google"]
```

O sea que las funciones de la 0015 lo aceptan sin cambios y no hizo falta ninguna
migración. La consulta para repetir la verificación, si algún día cambia el comportamiento
de Supabase o se agrega otro proveedor:

```sql
select u.email,
       u.email_confirmed_at is not null as correo_confirmado,
       (select array_agg(i.provider) from auth.identities i where i.user_id = u.id) as proveedores
  from auth.users u
 order by u.created_at desc
 limit 5;
```

Si algún proveedor diera `false`, habría que relajar esa condición: aceptar o un correo
confirmado, o una identidad de un proveedor que ya verifica el correo.

---

## El nombre: ARIA, provisorio

Elegido el 9/10/2026 **para probarlo**, no como decisión final. Está en
`src/comun/marca.ts`, en una constante, y cambiarlo toca ese archivo y nada más.

**Aria** — la pieza que canta una sola voz. Conocida sin traducción en castellano,
italiano e inglés. Cálida, con música adentro sin atarse a un instrumento ni a una
disciplina.

**La colisión que hay que tener presente:** *Aria Systems* es un SaaS de **facturación
recurrente en la nube**. Es enterprise y telecom, otro segmento, pero facturación
recurrente es lo más cerca de este producto que ninguna de las otras colisiones que
aparecieron. No bloquea —mercados distintos— pero es el dato a mirar si el nombre se
confirma.

### Los criterios que fueron apareciendo, en orden

1. Corto, dos sílabas, que suene a marca y no describa el producto.
2. Que signifique lo mismo en **castellano, italiano y portugués** (por el plan de
   expansión). Esto descartó *pulso* (en italiano *polso* es muñeca) y *nido* (en Italia
   *asilo nido* es guardería).
3. **Que se pueda decir en inglés al primer intento** — el mercado incluye Estados Unidos,
   Canadá y Europa. Esto descartó toda una tanda: *Camada*, *Peña*, *Barra*. Nada de ñ, rr
   ni ll; mejor si termina en vocal.
4. Que no exista **en la misma categoría**. Este filtro se aplicó mal al principio: que
   haya un software dental llamado Marea no bloquea nada. Lo que bloquea es un vecino de
   rubro.

### Descartados y por qué

| Nombre | Motivo |
|---|---|
| Sala, Aula | Describen el lugar, y el lugar es alquilado: es lo circunstancial del negocio |
| Tanda | Ya es un SaaS de gestión de personal — rubro vecino, colisión real |
| Vela, Faro | Vela Software y FARO Technologies, las dos en software |
| Lumo, Corso | Muy ocupados: el asistente de Proton, una ferroviaria, una app de Shopify |
| Pulso, Nido | No viajan al italiano |
| Camada, Peña, Barra | No se pronuncian en inglés |
| Marea, Siena | Colisionan en otros rubros; no bloquean pero complican el dominio |
| Trama | Sobrevivió todo, quedó como alternativa viva |
| Orla | Sobrevivió todo. "La orla" es la foto de la camada que se recibe — el producto dicho sin describirlo. Alternativa viva |

### Lo que falta

El logo, y confirmar o cambiar el nombre. **Nada está bloqueado por esto:** los tokens de
color se llaman `acento` y `tinta`, no "el naranja de Aria", y el marcador del CSS dice
`data-app="nueva"` y no el nombre del producto. La identidad visual no depende de cómo se
llame.

---

## La paleta

Catorce tokens en `src/index.css`, con **modo claro y oscuro**.

**Quién elige el modo cambió (octubre).** Antes mandaba el sistema operativo y nadie podía
discutirlo: con el Mac en oscuro, la app era oscura siempre. Ahora manda la persona y el
sistema es solo el valor por omisión, con el `SelectorDeTema` de `comun/ui.tsx`. El claro es
el modo de la casa, y no por gusto: la paleta está construida sobre papel cálido y
terracota, y eso es lo que la distingue de cualquier panel de administración. En oscuro ese
papel desaparece. `data-tema` lo pone `main.tsx` **antes de dibujar nada**: si esperara a
que monte un componente, la app aparecería un instante en el modo equivocado y daría un
salto de color.

| Token | Para qué |
|---|---|
| `fondo` | la página |
| `panel` | tarjetas y bloques que se despegan |
| `campo` | adentro de un input |
| `linea` | bordes y separadores |
| `tinta` | el texto que se lee |
| `tenue` | lo secundario: fechas, ayudas, aclaraciones |
| `acento` | terracota: botones, enlaces, lo tocable |
| `sobre-acento` | texto arriba del acento |
| `ok` / `alerta` | pagado o confirmado / deuda o error |
| `acento-suave` / `ok-suave` / `alerta-suave` | el mismo estado como **fondo** de una etiqueta o un aviso, donde el color pleno taparía el texto |
| `contorno` | el borde apenas visible de un panel. No es `linea`: `linea` separa dos cosas, `contorno` encierra una |

**Los nombres son por función y no por color.** `acento`, no `terracota`. El día que cambie
el color, el nombre sigue siendo cierto y no hay que tocar ninguna pantalla.

**El oscuro no es el claro invertido:** los grises tiran a marrón y no a azul, y el acento
se aclara, porque el terracota del modo claro sobre fondo oscuro queda apagado.

### Dos cosas que hubo que resolver

**`index.css` es una sola hoja para las tres apps.** El `body` tenía `#111111` fijo. Si se
cambiaba, se le rompía el fondo a la app de la comunidad. Por eso el fondo cuelga de
`html[data-app="nueva"]`, que `main.tsx` pone en la raíz, en `/profe` y en `/alumno`, y no
en la app de la comunidad. Lo mismo con el `<title>`, que en `index.html` sigue siendo el
de la comunidad.

**Los 38 bordes `border-white/10` no eran cosméticos.** Sobre fondo oscuro se ven; sobre
fondo claro un borde blanco es invisible. Todos pasaron a `border-linea`.

### La regla a mantener

**Ningún componente usa un color que no sea uno de los nueve tokens.** Un color escrito a
mano es el que no cambia cuando cambia la paleta, y el que se ve mal en el modo que nadie
probó. La verificación es un comando:

```bash
grep -rn "brand-\|white/\|black/4\|red-[0-9]" src/profe src/alumno src/comun --include=*.tsx
```

Tiene que no devolver nada. (La única excepción deliberada es la cortina del cartel de
confirmación, `bg-black/50`: es una sombra, no un color de la paleta, y tiene que oscurecer
igual en los dos modos.)

**Falta todavía:** el logo. La marca hoy es la palabra sola.

---

## La estructura de las pantallas (9/10/2026)

El rediseño no empezó por los colores. El problema era de **estructura**, y los colores no
lo hubieran tapado.

### Qué estaba mal

1. **No había navegación, había un pozo.** "Quién me debe" y "Pagos por confirmar" colgaban
   de la lista de grupos. Para ir de una a la otra había que volver atrás. Eran hijas de
   algo con lo que no tienen relación.
2. **La pantalla de Grupos hacía tres trabajos:** era el inicio, era la lista y era el menú
   hacia las otras dos secciones. Los dos botones grandes de arriba empujaban al profesor a
   irse de la pantalla en la que acababa de entrar.
3. **Todo pesaba lo mismo.** Casi todo el texto era `text-sm` y los títulos de sección eran
   mayúsculas chiquitas en gris — la forma más común de escribir un título que nadie lee.
4. **Scroll infinito** en el detalle del grupo y en la pantalla del alumno.

### Cómo quedó

**Profesor: tres secciones hermanas, siempre visibles.**

| Sección | Qué contesta |
|---|---|
| **Hoy** | ¿qué tengo que hacer ahora? La clase que viene con el botón de asistencia, lo que espera confirmación, lo que te deben |
| **Grupos** | la lista, y adentro el camino grupo → clase → asistencia |
| **Cobros** | las tres vistas de plata juntas: para confirmar, quién te debe, lo cobrado |

**Alumno: dos pestañas.** *Clases* (lo que viene y los recaps) y *Mi cuenta* (cómo paga,
el saldo, lo que pagó). Antes eran cinco secciones en una página larga.

La barra va **abajo en el celular** —donde llega el pulgar— y **arriba en la computadora**.
Es la misma lista renderizada dos veces con `sm:`, no dos componentes: un menú que se puede
desincronizar consigo mismo en algún momento va a mentir.

**Adentro de Grupos sí hay profundidad, y ahí está bien.** Grupo → clase → asistencia es un
camino, no un menú. Esas pantallas conservan su "volver" y se quedan **sin barra**: mientras
tomás asistencia no querés irte a otro lado de un toque sin querer.

### La jerarquía

Cuatro niveles en `comun/ui.tsx`, y alcanzan. Más niveles es volver al mismo problema por
el otro lado.

| Pieza | Para qué |
|---|---|
| `Titulo` | de qué se trata la pantalla. Uno por pantalla |
| `Seccion` | los bloques adentro. Pesan de verdad y se separan del anterior, para poder recorrer saltando en vez de leyendo |
| `Dato` | EL número: cuánto te deben, cuánto entró. Con `tabular-nums`, para poder comparar dos cifras de un vistazo |
| `Etiqueta` | la marquita al costado: un formato, un estado |

### Dos decisiones que no son obvias

**En "Hoy", lo que no hay que hacer no se muestra.** Una pantalla de inicio que siempre
tiene seis tarjetas, estén vacías o no, deja de leerse a la semana.

**En "Cobros", las acciones van antes que el archivo.** Primero lo que pide una decisión
(confirmar transferencias), después lo que hay que mirar (las deudas), al final el registro
(lo cobrado). Una pantalla que arranca con el resumen del mes te hace bajar para encontrar
lo que tenés que hacer.

### El menú se dibujaba abajo (9/10/2026)

La barra de computadora estaba después del contenido en el documento y era `sticky`.
`sticky` pega un elemento al borde **cuando el scroll lo alcanza**: puesto al final,
aparecía abajo de toda la página. Un menú "arriba" que se dibuja abajo no es un problema de
estilo, es orden del documento. Ahora `Navegacion` se renderiza **antes** del contenido, y
su contenedor interno usa el mismo ancho y margen que las pantallas para que el menú y el
título queden sobre la misma línea vertical.

La barra de celular es `fixed`, así que dónde esté en el documento no cambia dónde se
dibuja.

### La tipografía

**Plus Jakarta Sans.** Geométrica pero con las curvas abiertas, que es lo que la hace
cálida en vez de corporativa, y con números de ancho fijo — importa en una app donde se
comparan montos uno debajo del otro.

El `system-ui` anterior no era feo, era **neutro**. Y lo neutro en una interfaz se lee como
"esto es una página web", porque es la letra que usan las páginas que no eligieron ninguna.

Se carga desde `main.tsx` y no con un `@import` en el CSS: la hoja es una sola para las tres
apps, y un `@import` se descargaría también al entrar a la app de la comunidad, que no la
usa.

### Las cinco piezas que separan una app de un sistema (9/10/2026)

Viven en `comun/ui.tsx` y ninguna agrega información: cambian cómo se recorre la misma.

| Pieza | Qué resuelve |
|---|---|
| `Avatar` | No había una sola inicial en toda la app. Una lista de personas sin caras se lee como filas de una planilla. El color sale del nombre, así cada alumno tiene siempre el mismo y en una lista de doce se encuentra a alguien sin leer |
| `Lista` + `Fila` | **El cambio más grande.** Antes cada elemento era una tarjeta con marco y aire alrededor: eso es una tabla disfrazada. Ahora son renglones pegados, separados por una rayita y **de borde a borde** en el celular. En pantalla grande vuelven a ser una tarjeta redondeada, porque ahí el borde a borde sería una línea de un metro |
| `Hoja` | Los formularios se abrían *adentro* de la página y la empujaban: perdías de vista dónde estabas y la pantalla cambiaba de alto mientras la mirabas. Ahora suben desde abajo y al cerrarse devuelven la pantalla intacta |
| `Esqueleto` | Reemplaza la palabra "Buscando…". Ocupa desde el principio el lugar y la forma de lo que viene, así cuando llegan los datos no salta nada |
| `Segmentos` | Para cortar una pantalla larga en dos vistas. No es lo mismo que la barra de abajo: aquella lleva a otra parte de la app, esta cambia qué mirás sin moverte |

**Sobre las referencias.** Instagram, TikTok y Spotify son apps de consumo de contenido:
pantalla completa, imagen al borde, inmersivas. Copiar eso en una herramienta donde se
cargan asistencias y se confirma plata la vuelve más difícil de usar. Las referencias
correctas son Uber, Revolut y Splitwise: herramientas que se sienten como apps.

El color de los avatares usa variables (`--avatar-sat`, `--avatar-fondo`, `--avatar-letra`)
porque el tono lo calcula el componente pero la saturación y la luminosidad son lo que
tiene que cambiar entre modo claro y oscuro. Sin eso, los pasteles del modo claro quedan
como manchas blancas sobre fondo oscuro.

Hay tres animaciones (`subir`, `aparecer`, `latir`) y se apagan con
`prefers-reduced-motion`: para quien marcó esa preferencia, el movimiento no es decoración.

### DetalleGrupo, cortado (9/10/2026)

Era un scroll de 1400 líneas con cuatro avisos apilados, alumnos, clases, y cinco
formularios que se abrían en el medio de la página. Ahora:

- **Cabecera** con el nombre, el volver, y el formato, el período, el horario, el nivel y
  el estudio como etiquetas en vez de una línea de texto separada por puntos.
- **Los cuatro avisos se juntan en uno.** Son lo mismo: lo que la app hizo sola al abrir el
  grupo. Antes eran cuatro cajas que empujaban el contenido real abajo del pliegue.
- **Solapas Alumnos / Clases** con la cuenta de cada una.
- **Los cinco formularios pasan a hojas.** Incluido el de editar una clase, que antes
  reemplazaba la fila en la lista — o sea que la lista cambiaba de forma mientras la mirabas.

Lo mismo en `Grupos` (nuevo grupo) y en el portal del alumno (avisar una transferencia).

---

## La segunda pasada de diseño (29 y 30/10/2026)

La referencia que trajo Tomás fue **airbnb.com.ar**, y lo que había que mirar ahí no eran
los colores: eran las sombras, las formas, cómo se cortan los niveles de información y
**cuántas cajas hay** (pocas).

### Menos cajas, no más

**`Tarjeta` se borró de `comun/ui.tsx`.** Era la pieza más usada de la app y era la que la
hacía parecer un panel de administración: cada cosa adentro de un marco, con aire alrededor,
y el marco repetido doce veces en una pantalla. Una caja dentro de otra caja no agrega
jerarquía, agrega ruido.

Lo que quedó en su lugar:

| Pieza | Qué resuelve |
|---|---|
| `Portada` | El encabezado de cada pantalla: título, bajada, el dato principal grande y una acción. Reemplaza el "título suelto arriba de todo" |
| `Onda` | El separador entre dos bandas de color. Una sola familia de separadores en toda la app, en vez de bordes, líneas y sombras conviviendo |
| `Seccion` | Un bloque con **una** raya arriba, y nada más. `primera` para la que abre la pantalla, que no la lleva |
| `BarraAccion` | La acción principal pegada abajo, con el dato al lado. El botón de "Agregar" dejó de flotar en el medio del contenido |
| `Vacio` | La pantalla sin datos, con los pasos de qué hacer. Antes decía "No hay nada" y era el final del camino |
| `Celebracion` | Cuando no hay nada que hacer **y eso es bueno**: el alumno al día. No es un vacío, es un logro |
| `Desplegable` | Lo que es largo y no es urgente, cerrado por omisión: lo que pagó, lo que viene |

### La onda necesita los dos colores

La `Onda` se dibujó mal dos veces, y las dos por la misma razón de fondo: **un separador
ondulado no es una forma, es el límite entre dos colores**. La tira tiene que llevar el
color de la banda que termina y el `path` el de la banda que empieza. Con un solo color se
ve una línea recta, que es justo lo que venía a evitar.

La segunda vez el síntoma fue otro y la causa parecida: en `Portada`, la capa de las manchas
difusas tenía un degradado al color del panel abajo, y ese degradado abarcaba todo el
componente — así que **pintaba color pleno por encima de la onda**. La capa de manchas ahora
está acotada al área del título.

### Las rayas que no significaban nada

Al poner una raya en cada `Seccion` aparecieron líneas dobles: el borde de abajo de una
`Lista` chocaba con el borde de arriba de la sección siguiente, y quedaban dos rayas
paralelas separadas por tres píxeles. `Lista` perdió su `border-y`.

**La regla:** una raya es la frontera entre dos cosas, así que **la dibuja una sola de las
dos**. En esta app la dibuja siempre la sección, nunca la lista.

### La barra de navegación se despegó del fondo

Tenía el mismo color que la página, así que no era una barra: era contenido que no se movía.
Ahora usa `panel` con `--shadow-barra`, y el alto vive en `--alto-nav` para que el contenido
sepa cuánto espacio dejarle sin que nadie copie un número a mano.

### Los campos de fecha y hora se salían de su caja

Apareció dos veces, porque tenía **dos causas** y la primera vez se arregló solo una:

1. Un hijo de grid o de flex tiene `min-width: auto`, así que no se encoge por debajo de su
   contenido. Se arregla con `min-w-0` en el campo.
2. iOS le da a `input[type=date]` y `input[type=time]` el ancho de su propio control nativo,
   y `width: 100%` no lo baja de ahí. Hace falta `appearance: none` más `max-width: 100%`.

Las dos reglas están en `src/index.css`, colgadas de `html[data-app="nueva"]`, aplicadas a
`date`, `time`, `datetime-local` y `month` de una vez — no al campo donde se vio el
problema. Un arreglo puesto en un solo lugar reaparece en el próximo formulario.

De paso se barrieron las otras inconsistencias del mismo tipo: cinco `<select>` escritos a
mano que no eran el `Selector` del sistema, y dos estilos distintos de "chip" para elegir
una opción, que ahora son `claseOpcion()` y nada más.

### Tres cosas que estaban y no se encontraban (30/10/2026)

Las tres son el mismo error con distinta cara: **algo importante dibujado con el
peso de algo secundario.** Ninguna faltaba; las tres estaban ahí y no se veían.

| Qué | Cómo estaba | Cómo quedó |
|---|---|---|
| Cambiar de escuela | La bajada del encabezado, en el gris de 14px con el que la app escribe fechas y aclaraciones, diciendo "tocá para cambiar de escuela". La única forma de descubrir que se podía tocar era leer la letra más chica de la pantalla | Una pastilla en color de acento con flecha, que dice "Cambiar de escuela". La forma ya dice que es un botón, sin leerla |
| Sacar la foto | Dos bloques del mismo tamaño y del mismo color apilados —"Cambiar la foto" y "Sacar la foto"— que juntos ocupaban más alto que la foto | La acción común es una pastilla compacta; las otras, texto tranquilo al lado. `claseAccionTenue`, en `ui.tsx` |
| El pago en revisión | Una línea de 14px del color de los enlaces, **adentro** del número grande, entre la cifra y la lista de cargos | `EnEspera`: bloque propio con reloj, borde y fondo de acento, afuera del número |

Dos cosas que salieron de ahí y valen más que los tres arreglos:

**Dos acciones del mismo peso visual obligan a leer las dos.** Cambiar la foto lo
hace todo el mundo; sacarla, uno de cada veinte. Dibujarlas iguales no es neutral:
le cobra a los veinte el trabajo de encontrar la suya.

**El mismo bloque mal resuelto estaba en dos lados** —la foto del alumno y el logo
de la escuela—, porque son la misma operación con otro archivo. Se arreglaron los
dos juntos y la clase compartida vive una sola vez. Un arreglo puesto donde se vio
el problema reaparece en el próximo formulario.

El `scale-150` con el que los dos agrandaban su avatar se fue: agrandaba también
el aro de 1px del borde, que quedaba el doble de grueso que en el resto de la app.
Ahora `Avatar` tiene un tamaño `grande` de verdad.

---

## La landing (29/10/2026)

La raíz dejó de servir la app de la comunidad y ahora sirve `src/inicio/Inicio.tsx`.

**Le habla a los dos.** El primer borrador le hablaba solo al profesor, y el alumno es quien
más veces va a abrir la app: entra desde el enlace que le manda su profe, y si la primera
pantalla le explica cómo cobrar cuotas, entendió que llegó al lugar equivocado. Hay dos
bloques mellizos, uno para cada uno.

**Cuatro bandas de color, separadas por ondas**, en vez de secciones apiladas sobre el mismo
fondo: `fondo` → `panel` → `fondo` → `acento`. La última es de color pleno a propósito; una
página que termina igual que empezó no termina.

**Textos cortos.** Quien entra no viene a leer.

**Las animaciones son dos:** las secciones aparecen al entrar en pantalla con
`IntersectionObserver`, y en el encabezado hay tres manchas difusas que se mueven solas.
Las manchas se vieron estáticas al principio: recorrían treinta píxeles en veinte segundos
detrás de un `blur` de 64, o sea un píxel y medio por segundo. Ahora cada una recorre entre
un tercio y la mitad de su propio tamaño, en ciclos de 11, 13 y 15 segundos, y además
cambian de escala y de opacidad.

Todo se apaga con `prefers-reduced-motion`, con una excepción deliberada: `.revelar` queda
en `opacity: 1`. Si se apagara la animación sin eso, el contenido que aparece al hacer
scroll se quedaría invisible para siempre.

**Se animan solo `transform` y `opacity`.** Son las dos propiedades que el navegador puede
mover sin volver a calcular el layout; animar `top` o `height` es la forma más común de
hacer que una página linda vaya a tirones en un celular.

---

## Las formaciones tienen principio y fin (9/10/2026)

`groups.end_date` existía desde la 0003 y el formulario ya lo pedía — pero estaba **al final
de un formulario largo, debajo de "Cupo (opcional)"**, y no se mostraba en ninguna pantalla
salvo mezclado en una línea de datos sueltos separados por puntos.

Una formación es un programa con principio y fin: dos meses, ocho clases. Las fechas son lo
que la define, no un detalle opcional. Además son las que hacen que `asegurar_clases()` deje
de generar clases y que `asegurar_cargos()` no cobre un mes que el grupo ya no cursa.

Qué cambió:

- Las dos fechas suben al principio del formulario, juntas, y para una formación son
  **obligatorias**: sin fecha de término el formulario no guarda.
- Una nota explica para qué sirven, en vez de dejarlo implícito.
- `periodoDe()` en `datos.ts` dice el período en castellano según en qué momento está:
  *"del 1/11 al 30/12"*, *"termina el 30/12"*, *"terminó el 30/12"*. Devuelve null para los
  grupos regulares, que no terminan.
- Se muestra en su propia línea en la tarjeta del grupo y en el encabezado del detalle.

**No era una función que faltaba: era una función que no se encontraba.** Vale la pena
distinguir los dos casos antes de ponerse a construir.

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

### 1. Saldo a favor del alumno — RESUELTO (6/10/2026, migración 0021)

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

### 11. La forma de pago la elige el alumno (definido 16/9/2026)

**Quién decide: el alumno, solo.** No hace falta que el profesor apruebe nada. El profesor
juega antes, cuando fija los dos precios: el descuento del mes es su herramienta para que
al alumno le convenga comprometerse. Si la cuota no seduce, el alumno viene suelto, y eso
es información para el profesor, no un problema del sistema.

Por eso el alta de grupo ahora le muestra la cuenta que no hace de cabeza: *"Cuatro clases
sueltas le saldrían $20.000. Con tu cuota ahorra $2.000, un 10%."* Y si la cuota no
conviene, se lo dice: *"pagar por mes no le conviene a nadie y nadie lo va a elegir."*

**Desde cuándo vale: el 1 del mes siguiente.** Igual que quien se suma a mitad de mes, y
mecánicamente es lo mismo que ya se hace: se termina la inscripción actual a fin de mes y
empieza otra con la forma nueva. Lo ya cobrado no se toca.

**Construido en la 0017 (17/9/2026):** `cambiar_forma_de_pago(p_grupo_id, p_modo)`, y la
sección **Cómo pago** en la pantalla del alumno, que muestra los dos precios siempre — no
solo el que le toca — con la cuenta de cuatro clases sueltas contra la cuota.

Dos detalles del diseño de la función, porque no son obvios:

- **Recibe el grupo, no la inscripción.** El alumno piensa "en esta clase pago así", no
  "en el arreglo 3f2a…". Si recibiera una inscripción habría que decidir qué pasa cuando
  hay dos (la de este mes y la que ya empieza el 1), y la respuesta correcta es siempre la
  misma: la del grupo.
- **Cambiar de opinión corrige, no apila.** Si el alumno elige mes y a los dos días vuelve
  a clase, no quedan dos inscripciones nuevas empezando el 1: se corrige la que ya estaba
  creada. Sin esto, dudar dos veces le genera cargos duplicados.

**El cambio pide confirmación (17/9/2026).** Un toque en el celular no puede cambiarle a
alguien cómo le cobran. El cartel no dice "¿estás seguro?" — dice el precio nuevo, desde
qué fecha, y que lo que queda de este mes no cambia. Un cartel que no informa nada solo
entrena a la gente a apretar "Sí" sin leer. El foco arranca en **Cancelar**: si alguien lo
abrió sin querer, Enter y Escape lo sacan.

### 12. Una regla que corre desde dos lados vive en un solo lado (18/9/2026)

La regla de **qué clases faltan crear** vivía en `src/comun/fechas.ts` y la
ejecutaba el navegador del profesor al abrir el grupo. Funcionaba, pero tenía un
techo: si el profe no abre la app, las clases del mes que viene no existen, y el
alumno abre su portal y no ve nada.

Para que una tarea programada pueda generarlas sola, la regla tiene que poder
correr sin navegador. Ahí aparecía la tentación de copiarla a SQL y dejar las
dos. **Se descartó:** el día que cambiemos una y nos olvidemos de la otra, la app
y la tarea van a crear clases distintas sin que nadie se entere. Un bug así no
tira un error, solo produce datos raros meses después.

Se mudó entera a la base (0018, `asegurar_clases()`) y la app pasó a llamarla.
Salió de `fechas.ts`: `clasesFaltantes`, `ocurrencias`, `finDelMesSiguiente` y el
tipo `GrupoConHorario`. Sus pruebas se fueron con ella, de
`npm run prueba:fechas` a `supabase/tests/clases_automaticas.sql`.

**Detalle de seguridad que vale la pena entender:** `asegurar_clases()` NO es
`security definer`. Corre con los permisos de quien la llama. Cuando la llama el
profesor, RLS se aplica y solo ve sus grupos — la función no verifica nada a
mano, el candado ya estaba puesto. Cuando la llame la tarea programada, quien
llama es el rol `postgres`, que no está sujeto a RLS y ve todos los grupos de
todos los profesores. Una misma función, dos alcances, según quién la llama.

**Detalle de concurrencia:** la función toma un `pg_advisory_xact_lock` sobre el
id del grupo. Sin eso, la tarea programada y el profesor abriendo la app en el
mismo segundo consultarían los dos antes de que el otro inserte, y crearían la
misma clase dos veces.

### 13. Un mes no tiene cuatro clases (18/9/2026)

Apareció preguntando qué hacer con los meses de cinco clases: si el alumno paga por mes y
el mes trae cinco, ¿se le cobra un extra? ¿Hace falta un segundo precio mensual?

**La respuesta fue que el problema no empezaba ahí.** Un grupo semanal da 52 clases al
año, o sea 4,33 por mes. La app comparaba contra 4 clases sueltas, y esa comparación
mentía para los dos lados. Con los precios de prueba —$5.000 la clase, $18.000 la cuota—:

| | Lo que decía la app | La realidad |
|---|---|---|
| Referencia | 4 clases = $20.000 | 52 clases al año = $260.000 |
| Con cuota | $18.000 | 12 cuotas = $216.000 |
| Cada clase le sale | $4.500 | **$4.154** |
| Descuento | 10% | **17%** |

El profesor fijaba el precio creyendo que resignaba un 10% y resignaba 17%: en el año
regalaba cuatro clases por alumno mensual sin haberlo decidido.

**La decisión: la cuota se queda fija, y el precio se piensa sobre 4,33.** El mes de cinco
ya está pago dentro del promedio. Se descartaron las otras dos salidas:

- **Un segundo precio para meses de cinco** no cubre los meses de tres (feriado, grupo que
  arranca el 10) y obliga a mantener dos números coherentes a mano.
- **Una cuota que escala con las clases del mes** es más justa clase por clase, pero deja
  de ser una cuota —el monto cambia todos los meses— y abre un problema que con cuota fija
  no existe: qué pasa cuando se cancela una clase después de generado el cargo, sobre todo
  si el alumno ya pagó.

**Sobre el tono de lo que ve el profesor (18/9/2026).** La primera versión le mostraba
"cobrás $216.000 en vez de $260.000". Es cierto y es contraproducente: lo único que logra
es desalentarlo de usar la única herramienta que tiene para que el alumno se comprometa.
Se sacó la comparación de facturación anual y quedó lo que necesita para decidir —el
precio por clase— más lo que recibe a cambio: cobros en fecha, todo el año, de alguien que
decidió quedarse una vez en vez de decidirlo cada semana. Y cuando el precio no funciona,
ahora dice cuál sí: el techo por encima del cual la cuota sale más que venir suelto.

Al alumno se le sigue mostrando el ahorro completo, que es lo que lo empuja a comprometerse.
Son dos textos distintos porque son dos decisiones distintas.

Se agregó `src/comun/precios.ts` con la constante y las cuentas, y se corrigieron los tres
lugares donde estaba el 4: la ayuda del precio mensual en el alta de grupo, la comparación
que ve el alumno en "Cómo pago", y el aviso de los meses de cinco clases —que ahora dice
lo que corresponde: que a los mensuales no se les cobra de más.

### 14. La llave maestra vive en Vault, nunca en un archivo (24/9/2026)

Borrar un comprobante del depósito **no se puede hacer con SQL**: en Supabase, borrar la
fila de `storage.objects` deja el archivo huérfano en el bucket. El único borrado de
verdad es el de la API de Storage, que es HTTP y pide autenticarse con la `service_role`.

O sea que para cumplir la promesa de borrar a los 6 meses hubo que meter la llave maestra
del proyecto dentro de la base. Se evaluó la alternativa —borrar desde la app cuando el
profe entra a pagos, sin service_role ni pg_net— y se eligió la tarea programada igual,
para que no dependa de que alguien abra nada.

**Las reglas que hacen que eso sea aceptable:**

- **Los secretos no están en ningún archivo del repositorio.** Se cargan a mano con
  `vault.create_secret()`, una vez por proyecto, desde el SQL Editor. Si estuvieran en la
  migración quedarían en GitHub para siempre, y borrar la línea después no limpia el
  historial de Git.
- **Son dos secretos, no uno:** `proyecto_url` además de `service_role_key`. La URL cambia
  entre `aliado-dev` y `aliado-prod`; leyéndola de Vault, la misma migración sirve para
  los dos proyectos sin editar una letra.
- **La función no tiene `grant` para nadie.** Solo la ejecuta el programador de tareas.
- **Lo que Vault NO resuelve, dicho para que no haya sorpresas:** cualquiera que pueda
  abrir el SQL Editor del proyecto puede leer la llave. Eso ya era cierto —está a la vista
  en la configuración del panel—. Lo que Vault agrega es que la llave no viaja en un
  archivo ni queda en el historial.

**El patrón de dos pasos, que es lo más útil de esta migración.** pg_net es asincrónico:
la respuesta HTTP llega después y en otra tabla. En vez de guardar el número de pedido y
después interpretarlo, la función verifica una regla en cada corrida —"ningún comprobante
confirmado hace más de 6 meses sigue existiendo"— y arregla lo que falte:

1. Los vencidos que **ya no están** en el depósito: se les suelta la referencia.
2. Los vencidos que **todavía están**: se pide el borrado.

Si el pedido falló, el archivo sigue ahí y mañana se vuelve a pedir. Si funcionó, mañana
el paso 1 lo da por cerrado. La confirmación sale del estado de la base, no de leer una
respuesta HTTP. Es el mismo patrón declarativo de `asegurar_cargos()`.

**Verificado de punta a punta el 24/9/2026.** La prueba automática no puede comprobar el
borrado real —pg_net no manda los pedidos hasta que la transacción se confirma, y la prueba
termina en `rollback`—, así que se hizo a mano: comprobante subido y confirmado, envejecido
a `now() - 7 months`, primera corrida `cerrados 0 / pedidos 1`, respuesta HTTP 200, segunda
corrida `cerrados 1 / pedidos 0`, y el archivo efectivamente desaparecido del depósito. Las
instrucciones para repetirlo están al pie de `supabase/tests/comprobantes_viejos.sql`.

### 15. Lo cobrado entraba al sistema y no volvía a salir (24/9/2026)

Hasta la fecha, un pago confirmado **desaparecía de la app**. La pantalla de Pagos lista
solo los que falta confirmar, y el portal del alumno ni siquiera pedía el dato. La base
sabía perfectamente cuánto había entrado y no había forma de preguntárselo.

Las dos preguntas que quedaban sin respuesta son justo las que la app existe para
contestar: *"¿cuánto cobré este mes?"* del lado del profesor, y *"¿yo no había pagado
marzo?"* del lado del alumno — que es, de lejos, la que más veces le van a hacer.

Se resolvió sin migración: los permisos de lectura ya estaban puestos desde la 0005 y la
0004. Era todo pantalla.

**La fecha que vale es cuándo entró la plata (`paid_on`), no cuándo el profesor la dio por
buena (`confirmed_at`).** Si un alumno transfiere el 30 y el profe confirma el 2, esa plata
es del mes que se fue. Cuando `paid_on` está vacío —el alumno no lo completó— se usa la
confirmación, que es lo más cercano que hay. El filtro contra la base va igual por
`confirmed_at`, que es el campo que siempre existe; el mes efectivo se calcula en la app.

El total del mes va primero y grande, y el detalle abajo: la pregunta que trae al profesor
a esa pantalla es "¿cómo vengo?", y esa se responde con un número. La comparación con el
mes anterior se muestra sin adjetivos — un mes flojo no necesita que la app se lo subraye.

Y acá aparece por fin el uso de `receipt_deleted_at`, que la 0020 había dejado en la base
sin nada que la mirara: en un cobro viejo, "el comprobante se borró por antigüedad" no es
lo mismo que "no mandó comprobante".

### 16. La app cobraba plata que después no sabía que tenía (6/10/2026)

`confirmar_pago()` reparte el pago entre los cargos abiertos y, si sobra, lo informa:
*"quedaron $18.000 a favor, sin cargo al que aplicarse"*. Hasta la 0021 eso era todo lo que
pasaba con esa plata: `student_account` calculaba lo pagado sumando **imputaciones**, no
pagos, así que plata confirmada sin imputar no bajaba ningún saldo ni aparecía en ninguna
pantalla.

El escenario, con un alumno que paga dos meses juntos en octubre: el 1 de noviembre la
tarea nocturna crea la cuota de noviembre, el alumno la ve como deuda habiendo entregado
la plata un mes antes, el profesor lo ve en "Quién me debe", y lo persigue por WhatsApp.
Al que ya pagó.

**La tarea programada de la 0019 empeoró esto.** Antes la cuota aparecía solo cuando el
profe abría el grupo, así que el choque era esporádico. Después pasaba solo, todos los
días 1, sin que nadie lo mirara. Una pieza que automatiza algo correcto puede volver
sistemático un defecto que antes era ocasional.

**Estaba anotado desde la 0006 y mal clasificado.** Figuraba como "saldo a favor", en la
lista de funciones que faltaban, descrito como lo que destrabaría el pago adelantado y el
pack de clases. No era una función faltante: era la app aceptando plata que no podía
rendir. Para una app de pagos, el defecto más serio que quedaba.

Se cerró con tres piezas: la vista expone `a_favor`, `asegurar_imputaciones()` aplica esa
plata del cargo más viejo al más nuevo —mismo patrón declarativo de `asegurar_cargos()`—,
y la tarea nocturna la llama **después** de generar los cargos, porque la plata a favor se
aplica a cargos que acaban de nacer.

Dos detalles que no son obvios:

- **La vista cambió de forma.** Salía de `charges`, así que un alumno que pagó y no tiene
  ningún cargo no aparecía — y es justo el caso del que pagó por adelantado. Ahora la base
  es la unión de quienes tienen cargos y quienes tienen pagos.
- **Las imputaciones van por espacio, no por grupo.** La plata a favor es del alumno y
  puede cubrir un cargo de cualquier grupo en el que esté anotado.

Y una fila de la prueba existe solo para esto: **que nunca impute más de lo que el alumno
pagó.** Equivocarse para el otro lado sería inventar plata que nadie entregó.

### Un invariante sostenido por convención, y una prueba que tenía razón (6/10/2026)

La 0021 definió `a_favor` como "lo confirmado menos lo imputado" y dejó `saldo` como "los
cargos menos lo imputado". Con esas dos definiciones un alumno puede aparecer **debiendo
$10.000 y teniendo $25.000 a favor al mismo tiempo**: las dos cifras son correctas según su
definición y juntas no significan nada. En pantalla es peor que un número raro — el alumno
figura en "Quién me debe" y en "Pagaron por adelantado" a la vez.

**Lo encontró la prueba, y de la manera menos esperada: fallando donde yo tenía razón.** La
fila 1 esperaba `a_favor = 15000` y la vista devolvía `25000`. El primer reflejo fue
corregir la expectativa de la prueba. Era al revés: la prueba codificaba la semántica que
el modelo necesitaba y la vista había implementado otra. Con la 0022 las seis expectativas
originales pasan sin tocar una línea del archivo de prueba.

**El reflejo peligroso acá es "la prueba está mal, la ajusto".** A veces es cierto. Pero una
prueba escrita pensando en el comportamiento deseado es un testigo, y ajustarla para que
pase es romperle el testimonio. Conviene preguntarse primero cuál de los dos tenía razón.

**Y el segundo reflejo, igual de peligroso: "esa ventana dura segundos".** Me dije que
`confirmar_pago()` imputa en el acto, así que el estado contradictorio sería momentáneo. Al
revisarlo no era cierto: el alta manual de un cargo no vuelve a imputar, así que entre que
el profesor crea el cargo y la próxima corrida pasan **horas**. La 0021 dejaba la
corrección dependiendo de que todo el que crea un cargo se acuerde de imputar después — un
invariante por convención, que se rompe el día que alguien agrega una cuarta forma de crear
un cargo.

La 0022 lo sostiene por construcción: `saldo` y `a_favor` son las dos caras de la misma
resta, cada una recortada en cero. Si una es positiva, la otra es exactamente cero, y no
depende de que nadie haya corrido nada. `total_pagado` pasa a ser lo que el alumno
**entregó** y se agrega `total_imputado` para la conciliación cargo por cargo.

`asegurar_imputaciones()` no sobra: sigue siendo la que hace que cada cuota aparezca como
"Pagada" en la lista del alumno. Lo que deja de ser es la condición para que el saldo esté
bien.

### 17. Botones que duplicaban lo que el sistema ya hacía solo (10/10/2026)

El detalle del grupo tenía dos formas de crear cargos a mano: **"Cobrar la cuota del mes"**
a todo el grupo, y **"Cobrar"** en cada alumno. Las dos son anteriores a `asegurar_cargos()`:
cuando se escribieron, los cargos los creaba el profesor.

Desde la 0011 la cuota del mes en curso y la próxima clase las genera la base sola, y desde
la 0019 lo hace **todas las noches sin que nadie abra nada**. O sea que esos botones no
agregaban nada, y sí podían restar: generar a mano la cuota que ya existe es la forma más
fácil de cobrarle dos veces a alguien.

- **"Cobrar la cuota del mes" se eliminó.** No hay ningún caso en que haga falta.
- **El de cada alumno quedó, con otro sentido:** pasa a ser *"Agregar un cargo"*, con el
  concepto **vacío**. Antes venía precargado con "Cuota septiembre" y el precio del grupo —
  o sea, proponiendo exactamente lo que ya existía. Ese valor por defecto era la invitación
  a duplicar. Ahora es para lo único que el automatismo no puede saber: una clase
  particular, un pack, materiales, un recupero.

**Una función que duplica lo que el sistema ya hace no es una comodidad, es una trampa.**
Cuando se automatiza algo, hay que ir a buscar los botones que lo hacían antes.

### 18. La ficha era del profesor, y es de la persona (10/10/2026)

El profesor creaba la ficha del alumno y podía editarla para siempre. Eso significa que el
nombre con el que una persona aparece en la app lo elige otro: un profesor que escribe
"Juan (el alto)" está nombrando a alguien que no eligió ese nombre y lo ve en su propia app.

Desde la 0023:

- El profesor **crea** la ficha y la **corrige mientras nadie la reclamó**. Ese período
  existe para arreglar un correo mal tipeado, que es lo único que impide que el alumno
  entre. (Y no hay riesgo de que la haya reclamado con el correo equivocado: reclamarla
  exige que el correo coincida, así que si estaba mal, nadie pudo.)
- Una vez reclamada, el nombre y la foto son del alumno.

**Por qué esto NO es una política de RLS.** La tentación era `for update using (user_id =
auth.uid())`. Sería un agujero, por la razón que ya nos mordió: **RLS protege filas, no
columnas.** Esa política deja cambiar cualquier campo de la fila, y ahí hay tres que no son
del alumno: `tenant_id` (mudarse a la escuela de otro profesor con su historial encima),
`email` (engancharse invitaciones dirigidas a otra persona) y `status` (darse de alta
después de que lo dieron de baja). Por eso es una función `security definer` que escribe
**exactamente dos columnas**: lo que no está en el `update` no se puede tocar, y eso no
depende de que nadie se olvide de nada.

La foto se toma de Google cuando el alumno entra con Google. Queda anotado el límite: es
una dirección de Google y puede dejar de funcionar si la persona cambia su foto. Si pasa,
se cae a las iniciales, que es lo que había antes. La solución definitiva sería copiar la
imagen a nuestro depósito al reclamar la ficha; hoy no vale la complejidad.

### El listado de clases (10/10/2026)

Era una sola lista con **todas** las clases del grupo, de la más nueva a la más vieja, sin
cortes. Un grupo regular acumula cuatro por mes: a los seis meses son veinticuatro
renglones iguales.

Y el orden estaba al revés de la pregunta. Lo que un profesor busca en esa pantalla es
*"cuándo es la próxima"*, no *"cuándo fue la última"* — con las pasadas arriba, lo que viene
quedaba abajo del pliegue.

Ahora son dos listas: **Próximas** (de hoy en adelante, de la más cercana a la más lejana,
y es la vista por defecto) y **Ya dadas** (para atrás, de a diez). Las dos agrupadas por mes.
Y la fecha pasó a ser un chip a la izquierda en lugar de texto a la derecha: en una lista de
clases el dato que se busca con el ojo es el día, y una columna de números se barre sin leer.

### Una prueba que no corría desde hacía un mes (10/10/2026)

Al correr `aislamiento_alumno.sql` después de la 0023, falló así:

```
ERROR: 42703: column "agreed_price" of relation "enrollments" does not exist
```

No lo rompió la 0023. Lo rompió **la 0011**, un mes antes: esa migración eliminó
`enrollments.agreed_price` cuando los precios pasaron a ser del grupo, y la preparación de
esta prueba seguía insertando esa columna.

Durante ese mes se tocaron las políticas y el esquema varias veces, y **la prueba de
aislamiento del portal del alumno —una de las más importantes que hay— no se ejecutó ni
una vez.** No falló: no corrió. Nadie se enteró porque nadie la llamó.

**Una prueba que no se ejecuta no protege nada, y además da la tranquilidad de existir.**
Es el mismo problema que la fila de los secretos de Vault, visto desde otro ángulo: ahí la
prueba corría y no miraba; acá ni siquiera corría.

La regla que se agregó a `CLAUDE.md`: después de un cambio de esquema o de políticas se
corren **todas** las pruebas repetibles, no solo la del tema que se tocó. Una migración que
elimina una columna rompe en silencio cualquier prueba que la nombre, esté o no relacionada
con lo que se estaba haciendo.

### Y una vez que corrió, dijo "FUGA DE DATOS" sin que hubiera ninguna

Arreglada la columna, la prueba corrió y dio seis FALLA, una de ellas con el cartel de
**FUGA DE DATOS**. No había ninguna fuga.

Todas las filas que verificaban lo ajeno —*no ve la ficha de su compañera*, *no ve sus
cargos*, *no ve sus pagos*— dieron 0. Las que fallaban eran las de **lo propio**, y fallaban
por ver de más: el alumno tenía ficha en 2 escuelas en vez de 1, estaba en 3 grupos, y esos
grupos acumulaban 24 clases porque **la tarea nocturna de la 0019 se las viene generando
sola**.

La prueba preguntaba `count(*) = 1`. Era cierto el día que se escribió.

**Contar no es verificar aislamiento.** `count(*) = 1` confunde *"ve de más de lo suyo"* con
*"ve lo ajeno"*, y lo único que importa es lo segundo. Peor: una prueba de seguridad que
grita cuando crece la data propia es una prueba que se aprende a ignorar — y el día que
grite de verdad va a parecer lo mismo que las otras diez veces.

Se reescribió por **propiedad**: cada fila verifica que no haya **ni una** fila visible que
no sea suya (`where x.student_id not in (las fichas de auth.uid())`). Eso es cierto con un
grupo y con cuarenta, y no se degrada con el uso.

**La regla general:** una prueba de aislamiento se escribe contra una propiedad, nunca
contra una foto de los datos. La foto envejece; la propiedad no.

### La tanda completa de pruebas: seis rotas, cero fugas (10/10/2026)

La primera vez que se aplicó la regla nueva —correr **todas** las repetibles— seis de diez
archivos fallaron. **Ninguna era una fuga.** Cuatro filas decían literalmente "FUGA DE
DATOS" y en las cuatro el aislamiento estaba intacto.

| Archivo | Qué pasaba |
|---|---|
| `aislamiento.sql` | `count(*) = 1` sobre espacios y membresías. Hay **dos espacios llamados "Escuela de Prueba 1"**, así que Profe 1 ve dos cosas **propias** y la prueba gritaba fuga |
| `aislamiento_cargos.sql` | `from payment_allocations` y `from student_account` **sin filtro**, esperando cero. Contaban las imputaciones propias de Profe 1, que hoy son trece |
| `confirmar_pago.sql` | Daba por hecho un cargo abierto de $5.000 que había dejado otra prueba. Desde la 0021, `asegurar_imputaciones` corre todas las noches y lo había cubierto: la función imputaba 0 porque no había nada que imputar |
| `invitaciones.sql` | `= 2` y `= 0` sobre la lista de invitaciones. Hoy hay cuatro, porque se usaron de verdad |
| `saldo_a_favor.sql` | Moría entera: `more than one row returned by a subquery`, por los dos espacios con el mismo nombre |

**El patrón es uno solo, y es el mismo de `aislamiento_alumno.sql`:** estas pruebas se
escribieron como **una foto de una base fija**, y esa base dejó de ser fija. Se usa todos
los días, y desde la 0019 hay dos tareas que le escriben **todas las noches**.

Qué se cambió, en todas:

- **Verificar por propiedad, no por cantidad.** `where a.tenant_id not in (select my_tenant_ids())`
  en vez de `count(*) = 0`. Cierto con trece imputaciones y con mil.
- **Cada prueba se arma su propio estado.** `confirmar_pago.sql` ahora crea el cargo que va
  a verificar. Una prueba que se apoya en lo que dejó otra verifica cosas distintas según
  qué corrió antes y cuánto hace que no pasa la tarea de la noche.
- **Verificar el efecto sobre lo propio, no sobre el total.** `confirmar_pago` reparte del
  cargo más viejo al más nuevo: si el alumno tenía deudas anteriores, el total imputado deja
  de ser predecible. Se verifica que **el cargo de la prueba** quede cubierto y que lo
  imputado más lo que sobra sume lo declarado — o sea, que la plata no se evapore.
- **`limit 1` donde se busca por nombre.** Ningún nombre de espacio es único, porque nada
  lo hace único.

**Lo más valioso que dejó esta tanda no es ninguno de los arreglos.** Es que cuatro carteles
de "FUGA DE DATOS" resultaron falsos. Una prueba de seguridad que da falsa alarma enseña a
ignorarla, y el día que avise de verdad va a parecer lo mismo que las otras cuatro veces.

**Pendiente, decisión de Tomás:** hay dos espacios llamados "Escuela de Prueba 1" en
`aliado-dev`. Las pruebas ya lo toleran. Borrar uno arrastra en cascada sus grupos, alumnos
y cargos, así que no se toca sin decidirlo a propósito.

---

### 19. Tres formas de sacar a alguien, y no son lo mismo (29/10/2026)

En el listado de alumnos convivían "Quitar" y "Dar de baja" sin que nada explicara la
diferencia, y faltaba la tercera.

| Acción | Qué hace | Cuándo |
|---|---|---|
| **Quitar** | Borra la inscripción como si no hubiera existido | Se anotó mal. No hay historia que conservar |
| **Dar de baja** | Cierra la inscripción con fecha: deja de generar clases y cargos, y lo cobrado queda | Dejó ese grupo. Sigue siendo alumno de la escuela |
| **Dejar la escuela** | `dejar_la_escuela()` (0040): cierra **todas** sus inscripciones activas y archiva la ficha | Se va del todo. Deja de aparecer en los listados |

`volver_a_la_escuela()` desarchiva la ficha y **no reabre ninguna inscripción**, a propósito:
que alguien vuelva no quiere decir que vuelva a los mismos grupos con los mismos precios.
Eso se anota de nuevo, y es información que solo tiene el profesor.

### 20. Las particulares son dos cosas distintas (29/10/2026)

"Particular" juntaba dos acuerdos que no se parecen:

- **Fijas:** todos los martes a las 19, mes a mes. Las clases se generan solas, como un
  grupo regular.
- **Por pedido:** "quiero cuatro clases". Las fechas las escribe el profesor una por una y
  **no se genera nada más** después de esas cuatro. El precio es el del paquete.

Son ramas distintas del formulario, no un campo opcional. Un paquete de cuatro clases que
sigue generando clases el mes que viene no es un detalle de configuración mal puesto: es
plata que el alumno no acordó.

**Y una particular puede ser de varios.** Un grupo reducido de tres personas que arreglan
entre ellas sigue siendo una particular, así que el formulario pide una **lista** de
participantes y no un alumno. El cupo no se pregunta: en una particular el cupo **es** la
gente que anotaste.

En los grupos sí se pregunta, y la ayuda dice la verdad: *"Al anotar a alguien con el grupo
lleno, la app te avisa."* Antes el campo existía y no hacía absolutamente nada — ni avisaba,
ni impedía. **El cupo es del profesor, no una regla del sistema:** si en la sala entra uno
más, el aviso no bloquea nada.

### 21. Un martes por medio no es medio martes (29/10/2026, migración 0036)

Cada día del horario dice ahora si es todas las semanas o 1, 2, 3 o 4 veces por mes. Antes
todo era semanal, así que al alumno que viene cada quince días **se le generaba el doble de
clases y se le cobraba el doble**.

Las opciones están escritas como las dice el profesor:

> Todas las semanas (incluso si hay 5ª) · 4 por mes · 3 por mes · 2 por mes (1ª y 3ª semana) · 1 por mes

Dos detalles que se discutieron y valen la pena:

- **"4 por mes" y "todas las semanas" no son lo mismo**, aunque casi siempre coincidan: el
  mes con cinco martes los tiene cinco en una y cuatro en la otra. Que las dos opciones
  existan y digan eso en voz alta es mejor que elegir por el profesor.
- **"2 por mes" es la 1ª y la 3ª semana, no la 1ª y la 2ª.** Dos semanas seguidas y después
  veinte días sin verse no es lo que nadie acuerda cuando dice "un martes por medio".

La cuenta en `asegurar_clases()`: el número de ese día dentro del mes es
`((día - 1) / 7) + 1`, y los permitidos salen de `(i - 1) * 4 / N + 1` para `i` de 1 a N.
N=1 → {1}; N=2 → {1,3}; N=3 → {1,2,3}; N=4 → {1,2,3,4}.

### 22. La app le decía al profesor que bajara un precio que ya era barato (29/10/2026)

Un grupo de dos días por semana a $15.000 la clase, con cuota mensual de $100.000: la app le
avisaba que la cuota le salía **más caro** al alumno. Ocho clases al mes son $120.000, así
que la cuota era un 17% más barata.

El error era de aritmética: dividía la cuota por cuatro semanas sin mirar **cuántos días por
semana** tiene el grupo. Y el arreglo correcto no era multiplicar por los días: es trabajar
en clases **por año**.

Un mes no tiene cuatro semanas. Tiene 4,33. Un año tiene 52 semanas, y repartirlas en doce
meses de cuatro deja un mes de clases afuera — que es, justamente, el margen que el profesor
estaba a punto de regalar porque la app se lo pedía. `clasesPorAnioDe()` cuenta 52 por cada
día semanal y `por_mes * 12` por cada día con frecuencia. La misma cuenta la ve el alumno de
su lado.

**Una cuenta que se muestra a las dos personas tiene que vivir en un solo archivo.** Está en
`src/comun/precios.ts`, con sus casos en `npm run prueba:fechas`.

### 23. Qué enseña cada escuela (29/10/2026, migraciones 0037 a 0039)

La escuela dice qué enseña, eligiendo de un catálogo de 32 actividades, y **puede enseñar más
de una**. El día que el alumno pueda buscar clases, la búsqueda necesita que "Bachata" sea el
mismo dato en todas las escuelas y no texto libre.

**Nada de subcategorías.** Apareció una escuela cargada como "Bachata Influence", y eso es
abrir una discusión que el producto no necesita hoy: sensual, dominicana, moderna, influence,
y cada profesor con su criterio. Se elige **Bachata** del catálogo y se aclara el estilo en un
campo libre de hasta 40 caracteres. La búsqueda ordena por la categoría; la aclaración es
para que la lea una persona.

El backfill de la 0037 no descartó lo que no supo mapear: convirtió el texto libre en una
entrada del catálogo con `orden = 800` para que se vea que entró por ahí. Perder el dato de
lo que un profesor ya había escrito, para que la migración quede limpia, es el intercambio
equivocado.

**Y el grupo también dice de qué es** (0039): una escuela de Bachata puede tener un grupo de
Salsa. El alumno lo ve en su clase, que es donde importa: él no eligió la escuela, eligió la
clase.

### 24. Las tareas nocturnas eran de cualquiera (30/10/2026, migraciones 0041 y 0042)

La 0041 agregó el barrido de fotos que nadie usa, y al escribir su prueba apareció que las
**tres** tareas nocturnas las podía ejecutar cualquier usuario logueado. Está contado en
"Una prueba que aceptaba cualquier error", más arriba.

El barrido en sí es deliberadamente lento: una foto huérfana se anota, y se borra solo
después de **siete noches seguidas** de seguir huérfana. Una foto que parece suelta porque la
subida quedó a mitad de camino, o porque la ficha se está editando justo ahora, aparece una
noche y no la siguiente. Siete noches es la diferencia entre limpiar y perder.

**Arranca en modo mirar.** La tarea está agendada llamando a `limpiar_archivos_sueltos()` sin
argumento, o sea sin borrar: anota en `public.archivos_sueltos` lo que *habría* borrado.
Alrededor del 6/11/2026 hay que mirar esa tabla y, si lo que anotó es lo esperable,
re-agendarla con `limpiar_archivos_sueltos(true)`. Es una migración de dos líneas.

Una tarea que borra archivos y se enciende el mismo día que se escribe no tiene forma de
equivocarse barato.

---

## Errores encontrados y qué enseñaron

### `create or replace` no puede cambiar lo que una función devuelve (16/9/2026)

La 0016 le agregaba una columna a `invitaciones_pendientes` y falló con `42P13: cannot
change return type of existing function`. Hay que borrar la función y crearla de nuevo.

Dos cosas que quedaron claras:

- **Una migración que falló no es una migración aplicada.** La regla "una migración
  aplicada nunca se edita" protege lo que ya está en la base. La 0016 no llegó a entrar,
  así que se corrigió en el mismo archivo en vez de agregar otra para tapar un error que
  nunca existió.
- **`drop function` se lleva puestos los permisos.** Sin volver a hacer el `grant execute
  ... to authenticated`, la app del alumno habría recibido "permission denied" al pedir
  sus invitaciones — y el error habría aparecido lejos del cambio que lo causó.

### Un campo de archivo adentro de su propio `<label>` no abre (16/9/2026)

El botón de adjuntar comprobante no hacía nada. El campo estaba dentro del componente
`Campo`, que envuelve a sus hijos en un `<label>` — como todos los demás campos de la app.
Con un campo de archivo eso lo rompe: el clic abre el selector y el `label` le reenvía un
segundo clic al mismo input, que lo cierra en el acto. No hay error en la consola: parece
que el botón está muerto.

Se sacó de `Campo` y se armó la etiqueta a mano, con un comentario al lado explicando por
qué ese campo es la excepción — si no, el próximo que ordene el código lo va a "arreglar"
metiéndolo de nuevo adentro.

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

### Una prueba que confirmaba que la caja existe, sin mirar adentro (24/9/2026)

Al cargar los secretos de Vault para la 0020 quedó guardado el texto de molde
—`https://TU-PROYECTO.supabase.co`— en vez del valor real. Los dos secretos, porque se
crearon juntos.

Lo grave no fue el error de carga, que se arregla con dos `update_secret`. Lo grave es que
**la prueba pasaba en verde igual**: la fila decía "los dos secretos están cargados" y solo
miraba `vault.secrets.name`. Confirmaba que la caja existía sin fijarse si tenía algo
adentro.

Si no se hubiera visto de casualidad, el síntoma habría aparecido meses más tarde: el
borrado nocturno fallando en silencio, sin nadie mirando, y los comprobantes acumulándose
igual que antes.

La fila ahora verifica la **forma** de cada secreto —que la URL sea de un proyecto de
Supabase, que la clave tenga más de 100 caracteres— sin mostrar el contenido. Alcanza para
descartar un molde.

Es pariente del error de las invitaciones: **una prueba que no puede fallar por el motivo
que dice estar probando es peor que no tener prueba**, porque da tranquilidad falsa.

### Una función que recibía dos formas y sabía leer una sola (30/10/2026)

El alumno que avisaba una transferencia leía esto en su cuenta:

> Lo avisaste el **30T22:43:56.720398+00:00/10/2026**.

`fecha()` partía el texto por los guiones y devolvía `d/m/a`. Eso es correcto
para una fecha sola —`2026-10-30`, como `due_date` o `paid_on`— y basura para una
marca de tiempo con huso —`2026-10-30T22:43:56.720398+00:00`, como `declared_at`
o `confirmed_at`—, que es la otra cosa que la base guarda con la misma pinta de
texto.

**No falló: dibujó basura.** Una excepción se ve en el acto; esto se ve cuando lo
mira una persona, y solo si mira la pantalla correcta.

**Lo importante no es el error, es lo que destapó.** Tres pantallas ya resolvían
esto cada una por su cuenta, recortando el texto a mano antes de pasarlo:

| Dónde | Qué hacía |
|---|---|
| `Pagos.tsx` | `fecha(p.declared_at.slice(0, 10))` |
| `datos.ts`, lo cobrado | `paid_on ?? String(confirmed_at).slice(0, 10)` |
| `MiEscuela.tsx`, lo que pagaste | `paid_on ?? confirmed_at?.slice(0, 10) ?? declared_at.slice(0, 10)` |

O sea que la regla *"a esto hay que recortarlo antes"* existía, se aplicaba tres
veces, y no estaba escrita en ningún lado. El cuarto que llegara se la iba a
comer. Y el recorte, además, **estaba mal**: los primeros diez caracteres son el
día **en UTC**. Un pago avisado a las 21:30 del 31 en Buenos Aires son las 00:30
del 1 en UTC, así que la app le decía al alumno **1/11** por algo que hizo el 31 —
y la lista agrupada por mes lo mandaba a noviembre.

Cómo quedó: `diaLocal(iso)` devuelve el día de una marca de tiempo **según el
reloj de quien mira**, igual que ya hacía `hoyISO()`. `fecha()` acepta las dos
formas y manda las marcas de tiempo por ahí. Los tres recortes a mano la llaman.

**La fecha sola se sigue partiendo a mano, a propósito**, y conviene dejar escrito
por qué, porque las dos trampas son opuestas y es fácil "arreglar" una rompiendo
la otra:

- `new Date('2026-10-30')` se lee como **medianoche UTC**, que en Buenos Aires es
  el 29 a las 21. Pasar una fecha sola por `Date` es cómo una app termina
  mostrando el día anterior al que dice la base.
- Partir por los guiones una marca de tiempo da el texto crudo de arriba.

**La lección:** cuando una función de formato recibe dos formas distintas del
mismo dato, no alcanza con que cada pantalla se acuerde de normalizar antes de
llamarla. Lo que hay que normalizar vive adentro de la función, una vez. Una
regla que depende de que todos se acuerden es una regla que ya falló, solo que
todavía no sabés dónde.

Los casos están en `npm run prueba:fechas`, incluido el borde de medianoche. Las
dos filas del día local comparan contra `Date` y no contra un texto fijo: un
texto fijo solo pasaría corriendo la prueba en Argentina.

---

## Pendientes sueltos

- [x] Instalar Node.js — hecho (v24.20.0, npm 11.19.0)
- [x] Resetear la contraseña de la base — hecha el 30/10/2026, después de haberla pegado en un chat
- [x] Devolver el Site URL de Supabase a su valor — hecho el 30/10/2026 (se había apuntado a una IP de la red local para probar desde el celular)
- [ ] Mirar `public.archivos_sueltos` alrededor del 6/11/2026 y decidir si se enciende el borrado
- [ ] `cambiar_forma_de_pago` busca la ficha sin `limit`: con dos fichas reclamadas en la misma escuela tira un error de Postgres sin explicación
- [ ] Hay dos espacios llamados "Escuela de Prueba 1" en `aliado-dev`. Borrar uno arrastra en cascada sus grupos, alumnos y cargos
- [ ] Falta una tanda de nombres para decidir el definitivo, y el logo
- [ ] Cambiar la contraseña del admin en la app vieja (hoy es `admin`, en texto plano)
- [ ] No tocar el proyecto Supabase `axzyhjprterixsgqhddv` — sirve los videos de la app en producción
- [ ] La app vieja tiene `firestore.rules` con `allow read, write: if true` (base abierta). Se resuelve solo con la migración a Supabase
