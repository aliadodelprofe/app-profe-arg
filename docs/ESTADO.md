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

**Usuarios de prueba en `aliado-dev`:** `profe1@prueba.com` y `profe2@prueba.com`.

---

## Migraciones aplicadas en `aliado-dev`

| Archivo | Qué hace | Estado |
|---|---|---|
| `0001_fundacion_multitenant.sql` | `tenants`, `tenant_members`, función `my_tenant_ids()`, RLS y políticas, `create_tenant()` | Aplicada |
| `0002_corrige_recursion_politicas.sql` | Fix de recursión infinita (error 42P17). Agrega `my_owned_tenant_ids()` | Aplicada |
| `0003_nucleo_academico.sql` | `students`, `groups`, `sessions`, `enrollments`, `attendance` | Aplicada |
| `0004_cargos_y_pagos.sql` | `charges`, `payments`, `payment_allocations`, vista `student_account` | **Pendiente de correr** |

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
| `supabase/tests/aislamiento.sql` | La prueba de los dos profesores. La Parte 1 se corre una sola vez; la Parte 2 es repetible |

Último resultado del aislamiento: **3 de 3 PASA**.

---

## Próximo paso exacto

1. Correr `0004_cargos_y_pagos.sql` en `aliado-dev`
2. Correr `control_general.sql` → deben aparecer **10 tablas en `ok`**
   (la vista `student_account` no aparece en esa lista: no es una tabla)
3. Migración `0005`: `announcements` y `benefits`
4. Políticas del portal del alumno — quedaron pendientes a propósito en la 0003
5. Recién ahí: conectar la app con Supabase (ese es el momento de pasar a Claude Code)

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
