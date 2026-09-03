# Proyecto — App para profesores independientes

Contexto permanente del proyecto. Leé este archivo antes de proponer cambios.

---

## Qué es

SaaS para el **profesor independiente que alquila salas y da clases por su cuenta** — no trabaja para una academia. Baile (bachata, salsa), y a futuro yoga, zumba, artes marciales, música, idiomas.

**Posicionamiento:** no es software de reservas, es software de formaciones y grupos. Los competidores (Acuity, Vagaro, OfferingTree, Momence) asumen turnos sueltos en un calendario. Acá el objeto central es un **grupo de gente que cursa junta**.

**Mercado inicial:** Argentina. Después España, Italia, México, Colombia.

**Dos tipos de usuario:**
- **Profesor** — administra. Usa la app también desde computadora.
- **Alumno** — consume. Móvil. Entra por el contenido de sus clases, no por el pago.

---

## Reglas de seguridad — INNEGOCIABLES

Estas cuatro no se discuten ni se posponen. La app maneja datos personales de alumnos de terceros.

1. **Aislamiento entre tenants.** Un profesor NUNCA puede ver datos de otro. Se garantiza con Row Level Security en Postgres, no con lógica en el front-end.
2. **`tenant_id` en todas las tablas de datos**, incluso donde parezca redundante. Simplifica y acelera las políticas de RLS.
3. **La `service_role` key jamás va al front-end.** Solo la `anon` key. La `service_role` solo en el servidor, si alguna vez hace falta.
4. **Nada de credenciales en el código.** Todo por variables de entorno. `.env.local` en `.gitignore`, `.env.example` versionado sin valores reales.

**Después de cualquier cambio en el esquema o en las políticas: correr la prueba de los dos profesores.** Dos tenants de prueba, intentar activamente leer y escribir datos del otro desde la sesión de cada uno. Si algo pasa, se frena todo hasta arreglarlo.

---

## Stack

- **Base de datos y auth:** Supabase (Postgres). Elegido sobre Firebase por RLS, datos relacionales, costo predecible y facilidad de salida.
- **Dos proyectos de Supabase:** `dev` y `prod`. Región São Paulo (la más cercana a Argentina).
- **Front:** web app / PWA instalable. NO app nativa. Si algún día hace falta estar en las tiendas, se envuelve con Capacitor — no se reescribe.
- **Video de los recaps:** a un servicio de video externo. NUNCA al storage de la base.

---

## Los tres formatos

Todo lo que hace un profesor entra en tres formatos. **Comparten alumno, asistencia, cargo, pago y recap.** Un solo modelo con un campo de formato — nunca tres productos separados.

| Formato | Qué es | Fin |
|---|---|---|
| `cycle` | Grupo cerrado, cupo, contenidos que progresan. La "formación". **Un workshop es un ciclo de una sola sesión.** | Sí |
| `regular` | Recurrente, abierta, gente que entra y sale. **Es lo que hace la mayoría del mercado.** | No |
| `private` | Uno a uno, agendada, por hora. Módulo pago aparte. | No |

---

## Cómo se cobra — el punto clave del modelo

**La forma de pago NO es una propiedad del formato. Es de cada inscripción.** Dentro de un mismo grupo regular puede haber alumnos pagando por clase y otros pagando el mes con descuento.

- **Regular:** por clase. Si paga el mes por adelantado, precio mensual con descuento.
- **Cycle (formación):** cuota mensual mientras dure.
- **Cycle (workshop):** pago único por asistir.
- **Private:** por clase, o descuento pagando 4 clases del mes por adelantado.

### Pagos en Argentina
Se cobra por **transferencia**, no con tarjeta. El producto NO procesa pagos: **concilia**.

Flujo: el alumno declara la transferencia (monto, fecha, comprobante) → le llega al profesor como pendiente → confirma con un toque → el estado de cuenta se actualiza solo.

Esto es diferencial competitivo: ningún producto internacional lo contempla.

---

## Modelo de datos

Nombres de tablas y columnas en **inglés, snake_case**. Textos de interfaz en **español**.

```
tenants            id, name, discipline, plan, created_at
tenant_members     tenant_id, user_id, role (owner|teacher|assistant)
students           id, tenant_id, full_name, contact, user_id (nullable), status
groups             id, tenant_id, name, format (cycle|regular|private),
                   level, capacity, start_date, end_date (null si regular)
sessions           id, tenant_id, group_id, date, start_time, duration_min, recap
enrollments        id, tenant_id, group_id, student_id,
                   billing_mode (per_session|per_period|one_time),
                   agreed_price, discount, start_date, end_date, status
attendance         id, tenant_id, session_id, student_id, status (present|absent|excused)
charges            id, tenant_id, enrollment_id, amount, period (nullable),
                   session_id (nullable), due_date, status
payments           id, tenant_id, student_id, amount, method (transfer|cash|other),
                   declared_at, receipt_url, status (declared|confirmed|rejected),
                   confirmed_by, confirmed_at
payment_allocations payment_id, charge_id, amount
announcements      id, tenant_id, title, body, published_at
benefits           id, tenant_id (nullable si es global), brand, description,
                   discount, valid_until
```

**Notas:**
- Un **pago puede cubrir varios cargos** — de ahí `payment_allocations`.
- `tenant_members` permite que Tomás y su pareja compartan un tenant, y habilita el plan Multi sin rediseñar nada.
- Los **cargos se generan** por asistencia (`per_session`), por período (`per_period`) o al inscribirse (`one_time`).

---

## Planes y límites

El límite es **alumnos activos** = alumnos con actividad en los últimos 30 días.

| Plan | Alumnos activos | Precio (ARS) |
|---|---|---|
| Esencial | hasta 20 | $8.000 |
| Pro | 21 – 50 | $16.000 |
| Estudio | 51 – 90 | $32.000 |
| Multi | 91 en adelante | $64.000 |

- Producto completo en todos los planes. **Sin comisión por transacción** — es el diferencial.
- Módulo aparte: **clases particulares**, ~$12.000/mes.
- **Prueba de 30 días**, producto completo, sin tarjeta. NO hay plan gratuito permanente.
- El precio está anclado a "una clase de un alumno". Se revisa cada trimestre.
- **Tolerancia:** se puede exceder el tramo un 10% durante un mes antes de que cambie el plan.

---

## Orden de construcción

1. **Multi-tenant con aislamiento probado.**
2. **Formato `regular`.** Sin esto no hay producto para la mayoría del mercado.
3. **Conciliación de transferencias.**
4. **Nada más hasta tener tres profesores pagando.** Particulares, workshops y club de beneficios esperan.

---

## Cómo trabajar en este repo

- **No agregar funciones que no se pidieron.** Cada función de más es una semana que no se usa para vender.
- **No reescribir el front existente.** Las pantallas y componentes que vienen de la app anterior se reusan; solo cambia de dónde salen los datos.
- Cambios de esquema como **migraciones versionadas**, nunca editando tablas a mano en el panel.
- Antes de un cambio estructural, explicar en dos líneas qué se rompe y qué hay que volver a probar.
- Si una política de RLS se está volviendo enredada, es señal de que el modelo está mal. Frenar y revisar el modelo.

## Contexto del autor

Tomás no es desarrollador profesional: viene de consultoría y real estate corporativo, y construyó la primera versión con vibe coding. Está estudiando Data Analytics (SQL).

**Explicar en castellano qué hace cada política de seguridad y cada migración.** No hace falta que las escriba él, sí que las entienda para poder detectar cuando algo está mal.
