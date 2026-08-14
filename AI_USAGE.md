# Nota sobre el uso de IA

## 1. Qué herramientas usé y en qué partes del proyecto

**Herramienta:** Claude (modelo Opus) a través de Claude Code, la CLI de Anthropic, dentro
de VS Code. No usé ninguna otra herramienta de IA — ni Copilot, ni v0, ni generadores de
scaffolding.

**Dónde se usó, y con qué peso:**

| Parte del proyecto              | Peso de la IA | Qué hice yo                                                              |
| ------------------------------- | ------------- | ------------------------------------------------------------------------ |
| Capa de dominio (`src/domain/`) | Alto          | Definí que las reglas fueran puras y compartidas cliente/servidor        |
| Route Handlers y store          | Alto          | Elegí Redux, la estructura de slices y qué NO va al store                |
| Componentes y estilos           | Alto          | Definí la organización por carpetas y el modelo de un CSS por componente |
| Tests (unitarios y E2E)         | Alto          | Definí qué había que cubrir y que cada componente tuviera su test        |
| Arquitectura de carpetas        | **Mío**       | Todas las reestructuraciones las pedí y las dirigí yo                    |
| Accesibilidad                   | **Mío**       | Yo la puse como requisito; la IA auditó y ejecutó                        |
| Documentación                   | Alto          | Revisé y corregí; varias secciones existen porque las pedí               |

El flujo real no fue “pedir el proyecto entero y aceptarlo”. Fue iterativo: la IA proponía,
yo revisaba, y en varios puntos la mandé a rehacer cosas.

---

## 2. Qué acepté directamente y qué corregí o rechacé

### Acepté directamente

- La **capa de dominio pura** (`money.ts`, `handle.ts`, `rules.ts`): centavos como enteros
  con tipo marcado, `validateTransfer` como función pura que devuelve un `TransferCommand`
  en lugar de un booleano, y la unión discriminada de violaciones. Coincidía con lo que
  quería y no le toqué nada.
- La **taxonomía cerrada de fallos** con `retryable` como propiedad del código de error y
  no como decisión de cada componente.
- La **idempotencia** en el reintento. Esto lo propuso la IA y me pareció correcto: un
  timeout no te dice si el servidor ejecutó la transferencia, así que reintentar sin clave
  puede mandar la plata dos veces.
- La **cobertura de tests**, incluido el test que verifica que las reglas se cumplen
  pegándole a la API sin pasar por la UI.

### Corregí o rechacé

- **Rechacé la propuesta de estado.** La IA recomendó Context + `useReducer` y escribió una
  justificación entera en `DECISIONS.md` argumentando en contra de Redux. **Elegí Redux
  Toolkit igual** y le pedí que reescribiera esa sección con la justificación correcta. El
  enunciado lista Redux como opción válida y, para un sistema que va a crecer, prefiero una
  única forma de manejar estado antes que providers acumulándose por feature.
- **Rechacé el exceso de comentarios.** El código venía con comentarios explicativos en casi
  cada función. Pedí eliminarlos todos: el “por qué” va en `DECISIONS.md`, no repartido por
  el código. Se eliminaron 178 comentarios en 60 archivos, preservando solo el pragma
  `// @vitest-environment node`, que sí cambia comportamiento.
- **Corregí la organización de carpetas, en tres pasos.** Primero pedí que cada componente
  viviera en su propia carpeta con su `style.module.css` y su test al lado. Después, que
  **todos** los componentes estuvieran bajo `components/`, eliminando la separación
  `features/`. Por último, que `app/` contuviera únicamente ruteo — hoy ningún `page.tsx`
  pasa de 27 líneas ni tiene markup.
- **Rechacé el route group `(wallet)`.** La IA lo agregó siguiendo la convención del App
  Router. No me convenció la sintaxis con paréntesis en el árbol de archivos y pedí
  sacarlo. Se comprobó antes que cada página ya validaba su propia sesión, así que el
  layout del grupo era redundante; se conservaron los `loading.tsx` por ruta, que era el
  beneficio real.
- **Corregí un error de la IA en la config de accesibilidad.** Al escalar las reglas de
  `jsx-a11y`, encendió las 34 a la vez, incluidas dos que el plugin apaga **a propósito**
  (`label-has-for`, deprecada, y `control-has-associated-label`, con demasiados falsos
  positivos). Eso generó 5 errores falsos. La corrección fue escalar solo las que el preset
  considera activas: de 5 errores falsos a 0, con 31 reglas reales como error.
- **Rechacé archivos de andamiaje que no son del proyecto**: `AGENTS.md`, `CLAUDE.md` y la
  carpeta `.claude/`, que Next y las herramientas de IA generan solas y no aportan nada a
  la entrega.

### Errores que la IA cometió y hubo que arreglar sobre la marcha

Los anoto porque muestran que el código no se aceptó a ciegas:

1. **Documentación desactualizada.** El modelo tiende a escribir `middleware.ts`. En Next 16
   se llama **`proxy.ts`**. Se detectó leyendo la documentación incluida en
   `node_modules/next/dist/docs/`, no confiando en la memoria del modelo. Lo mismo con
   `cookies()`, que ahora es asíncrona.
2. **`react-hooks/set-state-in-effect`.** El primer hook de carga llamaba `setState` de
   forma síncrona dentro de un efecto. Hubo que rediseñarlo (ese hook terminó reemplazado
   por `createAsyncThunk` al migrar a Redux).
3. **`react-hooks/refs`.** El `Provider` de Redux leía `ref.current` durante el render,
   siguiendo el patrón que circula en blogs. Se cambió por `useState(makeStore)`.
4. **26 tests E2E fallaron en la primera corrida.** Next inserta un route announcer con
   `role="alert"` permanente, así que `getByRole('alert')` siempre encontraba dos elementos
   y rompía el modo estricto de Playwright. Se resolvió con un locator que lo excluye.
5. **Tipos de Immer.** Los slices no compilaban porque el dominio usa arrays `readonly`. Se
   resolvió guardando copias mutables en el borde del store, sin agregar dependencias.

---

## 3. Qué decisiones tomé yo y no la IA

Estas son mías. La IA las ejecutó; el criterio no fue suyo.

1. **El stack y el rechazo de React Native.** Verificado contra el enunciado.
2. **Redux Toolkit como manejo de estado**, en contra de la recomendación explícita de la
   IA. Asumo el costo: más ceremonia que Context, y un store global que sobrevive al flujo
   — por eso exigí el `draftReset()` al montar y un test que lo cubra.
3. **La arquitectura de carpetas completa**: un componente por carpeta con su estilo y su
   test; todo bajo `components/`; `app/` reservado a ruteo. Ninguna de las tres salió de
   la IA.
4. **Un CSS Module por componente**, sin hojas compartidas. De ahí salieron dos componentes
   que antes eran clases compartidas: `summary-list/` (lo usan el resumen y el comprobante)
   y `spinner/` (lo usan el botón y los estados de carga). Lo que se comparte entre
   pantallas se comparte como componente, no como clase de CSS.
5. **Código sin comentarios.** El “por qué” vive en `DECISIONS.md`.
6. **La accesibilidad como requisito, no como extra.** Yo pedí tratarla como buena práctica
   y apunté a la documentación de Next. La auditoría resultante encontró problemas reales:
   cuatro de seis pantallas sin `<h1>` — que es justo lo que lee el route announcer de
   Next —, una jerarquía de encabezados rota en Home, y solo 6 reglas de `jsx-a11y` activas
   y como advertencias. Hoy son **31 reglas como error** y `npm run lint` falla si se
   rompen. También pedí el skip link y el landmark `<main>` único.
7. **Revisar Fast Refresh.** Pedí evaluarlo; la respuesta honesta es que **no hay nada que
   implementar** — viene activado desde Next 9.4. Lo que sí exigí es documentar las
   convenciones que evitan romperlo (exports nombrados, archivos de componente que solo
   exportan componentes, `reactStrictMode`), y verificar que el proyecto ya las cumple.
   Preferí eso a inventar trabajo para aparentar.
8. **Que las reglas de negocio no vivan en el store.** Redux guarda datos; el dominio decide
   qué es válido. Los selectores llaman a `validateTransfer`, que sigue siendo una función
   pura sin React. Si mañana se cambia Redux por otra cosa, las reglas no se enteran.
9. **Que cada afirmación del README fuera verificable.** Nada de “los tests pasan” sin
   correrlos: `npm run check`, `npm run test:e2e` y `npm run build` se ejecutaron después
   de cada reestructuración, no una sola vez al final.

---

## Verificación

Todo lo que afirma el `README.md` fue ejecutado, no asumido:

```
npm run check      → typecheck + lint (31 reglas a11y como error) + format + 208 tests
npm run test:e2e   → 26 tests end-to-end
npm run build      → build de producción exitoso
```

## Opinión

La IA acelera muchísimo lo mecánico: boilerplate, tests exhaustivos, documentación, y
reestructuraciones grandes que a mano serían horas de mover archivos y arreglar imports.
Donde no reemplaza criterio es en decidir **qué** construir y **qué no**: dónde va cada
regla, qué trade-off de renderizado tiene sentido por pantalla, cuándo una convención del
framework suma y cuándo es ruido (el route group), y cuándo la respuesta correcta es “esto
ya viene resuelto, no hay nada que hacer” (Fast Refresh).

También hay que desconfiar de ella. La advertencia sobre Next 16 que el propio framework
escribe en `AGENTS.md` existe justamente porque el modelo, librado a su memoria, escribe
`middleware.ts` y `cookies()` síncrono. Leer la documentación de la versión instalada en
lugar de aceptar lo que el modelo recuerda fue lo que evitó ese error.
