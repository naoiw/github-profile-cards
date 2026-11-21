# GitHub Profile Cards

A configurable, standalone **GitHub profile language card generator** written in TypeScript and run on **Node.js 26**. No web hosting, application deployment, npm dependencies, or build step required.

Inspired by the GitHub GraphQL acquisition strategy in [github-profile-summary-cards](https://github.com/vn7n24fzkq/github-profile-summary-cards). Aggregation and SVG rendering here are independent.

## Features

Generates two SVG cards:

| SVG | Metric |
| --- | --- |
| cards/languages-by-repo.svg | Number of owned non-fork repositories, grouped by primary language |
| cards/languages-by-commit.svg | GitHub commit contributions assigned to each repository's primary language |

**By Commit is not a changed-file language analysis**. It counts eligible commit contributions by the primary language of the repository. This matches the original Summary Cards concept.

Both cards support:
- Configurable **Top N (1–30)**; default Top 12, plus **Others** for the long tail
- Donut or horizontal-bar layouts
- Dark or light themes
- Whole-distribution percentage denominators

Private repositories are excluded by design. Archived repositories are included unless explicitly excluded via CLI. Stars, profile growth, and time-of-day graphs are out of scope.

## Use from another GitHub repository

No hosted service is required. Copy [examples/profile-workflow.yml](examples/profile-workflow.yml) into the profile repository as .github/workflows/profile-cards.yml.

The example:
1. Uses this repository as a reusable **composite Action**.
2. Runs TypeScript directly under Node.js 26.
3. Fetches data with GitHub GraphQL.
4. Commits the generated SVG files into the caller's repository on a schedule.

Once the workflow has run successfully, put these images in your profile README:

    ![Languages by Repo](./cards/languages-by-repo.svg)
    ![Languages by Commit](./cards/languages-by-commit.svg)

For now the example references the Action's @main branch. For production usage pin to an audited commit SHA or release tag once available. The calling job needs contents: write to commit SVG files. The Action itself never pushes files.

The Action attempts the caller job's GitHub token for public GraphQL data. If that token is insufficient, provide a token with appropriate read permissions using the optional Action input named token. Keep secrets in GitHub Actions secrets, never in source.

## Local use

Requires Node.js 26 (.nvmrc). Native TypeScript type stripping is used.

Run tests and generate **synthetic example data** (not real user metrics):

    npm run check
    npm test
    npm run demo -- --username demo

For real data, export GITHUB_TOKEN and run:

    npm run generate -- --username naoiw --top-n 12 --chart donut --theme dark --output-dir cards

| CLI option | Default | Meaning |
| --- | --- | --- |
| --username | GITHUB_REPOSITORY_OWNER | GitHub account |
| --top-n | 12 | Number of named languages, 1–30 |
| --chart | donut | donut / bars |
| --theme | dark | dark / light |
| --output-dir | cards | Relative output directory |
| --hide-others | false | Hide the long-tail Others category |
| --exclude-archived | false | Ignore archived repositories |
| --exclude-repos | empty | Comma-separated repo names or owner/repo |
| --exclude-languages | empty | Comma-separated language names |
| --demo | false | Generate synthetic test results without GraphQL |

The Action exposes username, token, top-n, chart, theme, output-dir, hide-others, exclude-archived, exclude-repos and exclude-languages. Both the Action and CLI use identical aggregation rules.

## Preview from CI

The pull-request CI also runs the composite Action against public GitHub data (account: naoiw) and uploads the resulting two SVG files as a downloadable **language-cards-live-preview** artifact. This does not modify the profile repository. The sample metrics are regenerated at CI time.

## Development

- [Architecture and data semantics](docs/ARCHITECTURE.md)
- [Development and verification](docs/DEVELOPMENT.md)
- [Shared repository standards](https://github.com/naoiw/.github)

MIT License (see LICENSE).
