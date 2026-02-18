# Agent Guide for Pupu

This document provides essential information for AI agents working on the Pupu codebase. Pupu is a multi-platform application built with Rust (backend, WebAssembly), SolidJS (frontend), Tauri (native/Android), and Cloudflare Workers (web). The project uses Bun as the primary package manager and uv for Python scripts.

## Build Commands

### Web Development
- `bun run dev` – Start the development server with hot reload
- `bun run build` – Build the web application (runs checks first)
- `bun run preview` – Preview the built application with Wrangler dev server
- `bun run wasm:build` – Build the WebAssembly endpoint (`wasm/endpoint`)

### Native Development (Tauri)
- `bun run native:dev` – Start Tauri development environment
- `bun run native:build` – Build the native executable for the current platform

### Android Development
- `bun run android:init` – Initialize Android project (requires Android SDK)
- `bun run android:dev` – Start Android development environment
- `bun run android:build` – Build Android APK (arm64)

### Rust Workspace
- `cargo build` – Build all Rust crates
- `cargo build -p <crate>` – Build a specific crate (e.g., `cargo build -p endpoint`)
- `cargo test` – Run unit tests for all crates
- `cargo test -p <crate>` – Run tests for a specific crate
- `cargo test -p <crate> -- <test_name>` – Run a specific test (supports wildcards)
- `cargo clippy` – Run Clippy lints (no custom configuration)
- `cargo fmt` – Format Rust code with rustfmt (no custom configuration)

### Database & Code Generation
- `bun run generate:db-schema` – Generate Prisma schema and push to database
- `bun run generate:icon` – Generate Tauri icon from SVG
- `bun run generate:ipc-bindings` – Generate IPC bindings (requires Rust)

## Lint & Test Commands

### TypeScript/JavaScript
- `bun run check` – Run all checks (TypeScript and ESLint)
- `bun run check:tsc` – TypeScript type checking only
- `bun run check:eslint` – ESLint linting only (configuration in `eslint.config.ts`)
- `bun run test` – Run Playwright end‑to‑end tests (requires dev server)
- `bun test` – Run unit tests with Bun’s test runner (if any)

### Playwright E2E Tests
- `bun run test` – Runs all tests defined in `tests/`
- `bun run test -- --grep "pattern"` – Run tests matching a pattern
- `bun run playwright:install` – Install Playwright browsers

### Rust
- `cargo clippy` – Lint with Clippy (default settings)
- `cargo fmt --check` – Check formatting without modifying files

## Code Style Guidelines

### TypeScript / SolidJS
- **Naming**: Use `camelCase` for variables, functions, and methods. Use `PascalCase` for components, classes, types, and interfaces. Use `SCREAMING_SNAKE_CASE` for constants.
- **Imports**: Group imports in the following order:
  1. External dependencies (Solid, router, etc.)
  2. Internal modules (`~/components/...`)
  3. Type imports (use `import type` for types)
- **Error Handling**: Prefer `try/catch` with async/await. Use `Result`‑like patterns from libraries where appropriate.
- **Types**: Always use strict TypeScript (`strict: true`). Avoid `any`. Use `unknown` or proper generics.
- **Formatting**: Prettier is configured with default settings (see `.prettierrc`). Run `bun run check:eslint` to enforce code style.
- **ESLint Rules**: Key rules from `eslint.config.ts`:
  - `@typescript-eslint/strict-boolean-expressions`: error
  - `@typescript-eslint/no-misused-promises`: off
  - `no-unassigned-vars`: off

### Rust
- **Naming**: Follow `snake_case` for functions, variables, and modules. Use `PascalCase` for types, traits, and enums. Use `SCREAMING_SNAKE_CASE` for constants.
- **Imports**: Group imports as per `rustfmt` defaults. Use `crate::` for internal modules.
- **Error Handling**: Use `eyre::Result` for fallible functions. Propagate errors with `?`. Provide context with `wrap_err`.
- **Formatting**: Use `cargo fmt` (no project‑specific `rustfmt.toml`). Ensure code passes `cargo fmt --check`.
- **Linting**: Run `cargo clippy` and address all warnings. No custom Clippy configuration.
- **Documentation**: Document public APIs with `///` doc comments.

### Commit Messages
- Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
- Common types: `fix:`, `feat:`, `docs:`, `chore:`.
- Use present tense, imperative mood (e.g., “Add feature” not “Added feature”).

## Editor & Tooling Notes
- No Cursor rules (`.cursorrules` or `.cursor/rules/`) are present.
- No Copilot instructions (`.github/copilot-instructions.md`) are present.
- ESLint and Prettier are configured as described above.

## Project Structure
```
pupu/
├── src/                    # Frontend SolidJS source
│   ├── routes/            # Route components (file‑based routing)
│   ├── components/        # Reusable UI components
│   ├── stores/            # State management stores
│   └── lib/               # Internal libraries (endpoint, SQLite, etc.)
├── crates/                # Rust crates (shared logic)
│   ├── endpoint/          # Endpoint abstraction
│   ├── person‑protocol/   # Person protocol implementation
│   └── utils/             # Utility helpers
├── wasm/endpoint/         # WebAssembly build target
├── native/                # Tauri native application
├── cli/pupu‑relay/        # Relay CLI tool
├── tests/                 # Playwright end‑to‑end tests
└── .github/               CI/CD workflows and actions
```

## Environment Setup
1. Install prerequisites: Tauri, Bun, uv, `wasm32‑unknown‑unknown` target, wasm‑pack.
2. Run `bun run install:pre` (builds WASM).
3. Run `bun install` (installs Node dependencies).
4. Run `bun run install:post` (runs generation tasks and installs Playwright browsers).
5. For Android development, also run `bun run android:init` and set up keystore.

## CI/CD Notes
- The repository uses GitHub Actions for testing and releases (see `.github/workflows/`).
- The `initialize‑project` action sets up the environment (Rust target, Bun, uv, system dependencies).
- Web releases deploy to Cloudflare Workers via Wrangler.
- Native releases build Windows, Android, and relay binaries.

## Useful References
- `package.json` – Scripts and dependencies
- `wrangler.json` – Cloudflare Workers configuration
- `playwright.config.ts` – Playwright test configuration
- `tsconfig.json` – TypeScript compiler options
- `eslint.config.ts` – ESLint configuration
- `.prettierrc` – Prettier configuration (defaults)
- `Cargo.toml` (workspace) – Rust crate layout

## Quick Start for Agents
1. Always run `bun run check` before committing changes.
2. For Rust changes, run `cargo fmt` and `cargo clippy`.
3. For frontend changes, ensure TypeScript passes and ESLint passes.
4. Write tests for new features (unit tests with Bun, E2E with Playwright).
5. Follow existing naming and import patterns in the codebase.
6. Use conventional commits for any commit messages.

---
*This file is maintained for AI agents working on the Pupu repository. Update it when tooling or conventions change.*