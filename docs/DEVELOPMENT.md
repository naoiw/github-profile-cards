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

`npm run demo` produces all four SVGs under the ignored `demo-output/{dark,light}/` paths and a scrollable `demo-output/README.md` from synthetic data and needs no token. It will not overwrite the committed gallery. It is not a real-account benchmark.

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

Commit all four regenerated SVGs under `profile-card-output/dark/` and `profile-card-output/light/`, plus `profile-card-output/README.md`, when the renderer or gallery changes. CI verifies the committed files. Browsing the output folder on GitHub displays the gallery README and its inline SVG previews once that README is committed. The paths shown inside this gallery are relative to the output directory; links in a repository-root profile README must include the output directory prefix. Only the most recent run's generated files are listed, even when old SVGs remain on disk. The root README displays both themes directly. Test cases also cover 1, 7, 12 and 30 languages, long labels, both themes and chart layouts.

## CI

On pull requests and pushes to `main`, CI runs syntax checks, unit tests, deterministic gallery checks (including the generated output README), demo SVG generation, and a **live public GraphQL** smoke test of the composite Action. The live SVGs and generated gallery README are produced with `theme: all` and uploaded as temporary workflow artifacts for review. A separate verification step compares public non-fork primary-language counts against independently paginated GitHub REST repository data. GitHub's commit-contribution metric is validated using year-boundary, duplicate-year and 100-repository-window fixtures, not claimed to match raw REST commit counts. A successful CI run does **not** update the user's profile repository.

`npm run check` validates Node.js syntax; `npm run typecheck` runs strict TypeScript 7 static checking with Node.js 26 definitions. The `tsconfig.json` is for static analysis; Node.js executes .ts directly using native type stripping. Tests cannot guarantee that GitHub's API will always be reachable.

## Branches and pull requests

Use a short-lived feature/fix branch based on `main` and open a PR. The repository does not require a permanent `develop` branch. Do not merge without the maintainers' approval. See [CONTRIBUTING.md](../CONTRIBUTING.md) and the [shared GitHub Flow standards](https://github.com/naoiw/.github/blob/main/standards/GITHUB_FLOW.md).

In PR descriptions, explain changes to metric semantics and note which checks passed, including any untested environment-specific behavior. For visual changes, include a preview or reference the updated gallery files.

## Stable releases

Version `v1.1.0` adds the output-local gallery README and a browser-compatible donut SVG renderer. Workflows pinned to the immutable `@v1.0.0` tag still generate only SVGs; change their `uses:` reference to `@v1.1.0` after publishing. The moving `@v1` alias is promoted only after verification in an independent consumer. Commit SHA pinning remains available.

The initial release is published by the guarded workflow in `.github/workflows/publish-v1.yml` after it lands on `main`. That workflow runs static checks, unit tests, the public GitHub GraphQL Action smoke test, and the independent REST comparison **before** creating the `v1.0.0` release. It checks existing tags/releases and does not publish a new version on ordinary main pushes.

To publish v1.1.0, use the manually dispatched `.github/workflows/publish-v1.1.yml` workflow, **not** `publish-v1.yml`:

1. After the release-preparation PR is merged into `main` and CI passes, open **Actions → Publish GitHub Profile Cards v1.1.0 → Run workflow**. Choose the **main** branch, `operation: publish`, and enter `confirmation: v1.1.0`. The workflow checks syntax, types, tests, gallery consistency, live four-card + README output, and independent public REST metrics. It refuses to replace an existing version tag or release.
2. Test the published `uses: naoiw/github-profile-cards@v1.1.0` Action in an **independent consumer repository**. Verify four SVGs and output README, review GitHub rendering, commit/push and rerun idempotency. The release workflow does not replace this independent test.
3. After that test, run the same workflow on **main** with `operation: promote-v1`, `confirmation: v1.1.0`, and `consumer_verified: true`. It promotes the `v1` alias from its expected v1.0.0 target using force-with-lease, without rewriting immutable version tags. Tag protection may require separate permissions or approval.
4. Update caller workflows pinned to `@v1.0.0` separately if desired. The generator release does not modify `naoiw/naoiw`.

An ordinary main push never publishes v1.1.0. The legacy `publish-v1.yml` remains the one-time initial-release workflow. See the [v1.1.0 release notes](RELEASE_v1.1.0.md), [v1.0.0 notes](RELEASE_v1.0.0.md), and [changelog](../CHANGELOG.md).
