<div align="center">

# ZooDB

**Interactive SQL learning environment with a zoo-themed database**

[![Release](https://img.shields.io/github/v/release/Only0neHpLeft/zoodb-app?style=flat-square&color=blue)](https://github.com/Only0neHpLeft/zoodb-app/releases)
[![macOS](https://img.shields.io/badge/macOS-arm64%20%7C%20x64-black?style=flat-square&logo=apple)](https://github.com/Only0neHpLeft/zoodb-app/releases)
[![License](https://img.shields.io/github/license/Only0neHpLeft/zoodb-app?style=flat-square)](LICENSE)

</div>

---

Learn SQL by writing real queries against a zoo database — animals, caretakers, species, and more. Built as a native desktop app that works completely offline.

## Features

- **Interactive SQL Editor** — Write and execute queries with syntax highlighting and instant results
- **Guided Lessons** — 26 structured lessons from basic SELECT to JOINs and subqueries
- **67 Practice Tasks** — Hands-on exercises with progress tracking
- **Classrooms** — Teachers create classes, students join and track progress together
- **Offline-First** — Full local PostgreSQL database via PGlite, no internet required
- **Bilingual** — English and Czech language support
- **Auto-Updates** — Background updates with automatic install on restart

## Download

Grab the latest release for your platform:

| Platform | Architecture | Download |
|:---------|:-------------|:---------|
| macOS | Apple Silicon (M1–M5) | [`.dmg`](https://github.com/Only0neHpLeft/zoodb-app/releases/latest) |
| macOS | Intel x64 | [`.dmg`](https://github.com/Only0neHpLeft/zoodb-app/releases/latest) |

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Desktop | [Tauri v2](https://v2.tauri.app) |
| Frontend | [React 19](https://react.dev) + [Vite](https://vite.dev) |
| Routing | [TanStack Router](https://tanstack.com/router) |
| Local DB | [PGlite](https://electric-sql.com/product/pglite) (PostgreSQL in WASM) |
| Backend | [Convex](https://convex.dev) |
| Auth | [Better Auth](https://better-auth.com) |
| UI | [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com) |

## Development

```bash
bun install
bun run tauri dev
```

## Building

```bash
bun run tauri build
```

## License

[MIT](LICENSE)
