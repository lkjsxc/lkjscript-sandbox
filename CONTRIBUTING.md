# Working in the sandbox

## Project boundaries

Use `projects/<lowercase-kebab-name>/` for each independently runnable application, game, demo, or experiment. A project owns its README, source, version pins, dependency lockfiles, tests, and runtime settings. Do not nest another Git repository or submodule inside it. Do not import the lkjscript language repository or patch a compiler as part of application work.

The root `sandbox` script only dispatches to the selected project's `project.sh`. It does not require Node, Python, or any language-specific workspace manager. Implement these tasks in each project: `setup`, `build`, `check`, `test`, and `run`. Add optional tasks such as `browser` when useful. Reject unknown tasks rather than evaluating arbitrary command strings. Document required tools, local URLs, persistence, and cleanup behavior.

To add a project, create its directory and task entry point, document a fresh-clone workflow, add one row to the root project table, and add a project CI job. Do not create empty placeholder projects or a speculative shared framework. Extract genuinely shared code only after multiple projects need the same behavior.

## Reproducibility

Pin the runtime per project; projects need not upgrade together. Verify downloaded tool checksums. Keep accepted sources and test results associated with the exact runtime and built artifact. Use project-local stores and temporary ports in tests. Rebuilding is not a deployment. Never restart a hosted preview simply to test a source import.

## Publication boundary

Publish source, synthetic fixtures, and safe documentation. Do not commit tokens, local configuration, credentials, player saves, browser profiles, native store backups, machine-specific deployment records, generated reports, or downloaded binaries. Review staged paths and scan for secrets before pushing. The root ignore rules cover common generated/private directories; they are not a substitute for review.

Use ordinary commits and pushes. Preserve unrelated work and user data. No force-pushes. Source licensing is separate from making a repository public; do not silently apply a license to imported code.

## Checks

```sh
bash -n sandbox projects/traffic-city/project.sh
node scripts/check-repository.mjs
./sandbox traffic-city check
./sandbox traffic-city test
```

CI runs repository checks plus Traffic City's pinned native build, core regressions, and an isolated browser smoke test. Longer scaling workloads and historical before/after comparisons are opt-in; their inputs and limits are described in the project README.
