# Decisiones de diseño

Por qué el proyecto está estructurado así, qué se consideró y qué haría distinto con más
tiempo.

---

## 1. La decisión central: dónde viven las reglas de negocio

**Decisión:** una única función pura, `validateTransfer` en
[`src/domain/transfer/rules.ts`](./src/domain/transfer/rules.ts), que el cliente y el
servidor importan literalmente del mismo archivo.

El enunciado dice que _“el cómo y dónde implementes estas reglas forma parte de la
evaluación”_. Las tres opciones habituales son:

| Dónde                 | Problema                                                                |
| --------------------- | ----------------------------------------------------------------------- |
| Solo en el componente | Un `POST` a mano se salta todo. El botón deshabilitado no es una regla. |
| Solo en la API        | El usuario descubre el error después de enviar. Mala UX.                |
| **Duplicada**         | Las dos copias divergen. Es cuestión de tiempo.                         |

Por eso la regla es una función pura, sin React y sin `fetch`, y se ejecuta en los dos
lados con roles distintos:

- **En el cliente** (el selector `selectValidation` en [`selectors.ts`](./src/store/selectors.ts))
  corre en cada cambio del borrador para dar feedback inmediato y decidir si el botón se
  habilita. Es una **conveniencia de UX**.
- **En el servidor** (`app/api/transactions/route.ts`) corre antes de tocar el ledger. Es
  la **autoridad**.

La consecuencia práctica está testeada en
[`route.test.ts`](./src/app/api/transactions/route.test.ts): un `POST` con monto `0`,
negativo o mayor al saldo se rechaza igual, sin que exista UI de por medio.

**Además, `validateTransfer` parsea en vez de solo aprobar.** No devuelve `boolean`,
devuelve un `TransferCommand` con el monto ya convertido a centavos exactos. Así ningún
consumidor vuelve a parsear el string y nadie puede discrepar sobre cuánto era.

Devuelve **todas** las violaciones, no la primera, para que el formulario muestre todos los
problemas de una vez en lugar de hacer que el usuario los descubra uno por uno.

---

## 2. Renderizado: SSR y CSR, distinto por pantalla

No hay una respuesta única; hay una respuesta por pantalla, y la diferencia entre Home y
Nueva Transacción es deliberada.

| Pantalla              | Estrategia                                   | Por qué                                                                                                                                                                                                                                                                                                              |
| --------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Login**             | Server Shell + Client Component para el form | El texto estático viaja como HTML; solo el formulario (estado, validación, handler) se vuelve JS.                                                                                                                                                                                                                    |
| **Home**              | **Híbrido**: identidad SSR, dinero CSR       | Quién eres se sabe apenas llega el request (cookie) → saludo sin spinner ni layout shift. El saldo es volátil, per-usuario e incacheable: SSR no aporta caché, solo TTFB. Y hacerlo en cliente es lo que **hace alcanzables los tres estados** (carga, vacío, error) y el botón de reintentar que pide el enunciado. |
| **Nueva Transacción** | **SSR** de saldo y favoritos                 | Aquí los datos no se _miran_, se _usan_: no puedes escribir un monto sin saber cuánto tienes. Un spinner antes de poder actuar es peor UX. El trade-off (saldo = snapshot) lo cubre la revalidación del servidor al confirmar.                                                                                       |
| **Comprobante**       | **SSR** desde la transacción guardada        | Un comprobante que no se puede refrescar, guardar en favoritos ni compartir no es un comprobante. Vive en su propia URL y muestra lo que el servidor registró, no lo que el cliente creyó enviar.                                                                                                                    |

Leer la sesión con `cookies()` marca estas rutas como dinámicas, que es exactamente lo
correcto: una pantalla con el saldo de un usuario jamás debe cachearse estáticamente.

**No se usaron Server Actions para la transferencia.** El enunciado pide explícitamente
_“uso de API router”_, y un Route Handler además deja el contrato observable y testeable
con un `Request` común, cosa que una Server Action no permite tan directamente.

---

## 3. Estado: Redux Toolkit

**Decisión:** Redux Toolkit + React-Redux, con dos slices y sin middleware extra.

El enunciado pide justificar la elección. En un flujo de este tamaño, Context +
`useReducer` alcanzaría; la razón para elegir Redux no es que haga falta hoy, sino en qué
se convierte esto cuando crece — que es explícitamente el contexto planteado (millones de
usuarios activos, escalabilidad y mantenibilidad):

1. **Una sola forma de mutar estado, sin importar cuántas pantallas haya.** Con Context,
   cada feature nueva trae su propio provider y su propia convención, y el árbol termina
   con seis providers anidados. Con un store, agregar una pantalla es agregar un slice.
2. **Los estados asíncronos dejan de escribirse a mano.** `createAsyncThunk` genera
   `pending / fulfilled / rejected`, que es exactamente el trío carga / éxito / error que
   pide el enunciado. Antes eso vivía en un hook propio; ahora es el patrón de la librería
   y se comporta igual en todas las pantallas.
3. **Depuración.** Redux DevTools da time-travel y un log de acciones. En un wallet, poder
   reconstruir la secuencia exacta que dejó a alguien con un saldo raro vale mucho más que
   las líneas de boilerplate que cuesta.
4. **Cancelación incluida.** `dispatch(thunk)` devuelve una promesa con `.abort()`, y el
   slice ignora los rechazos por `action.meta.aborted`. Así una respuesta lenta no pisa a
   una rápida ni se escribe estado después de desmontar.

### Cómo está organizado

| Slice      | Qué guarda                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transfer` | El borrador (monto, destinatario, nota), el paso del wizard, el fallo y la clave de idempotencia. También el contexto que baja del servidor: contactos, saldo y handles propios. |
| `wallet`   | El snapshot de Home más su estado de carga, alimentado por el thunk `loadWallet`.                                                                                                |

**Las reglas de negocio no viven en el store.** Los selectores
([`selectors.ts`](./src/store/selectors.ts)) llaman a `validateTransfer`, que sigue siendo
la función pura del dominio. `createSelector` memoiza el resultado, así que validar en cada
tecla no re-ejecuta nada de más. El store guarda **datos**; el dominio decide **qué es
válido**. Si mañana se reemplaza Redux por otra cosa, las reglas no se enteran.

Los reducers de RTK son puros, así que la lógica del wizard se sigue testeando con
llamadas a función y sin renderizar nada — ver
[`transfer-slice.test.ts`](./src/store/transfer-slice.test.ts).

Los pasos son una unión (`'compose' | 'review' | 'submitting' | 'failed'`) y no booleanos,
porque los booleanos permiten estados imposibles como “enviando y fallado a la vez”.

### El costo, dicho de frente

Redux es más ceremonia que Context para una app de cuatro pantallas: hay un `Provider`, un
archivo de hooks tipados, y el store es global, así que el borrador **sobrevive** a salir
del flujo. Eso último es un bug esperando: por eso `TransferFlow` despacha `draftReset()`
al montarse, y hay un test que verifica que el reset no borra el contexto hidratado. Con
Context ese problema no existía porque el estado moría con el árbol.

**El store se crea por instancia de `<Providers>`** (`useState(makeStore)`), no como
singleton de módulo. En SSR un singleton se compartiría entre requests de usuarios
distintos — que en una app de dinero es la peor clase de bug posible.

**Lo que NO se puso en Redux:** los datos que ya tiene el servidor. La pantalla de
transferencia recibe saldo y contactos por props desde un Server Component y solo los
hidrata al store; no hay un thunk que los vuelva a pedir. Meter en un store algo que el
servidor ya renderizó es duplicar la fuente de verdad.

---

## 4. El dinero es un entero, siempre

`0.1 + 0.2 !== 0.3`,es dinero real
perdiéndose en redondeos, multiplicado por millones de transacciones.

Todo monto es un `Cents` — un entero con **marca nominal** (`Brand<number, 'Cents'>`), de
modo que el compilador no deja pasar un `number` cualquiera donde va dinero. El único lugar
donde existe un decimal es el `<input>` y el formateador.

`parseAmount` es estricto y trabaja sobre strings en vez de usar `parseFloat`, que acepta
`"12abc"` como `12` y pierde precisión con decimales largos. Rechaza explícitamente más de
2 decimales en lugar de redondear en silencio: redondear el dinero de alguien sin avisarle
no es un default aceptable.

**El campo directamente no acepta letras.** `sanitizeAmountInput` filtra cada pulsación:
descarta todo lo que no sea dígito o separador, admite un solo separador, corta la parte
decimal en 2 y la entera en 12 dígitos. Escribir una letra no hace nada — no aparece y
después se borra, simplemente no entra. Es defensa en profundidad, no reemplazo: el
sanitizador es UX, `parseAmount` sigue validando y la API valida por su cuenta, porque un
`POST` a mano nunca pasó por el input. Un test verifica que **toda** salida del sanitizador
es aceptada por `parseAmount` (o está vacía), así que las dos piezas no pueden divergir.

---

## 5. Manejo de errores: una taxonomía cerrada, no strings

[`failures.ts`](./src/domain/transfer/failures.ts) define una unión cerrada de todo lo que
puede fallar. Agregar un código convierte cada `switch` en un error de compilación hasta
que se maneje. Esa es la diferencia entre “maneja el happy path” y “maneja las cinco formas
en que un pago falla”.

Cada código sabe **si tiene sentido reintentar**, y esa propiedad vive junto a la
taxonomía, no en cada componente:

| Escenario            | HTTP | ¿Reintento? | Por qué                                   |
| -------------------- | ---- | ----------- | ----------------------------------------- |
| `NETWORK_ERROR`      | 502  | Sí          | Transitorio                               |
| `TIMEOUT`            | 504  | Sí          | Transitorio                               |
| `UNKNOWN_ERROR`      | 500  | Sí          | Desconocido; vale la pena intentar        |
| `INSUFFICIENT_FUNDS` | 409  | **No**      | Reintentar el mismo monto vuelve a fallar |
| `VALIDATION_FAILED`  | 422  | **No**      | Hay que corregir los datos                |
| `UNAUTHORIZED`       | 401  | **No**      | Hay que volver a iniciar sesión           |

Ofrecer “Reintentar” ante un saldo insuficiente es tan bug como no ofrecerlo ante un
timeout. El E2E verifica ambos lados.

El **timeout se aplica en el cliente** con `AbortController`
([`api/client.ts`](./src/api/client.ts)), no solo se simula en el servidor: un timeout que
el cliente no impone deja el spinner girando para siempre.

---

## 6. Idempotencia: por qué el botón “Reintentar” es seguro

Este es el edge case menos obvio del enunciado. Un timeout **no te dice si el servidor
ejecutó la transferencia o no**. Reintentar ingenuamente puede mandar el dinero dos veces.

Solución estándar de pagos: el cliente genera una `idempotency-key` por borrador, estable
entre reintentos del _mismo_ borrador y regenerada apenas cambia el monto o el
destinatario. El servidor guarda `key → transactionId` y, ante una repetición, devuelve el
comprobante original en lugar de mover dinero otra vez.

Está testeado en los dos niveles: el reducer mantiene la clave entre `SUBMIT` y `FAIL` pero
la regenera al editar el monto, y la ruta cobra una sola vez ante dos POST con la misma
clave.

---

## 7. Separación UI / lógica

Cuatro capas, con una regla de dependencia que va en un solo sentido:

```
domain/   ← no importa NADA de React, Next ni fetch
   ↑
server/ y api/   ← usan domain
   ↑
store/ y components/     ← usan api + domain
   ↑
app/   ← rutas; ensambla lo anterior
```

Consecuencias concretas:

- `domain/` se testea sin renderizar ni mockear nada.
- Los componentes de presentación (`BalanceCard`, `MovementList`, `ContactPicker`) reciben
  datos por props y no saben que existe `fetch`. Sirven igual bajo un padre SSR o CSR.
- Los componentes no contienen ninguna regla: leen `validation` y `errorFor` del context.
- **Todo el texto visible vive en [`messages/es.ts`](./src/messages/es.ts)**, en un único
  objeto `copy` agrupado por área (`app`, `titles`, `login`, `home`, `transfer`, `review`,
  `receipt`, `summary`, `errors`, `api`). Ningún componente contiene una cadena en español:
  ni labels, ni placeholders, ni `aria-label`, ni los mensajes de error de la API. El
  dominio sigue emitiendo códigos, no frases, y `violationMessage` / `failureCopy` los
  traducen. Agregar `en.ts` al lado es todo lo que haría falta para i18n.
- Los valores que dependen de datos son funciones, no plantillas repartidas por el código:
  `copy.home.announceReady(n)`, `copy.transfer.available(monto)`,
  `copy.transfer.stepIndicator(paso, total)`.
- Duplicaciones eliminadas en el mismo pase: `initials()` estaba copiado en dos componentes
  (ahora `lib/initials.ts`), la clase `.srOnly` en tres hojas (ahora una sola, compartida
  con `composes: srOnly from global`), el guard de sesión repetido en tres `page.tsx`
  (ahora `server/guards.ts`) y tres `loading.tsx` idénticos (ahora `<RouteLoading />`).

---

## 8. Estilos: CSS Modules, sin librería de UI

Nada que enviar al cliente en runtime, funciona dentro de Server Components sin provider.
Los tokens son custom properties en `globals.css`.

**Tema claro únicamente.** La app no reacciona a `prefers-color-scheme`: `color-scheme:
light` y una sola paleta. Una marca financiera suele querer un color exacto, y mantener dos
temas duplica la superficie de contraste a verificar. Volver a soportar oscuro es agregar un
bloque de media query que redefina los mismos tokens — nada del resto del CSS cambiaría.

Los lookups se escriben `styles['name']` y no `styles.name` porque el `tsconfig.json` del
scaffold activa `noPropertyAccessFromIndexSignature`. Un CSS Module se tipa como index
signature, así que el acceso con punto devolvería `any` para una clase inexistente. Con
corchetes, un typo aparece como `undefined` en el DOM en vez de compilar sin ruido.

---

## 9. Convenciones del App Router

Auditoría contra las buenas prácticas del App Router, con lo que se aplicó y lo que no.

**`page.tsx` delgado.** Cada archivo de ruta hace solo tres cosas: leer la sesión, buscar
los datos y renderizar una pantalla de `components/screens/`. Ninguno pasa de 27 líneas ni
contiene markup. La lógica de negocio vive en `domain/`, nunca en una ruta.

**Nunca un Server Component consultando su propia API.** Las páginas de Home, transferencia
y comprobante llaman a las funciones del store directamente; no hacen `fetch('/api/...')`
contra sí mismas. Pegarle a tu propio endpoint desde el servidor agrega un salto de red
completo — serializar, HTTP, deserializar — para datos que ya están en el proceso. Los
Route Handlers existen para el **cliente** (el panel de Home) y como contrato verificable,
no como capa intermedia del servidor consigo mismo.

**Navegación con `<Link>`, con prefetch administrado.** No hay ningún `<a>` apuntando a una
ruta interna; el único `<a>` del proyecto es el skip link, que apunta a un fragmento
(`#main-content`) y por definición no es navegación. El prefetch está activo solo en los
dos CTA primarios (`/transfer` desde Home, `/home` desde el comprobante) y apagado en los
links secundarios y en las salidas de las pantallas de error: precargar `/transfer` —que
renderiza saldo y contactos en el servidor— desde un 404 es trabajo que casi nunca se usa.

**Archivos especiales.** `loading.tsx` por ruta privada (límite de Suspense automático,
UI en streaming), `not-found.tsx` con `notFound()` disparado desde el comprobante cuando el
id no existe, `error.tsx` como límite de error de cliente por página, y **`global-error.tsx`**,
que es el que faltaba: `error.tsx` no captura errores lanzados por el root layout, así que
sin él un fallo ahí deja pantalla en blanco. Por eso `global-error.tsx` trae su propio
`<html>` y `<body>` y no depende de ningún estilo del proyecto.

### Lo que se evaluó y se descartó

**Route groups `(nombre)/`.** Se probaron para agrupar las rutas privadas bajo un layout
con el guard de sesión. Se sacaron: cada `page.tsx` ya valida su propia sesión y el
`proxy.ts` ya redirige, así que el layout del grupo era una tercera comprobación redundante
a cambio de una carpeta con paréntesis en el árbol. Los `loading.tsx` —que era el beneficio
real— se conservaron por ruta.

**Colocación en la ruta + carpetas privadas `_components/`.** Es la alternativa a la
estructura elegida: dejar los componentes de una ruta dentro de su carpeta, ocultándolos del
router con el guion bajo. Se descartó a favor de **todos los componentes bajo
`components/`**, con `app/` reservado exclusivamente a ruteo. Las dos son defendibles; esta
mantiene un solo lugar donde buscar un componente y evita que `app/` mezcle ruteo con UI. Si
el proyecto creciera hasta que `components/screens/` fuera incómodo, `_components/` por ruta
sería la salida natural.

---

## 10. Transiciones tipo SPA

El App Router ya da navegación cliente, code-splitting por ruta y prefetch. Lo que se
agregó son las dos piezas que faltaban para que **se sienta** como SPA.

**Feedback inmediato al hacer clic (`useLinkStatus`).** Los links con `prefetch={false}`
no tienen nada precargado, así que entre el clic y la nueva pantalla hay un viaje al
servidor sin ninguna señal visual. `ButtonLink` ahora renderiza un spinner dentro del
`<Link>` mientras la navegación está pendiente. La documentación recomienda `loading.tsx`
como mecanismo principal — que ya está — y `useLinkStatus` justo para este caso: destino
dinámico y prefetch apagado.

**El botón Atrás vuelve al paso 1, no fuera del flujo.** Era un bug real: en el paso 2 el
Atrás del navegador salía a Home y perdía el borrador, porque el wizard vivía solo en
Redux y la URL nunca cambiaba. Ahora, al entrar al resumen se hace
`window.history.pushState` de `?step=review` — _shallow routing_, sin re-render del
servidor — y un listener de `popstate` devuelve el estado al paso 1. El botón “Volver”
llama a `history.back()`, así que el control de la UI y el del navegador hacen exactamente
lo mismo en vez de divergir.

Se implementó con `popstate` y no sincronizando `useSearchParams` con Redux a propósito:
esa versión tenía una condición de carrera. Los dos efectos corrían en el mismo commit con
el mismo valor obsoleto — uno empujaba la URL y el otro, leyendo el valor viejo, deshacía
el paso inmediatamente. `popstate` solo se dispara ante un Atrás/Adelante real, así que no
hay nada que reconciliar.

Tres tests E2E cubren esto: Atrás desde el resumen vuelve al paso 1 con el monto intacto,
“Volver” se comporta igual, y Atrás desde el paso 1 sí sale del flujo.

**Lo que no se adoptó del documento:** `use()` + Context para transmitir una promesa desde
un Server Component (obligaría a reescribir la carga de Home y perdería el reintento
explícito que pide el enunciado), `next/dynamic` con `ssr: false` (no hay librerías que
dependan de `window`), Server Actions con `useOptimistic` (el enunciado pide API routes) y
`output: 'export'` (la app necesita servidor para la sesión y los handlers).

---

## 11. Accesibilidad

Next.js aporta dos cosas de fábrica y el resto hay que ganárselo.

**Lo que da el framework:** un _route announcer_ que anuncia cada navegación cliente a los
lectores de pantalla, leyendo primero `document.title`, después el `<h1>` y por último la
URL. Por eso cada ruta exporta su propio `metadata.title` — incluido `not-found`.

**Lo que hubo que arreglar.** Una auditoría contra `eslint-plugin-jsx-a11y` y la estructura
de encabezados encontró problemas reales:

| Problema                                                              | Arreglo                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Home, comprobante, error y 404 **no tenían `<h1>`**                   | El saludo, el resultado y los títulos de estado ahora son `h1`      |
| Home tenía un `<h2>` (“Movimientos”) sin `h1` arriba — jerarquía rota | Resuelto por lo anterior                                            |
| Solo **6 reglas** de `jsx-a11y` activas, y todas como _warning_       | **31 reglas activas como error**; `npm run lint` falla si se rompen |
| `autoFocus` en el login                                               | Eliminado (`jsx-a11y/no-autofocus`)                                 |
| No había forma de saltarse la navegación con teclado                  | `SkipLink` visible solo al enfocarlo, apuntando a `<Main>`          |

Sobre las reglas: `eslint-config-next` trae `jsx-a11y` pero solo enciende 6 reglas y como
advertencias, que en la práctica nadie mira. Ahora se escalan las de `recommended` a
`error`, **respetando las que el plugin apaga a propósito** (`label-has-for` está deprecada
y `control-has-associated-label` tiene demasiados falsos positivos). Encenderlas todas a la
fuerza generaba 5 errores falsos; escalar solo las que el plugin considera activas deja 0.

Además, ya presente desde antes: `lang="es"` en `<html>`, labels asociadas por `htmlFor`,
`aria-invalid` + `aria-describedby` en los campos con error, `role="alert"` en los mensajes,
`aria-pressed` en los selectores, foco visible con `:focus-visible`, y
`prefers-reduced-motion` para las animaciones.

**Auditoría automatizada.** El linter analiza el código; no ve el DOM renderizado. Por eso
`e2e/accessibility.spec.ts` corre **axe-core contra WCAG 2.1 AA en 12 estados reales** —
login, login con error, Home cargado/vacío/con error, los dos pasos de la transferencia con
y sin errores, el comprobante y el 404. **0 violaciones.**

Y dos cosas que axe no puede detectar, porque no son del DOM sino del comportamiento:

- **Foco al cambiar de paso.** Al pasar al resumen, el foco se mueve a un encabezado
  `Paso 2 de 2` (visible solo para lectores de pantalla). Sin eso, quien navega por teclado
  queda parado en el botón del paso anterior mientras la pantalla ya cambió.
- **Anuncio de estados asíncronos.** Home tiene una región `aria-live="polite"` que anuncia
  “Cargando tu cartera digital…” y “Cartera digital actualizada”. Que el esqueleto desaparezca y llegue
  el contenido es silencioso para un lector de pantalla.

Ambas tienen su propio test.

---

## 12. Carga diferida (dynamic imports)

Se midió antes de optimizar. El chunk de `/transfer` metía en el mismo archivo el paso 1 y
el paso 2 — código que el usuario no necesita hasta que pulsa “Continuar”. `ReviewStep` se
difiere con `next/dynamic`, con un `LoadingState` como fallback.

Para que el diferido funcione de verdad hubo un detalle: `TransferFlow` importaba un tipo
desde `ReviewStep`. Aunque `verbatimModuleSyntax` borra los imports de tipo, mantener la
dependencia invita a que alguien importe un valor por accidente y anule el split.

**Resultado medido, contra el servidor de producción:**

| Ruta                     | JS inicial          |
| ------------------------ | ------------------- |
| `/login`                 | 228.8 KB            |
| `/home`                  | 281.4 KB            |
| `/transfer` (paso 1)     | 290.6 KB            |
| Diferido hasta el paso 2 | **1 chunk, 3.3 KB** |

**Honestamente: la ganancia es chica.** 3.3 KB sobre 290 KB es ~1.1 %. El peso de esta app
es React + Redux + el runtime de Next, no sus componentes; partir código propio de 3 KB no
mueve la aguja y encima agrega overhead por chunk.

La costura queda montada y verificada —un test comprueba que ese chunk se pide solo al
llegar al paso 2— y es donde rendiría de verdad en cuanto entre una dependencia pesada: un
selector de fechas, una librería de gráficos o un escáner de QR.

---

## 13. Fast Refresh

No hay nada que “implementar”: Fast Refresh viene activado en todo Next.js desde la 9.4.
Lo que sí se puede hacer es no romperlo, y eso son convenciones de código:

- **Exports nombrados, nunca `export default () => ...`.** Una función anónima como default
  hace que Fast Refresh pierda el estado local en cada guardado. Todos los componentes de
  `components/` se exportan con nombre.
- **Un archivo de componente exporta componentes y nada más.** Si un archivo exporta también
  una constante que consume código fuera del árbol de React, Fast Refresh cae a un reload
  completo. Por eso las constantes viven en `domain/`, `store/` o `lib/`, no junto a la UI.
- **`reactStrictMode: true`** en `next.config.ts`. Los efectos se re-ejecutan durante Fast
  Refresh ignorando su array de dependencias, así que un efecto que no tolera correr dos
  veces falla justo cuando estás editando. Strict Mode obliga a escribirlos bien desde el
  principio.
- **Imports sensibles a mayúsculas.** Todo el proyecto usa `kebab-case`, así que no hay
  ambigüedad entre `./header` y `./Header`.

---

## 14. Testing

**Vitest** en vez de Jest: reusa el pipeline de Vite, así que TypeScript, JSX y el alias
`@/*` funcionan sin configuración de transform.

**Playwright** en vez de Cypress: maneja el servidor real de Next (se ejercitan los
redirects del Proxy, los Route Handlers y los Server Components tal como se despliegan),
corre en Chromium/Firefox/WebKit con las mismas specs, y su auto-waiting elimina buena
parte del presupuesto de flakiness.

La prioridad no fue el porcentaje de cobertura sino **qué es caro que se rompa**: las reglas
de negocio, el parseo de dinero, el ciclo de vida del wizard, y que las reglas se cumplan
desde la API.

**El conflicto azar vs. tests** se resolvió haciendo la aleatoriedad _inyectable_: aleatoria
por defecto, determinista cuando llega `x-simulate-outcome`. La misma costura alimenta el
panel de demo, así que ninguna rama de error es alcanzable solo por suerte.

---

## 15. Edge cases considerados

- Monto cero, negativo, vacío, con texto (`12abc`), con más de 2 decimales, y absurdamente
  grande (fuera del rango seguro de enteros).
- Gastar el saldo hasta exactamente cero — permitido; un centavo más — rechazado.
- **Enviarse dinero a uno mismo**, detectado sin importar mayúsculas ni formato del teléfono
  (`+1 (555) 555-0100` == `+15555550100`).
- Destinatario con nombre en blanco o handle inválido.
- Doble submit — el botón se deshabilita mientras hay una request en vuelo.
- **Doble cobro al reintentar** — resuelto con idempotencia.
- El saldo cambia entre validar y ejecutar — el store revalida antes de debitar.
- Guardar el contacto falla después de una transferencia exitosa — se traga el error; la
  dinero ya se movió y eso no puede fallar retroactivamente.
- Cookie corrupta o falsificada — se trata como “sin sesión”, nunca lanza.
- **Open redirect** en `?next=` — solo se aceptan rutas del mismo sitio.
- Carreras al cargar Home: una respuesta lenta que llega después de una rápida no pisa los
  datos frescos; al desmontar se aborta el thunk y el slice ignora los rechazos abortados.
- Volver atrás desde el comprobante no reabre la pantalla de confirmación (`replace`).
- Límite por transacción, además de las tres reglas pedidas.

---

## 16. Qué haría distinto con más tiempo

1. **Persistencia real.** SQLite o Postgres con un ledger de doble entrada en vez de mutar
   un saldo. Los movimientos deberían derivarse de los asientos, no guardarse aparte.
2. **Sesión firmada** con expiración y refresh, y CSRF en las mutaciones.
3. **Paginación de movimientos** (cursor) y virtualización de la lista de contactos — el
   punto donde “millones de usuarios” deja de ser teórico.
4. **RTK Query** en lugar de `createAsyncThunk` + cliente HTTP propio: dedupe, caché,
   revalidación en background e invalidación por tags, gratis. Ver el final de la sección 3.
5. **Tests de accesibilidad automatizados** (`axe-core`) en el pipeline. Hoy hay labels,
   `aria-invalid`, `aria-describedby`, roles y foco visible, pero nada que impida una
   regresión.
6. **Observabilidad**: reportar `error.digest` a Sentry, y métricas por código de fallo —
   sin eso, en producción no se sabe cuál de los cinco escenarios está pasando de verdad.
7. **Máquina de estados explícita** (XState) si el flujo creciera a más pasos; a dos pasos,
   el reducer es más simple de leer.
8. **Feature flag** para el panel de demo, y E2E en los tres navegadores.
9. **Presupuesto de bundle** en CI, para que el peso del cliente no crezca sin que nadie lo
   note.
