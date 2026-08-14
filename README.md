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
