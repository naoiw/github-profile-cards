# Architecture

The project uses Node.js 26's stable native TypeScript type stripping. There are no runtime npm dependencies.

- src/github.ts: GitHub GraphQL API, pagination, yearly commit-contribution aggregation and range splitting.
- src/core.ts: primary-language counts, configurable Top N / Others, standalone SVG layouts.
- src/cli.ts: CLI argument validation and SVG file generation.
- action.yml: reusable composite Action which selects Node.js 26.
- examples/profile-workflow.yml: end-user workflow that commits its own generated output.

## Language semantics

**By Repo:** GraphQL repositories(ownerAffiliations: OWNER, isFork: false); all repository pages, counting each repository's primaryLanguage once. Forks and private repositories are excluded. Archived ones are included by default.

**By Commit:** GraphQL contributionsCollection.commitContributionsByRepository, queried across contribution years. Each repository's contribution count is attributed to that repository's primaryLanguage, **not the language of edited files**. Contributions to non-owned repositories can be included. GitHub's rules for what counts as a contribution and its visibility rules apply.

GraphQL returns at most 100 contribution repositories in a given time window. If that limit is reached, this project recursively divides the period to avoid silently hiding a long tail. It errors if an exhaustive result is impossible.

The full distribution is the percentage denominator, whether or not all categories are rendered. Others is the sum of hidden languages. SVG markup is escaped and self-contained, with no external script, font or image dependencies.

No code in this repository changes naoiw/naoiw. Users' workflows decide where to save and display the generated SVGs.
