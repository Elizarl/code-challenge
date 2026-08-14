# Wallet — Code Challenge

Flujo de cartera digital: **Login → Home → Nueva Transacción → Confirmación / Comprobante**.

Next.js 16 (App Router) + React 19 + TypeScript en modo estricto. Todos los datos son
mockeados: no hay backend real ni autenticación real.

- **Decisiones de diseño:** [DECISIONS.md](./DECISIONS.md)
- **Uso de IA:** [AI_USAGE.md](./AI_USAGE.md)

---

## Requisitos

- Node.js >= 20.9

## Cómo levantar el proyecto

```bash
npm install
npm run dev
```

Abrir <http://localhost:3000>. La app redirige a `/login`.

### Cómo entrar

No hay contraseñas. **Cualquier email o teléfono con formato válido inicia sesión** como el
usuario demo:

| Entrada            | Resultado                                              |
| ------------------ | ------------------------------------------------------ |
| `demo@wallet.com`  | Login exitoso                                          |
| `+15555550100`     | Login exitoso (también acepta teléfono)                |
| `error@wallet.com` | Error simulado del servidor (500)                      |
| `no-es-un-handle`  | Error de validación en el cliente, sin llamar a la API |

### La confirmación es aleatoria

Como pide el enunciado, confirmar una transferencia **elige un resultado al azar**. No hay
ningún control en la interfaz para forzarlo: la app se comporta como se comportaría en
producción.

| Escenario            | Peso | Qué ves                                                       |
| -------------------- | ---- | ------------------------------------------------------------- |
| Éxito                | 60 % | Comprobante en su propia URL, saldo descontado                |
| Error de red         | 10 % | Estado de error **con botón de reintentar**                   |
| Timeout              | 10 % | Espera excesiva manejada; se puede reintentar sin doble cobro |
| Fondos insuficientes | 10 % | Error descriptivo, **sin** invitación a reintentar            |
| Error desconocido    | 10 % | Fallback genérico, reintentable                               |

Reintentar unas cuantas veces alcanza para ver los cinco. Si quieres ir directo a uno
concreto sin depender de la suerte, el servidor acepta una cabecera de simulación —el mismo
gancho que usa la suite E2E, que no forma parte de la interfaz:

```bash
# Fuerza un timeout en la próxima confirmación
curl -i -X POST http://localhost:3000/api/transactions \
  -H 'content-type: application/json' \
  -H 'x-simulate-outcome: TIMEOUT' \
  -H "cookie: $(: pega aquí tu cookie wallet_session)" \
  -d '{"amountInput":"10","recipient":{"contactId":null,"name":"Ana","handle":"ana@example.com"}}'
```

Valores: `SUCCESS`, `NETWORK_ERROR`, `TIMEOUT`, `INSUFFICIENT_FUNDS`, `UNKNOWN_ERROR`.
Para los estados de Home hay dos equivalentes: `x-simulate-wallet-empty` y
`x-simulate-wallet-error`. Desde el navegador se pueden agregar con cualquier extensión que
inyecte cabeceras.

El estado de **carga** se ve al entrar a Home (hay latencia simulada de ~300 ms).

---

## Scripts

| Script                  | Qué hace                                                     |
| ----------------------- | ------------------------------------------------------------ |
| `npm run dev`           | Servidor de desarrollo                                       |
| `npm run build`         | Build de producción (falla ante errores de tipo)             |
| `npm start`             | Sirve el build de producción                                 |
| `npm run typecheck`     | `tsc --noEmit`                                               |
| `npm run lint`          | ESLint sobre todo el proyecto                                |
| `npm run lint:fix`      | ESLint con `--fix` (además ordena imports)                   |
| `npm run format`        | Prettier write                                               |
| `npm run format:check`  | Prettier check                                               |
| `npm test`              | Tests unitarios y de componentes (Vitest)                    |
| `npm run test:watch`    | Vitest en modo watch                                         |
| `npm run test:coverage` | Cobertura                                                    |
| `npm run test:e2e`      | Tests end-to-end (Playwright)                                |
| `npm run check`         | typecheck + lint + format + tests unitarios — **usar en CI** |

La primera vez que corras E2E necesitas el navegador:

```bash
npx playwright install chromium
npm run test:e2e
```

`test:e2e` hace `build` + `start` automáticamente y levanta el servidor solo.

---

## Arquitectura

```
src/
  domain/              Lógica de negocio pura. Sin React, sin fetch, sin Next.
    money.ts             Cents como enteros + parseo y formato
    handle.ts            Email/teléfono: clasificación y comparación
    models.ts            Entidades del dominio (User, Account, Movement, Contact, Receipt)
    transfer/
      rules.ts           validateTransfer() — las reglas de negocio
      violations.ts      Unión discriminada de violaciones
      failures.ts        Taxonomía de fallos + si cada uno admite reintento

  server/              Solo servidor.
    guards.ts            requireSessionOrRedirect(), compartido por las páginas privadas
    store.ts             Store en memoria (stand-in del repositorio)
    session.ts           Sesión mockeada en cookie httpOnly
    simulate.ts          Simulador de resultados aleatorios / forzados
    http.ts              Helpers de respuesta y guard de sesión

  api/                 Contrato de red compartido.
    schemas.ts           Esquemas zod de request
    client.ts            Cliente tipado; traduce HTTP → taxonomía de fallos

  app/                 SOLO ruteo. Ni un componente, ni una hoja de estilos.
    layout.tsx           <SkipLink> + <Providers> (store de Redux)
    icon.svg             Favicon (convención del App Router)
    login/page.tsx
    home/ transfer/ receipt/[id]/    page.tsx + loading.tsx cada uno
    error.tsx  global-error.tsx  not-found.tsx
    api/                 Route Handlers

  components/          TODOS los componentes.
    screens/             Una pantalla completa por ruta: login-screen/ home-screen/
                         transfer-screen/ receipt-screen/ error-screen/
                         not-found-screen/ route-loading/
    ui/                  button/ text-field/ layout/ spinner/ skeleton/
                         alert/ state-view/ summary-list/ skip-link/
    wallet/              balance-card/ movement-list/ app-header/ wallet-panel/
    transfer/            compose-step/ review-step/ contact-picker/ transfer-flow/
    auth/                login-form/
    providers/           Provider de Redux

  store/               Redux Toolkit.
    index.ts             configureStore (uno por request, no singleton)
    transfer-slice.ts    Borrador del wizard + contexto hidratado del servidor
    wallet-slice.ts      Snapshot de Home vía createAsyncThunk
    selectors.ts         Selectores memoizados; llaman a las reglas del dominio
    hooks.ts             useAppDispatch / useAppSelector tipados

  messages/es.ts       TODO el texto visible: `copy` + mensajes de reglas y fallos
  lib/                 cx (className), initials (avatares)
  proxy.ts             Protección de rutas (en Next 16 el middleware se llama Proxy)
```

`app/` contiene únicamente ruteo: cada `page.tsx` lee la sesión, busca los datos y
renderiza una pantalla de `components/screens/`. Next exige un `page.tsx` por ruta —
es lo que _define_ la ruta — pero ninguno pasa de 27 líneas y ninguno tiene markup.

**Cada componente vive en su propia carpeta**, con su estilo y su test al lado:

```
components/ui/button/
  index.tsx           El componente (import: '@/components/ui/button')
  style.module.css    Sus estilos, sin clases compartidas con nadie
  button.test.tsx     Su test
```

Un CSS Module por componente en lugar de hojas compartidas: borrar el componente borra
sus estilos, y no queda CSS huérfano que nadie se anima a tocar. Lo que sí se comparte
entre pantallas se comparte como **componente**, no como clase — por eso existen
`summary-list/` (lo usan el resumen y el comprobante) y `spinner/` (lo usan el botón y
los estados de carga).

La regla que ordena todo: **`domain/` no importa nada de React ni de Next**. Eso es lo que
permite que la misma función de validación corra en el navegador y en el servidor.

### API (mockeada)

| Método   | Ruta                     | Qué hace                                               |
| -------- | ------------------------ | ------------------------------------------------------ |
| `POST`   | `/api/session`           | Login; setea la cookie de sesión                       |
| `DELETE` | `/api/session`           | Logout                                                 |
| `GET`    | `/api/wallet`            | Usuario + saldo + movimientos                          |
| `GET`    | `/api/contacts`          | Contactos (favoritos primero)                          |
| `POST`   | `/api/contacts`          | Guarda un contacto nuevo (idempotente por handle)      |
| `POST`   | `/api/transactions`      | Confirma una transferencia (valida + simula + ejecuta) |
| `GET`    | `/api/transactions/[id]` | Comprobante por id                                     |

Cabeceras de control usadas por los tests y por el panel de demo:

- `x-simulate-outcome` — fuerza el resultado de `POST /api/transactions`
- `x-simulate-wallet-error` / `x-simulate-wallet-empty` — fuerzan los estados de Home
- `idempotency-key` — evita el doble cobro al reintentar

---

## Testing

**Unitarios y de componentes (Vitest) — 201 tests**

- `domain/` — reglas de negocio, parseo de dinero, validación de email/teléfono
- `store/transfer-slice.test.ts` — el reducer del wizard, sin renderizar nada
- `components/*/` — un test junto a cada componente
- `components/screens/screens.test.tsx` — landmarks y jerarquía de encabezados
- `app/api/transactions/route.test.ts` — **las reglas se cumplen aunque no exista la UI**

**End-to-end (Playwright) — 50 tests**

- `e2e/auth.spec.ts` — redirecciones, validación, error del servidor, logout
- `e2e/home.spec.ts` — carga, vacío, error + reintento
- `e2e/transfer.spec.ts` — camino feliz, reglas de negocio y **los cinco escenarios de confirmación**
- `e2e/transfer.spec.ts` — también cubre que el botón Atrás vuelva al paso 1
- `e2e/accessibility.spec.ts` — **axe-core (WCAG 2.1 AA) en 12 estados: 0 violaciones**, más foco y live regions
- `e2e/responsive.spec.ts` — sin desborde horizontal en 320 / 390 / 768 / 1440 px, datos
  largos, y tamaño táctil mínimo de los botones

```bash
npm run check      # typecheck + lint + format + unitarios
npm run test:e2e   # end-to-end
```

---

## Librerías usadas

| Librería                   | Para qué                                             |
| -------------------------- | ---------------------------------------------------- |
| `next` 16 / `react` 19     | Framework y UI                                       |
| `zod` 4                    | Validación del contrato de red en el borde de la API |
| `vitest` + Testing Library | Tests unitarios y de componentes                     |
| `@playwright/test`         | End-to-end                                           |
| ESLint + Prettier          | Calidad y formato (config heredada del scaffold)     |

Sin librería de UI y sin CSS-in-JS: se usan CSS Modules y custom properties. El porqué de
cada elección está en [DECISIONS.md](./DECISIONS.md).

---

## Limitaciones conocidas

Son limitaciones deliberadas de un challenge con datos mockeados, no descuidos:

1. **La sesión no es segura.** La cookie es JSON en base64, sin firmar. Es falsificable a
   mano. Es `httpOnly` y se re-valida en cada Route Handler, así que la _estructura_ es
   correcta, pero para producción hay que reemplazar `encodeSession`/`decodeSession` por
   firmar/verificar (JWT o `iron-session`) y agregar expiración.
2. **El store vive en memoria del proceso.** Se reinicia al reiniciar el servidor y no se
   comparte entre instancias serverless. En producción esto es una base de datos.
3. **Un solo usuario.** Cualquier handle entra a la misma cuenta demo. No hay registro.
4. **Las cabeceras de simulación existen en producción.** `x-simulate-outcome` y las de
   Home no están protegidas por ningún flag. En una app real irían detrás de un feature
   flag o restringidas a entornos de test; aquí son el gancho que mantiene determinista a la
   suite E2E sin ensuciar la interfaz.
5. **Los tests E2E corren en serie** (`workers: 1`) porque comparten el store en memoria.
6. **La lista de contactos no está virtualizada** ni paginada. Con cuatro contactos es
   correcto; con miles no lo sería.
7. **El saldo del paso 1 es un snapshot del render.** Si cambiara mientras el usuario
   escribe, el cliente no se entera — pero el servidor revalida al confirmar, así que el
   peor caso es un error explicado, no un saldo negativo.
8. **Solo se testea Chromium** en E2E, por tiempo de ejecución.
