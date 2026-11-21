# GitHub Profile Cards v1.0.0

Initial stable release of **GitHub Profile Cards**, a reusable composite GitHub Action that generates SVG language statistics for a GitHub profile using **Node.js 26** and TypeScript.

## Included

- **Languages by Repo**: number of owned, public, non-fork repositories by their GitHub primary language.
- **Languages by Commit**: GitHub commit-contribution counts grouped by each repository's primary language.
- **Two chart layouts**: `donut` and `bars`.
- **Both color themes**: `theme: all` by default; generates `dark` and `light` cards together using one data retrieval.
- **Four SVG files** by default under `profile-card-output/{dark,light}/`.
- **Long-tail languages**: up to 30 named languages plus optional `Others`. GitHub language colors with safe fallback for missing colors.
- **Readable cards**: explicit absolute counts and share columns, accurate small-percentage labels, overflow-safe language names and dynamic donut totals.
- **Reusable workflows**: outputs are committed by the caller's workflow, not by the generator Action. README examples show clickable cards linking back to this project.

## Verification

- Strict TypeScript static checking, unit tests and deterministic preview verification on Node.js 26.
- Independent comparison of public non-fork repository languages between GitHub GraphQL and REST APIs.
- Successful **independent repository invocation** from [naoiw/cards-test](https://github.com/naoiw/cards-test) using `theme: all`, including four-file output validation, git commit/push and an idempotent rerun.
- Release tag is checked by a separate consumer smoke test before the release Issue is closed.

## Important limitations

- **By Commit does not count programming languages in changed files.** It assigns eligible GitHub contributions to each repository's **primary language**.
- GitHub's contribution eligibility, permissions and privacy rules govern counts. Private repository data is excluded.
- This is a GitHub Action / CLI, not a hosted web API. To update cards, run the included workflow on your profile repository.
- Requires GitHub-hosted (or compatible) runners capable of using **Node.js 26**.

## Usage

To stay on this exact release:

```yaml
- uses: naoiw/github-profile-cards@v1.0.0
  with:
    username: ${{ github.repository_owner }}
    theme: all
    output-dir: profile-card-output
```

The `v1` major-version alias is also available for users who want compatible v1 updates. The `@v1.0.0` example provides a fixed version.

See the [README](https://github.com/naoiw/github-profile-cards) for setup, generated paths and theme-switching profile embed examples.
