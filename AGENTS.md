# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 App Router project using TypeScript, React, Redux Toolkit, Tailwind CSS, Auth.js, and Mongoose.

- `app/` contains routes, layouts, pages, and API handlers. Example: `app/api/tasks/route.ts`.
- `components/` contains reusable UI and feature components, including `analytics/`, `notes/`, `tasks/`, `theme/`, and `ui/`.
- `store/` contains Redux setup, typed hooks, slices, and timer persistence.
- `models/` contains Mongoose schemas for persisted entities.
- `lib/` contains shared database, analytics, markdown, board, theme, and utility logic.
- `types/` contains shared TypeScript types.
- `public/` contains static assets.

## Build, Test, and Development Commands

Use `yarn` for local development:

- `yarn install` installs dependencies.
- `yarn dev` starts the development server at `http://localhost:3000`.
- `yarn build` creates the production Next.js build.
- `yarn start` runs the production server after a successful build.
- `yarn lint` runs ESLint with Next.js core web vitals and TypeScript rules.

## Coding Style & Naming Conventions

Write maintainable TypeScript. Prefer explicit names and small single-purpose functions. Use PascalCase for React components and Mongoose models, camelCase for variables/functions, and kebab-case for route segments when needed. Keep feature components near their domain folder and shared UI primitives in `components/ui/`.

Use the `@/*` path alias from `tsconfig.json` when it improves readability. Follow the existing style: 2-space indentation, double quotes, and semicolons.

## Testing Guidelines

No test framework is currently configured. Before adding tests, add the framework and scripts intentionally in `package.json`. Prefer colocated tests such as `TaskCard.test.tsx` or domain tests under a future `__tests__/` folder. For now, validate changes with:

- `yarn lint`
- `yarn build`
- Manual checks in the impacted route or workflow

## Commit & Pull Request Guidelines

Recent commits use conventional-style prefixes such as `feat:` and `docs:`. Keep using that pattern, for example `feat: add task priority filter` or `fix: prevent duplicate habit logs`.

Pull requests should include a short summary, reason for the change, linked issues when available, and screenshots or recordings for UI changes. Mention environment variables, migrations, or manual verification steps.

## Security & Configuration Tips

Do not commit secrets. Keep local values in `.env` or `.env.local`. Required configuration includes MongoDB and Auth.js-related secrets; document any new variables in `README.md`.

## Agent-Specific Instructions

Keep changes minimal and focused. Do not rewrite unrelated files. Preserve the current architecture: Next.js routes in `app/`, shared logic in `lib/`, persisted schemas in `models/`, and client state in `store/`.
