# Development and verification

## Requirements

- **Node.js 26** (see `.nvmrc` and `package.json`)
- Git and a GitHub account for contributions
- A read token for live GitHub GraphQL generation

The project uses Node's native TypeScript type stripping, with no dependency installation or separate TypeScript transpilation required.

## Local commands

```bash
npm run check
npm test
npm run demo -- --username demo
npm run gallery:check
```

`npm run demo` produces sample SVGs under `cards/` from synthetic data and needs no token. It is not a real-account benchmark.

To generate real data, set `GITHUB_TOKEN` as an environment variable and run:

```bash
npm run generate -- --username YOUR_USERNAME --top-n 12 --chart donut --theme dark
```

Do not paste tokens in source files or into public CI logs. If the caller job's `github.token` is insufficient for GraphQL contributions, an appropriately scoped read token can be passed as an Action secret.

## Updating README previews

`scripts/gallery.ts` contains a **fixed public snapshot** used only for the README's gallery. It is not fetched from a live GitHub account on each run.

```bash
npm run gallery
npm run gallery:check
```

Commit all four regenerated SVGs in `docs/previews/dark/` and `docs/previews/light/` when the renderer changes. CI verifies that the committed files match the current renderer. The README uses `<picture>` to show the theme-appropriate sample.

## CI

On pull requests and pushes to `main`, CI runs syntax checks, unit tests, deterministic gallery checks, demo SVG generation, and a **live public GraphQL** smoke test of the composite Action. The live SVGs are uploaded as temporary workflow artifacts for review. A successful CI run does **not** update the user's profile repository.

Note: `npm run check` checks syntax, not static types. This MVP currently has no separate `tsc --noEmit` stage. Tests cannot guarantee that GitHub's API will always be reachable in every environment.

## Branches and pull requests

Use a short-lived feature/fix branch based on `main` and open a PR. The repository does not require a permanent `develop` branch. Do not merge without the maintainers' approval. See [CONTRIBUTING.md](../CONTRIBUTING.md) and the [shared GitHub Flow standards](https://github.com/naoiw/.github/blob/main/standards/GITHUB_FLOW.md).

In PR descriptions, explain changes to metric semantics and note which checks passed, including any untested environment-specific behavior. For visual changes, include a preview or reference the updated gallery files.
