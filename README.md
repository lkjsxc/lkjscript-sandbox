# lkjscript-sandbox

A monorepo for applications, games, and experiments built with [lkjscript](https://github.com/lkjsxc/lkjscript).

This is a home for multiple independent projects, not another copy of the language implementation. Each project owns its source, runtime version, dependencies, tests, and local data. Traffic City is the first project; new projects can be added alongside it without adopting its build tools.

## Projects

| Project | Description | Runtime |
| --- | --- | --- |
| [Traffic City](projects/traffic-city/) | Browser city builder with native traffic, rail, economy, and persistence | lkjscript 0.1.77 |

## Layout

```text
projects/
  traffic-city/       # First independent project
    src/              # lkjscript declaration proposals
    web/              # Browser presentation and input
    examples/         # Authored cities, not player saves
    scripts/          # Project-specific build and runtime tooling
    tests/            # Native and browser regression tests
    project.sh        # Common task entry point
sandbox               # Small project/task dispatcher
scripts/              # Repository-wide checks
.github/workflows/    # Continuous integration
```

## Run Traffic City

On Linux x86-64, install Node.js 22+, npm, Bash, curl, tar, and `flock` (util-linux), then:

```sh
git clone https://github.com/lkjsxc/lkjscript-sandbox.git
cd lkjscript-sandbox
./sandbox traffic-city setup
./sandbox traffic-city build
./sandbox traffic-city run
```

Open **http://127.0.0.1:19140/?session_port=19141**. Stop the foreground launcher with Ctrl-C. Setup downloads the exact pinned public runtime and checks its archive and executable SHA-256. Node is a development tool, not a game server. Python is only needed for optional proposal regeneration or memory profiling.

```sh
./sandbox list
./sandbox traffic-city check
./sandbox traffic-city test
# Optional end-to-end browser suite:
(cd projects/traffic-city && npx playwright install chromium)
./sandbox traffic-city browser
```

Builds, installed tools, test evidence, and local saves are ignored by Git. A fresh clone starts with a fresh city store. This repository does not deploy or change an existing hosted preview.

## Add another project

Create `projects/<project-name>/` with a README and executable `project.sh`, then add it to the project table. The dispatcher discovers projects directly; no root dependency lockfile or framework is required. See [CONTRIBUTING.md](CONTRIBUTING.md) for the task interface, dependency boundaries, and publication rules.

## Status and licensing

These are experimental applications, not the lkjscript language's stability contract. See each project's README for supported environments and limitations. No repository-wide source license has been selected; publication alone is not a license grant. Third-party tools retain their own licenses.
