# Development

Required runtime: **Node.js 26** (.nvmrc and package.json engines).

Run:

    npm run check
    npm test
    npm run demo -- --username demo

The demonstration uses synthetic data and generates two SVGs under cards/. The GitHub API is never contacted by the demo. Real data requires an environment variable GITHUB_TOKEN.

Follow the GitHub Flow described by [naoiw/.github](https://github.com/naoiw/.github):
- Create a short-lived feature branch based on main.
- Run the relevant checks and open a PR.
- Merge only after review/approval.
- Do not create develop by default.

This MVP runs .ts files directly with Node.js 26's type stripping. It does not include a dedicated TypeScript type-checker; syntax checks and behavior tests are provided by CI. Static type checking can be added in a later iteration.

There is no application server, frontend, Vercel/Cloudflare deployment, or mandatory package install.
