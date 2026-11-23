# Architecture and metric definitions

GitHub Profile Cards is a **Node.js 26 / TypeScript** CLI packaged as a composite GitHub Action. It produces self-contained SVG files, without a hosted API, browser UI, runtime npm dependencies, or a build step.

## Components

| Path | Responsibility |
| --- | --- |
| `src/github.ts` | Authenticated GitHub GraphQL requests, repository pagination, contributions by year |
| `src/core.ts` | Filtering, aggregation, colors, Top N/Others and SVG rendering |
| `src/cli.ts` | Command-line arguments, input validation, output files and demo data |
| `src/output-gallery.ts` | Manifest-based Markdown gallery, generated-file validation and deterministic output |
| `action.yml` | Reusable composite Action that runs the CLI with Node.js 26 |
| `examples/profile-workflow.yml` | Caller workflow that commits SVGs into the user's own profile repository |
| `scripts/gallery.ts` | Regenerates the fixed public-data light/dark gallery SVGs |
| `tests/core.test.ts` | Unit tests for metric definitions, labels, themes and safe markup |

## Data sources and definitions

### Languages by Repo

The GraphQL `user.repositories(ownerAffiliations: OWNER, isFork: false)` connection is paginated across all owned repositories. Each repository with a `primaryLanguage` counts **once** toward that language. Repositories with no primary language, forks and private repositories are not counted. Archived repositories are included unless excluded in settings.

### Languages by Commit

The GraphQL `user.contributionsCollection(from, to).commitContributionsByRepository` connection is queried for each reported contribution year. Contribution counts are accumulated by the **repository's primary language**. This is not a measurement of changed-line counts, file extensions, or languages actually modified within a commit.

Some eligible contributions can be in repositories owned by others; GitHub's visibility and contribution rules determine what GraphQL reports. The renderer excludes private repository rows.

GitHub limits `commitContributionsByRepository` to at most 100 repositories per time window. When a response reaches that cap, `src/github.ts` subdivides the window instead of silently losing part of the long tail. A window that cannot be fully retrieved causes an explicit error.

### Percentages, Top N and labels

The denominator for every percentage is the **complete included distribution**, not just the visible Top N. Named languages are sorted by contribution/repository count, then by name. When the number of languages exceeds `top-n`, the remainder can be combined as `Others`.

- Below the cap: `7 languages`, not `Top 12 · 7 languages`.
- Above the cap: `Top 12 of 17 languages + Others` (when Others is enabled).
- The donut center shows the **total number of repos/commits**, not a count of legend entries.
- Absolute counts and shares are in separately labeled columns.
- Positive shares too small to round to 0.1% are displayed as `<0.1%`. Values just below 100% may be shown as `>99.9%`.

## GitHub language colors

The GraphQL `primaryLanguage { name color }` field is the preferred source for both the language name and its color. **The tool does not maintain a whitelist of supported languages.** Names returned as a primary language can be counted even when they are unknown to the code.

SVG color values accept valid 3-digit or 6-digit hexadecimal colors (3-digit values are expanded). If the API supplies no valid color, the language is retained and displayed with neutral `#87929c`. The first valid color found for a language takes precedence over an earlier missing color. XML and SVG attributes are escaped/sanitized.

GitHub's own language detection is based on [Linguist](https://github.com/github-linguist/linguist); this project does not separately parse every source file and therefore does **not** claim to list every language used in each repository.

## Rendering and integration

`renderSvg()` supports `donut` and `bars`, and `dark` and `light` themes. SVG markup is self-contained (no external fonts, images, JavaScript, or token data). The Action and CLI default to `theme: all` and `output-dir: profile-card-output`. They query and aggregate data once per invocation, then render four SVG files:

- `<output-dir>/dark/languages-by-repo.svg`
- `<output-dir>/dark/languages-by-commit.svg`
- `<output-dir>/light/languages-by-repo.svg`
- `<output-dir>/light/languages-by-commit.svg`

Selecting `dark` or `light` produces only that theme's two files, always under its own theme subdirectory. The `chart` option (`donut` / `bars`) selects the chart layout independently.

The Action and CLI additionally generate `<output-dir>/README.md` as an inline preview gallery. The gallery is built from a manifest of files written in the **current run** rather than scanning output directories; stale files are not listed. Each referenced SVG is checked for existence. Paths are relative to the output README and the chosen chart style is labeled. The README content is deterministic and unchanged content is not rewritten.

### Verification and limitations

`npm run verify -- --username LOGIN` independently fetches a user’s public non-fork repositories through the REST API, compares each repository’s primary language with the GraphQL response, and checks the aggregate **By Repo** counts. The CI verification currently targets the public `naoiw` account. This catches omissions and mismatches without relying on the SVG renderer itself.

**By Commit cannot be compared to a raw `GET /commits` count.** GitHub defines contribution eligibility, user attribution, visibility and time windows independently of a repository commit listing. We instead test GraphQL pagination, year boundaries and repository-cap window splitting with controlled fixtures. This does not prove that every GitHub internal contribution rule is visible through the API.

### SVG layout safeguards

SVG legends use a display-width-aware ellipsis plus clip boundaries to keep long language names out of adjacent numeric and bar columns. Full language labels remain in SVG `<title>` elements. Large donut totals receive a reduced font size to avoid collisions. Donut slices use explicit SVG arc paths (and a plain circle for a 100% slice) rather than circle dash offsets, to avoid browser-specific artifacts for tiny shares. Renderer tests cover both chart styles and light/dark palettes.

The caller workflow decides whether/where to commit these files. This repository never directly modifies a user's profile.

The top-level README displays both style galleries from `profile-card-output/{dark,light}/`. They are frozen public-data snapshots generated for **all** themes by `scripts/gallery.ts`, along with `profile-card-output/README.md`, and checked in CI with `npm run gallery:check`. Local synthetic demos are kept in ignored `demo-output/` so they do not overwrite the gallery.
