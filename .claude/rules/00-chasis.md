# Chasis de tooling `cirugias-cruz` (capa siempre-cargada)

> Esta es la ÚNICA pieza del chasis que se carga en toda sesión — por eso es corta y todo lo que
> solo aplica a una clase de tarea vive en archivo propio con un puntero. Al instalar: reemplazá
> cada `{{…}}`, borrá los bloques `<!-- MINAR -->` cuando estén resueltos, y NO agregues nada que
> no cambie una decisión del agente.

---

## 1–2. Anatomía y formato de skills

→ **`.claude/authoring-skills.md`**. Leerlo antes de crear o editar una skill o un command.
No hace falta para ninguna otra tarea.

## 3. Los 4 bucles de valor

### 3.1 `verification-loop` — nada se cierra sin verificar

Toda tarea termina ejecutando el **gate de CI real**, no una simulación:
`pnpm run lint` → `pnpm run format:check` → `pnpm run typecheck` → `pnpm run test`
(equivalente a `pnpm run check`; no hay CI en `.github/workflows` — este es el gate que el repo
declara en su propio `package.json`).
❌ NEVER dar por hecha una tarea porque "compila". El gate es la prueba, no el criterio propio.
✅ ALWAYS si el gate no corrió (falta infra, etc.), decirlo explícito — no fingir verde.

### 3.2 `eval-harness` — el fail-path es el entregable

Por cada camino feliz nuevo, enumerar y probar sus modos de falla: concurrencia, timeouts,
shapes de error inesperados, límites. Happy-path solo no cuenta como cobertura.

### 3.3 `strategic-compact` — comprimir sin perder el hilo

En tareas largas, consolidar el estado en un punto de control legible ANTES de que el contexto se
sature. La fuente de verdad del estado es `docs/architecture/ROADMAP.md` (MVP Definition, Planning
Decisions, Risks and Unknowns) más los ADRs en `docs/decisions/`, no la memoria de la sesión (regla
anti-drift). Compactar es seguro exactamente cuando nada de valor vive solo en la conversación.

### 3.4 `continuous-learning` — lo aprendido se persiste

Un gotcha no trivial no muere con la sesión. El motor es **`/x-learn`**: clasifica el hallazgo y lo
persiste en el nivel correcto — ficha accionable / memoria local / gotcha versionado / ADR — con la
regla de maduración: NO todo se guarda, y la barrera para un ADR es extremadamente alta.

## 4. Invariantes de `cirugias-cruz` que TODA skill debe respetar

- ❌ NEVER reintroducir una relación Resident ↔ Patient en cualquier forma. ✅ ALWAYS Resident se
  asigna directo a una Surgery, sin vínculo con Patient — eliminado a propósito (ADR 0010, amends
  ADR 0007).
- ❌ NEVER crear un `ControlRepository` ni embeber `Surgery` dentro de `ResearchStudy`. ✅ ALWAYS
  cargar/guardar Control solo a través de `SurgeryRepository` — Control no tiene consistencia fuera
  de su Surgery (`docs/architecture/application-layer-discovery.md`).
- ❌ NEVER agregar estados de Surgery más allá de `DONE`, ni un concepto de scheduling/calendario.
  ✅ ALWAYS Surgery siempre `DONE` en esta iteración — decisión de dominio cerrada.
- ❌ NEVER hacer `COMPLETED` irreversible en ResearchStudy, ni sumarle locking/versioning/publishing.
  ✅ ALWAYS reabrir `COMPLETED → IN_PROGRESS` es una feature confirmada y permanente del diseño
  (ADR 0006 y sus amends).
- ❌ NEVER darle a Platform Admin acceso a datos clínicos. ✅ ALWAYS Platform Admin ve solo métricas
  de negocio agregadas (conteos) — nunca Patient/Surgery/Control en detalle.
- ❌ NEVER re-litigar Fastify/Prisma-Postgres/Next.js App Router (BFF)/Railway porque "la práctica
  común sería otra". ✅ ALWAYS tratarlos decididos; un cambio real necesita un ADR nuevo, no una
  sugerencia de skill.
- ❌ NEVER construir `packages/web` como SPA client-heavy. ✅ ALWAYS Server Components por defecto;
  `"use client"` solo para forms/leaves interactivos — así se decidió el patrón BFF.
- ❌ NEVER agregar optimistic locking/columna de versión a `PrismaSurgeryRepository.save()` para su
  riesgo conocido de lost-update en participantes. ✅ ALWAYS diferido hasta que exista un requisito
  real de multi-writer concurrente (`docs/architecture/ROADMAP.md` § Risks and Unknowns).
- ❌ NEVER afirmar el comportamiento de una API/servicio externo como hecho desde una conclusión
  propia. ✅ ALWAYS anclarlo a procedencia citable — doc oficial/SDK (`oficial`) o reproducción
  propia in-repo (`empírico`); si no se puede validar, es `hipótesis` con `TODO: validar` **y su
  fila en el registro de incógnitas (`docs/architecture/ROADMAP.md` § Risks and Unknowns; no hay
  un doc dedicado de pendientes — este repo aún no lo necesitó) en el mismo commit** — el TODO es
  el ancla, el registro es el índice.

## 5. Gate de salida (copiar en cada skill)

```
- [ ] pnpm run check (lint && format:check && typecheck && test) ... verde
- [ ] node scripts/chasis-check.mjs ... verde (protege `.claude/` — lo que ningún otro gate mira)
- [ ] node scripts/contexto-check.mjs ... verde (protege la capa de reglas)
- [ ] specs viejos revisados: ningún test pasa en verde mintiendo sobre el comportamiento real
- [ ] estado consolidado en docs/architecture/ROADMAP.md o el ADR correspondiente
- [ ] continuous-learning: ¿la sesión dejó un aprendizaje no trivial? → /x-learn antes de cerrar
      (o declarar "nada que persistir")
```

> **Ritual de cierre (obligatorio):** el último ítem no es opcional. Si un gate de esta lista no
> pudo correr, se dice explícito — no se finge verde.

## 6. Convenciones de docs

Bóveda versionada en `docs/` (`architecture/`, `decisions/`, `design/`, `domain/`). Todo doc nuevo
se enlaza desde algún índice existente — un nodo huérfano lo marca `docs-linkcheck` (README exento).
Un ADR **aceptado no se reescribe**: un aprendizaje nuevo que lo contradice es un ADR nuevo que lo
amends/supersede (ver el patrón ya usado en 0006, 0007→0010, 0018→0020/0022) — el `Status` de cada
ADR dice si sigue vigente antes de tratarlo como verdad actual.

## 7. Proof-of-Bug — clasificar Bug vs Sugerencia

→ **`.claude/proof-of-bug.md`**. El filtro por impacto observable y la regla de evidencia
ejecutable. Lo referencian las skills que reportan o reproducen hallazgos, en el punto de uso.

## 8. Ingeniería de contexto

→ **`.claude/contexto-agente.md`**. Leerlo al auditar o reestructurar capas de contexto (rules,
skills, memoria, compactación): los 4 criterios de auditoría, el filtro de restricciones y las
reglas de caché/compactación. No hace falta para ninguna otra tarea.
