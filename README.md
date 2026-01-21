# Yu Scheduler

A modern, client-side course scheduling tool designed for York University students. Yu Scheduler helps students plan their semesters by generating conflict-free schedules based on their selected courses and personal time constraints.

## Features

- **Smart Scheduling Engine:** Automatically generates all possible conflict-free schedule combinations for your selected courses.
- **Term Selection:** Support for multiple academic terms.
- **Customizable Constraints:** Define "Blocked Hours" to ensure your schedule fits around your life (work, breaks, commuting).
- **Local Persistence:** Your selections and generated schedules are automatically saved to your browser's local storage.
- **Modern UI:** Built with Svelte 5 for a fast, reactive user experience.
- **Internationalization:** Multi-language support (i18n).

## Tech Stack

- **Framework:** [SvelteKit](https://kit.svelte.dev/) (Svelte 5)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Runtime & Manager:** [Bun](https://bun.sh/)
- **Deployment:** [Cloudflare Pages](https://pages.cloudflare.com/)
- **UI Components:** [bits-ui](https://www.bits-ui.com/)
- **Reactivity:** [runed](https://runed.dev/)

## Getting Started

### Prerequisites

This project uses [Bun](https://bun.sh/) as its package manager and runtime. Ensure you have it installed before proceeding.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/arvemy/yu-scheduler.git
   cd yu-scheduler
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

### Development

Start the development server:

```bash
bun run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

To create a production build (configured for Cloudflare Pages):

```bash
bun run build
```

To preview the production build locally:

```bash
bun run preview
```

## Project Structure

- `src/lib/scheduler`: Core logic for the scheduling engine and conflict detection.
- `src/lib/components`: Reusable UI components.
- `src/lib/storage`: Local storage management for user preferences.
- `src/routes`: Application pages and routing logic.
