---
name: x-learn
description: Motor de Continuous Learning del repo. Dispara al cerrar una sesión/tarea que dejó un aprendizaje no trivial, un gotcha de dominio o un gap técnico. Clasifica el hallazgo y lo persiste en el NIVEL correcto (memoria local / gotcha versionado / ADR), o lo redacta como ficha accionable si es un bug/gap. NO todo se guarda; la barrera para un ADR es extremadamente alta.
---

# /x-learn — persistir el aprendizaje en el nivel correcto

Encarna el bucle `continuous-learning` (chasis §3.4): un gotcha no trivial **no muere con la
sesión**. Esta skill es el motor de decisión + escritura: convierte "aprendí algo" en un registro
persistido en el nivel adecuado, sin sobre-documentar. Es la **primera skill que se porta** a un
repo nuevo — sin ella el chasis no crece con el repo.

## Cuándo usar / Cuándo NO

- ✅ Al cerrar una tarea que dejó un aprendizaje no trivial: gotcha de dominio, regla recién
  descubierta, modo de falla del CI/tooling, trampa de plataforma.
- ❌ NO para lo que el repo **ya registra** solo (estructura, git log, historial de fixes, docs
  vigentes). Si ya está, no se re-documenta.
- ❌ NO para lo que **solo importa a esta conversación**. El recall vive entre sesiones; el ruido
  de sesión no.
- ❌ NO fuerza un ADR: casi nada califica para Nivel 3.

## Pre-flight (checklist bloqueante)

- [ ] Formulá el hallazgo en **una oración** con su impacto observable o su regla accionable.
      Si no podés, no hay nada que persistir — detenete y decilo.
- [ ] Dedup: `grep` el término en los destinos (docs del repo + índice de memoria). Si ya existe
      un nodo, **se actualiza ese**, no se crea un duplicado.

## Clasificación — decidí ANTES de escribir

Primer corte: **¿es accionable o es un saber?** Si hay algo que _hacer_ (código a arreglar,
cobertura a sumar) → **ficha en `docs/architecture/ROADMAP.md`** (o issue del repo si el usuario
usa uno), clasificada Bug o Sugerencia con `.claude/proof-of-bug.md` — NO va a memoria. Si es un
_saber_, elegí nivel por durabilidad:

| Nivel | Destino                                             | Para qué                                               | Editable  |
| :---: | :-------------------------------------------------- | :----------------------------------------------------- | :-------- |
|   1   | memoria local del agente                            | atajos, config de máquina, reglas **aún en discusión** | sí, libre |
|   2   | `docs/architecture/GOTCHAS.md` (crear si no existe) | trampa técnica estable que **hay** que conocer         | sí        |
|   3   | `docs/decisions/NNNN-*.md` (nuevo ADR numerado)     | SOLO decisiones **cerradas e inmutables**              | ❌ nunca  |

> Heurística: _¿esto puede cambiar la semana que viene?_ → Nivel 1. _¿Es una trampa técnica
> estable?_ → Nivel 2. _¿Decisión tomada, discutida y cerrada?_ → Nivel 3 — y aun así, proponer y
> confirmar con el usuario antes de escribirla.

## Procedencia — comportamiento de terceros

Un claim sobre una API/servicio externo NO se persiste como hecho sin procedencia citable:
`oficial` (doc/SDK: URL + fecha, o `símbolo@versión`) / `empírico` (reproducción propia in-repo) /
`hipótesis` (etiquetada + `TODO: validar` **+ su fila en `docs/architecture/ROADMAP.md` § Risks
and Unknowns en el mismo commit**). La procedencia se guarda junto al hecho.

## Workflow

1. Formular (pre-flight). 2. Clasificar con la tabla. 3. Dedup. 4. Escribir en el destino,
   enlazado a sus nodos relacionados — nunca un nodo huérfano, y nunca un link desde un doc
   versionado hacia la memoria local de una máquina. 5. Reportar en una línea qué nivel se eligió y
   por qué — o "nada que persistir", que es un resultado válido y mejor que un registro de más.

## Gate de salida (obligatorio)

```
- [ ] hallazgo en 1 oración (o reportado "nada que persistir")
- [ ] clasificado con justificación de 1 línea; accionable → ficha, no memoria
- [ ] dedup verificado; si existía, se actualizó el nodo
- [ ] escrito + enlazado; claim externo con tier de procedencia + cita
- [ ] ADR SOLO confirmado con el usuario y con la decisión cerrada
```
