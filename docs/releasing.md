# Releasing github-profile.sh

Maintainer process for a public release. Do not put credentials in this file.

The first public release is `0.1.0`. The CLI package is already at that
version. The Action is consumed from this repository by git tag, not from npm.

## Before the tag

1. Confirm `main` is green on CI.
2. Confirm `packages/cli/package.json` is `0.1.0` (already true for v0.1).
   On later releases, update that version and `cli.version(...)` in
   `packages/cli/src/cli.ts` so they stay in sync. Do not publish
   `@github-profile-sh/core`. Keep root `LICENSE` and
   `packages/cli/LICENSE` identical (`MIT`, plus the CC BY 4.0 note for
   generated SVGs).
3. Run `pnpm install` if lockfile changes are required.
4. Run `pnpm release:check`.
5. Commit any intended release changes yourself.
6. Push the commit yourself.

`release:check` never commits, tags, or publishes.

## Tag and publish

7. Create the annotated tag yourself, matching the CLI version:

   ```bash
   git tag -a v0.1.0 -m "v0.1.0"
   ```

8. Push only that tag yourself:

   ```bash
   git push origin v0.1.0
   ```

9. The **Release** workflow runs on `v*.*.*` tags. It:

   - runs `pnpm release:check`;
   - checks that `v0.1.0` matches `packages/cli` version `0.1.0`;
   - publishes `github-profile-sh` with `npm publish` from `packages/cli`;
   - creates a GitHub Release with generated notes.

10. Verify npm (`npm view github-profile-sh version`) and the GitHub Release.

Do not push `v1` as the release tag. That pattern would not match
`v*.*.*` anyway, and must not publish npm.

## After the first release: movable `v1`

Generated user workflows use `angelabenavente/github-profile-sh@v1`.

Do **not** create or move `v1` from CI. After `v0.1.0` is tagged and you
want `@v1` to resolve:

```bash
git tag -f v1 v0.1.0
git push -f origin v1
```

Only do this deliberately. Later 0.1.x / 1.x patches can move `v1` the same
way, by hand.

## Secrets

Create a classic npm automation token and add it to the repository as
`NPM_TOKEN`. The workflow does not create this secret.

GitHub Release uses `GITHUB_TOKEN` from the job.

## If npm publish succeeds and GitHub Release fails

The npm version is already public and cannot be republished. Create the
GitHub Release by hand for that tag. Do not delete or reuse the npm version.

## What `release:check` covers

- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm build:cli`
- `pnpm test:run`
- Action bundle freshness (`pnpm build:action` then `git diff --exit-code -- dist`)
- Isolated CLI tarball install and `--help`
