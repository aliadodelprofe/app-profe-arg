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
| `localhost:3000/profe` | La app nueva, contra Supabase |
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

Últimos resultados (4 de septiembre de 2026):
- `aislamiento.sql` Parte 2 → **3 de 3 PASA**
- `aislamiento_cargos.sql` → **5 de 5 PASA**
- `aislamiento_alumno.sql` → **16 de 16 PASA**
- `confirmar_pago.sql` → **6 de 6 PASA**
- `control_general.sql` → **10 tablas en `ok`**

---

## Próximo paso exacto

**El loop diario del profesor está completo.** *Mis grupos → tomar asistencia →
quién me debe → confirmar un pago* funciona de punta a punta contra Supabase.

Lo que sigue es la decisión de producto, no más pantallas: hoy los cargos y los pagos
declarados se siembran a mano (`supabase/seeds/pago_declarado.sql`). Para que el loop
se alimente solo hacen falta dos cosas, en este orden:

1. **Resolver el saldo a favor** (ver Decisiones de producto pendientes). Destraba el
   pago anticipado, el pack de 4 clases y el sobrante que hoy la app informa pero no
   sabe dónde guardar.
2. **Enlazar alumnos con usuarios** (`students.user_id`), que es lo que le da entrada
   al portal del alumno y hace que las transferencias las declare el alumno en vez de
   sembrarlas nosotros.

Las pantallas hechas, en `src/profe/`:

| Pantalla | Qué hace |
|---|---|
| Ingreso | Email y contraseña contra Supabase Auth |
| Espacios | Solo aparece con más de un espacio, o con ninguno (ahí ofrece crear el primero). Con uno solo la app entra derecho a los grupos |
| Grupos | Los grupos del espacio, con su formato |
| Detalle del grupo | Alumnos con su precio y forma de pago (que salen de la inscripción, no del grupo) y las clases con su recap. Da de alta alumnos y clases |
| Asistencia | Presente / ausente / justificado, guardando en cada toque, **con la deuda de cada alumno a la vista**. Al pie, el recap de la clase |
| Quién me debe | Estado de cuenta del espacio sobre la vista `student_account`, separando lo que hay declarado y sin confirmar |
| Pagos por confirmar | Las transferencias declaradas. Un toque llama a `confirmar_pago()` e informa cuánto se imputó y cuánto quedó a favor |

Decisión tomada el 4/9/2026: **no se migra `AuthContext.tsx`.** Sus 2.929 líneas
manejan diez colecciones de Firestore (`users`, `merch_*`, `convocatorias`,
`notifications`…) que no se cruzan con el modelo nuevo, y nada de eso está en la ruta
a los tres profesores pagando. La app de la comunidad sigue viva en Firebase mientras
tanto, y por eso `announcements` y `benefits` tampoco se migran todavía.

Pendiente de diseño, para cuando toque el portal del alumno: el enlace alumno ↔
usuario. `students.user_id` está vacío en todas las fichas, y hasta que no se cargue,
las reglas de la 0005 no le abren la puerta a ningún alumno. Ese flujo (el profe
invita, el alumno se registra) es trabajo de la app.

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

### 4. Generación automática de cargos por asistencia — en pausa

`CLAUDE.md` dice que los cargos se generan por asistencia para quien paga por clase.
La pantalla de asistencia todavía **no lo hace**, a propósito: si el cargo termina
naciendo al anotarse (punto 1), generarlo también al asistir duplicaría. Se decide
cuando se resuelva el saldo a favor.

### 5. Clases en serie para grupos regulares — pedido, con dos piezas faltantes

Idea de Tomás (5/9/2026): un grupo regular sucede siempre el mismo día, a la misma
hora y en el mismo lugar. El profe debería cargar eso **una sola vez** y que las
clases se creen solas, con la posibilidad de corregir alguna puntual.

Es correcto y aplica justo a `regular`, que es el formato que sí es fijo. Antes hacen
falta dos cosas que hoy no existen:

- **Corregir o cancelar una clase puntual.** Hoy de una clase ya creada solo se puede
  editar el recap: no la fecha, no la hora, y no hay forma de cancelarla por feriado
  o por lluvia. Sin esto, generar en serie es generar problemas en serie.
- **El lugar.** No existe en el modelo, ni en `groups` ni en `sessions`. Pide una
  migración. Lo razonable: el lugar por defecto en el grupo, y que la clase pueda
  pisarlo cuando ese día se dio en otro lado.

Detalle de diseño: pedir **cuántas clases** en vez de "un mes". Un mes tiene 4 o 5
martes según cuál sea; un número es predecible y no sorprende a nadie.

---

## Pendientes sueltos

- [x] Instalar Node.js — hecho (v24.20.0, npm 11.19.0)
- [ ] Cambiar la contraseña del admin en la app vieja (hoy es `admin`, en texto plano)
- [ ] No tocar el proyecto Supabase `axzyhjprterixsgqhddv` — sirve los videos de la app en producción
- [ ] La app vieja tiene `firestore.rules` con `allow read, write: if true` (base abierta). Se resuelve solo con la migración a Supabase
