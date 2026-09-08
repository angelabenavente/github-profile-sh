# github-profile.sh

Turn your GitHub profile into an animated terminal.

Choose your stats, theme, and animation style. github-profile.sh renders a
standalone SVG and keeps it updated with GitHub Actions — no backend,
database, or tracking.

[![CI](https://github.com/angelabenavente/github-profile-sh/actions/workflows/ci.yml/badge.svg)](https://github.com/angelabenavente/github-profile-sh/actions/workflows/ci.yml)

![github-profile.sh](./examples/github-profile.svg)

## Quick start

Run this from your public GitHub Profile README repository
(`USERNAME/USERNAME`):

```bash
npx github-profile-sh init
```

The wizard asks for stats, theme, animation, and update frequency. It writes
`github-profile-sh.yml` and `.github/workflows/github-profile-sh.yml`.

Add this to your profile `README.md`:

```md
![github-profile.sh](./github-profile.svg)
```

Then commit and push. The SVG is generated the next time the workflow runs.
You can trigger it immediately from the Actions tab.

## Examples

These examples use the same fictional profile data. Only the config changes.

### Dark

Default config (`theme: dark`, typing). Existing configs that omit `theme`
keep this look.

```yaml
sections:
  repos: true
  stars: true
  streak: true
  codeChanges: true
  languages: true

theme: dark

animation:
  enabled: true
  mode: typing

update:
  frequency: daily
```

**Result**

![Dark example](./examples/github-profile.svg)

### Matrix

```yaml
sections:
  repos: true
  stars: true
  streak: true
  codeChanges: true
  languages: true

theme: matrix

animation:
  enabled: true
  mode: typing

update:
  frequency: daily
```

**Result**

![Matrix example](./examples/matrix.svg)

### Ubuntu

Same product, a different palette and animation (`sequential` instead of
typing).

```yaml
sections:
  repos: true
  stars: true
  streak: true
  codeChanges: true
  languages: true

theme: ubuntu

animation:
  enabled: true
  mode: sequential

update:
  frequency: daily
```

**Result**

![Ubuntu example](./examples/ubuntu.svg)

## Themes

Themes are built-in palettes. The default is `dark`. The CLI writes the
selected theme ID to `github-profile-sh.yml`:

```yaml
theme: ubuntu
```

There is no custom color API. Opening a README does not load themes from
this project.

The gallery below uses the same stats and `animation.mode: none`, so the
palettes are easy to compare.

| Dark                                | Light                                 |
| ----------------------------------- | ------------------------------------- |
| ![Dark](./examples/themes/dark.svg) | ![Light](./examples/themes/light.svg) |

| GitHub Dark                                       | Ubuntu                                  |
| ------------------------------------------------- | --------------------------------------- |
| ![GitHub Dark](./examples/themes/github-dark.svg) | ![Ubuntu](./examples/themes/ubuntu.svg) |

| macOS                                 | Matrix                                  |
| ------------------------------------- | --------------------------------------- |
| ![macOS](./examples/themes/macos.svg) | ![Matrix](./examples/themes/matrix.svg) |

| Dracula                                   | Nord                                |
| ----------------------------------------- | ----------------------------------- |
| ![Dracula](./examples/themes/dracula.svg) | ![Nord](./examples/themes/nord.svg) |

| Tokyo Night                                       | Catppuccin                                      |
| ------------------------------------------------- | ----------------------------------------------- |
| ![Tokyo Night](./examples/themes/tokyo-night.svg) | ![Catppuccin](./examples/themes/catppuccin.svg) |

| Gruvbox                                   | Monokai                                   |
| ----------------------------------------- | ----------------------------------------- |
| ![Gruvbox](./examples/themes/gruvbox.svg) | ![Monokai](./examples/themes/monokai.svg) |

| Solarized Dark                                          | Solarized Light                                           |
| ------------------------------------------------------- | --------------------------------------------------------- |
| ![Solarized Dark](./examples/themes/solarized-dark.svg) | ![Solarized Light](./examples/themes/solarized-light.svg) |

| Amber                                 | Retro Green                                       |
| ------------------------------------- | ------------------------------------------------- |
| ![Amber](./examples/themes/amber.svg) | ![Retro Green](./examples/themes/retro-green.svg) |

### Theme reference

| Theme ID          | Name            |
| ----------------- | --------------- |
| `dark`            | Dark            |
| `light`           | Light           |
| `github-dark`     | GitHub Dark     |
| `ubuntu`          | Ubuntu          |
| `macos`           | macOS           |
| `matrix`          | Matrix          |
| `dracula`         | Dracula         |
| `nord`            | Nord            |
| `tokyo-night`     | Tokyo Night     |
| `catppuccin`      | Catppuccin      |
| `gruvbox`         | Gruvbox         |
| `monokai`         | Monokai         |
| `solarized-dark`  | Solarized Dark  |
| `solarized-light` | Solarized Light |
| `amber`           | Amber           |
| `retro-green`     | Retro Green     |

Names such as Ubuntu, macOS, and GitHub Dark are inspired by familiar
terminals. They are not official or affiliated palettes.

## Configuration

`github-profile-sh.yml` is the source of truth. The checked-in default
sample is `examples/github-profile.yml`.

| Key         | What it controls                                   |
| ----------- | -------------------------------------------------- |
| `sections`  | Which public stats to include                      |
| `theme`     | Built-in palette. Default: `dark`                  |
| `animation` | Playback style (`typing`, `sequential`, or `none`) |
| `update`    | Used by `init` to write the workflow schedule      |

A default file looks like this:

```yaml
sections:
  repos: true
  stars: true
  streak: true
  codeChanges: true
  languages: true

theme: dark

animation:
  enabled: true
  mode: typing

update:
  frequency: daily
```

## Available stats

Any of these public metrics can be included:

- **repos** — public repositories you own
- **stars** — stars across those repositories
- **current streak** — consecutive days with contributions
- **code changes** — additions plus deletions from GitHub contributor stats
- **top languages** — language mix across those repositories

If contributor stats are incomplete for some repositories, code changes is
shown as an approximation (`~8.4k`).

## Animation

- `typing` — types the command, then reveals each line
- `sequential` — reveals the command and lines in order, without typing
- `none` — static terminal (no playback)

`animation.enabled: false` is treated as `none`.

## Update frequency

| Config    | Meaning        |
| --------- | -------------- |
| `12h`     | Every 12 hours |
| `daily`   | Once a day     |
| `weekly`  | Once a week    |
| `monthly` | Once a month   |
| `manual`  | Manual only    |

Every generated workflow includes `workflow_dispatch`, so you can always run
it from the Actions tab.

`update.frequency` is only used by `github-profile-sh init` when it writes
the workflow. The Action does not read it while rendering an SVG.

## Manual GitHub Action setup

If you prefer not to use the CLI, add the same two files yourself. The
generate step is:

```yaml
- name: Generate profile
  uses: angelabenavente/github-profile-sh@v1
  with:
    config: github-profile-sh.yml
    output: github-profile.svg
    token: ${{ github.token }}
```

| Input    | Default                 | Description                             |
| -------- | ----------------------- | --------------------------------------- |
| `config` | `github-profile-sh.yml` | Path to the config file                 |
| `output` | `github-profile.svg`    | Path of the generated SVG               |
| `token`  | required                | Token used to fetch public profile data |

The workflow generated by `init` also checks out the repo and commits
`github-profile.svg` when it changes.

The Action reads `theme` from the config file. Do not pass a theme input.

## Multiple SVGs

You can split a profile into more than one terminal block. Use the same
Action more than once in a single workflow, each time with a different
`config` and `output`. You do not need two workflows.

`github-profile-sh init` still writes one config and one generate step.
Add extra files by hand.

In your profile repository:

```text
github-profile-main.yml
github-profile-languages.yml
github-profile.svg
github-languages.svg
.github/workflows/github-profile-sh.yml
```

Each config is a normal `github-profile-sh.yml`. This repository keeps a
generated copy in `examples/multi-svg/`.

### Main stats

Ubuntu theme, typing, languages off (`examples/multi-svg/main.yml`):

```yaml
sections:
  repos: true
  stars: true
  streak: true
  codeChanges: true
  languages: false

theme: ubuntu

animation:
  enabled: true
  mode: typing

update:
  frequency: daily
```

**Result**

![Main stats](./examples/multi-svg/main.svg)

### Languages

Matrix theme, sequential, only top languages
(`examples/multi-svg/languages.yml`):

```yaml
sections:
  repos: false
  stars: false
  streak: false
  codeChanges: false
  languages: true

theme: matrix

animation:
  enabled: true
  mode: sequential

update:
  frequency: daily
```

**Result**

![Top languages](./examples/multi-svg/languages.svg)

### Workflow

Keep one job. Invoke `angelabenavente/github-profile-sh@v1` twice, then
commit both SVG paths explicitly. A complete sample is
`examples/multi-svg/workflow.yml`.

```yaml
- name: Generate main profile
  uses: angelabenavente/github-profile-sh@v1
  with:
    config: github-profile-main.yml
    output: github-profile.svg
    token: ${{ github.token }}

- name: Generate languages
  uses: angelabenavente/github-profile-sh@v1
  with:
    config: github-profile-languages.yml
    output: github-languages.svg
    token: ${{ github.token }}
```

The commit step should add only those outputs:

```bash
git add github-profile.svg github-languages.svg
```

If both configs set `update.frequency`, pick one schedule for the workflow.
The Action ignores that field.

Each invocation fetches public GitHub data on its own.

### README

```md
## Stats

![GitHub stats](./github-profile.svg)

Some text between both blocks.

## Languages

![Top languages](./github-languages.svg)
```

## How it works

```text
github-profile-sh.yml
  sections + theme + animation + update
        ↓
GitHub Action
        ↓
public GitHub data
        ↓
terminal renderer
        ↓
github-profile.svg
        ↓
profile README
```

There is no hosted backend. The SVG lives in your repository. GitHub
Actions regenerates it on the schedule you choose. Viewing the README does
not call this project.

## Requirements

- A public [GitHub Profile README](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme) repository
- GitHub Actions enabled on that repository
- Node.js 24+ only if you run the CLI locally

## Limitations

- Only public profile data is used. Private repositories are not included.
- Repos and stars count every public repository you own, including forks.
- Code changes depends on GitHub contributor statistics. Large repositories
  can return partial data; the value is then prefixed with `~`.
- The SVG is static. It is not regenerated when someone views the README.
- Multiple Action steps in one workflow each fetch GitHub data independently.

## Development

```bash
pnpm install
pnpm test:run
pnpm lint
pnpm format:check
pnpm typecheck
```

Rebuild the committed Action bundle after changing Action or core source:

```bash
pnpm build:action
```

Build the publishable CLI bundle:

```bash
pnpm build:cli
```

Regenerate the versioned SVGs and example configs in `examples/`:

```bash
pnpm examples:generate
```

## License

The software is MIT. Generated profile SVGs are CC BY 4.0. See
[LICENSE](./LICENSE).
