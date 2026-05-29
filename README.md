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
- **Deployment:** [Cloudflare Pages](https://pages.cloudflare.com/) (via `@sveltejs/adapter-cloudflare`)
- **UI Components:** [bits-ui](https://www.bits-ui.com/)
- **Styling:** Native CSS with custom properties (design tokens in `src/app.css` + scoped component styles — no CSS framework)
- **Image Export:** [modern-screenshot](https://github.com/qq15725/modern-screenshot)
- **Testing:** [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/docs/svelte-testing-library/intro/) (jsdom)

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

### Building for Production

To create a production build (configured for Cloudflare Pages):

```bash
pnpm build
```

The output is written to `./build` (matching `pages_build_output_dir` in `wrangler.toml`).

To preview the production build locally:

```bash
pnpm preview
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

The app is built with `@sveltejs/adapter-cloudflare` and deploys to Cloudflare Pages. Runtime settings live in `wrangler.toml` (`compatibility_date`, `compatibility_flags`). Static asset caching headers are defined in `static/_headers` and merged into the build output.
