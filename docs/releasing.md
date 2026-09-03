# Releasing github-profile.sh

Maintainer process for a public release. Do not put credentials in this file.

The current CLI version is `1.0.0`. `0.1.0` is already on npm and must not
be republished. The Action is consumed from this repository by git tag,
not from npm.

## Before the tag

1. Confirm `main` is green on CI.
2. Confirm `packages/cli/package.json` is `1.0.0` and matches
   `cli.version(...)` in `packages/cli/src/cli.ts`. Do not publish
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
   git tag -a v1.0.0 -m "v1.0.0"
   ```

8. Push only that tag yourself:

   ```bash
   git push origin v1.0.0
   ```

9. The **Release** workflow runs on `v*.*.*` tags. It:

   - runs `pnpm release:check`;
   - checks that `v1.0.0` matches `packages/cli` version `1.0.0`;
   - publishes `github-profile-sh` with `npm publish` from `packages/cli`;
   - creates a GitHub Release with generated notes.

10. Verify npm (`npm view github-profile-sh version`) and the GitHub Release.

The workflow creates the GitHub Release with `--generate-notes`. Curated
notes for this version are in `docs/releases/v1.0.0.md`; edit the GitHub
Release body if you want those instead of the generated commit list.

Do not push `v1` as the release tag. That pattern would not match
`v*.*.*` anyway, and must not publish npm.

## After the first release: movable `v1`

Generated user workflows use `angelabenavente/github-profile-sh@v1`.

Do **not** create or move `v1` from CI. After `v1.0.0` is tagged and you
want `@v1` to resolve:

```bash
git tag -f v1 v1.0.0
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
