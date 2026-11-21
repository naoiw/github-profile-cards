# Contributing to GitHub Profile Cards

Thanks for considering a contribution! Bug reports, test cases, documentation improvements, and SVG layout suggestions are welcome.

## Before you start

- Check [existing issues](https://github.com/naoiw/github-profile-cards/issues) and pull requests to avoid duplicating work.
- Open or reference an issue for substantial changes, particularly changes that affect the meaning of the statistics.
- Keep each PR focused. Do not change unrelated files, language definitions, or the public output contract without discussion.

## Development environment

- **Node.js 26** is required (see `.nvmrc` and `package.json`).
- The project is TypeScript, executed with Node's native type stripping.
- There are no runtime npm dependencies and no app deployment. Install development dependencies for static checking.

Run these commands before opening a PR:

```bash
npm install --no-audit --no-fund
npm run check
npm run typecheck
npm test
npm run demo -- --username demo
npm run gallery:check
```

`npm run demo` generates synthetic SVG files in the ignored `demo-output/{dark,light}/` directories without using GitHub credentials.

To test with real public data, set `GITHUB_TOKEN` in your **local environment** and run:

```bash
npm run generate -- --username YOUR_USERNAME --top-n 12 --theme all
```

Never commit tokens, raw private data, `.env` files, or sensitive account details. The CI runs the composite Action against a public GitHub account for integration coverage; tests may still be limited by GitHub API availability.

## Coding and data rules

- Keep TypeScript implementation small and dependency-light; add libraries only with a concrete justification.
- Maintain deterministic SVG output, valid XML escaping, safe colors, and useful accessible image descriptions.
- **By Repo** means counting repositories by their GitHub primary language.
- **By Commit** means grouping GitHub commit contributions by the repository's primary language, **not** by changed-file languages.
- Never silently drop rare languages, private-data visibility constraints, or missing GraphQL pages.
- Preserve CLI and Action inputs and output paths unless a breaking change is explicitly discussed.
- Add or update unit tests for aggregation and rendering changes. For changes to GraphQL repository collection, also run `npm run verify -- --username YOUR_USERNAME` with a read token and report whether the REST-based cross-check passed.
- If you change the sample card layout, run `npm run gallery` and commit the generated SVGs in `profile-card-output/{dark,light}/`. CI verifies that the snapshots are current.
- When embedding generated SVG cards in any README or Markdown documentation, make each card clickable and link it to `https://github.com/naoiw/github-profile-cards`. Use `[![Alt](path/to/card.svg)](https://github.com/naoiw/github-profile-cards)` for Markdown images, or wrap a `<picture>` element with `<a href="https://github.com/naoiw/github-profile-cards">` for theme-aware examples. This attribution belongs in the Markdown embedding, not inside the SVG artwork.
- Document any behavior change in README or `docs/`; avoid speculative feature descriptions.

## Pull request workflow

1. Create a short-lived branch from `main` (e.g., `feature/readable-legends` or `fix/graphql-pagination`).
2. Make focused changes and run the checks above.
3. Open a PR against `main`, linking related issues and including screenshots or SVG previews for visual changes.
4. Include the test results and any validation you could not run.
5. Wait for review and maintainers' approval. Contributors should not assume a PR will be merged automatically.

A permanent `develop` branch is not required. This repository follows the shared [naoiw GitHub Flow](https://github.com/naoiw/.github/blob/main/standards/GITHUB_FLOW.md) while this project-specific guide takes precedence when needed.

## License

By contributing, you agree that your contributions will be licensed under this repository's [MIT License](LICENSE). Third-party code or assets must respect their own license terms.
