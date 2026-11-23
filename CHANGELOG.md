# Changelog

All notable changes to GitHub Profile Cards are recorded here.

## [Unreleased]

- Fix browser-specific donut SVG rendering artifacts by replacing dash-offset slices with explicit SVG arcs (#17, #18).
- Add an automatically generated, output-local `README.md` that previews cards from the current run, with relative SVG links, theme grouping, and chart-style labels (#19, #20).
- Avoid rewriting unchanged gallery Markdown and omit stale files from the generated preview.

These changes are in source / PRs only until a new release is published; `v1.0.0` remains unchanged.

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
