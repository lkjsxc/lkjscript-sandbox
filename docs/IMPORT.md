# Initial Traffic City import

Traffic City was imported from the owner's independent development repository at commit `6e7383b4c39340b53c2858df7f9a4245ec08bac6` (tree `6e450db60cdfaa44ecece5fcb4222272d60a4fc8`). This is a **fresh public history**, not a copy of the old repository's private Git history. The existing checkout, uncommitted evidence, remotes, running preview, and player data are not changed by this import.

Included: native declaration proposals, browser assets, three authored example layouts, local build/runtime scripts, development-only source generators, and reusable tests. Native game behavior and save formats are retained. The asset proposal is regenerated after removing the browser's personal Coder-host exception. Build preparation now creates its ignored output directories on a fresh clone. Browser tools honor CHROMIUM or use Playwright's installed browser. The project package name and public documentation identify its new monorepo location.

Excluded: player saves, recovery keys, browser profiles, local runtime binaries/artifacts, native graph stores, runtime logs, screenshots/reports, internal delivery/deployment documents, historical operational probes, and unrelated projects. The old repository remains the private home of its historical records.

The exact public lkjscript dependency is **v0.1.77**, archive `lkjscript-x86_64-unknown-linux-musl.tar.gz`.

- Archive SHA-256: `bb68ed1aa32ea2a115fa1102858b92e366a1ffd0e2380574356ed5f3f7c42298`.
- Executable SHA-256: `5eaadae4df214f4c5eaa2d4407acab58574b56447307b5a77261b2b9ff7adb37`.

The installer verifies both. No language repository sources or release assets are republished here. Generators and profiling helpers may use Python as optional development tooling; the application server remains native lkjscript.

Builds and tests for this import are recorded in [VERIFICATION.md](VERIFICATION.md). A successful source publication does not mean an existing preview was deployed from this monorepo.
