# Changelog

All notable changes to GitHub Profile Cards are recorded here.

## [1.0.0] - 2026-11-21

Initial stable release.

- Generate GitHub language cards by primary language of public repositories and eligible commit contributions.
- Render donut and bar charts with dark/light themes; default `theme: all` generates four SVGs under `profile-card-output/{dark,light}/`.
- Support Top N language selection, `Others`, exclusions, archive filtering and GitHub-derived language colors.
- Provide accessible SVG descriptions, numerical labels and overflow protection for long names.
- Ship a reusable Node.js 26 GitHub Action, example consumer workflow and clickable README card previews.
- Add strict TypeScript checking, GraphQL unit tests and live REST comparison for repository-language metrics.
- Validate the workflow from an independent consumer repository.

See [v1.0.0 release notes](docs/RELEASE_v1.0.0.md) for usage and limitations.
