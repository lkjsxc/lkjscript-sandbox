# Initial publication verification

## Confirmed locally

The initial import was built from a fresh project directory, without copying the former checkout's accepted graph, installed tools, or runtime stores. Setup downloaded lkjscript 0.1.77, verified its archive and executable SHA-256, and installed the locked npm development dependencies with `npm ci --ignore-scripts`.

The native build accepted all 39 proposal files and completed its check successfully: **162 tests passed, 0 failed, differential evaluators equal**. The check reported 4,816,991 production instructions and 3,186,376 reference expressions. The selected compiler SHA-256 is `5eaadae4df214f4c5eaa2d4407acab58574b56447307b5a77261b2b9ff7adb37`; this build's artifact SHA-256 is `883ef291fc9b0243b1e839f54067c236e44b3a535b9d69f50af890e3948e754f`. Runtime binaries and artifacts are not committed.

The repository checker passed on 164 versioned source/documentation files: project structure, JavaScript and shell syntax, JSON parsing, local Markdown links, and dispatcher rejection of invalid arguments. Ignore-boundary checks also confirmed that project-local runtime/tools/evidence outputs are excluded without hiding future source modules named src/runtime or src/tools.

The standalone motion-geometry test passed all 24 geometries. During the additional core regression run, all 22 independent weighted shortest-path comparisons and the correctness cases through bounded route-cache testing reported success. **Completion of the entire core/browser regression sequence was not observed because its result-retrieval tool call was blocked. Those complete suites are not claimed as passing here.** The repository's GitHub Actions workflow independently runs the native build, core suite, and isolated browser smoke test on pushes and pull requests; its actual result must be read from GitHub, not inferred from this document.

Before publication, Gitleaks 8.30.1 scanned an export of the versioned publication inputs with redacted reporting and found no leaks. This is a scan result, not a guarantee that all possible sensitive information can be detected. Runtime data, credentials, local settings, browser profiles, generated evidence, internal deployment records, and old private Git history were excluded by the import boundary.

## Preservation and limits

All 38 non-asset native proposal files and all three authored city layouts are byte-identical to the import source. The asset proposal was regenerated after the browser's private-host exception was removed. The source checkout's HEAD, remote configuration, tracked/untracked status, and 169 code/configuration file hashes were independently checked against the pre-import snapshot and were unchanged. The existing preview continued to return its native HTTP health response; no service deployment or user-data migration was performed.

This verification does not establish maximum-city performance, repeat all historical before/after comparisons, or claim compatibility with untested operating systems. Migration/upgrade comparisons need explicitly supplied predecessor artifacts, which are not part of the public source repository. This is a source publication, not a new hosted-game release.
