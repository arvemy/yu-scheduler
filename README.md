# YuScheduler

A modern, client-side course scheduling tool designed for Yaşar University students. YuScheduler helps students plan their semesters by generating conflict-free schedules based on their selected courses and personal time constraints.

## Features

- **Smart Scheduling Engine:** Automatically generates all possible conflict-free schedule combinations for your selected courses. Heavy combinatorics run in a Web Worker to keep the UI responsive.
- **Term Selection:** Support for multiple academic terms, with the latest term auto-selected.
- **Customizable Constraints:** Define "Blocked Hours" to ensure your schedule fits around your life (work, breaks, commuting).
- **AND/OR Course Groups:** Mark courses as alternatives so the engine can pick one of several options.
- **Image Export:** Download any generated schedule as a PNG.
- **Local Persistence:** Your selections and generated schedules are automatically saved to your browser's local storage.
- **Modern UI:** Built with Svelte 5 for a fast, reactive user experience.
- **Internationalization:** Multi-language support (English & Turkish) via a small custom i18n store.

## Tech Stack

- **Framework:** [SvelteKit](https://kit.svelte.dev/) (Svelte 5, runes)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Package Manager:** [pnpm](https://pnpm.io/)
- **Build Tool:** [Vite](https://vite.dev/)
- **Deployment:** [Cloudflare Workers](https://workers.cloudflare.com/) with [static assets](https://developers.cloudflare.com/workers/static-assets/) (via `@sveltejs/adapter-cloudflare`)
- **UI Components:** [bits-ui](https://www.bits-ui.com/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) (utility-first). Design tokens stay as CSS custom properties in `src/app.css` and are bridged into the Tailwind theme via `@theme`, with scoped component styles kept where utilities don't fit.
- **Icons:** [@lucide/svelte](https://lucide.dev/) (the GitHub/LinkedIn brand glyphs remain inline SVGs, since Lucide does not ship brand icons)
- **Fonts:** [Inter](https://rsms.me/inter/) — self-hosted variable font (Latin + Latin Extended), with `font-display: optional` and a tuned fallback face to minimize CLS
- **Image Export:** [modern-screenshot](https://github.com/qq15725/modern-screenshot)
- **Testing:** [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/docs/svelte-testing-library/intro/) (jsdom)
- **Linting/Formatting:** [ESLint](https://eslint.org/) (with `eslint-plugin-svelte`) and [Prettier](https://prettier.io/) (with `prettier-plugin-svelte` and `prettier-plugin-tailwindcss`)

## Getting Started

### Prerequisites

This project uses [pnpm](https://pnpm.io/) as its package manager and Node.js (>= 20.19). The pinned pnpm version is declared in `package.json` (`packageManager`), so [Corepack](https://nodejs.org/api/corepack.html) can provision it automatically:

```bash
corepack enable
```

Otherwise, install pnpm by following the [official instructions](https://pnpm.io/installation).

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/arvemy/yu-scheduler.git
   cd yu-scheduler
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development

Start the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`.

### Type Checking

```bash
pnpm check
```

### Testing

The project uses Vitest with the Svelte Testing Library (jsdom environment). Tests are colocated with the code as `*.test.ts` (and `*.svelte.test.ts` for component/rune tests).

```bash
pnpm test            # run the suite once
pnpm test:watch      # watch mode
pnpm test:coverage   # run with a V8 coverage report
```

### Linting & Formatting

```bash
pnpm lint            # Prettier check + ESLint
pnpm format          # auto-format the codebase with Prettier
```

### Building for Production

To create a production build:

```bash
pnpm build
```

The output is written to `.svelte-kit/cloudflare` — both the `main` worker entry and the `assets` directory referenced by `wrangler.jsonc`.

To preview the production build locally:

```bash
pnpm preview              # Vite preview server
pnpm exec wrangler dev    # run the build on the Workers runtime (workerd)
```

## Project Structure

- `src/lib/scheduler`: Core logic for the scheduling engine, conflict detection, term/course API, and the worker client.
- `src/lib/workers`: The Web Worker that runs schedule generation off the main thread.
- `src/lib/components`: Reusable UI components.
- `src/lib/i18n`: Custom, typed i18n store. `locales/en.ts` is the source of truth; `locales/tr.ts` is checked against it (`satisfies Messages`) so locales can't drift.
- `src/lib/storage`: Local storage management and schema validation for user preferences.
- `src/lib/utils`: Helpers, including `reactivity.svelte.ts` (native Svelte 5 `watch`/`useDebounce`) and `useMediaQuery.svelte.ts`.
- `src/test`: Test mocks (`$app/*` stubs) and shared test type declarations.
- `src/routes`: Application pages and routing logic (the app runs as a client-rendered SPA — `ssr = false`).

## Deployment

The app is built with `@sveltejs/adapter-cloudflare` and deploys to [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/) (with static assets). Worker settings live in `wrangler.jsonc` (`main`, `assets`, `routes`, `compatibility_date`, `compatibility_flags`, `observability`). Static-asset caching headers are defined in the project-root `_headers` file; the adapter copies it into the build output and also auto-generates immutable caching headers for `/_app/immutable/*`.

Build and deploy from your machine (or CI):

```bash
pnpm run deploy           # runs `vite build && wrangler deploy`
```

> Use `pnpm run deploy` (not `pnpm deploy`), since `deploy` is also a built-in pnpm command.
