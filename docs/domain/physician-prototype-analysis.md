# Análisis del prototipo del médico ("Registro de Consultorio")

**Origen**: un HTML autocontenido (`Registrros de consultorio.html`) que el
médico armó por su cuenta para registrar sus propios casos de superficie
ocular. No es código del repositorio ni una especificación formal — es una
fuente de _conceptos de dominio y experiencia deseada_ tal como el usuario
final del producto (el propio cirujano) ya los modeló para sí mismo antes
de que existiera Epitaxy.

Este documento hace dos cosas: (1) extrae qué conceptos y lógica clínica
usa el prototipo, y (2) contrasta cada uno con lo ya decidido en
[`DOMAIN.md`](DOMAIN.md) y los ADRs, señalando qué encaja, qué lo
enriquece y qué contradice decisiones ya cerradas.

## 1. Qué es el prototipo, estructuralmente

Una SPA de una sola página, dos pestañas ("Pterigión" y "Dolor
posquirúrgico"), cada una con: un formulario de alta, una fila de
estadísticas agregadas, una tabla de agregación por subgrupo, una tabla de
casos individuales con borrado, y exportación a CSV. Persiste vía
`window.storage` (clave-valor, específico del entorno donde vive el
prototipo) serializando arrays de objetos a JSON. No hay autenticación,
ni multi-usuario, ni identificación de paciente real (usa "código
propio", explícitamente para no guardar el nombre completo).

## 2. Conceptos de dominio extraídos

### 2.1 Pterigión — el caso de uso ya cubierto por Epitaxy

Campos del formulario y su lógica:

- **Código paciente** (texto libre, ej. `AB-014`) — el médico ya
  practica seudonimización manual del paciente. Esto valida el modelo de
  Epitaxy donde el `Patient` vive aislado por tenant, pero muestra que el
  médico _ya_ piensa en identificadores cortos, no en historias clínicas
  completas.
- **Fecha cirugía**, **Ojo** (OD/OI), **Tipo** (Primario/Recidivado) —
  atributos de la cirugía misma.
- **Técnica quirúrgica** — un `<select>` cerrado con 5 opciones
  (Autoinjerto conjuntival / + MMC / Membrana amniótica / + pegamento de
  fibrina / Otra). Esto es, en términos de Epitaxy, contenido candidato
  para un **ProcedureType** con "técnica" como atributo estructurado, o
  para un **CustomField** de tipo enumerado asociado al ProcedureType
  "Pterigión". Es la primera señal concreta de qué _forma_ debería tener
  la "estructura final de Procedure Type" que hoy está deliberadamente
  abierta (ver DOMAIN.md y la nota "Explicitly deferred" de este
  proyecto).
- **Última revisión** (fecha) + **Recidiva** (Pendiente/No/Sí) — esto es,
  conceptualmente, un **Control** de seguimiento: una observación fechada
  sobre la cirugía, cuyo propósito es responder una pregunta clínica
  concreta (¿recidivó?). El prototipo lo modela como _un solo campo sobre
  la cirugía_ (una única "última revisión"), no como una lista de
  controles a lo largo del tiempo. Epitaxy ya generaliza esto correctamente
  con `Control` como entidad interna de `Surgery` (múltiples controles,
  cada uno con su propio datetime + autor + observaciones) — el prototipo
  es un caso _degenerado_ de eso: le alcanza con el último control porque
  no necesita historial, solo el estado actual. Epitaxy no necesita
  cambiar nada aquí; solo confirma que el caso de uso real es "N
  controles, pero lo que más importa clínicamente es el estado del más
  reciente."
- **Notas** (texto libre, opcional).

Estadística derivada (calculada en el cliente, no persistida):

- Casos totales, tasa de recidiva global (%), pendientes de definir.
- **Agrupación por técnica quirúrgica**: n, recidivas, tasa, y
  "seguimiento medio" en meses (`(revision - fecha) / 30.44` días).

Esto es el corazón de la "experiencia deseada" del médico: no quiere solo
cargar datos, quiere **ver en vivo cómo le está yendo a cada técnica**.
Es, en esencia, un `ResearchStudy` implícito y permanente: "¿qué técnica
tiene menor recidiva?" — pero sin la fricción de crear un estudio
explícito. El médico modeló la comparación por técnica como parte del
flujo normal de carga de casos, no como un artefacto de investigación
aparte.

### 2.2 Dolor posquirúrgico — un segundo caso de uso, no cubierto hoy

- **Código paciente**, **Fecha cirugía**, **Tipo de cirugía** (Catarata /
  Pterigión / Glaucoma / Otra).
- **Esquema analgésico / rama** — otro enum cerrado (AINE tópico /
  Corticoide + AINE tópico / Analgesia oral / Corticoide tópico solo /
  Otro). Conceptualmente es un **brazo de tratamiento**: la variable
  independiente que el médico quiere comparar.
- **EVA día 1 / día 3 / día 7** (escala 0-10, Escala Visual Análoga de
  dolor) — tres mediciones puntuales en el tiempo, cada una en un día
  post-quirúrgico fijo. Esto es exactamente la forma de una serie de
  **Controles con una medición numérica estructurada** (EVA) tomada en
  timepoints protocolizados.
- Estadística: EVA medio día 1 y día 7 global, y **EVA medio por rama de
  tratamiento** en cada uno de los tres días.

Este segundo tab es importante porque generaliza el patrón: no es
"pterigión y recidiva", es "cirugía → uno o más controles con una
variable de resultado numérica u ordinal → comparación agrupada por una
variable de tratamiento". El tipo de cirugía en este tab ni siquiera se
limita a pterigión (incluye catarata, glaucoma), confirmando que el
médico ya piensa en múltiples `ProcedureType` bajo el mismo instrumento.

### 2.3 Patrón transversal: EVA como medición estructurada repetible

El día 1/3/7 con EVA es el ejemplo más concreto que existe hoy de qué
forma debería tener un **CustomField** con timepoints fijos: nombre
("EVA"), unidad (escala 0-10, sin unidad física), magnitud ("dolor
autorreferido"), y la necesidad de asociarlo a un Control en un momento
determinado (día 1, día 3, día 7 desde la cirugía) más que a una fecha de
calendario libre. Esto es evidencia real para destrabar el punto
"Value representation, unit/magnitude semantics... explicitly
unresolved" de CustomField — no lo resuelve, pero da un caso concreto
contra el cual validar cualquier propuesta futura.

> Nota (posterior, ADRs 0018–0020): el modelo de valor de CustomField ya
> quedó resuelto. EVA es un campo `NUMBER` con `constraint.unit = "0-10"`
> y `scope = CONTROL`; no existe un atributo `magnitude` (el nombre del
> campo — "EVA (dolor)" — ya expresa la dimensión). Lo único que sigue
> abierto es asociar timepoints fijos (día 1/3/7) a los Controles, que
> ADR 0018 deja fuera de alcance explícitamente.

## 3. Contraste explícito con decisiones ya cerradas de Epitaxy

| Concepto del prototipo                                                  | Encaja con Epitaxy                                               | Nota                                                                                                                                                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Código de paciente pseudonimizado                                       | Sí, alineado                                                     | Confirma que `Patient` no necesita (ni debe) almacenar PII completa por decisión de UX del propio médico, no solo por diseño técnico.                                                  |
| Selector de técnica quirúrgica cerrado                                  | Candidato a atributo de `ProcedureType` o `CustomField`          | No hay que inventar la estructura ahora (sigue explícitamente diferida), pero es el primer ejemplo real a validar contra futuras propuestas.                                           |
| "Última revisión" + "Recidiva" como campo único sobre la cirugía        | Caso degenerado de `Control`                                     | Epitaxy ya lo generaliza mejor (N controles con autor+datetime). No requiere cambios; el prototipo simplemente no necesitaba historial.                                                |
| Agregación por técnica / por rama en vivo, fuera de un "estudio" formal | **No modelado hoy**                                              | Ver §4 — es la brecha de producto más relevante que este prototipo expone.                                                                                                             |
| EVA en día 1/3/7                                                        | Caso de uso concreto para CustomField                            | No resuelve el modelo de valor de CustomField, pero es evidencia real, no hipotética.                                                                                                  |
| Exportar CSV                                                            | No modelado (ni bloqueado)                                       | Funcionalidad de UX, no de dominio; no contradice nada.                                                                                                                                |
| Persistencia `window.storage` sin auth ni multi-tenant                  | **No aplicable**                                                 | El prototipo es de un solo usuario sin necesidad de tenancy; Epitaxy ya resuelve esto mejor por requisito de producto (multi-physician). No hay nada que "adoptar" aquí, al contrario. |
| Tab "Dolor posquirúrgico" abarca Catarata/Glaucoma, no solo Pterigión   | Confirma que `ProcedureType` es plural desde el día 1 del médico | Alineado con que Epitaxy ya modela Procedure Type como physician-owned y no limitado a pterigión, aun cuando el _primer_ procedimiento construido sea pterigión.                       |

## 4. La brecha de producto más importante: estadística agregada "en vivo"

Lo más revelador del prototipo no es ningún campo puntual, sino el hecho
de que **cada pestaña combina, en la misma pantalla**: alta de casos +
estadística descriptiva global + estadística agregada por subgrupo
(técnica / rama), actualizada instantáneamente al cargar un caso. El
médico no distingue mentalmente entre "cargar mis datos" e "investigar
mis datos" — para él es el mismo gesto.

En el modelo actual de Epitaxy, esa comparación agregada solo existiría
dentro de un `ResearchStudy` explícito (crear el estudio, seleccionar el
universo de Surgery ids, escribir hipótesis/resultados). Eso es
correcto y deliberado para investigación formal (DRAFT ⇄ IN_PROGRESS ⇄
COMPLETED, con texto libre de hipótesis/resultados/análisis/conclusión),
pero el prototipo muestra que el médico también quiere, **sin fricción y
sin crear un estudio formal**, ver en todo momento cómo le está yendo por
técnica o por rama de tratamiento — una suerte de "estadística
descriptiva ambiente" sobre todas sus cirugías de un tipo dado.

Esto **no** implica reabrir ninguna decisión cerrada (no es un nuevo
estado de ResearchStudy, no es un nuevo agregado). Es, más bien, una
señal de producto para el futuro Read/Query side (ya confirmado como
MVP-required): los endpoints de lectura y la futura UI en `packages/web`
deberían considerar, además de listar Surgery/Control, una vista de
agregación rápida por ProcedureType (ej. recidiva por técnica, o media
de una medición por rama) que no requiera pasar por el flujo de
ResearchStudy. Se deja constancia acá como insumo de diseño de producto,
no como una decisión tomada.

## 5. Qué NO se adopta de este prototipo

- No se adopta su modelo de persistencia (`window.storage`, sin backend,
  sin tenancy) — Epitaxy ya lo resuelve mejor por requisito de multi-
  physician.
- No se adopta "revisión única" como reemplazo de `Control` — el modelo
  de Epitaxy (N controles con autor y datetime) es estrictamente más
  general y ya decidido (ADR 0004).
- No se toma la lista cerrada de técnicas/ramas del prototipo como la
  estructura final de ningún ProcedureType/CustomField — sigue siendo
  contenido clínico pendiente de una consulta específica con el médico
  (ver "Explicitly deferred" en la guía del proyecto). Se cita aquí solo
  como evidencia, no como especificación.

## 6. Próximos pasos sugeridos (no decisiones, solo sugerencias)

1. Cuando se retome el diseño de `CustomField`/estructura de
   `ProcedureType`, usar la técnica quirúrgica de pterigión y el esquema
   EVA día 1/3/7 como casos de prueba concretos.
2. Cuando se diseñe el Read/Query side y la UI de `packages/web`,
   considerar una vista de agregación rápida por ProcedureType (conteo,
   tasa de recidiva o media de una medición, agrupado por un atributo)
   como parte de la experiencia normal de navegación de Surgery — no solo
   dentro de un ResearchStudy formal. Esto es una sugerencia de producto,
   a validar con el médico antes de comprometerla como requisito.
