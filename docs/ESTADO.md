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

## Migraciones aplicadas en `aliado-dev`

| Archivo | Qué hace | Estado |
|---|---|---|
| `0001_fundacion_multitenant.sql` | `tenants`, `tenant_members`, función `my_tenant_ids()`, RLS y políticas, `create_tenant()` | Aplicada |
| `0002_corrige_recursion_politicas.sql` | Fix de recursión infinita (error 42P17). Agrega `my_owned_tenant_ids()` | Aplicada |
| `0003_nucleo_academico.sql` | `students`, `groups`, `sessions`, `enrollments`, `attendance` | Aplicada |
| `0004_cargos_y_pagos.sql` | `charges`, `payments`, `payment_allocations`, vista `student_account` | Aplicada |
| `0005_portal_del_alumno.sql` | Políticas del alumno: cuatro funciones `my_student_*`, nueve reglas de lectura y la de declarar un pago | Aplicada |

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

Últimos resultados (4 de septiembre de 2026):
- `aislamiento.sql` Parte 2 → **3 de 3 PASA**
- `aislamiento_cargos.sql` → **5 de 5 PASA**
- `aislamiento_alumno.sql` → **16 de 16 PASA**
- `control_general.sql` → **10 tablas en `ok`**

---

## Próximo paso exacto

**Conectar la app con Supabase.** El esquema de las dos prioridades del orden de
construcción (formato `regular` y conciliación de transferencias) ya está completo
y probado. Lo que falta no son más tablas: es la app dejando de hablarle a Firebase.

Primero hace falta resolver el enlace alumno ↔ usuario: `students.user_id` hoy está
vacío en todas las fichas, y hasta que no se cargue, las reglas de la 0005 no le
abren la puerta a ningún alumno. Ese flujo (el profe invita, el alumno se registra)
es trabajo de la app.

`announcements` y `benefits` quedan para después, a propósito: las pantallas
`AnnouncementsFeed` y `BenefitsCatalog` siguen funcionando en la app vieja sobre
Firebase, y `CLAUDE.md` manda el club de beneficios a la fila de espera hasta tener
tres profesores pagando.

Nota: `control_general.sql` lista 10 tablas. La vista `student_account` no aparece
ahí y está bien: no es una tabla.

---

## Orden de construcción del producto

1. ~~Multi-tenant con aislamiento probado~~ ✅
2. Formato `regular` — sin esto no hay producto para la mayoría del mercado
3. Conciliación de transferencias
4. Nada más hasta tener **tres profesores pagando**

---

## Pendientes sueltos

- [ ] Instalar Node.js (nodejs.org, versión LTS) — necesario para levantar la app
- [ ] Cambiar la contraseña del admin en la app vieja (hoy es `admin`, en texto plano)
- [ ] No tocar el proyecto Supabase `axzyhjprterixsgqhddv` — sirve los videos de la app en producción
- [ ] La app vieja tiene `firestore.rules` con `allow read, write: if true` (base abierta). Se resuelve solo con la migración a Supabase
