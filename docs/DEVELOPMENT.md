# Development and verification

## Requirements

- **Node.js 26** (see `.nvmrc` and `package.json`)
- Git and a GitHub account for contributions
- A read token for live GitHub GraphQL generation

The project uses Node's native TypeScript type stripping, with no dependency installation or separate TypeScript transpilation required.

## Local commands

```bash
npm install --no-audit --no-fund
npm run check
npm run typecheck
npm test
# Optional live REST-vs-GraphQL cross-check (requires GITHUB_TOKEN):
npm run verify -- --username YOUR_USERNAME
npm run demo -- --username demo
npm run gallery:check
```

`npm run demo` produces all four SVGs under the ignored `demo-output/{dark,light}/` paths from synthetic data and needs no token. It will not overwrite the committed gallery. It is not a real-account benchmark.

To generate real data, set `GITHUB_TOKEN` as an environment variable and run:

```bash
npm run generate -- --username YOUR_USERNAME --top-n 12 --chart donut --theme all
```

Do not paste tokens in source files or into public CI logs. If the caller job's `github.token` is insufficient for GraphQL contributions, an appropriately scoped read token can be passed as an Action secret.

## Updating README previews

`scripts/gallery.ts` contains a **fixed public snapshot** used only for the README's gallery. It is not fetched from a live GitHub account on each run.

```bash
npm run gallery
npm run gallery:check
```

Commit all four regenerated SVGs under `profile-card-output/dark/` and `profile-card-output/light/` when the renderer changes. CI verifies that the committed files match the current renderer. The root README displays both themes directly. Test cases also cover 1, 7, 12 and 30 languages, long labels, both themes and chart layouts.

## CI

On pull requests and pushes to `main`, CI runs syntax checks, unit tests, deterministic gallery checks, demo SVG generation, and a **live public GraphQL** smoke test of the composite Action. The live SVGs are generated with `theme: all` and uploaded as temporary workflow artifacts for review. A separate verification step compares public non-fork primary-language counts against independently paginated GitHub REST repository data. GitHub's commit-contribution metric is validated using year-boundary, duplicate-year and 100-repository-window fixtures, not claimed to match raw REST commit counts. A successful CI run does **not** update the user's profile repository.

`npm run check` validates Node.js syntax; `npm run typecheck` runs strict TypeScript 7 static checking with Node.js 26 definitions. The `tsconfig.json` is for static analysis; Node.js executes .ts directly using native type stripping. Tests cannot guarantee that GitHub's API will always be reachable.

## Branches and pull requests

Use a short-lived feature/fix branch based on `main` and open a PR. The repository does not require a permanent `develop` branch. Do not merge without the maintainers' approval. See [CONTRIBUTING.md](../CONTRIBUTING.md) and the [shared GitHub Flow standards](https://github.com/naoiw/.github/blob/main/standards/GITHUB_FLOW.md).

In PR descriptions, explain changes to metric semantics and note which checks passed, including any untested environment-specific behavior. For visual changes, include a preview or reference the updated gallery files.

## Stable releases

The current stable release is `v1.0.0`, with an accompanying `v1` major-version alias. Consumers may use `naoiw/github-profile-cards@v1.0.0` for a fixed version, `@v1` for compatible v1 updates, or a full commit SHA for exact pinning.

The initial release is published by the guarded workflow in `.github/workflows/publish-v1.yml` after it lands on `main`. That workflow runs static checks, unit tests, the public GitHub GraphQL Action smoke test, and the independent REST comparison **before** creating the `v1.0.0` release. It checks existing tags/releases and does not publish a new version on ordinary main pushes.

For a future minor or patch release, use a separately reviewed release process with an updated version and notes. Do not move an existing specific-version tag, and update the `v1` major alias only after verifying the new release. Validate versioned Action usage from an independent consumer repository before closing a release issue.

See [release notes](RELEASE_v1.0.0.md) and [changelog](../CHANGELOG.md).
