# lkjsns checkpoint — 2026-10-11

This checkpoint supersedes the earlier unexecuted workflow sketches and the
local-only usable-core checkpoint. Legacy data migration is not part of the new
application. The owner explicitly authorized replacing the old service.

## Accepted release candidate

The candidate uses the checksum-pinned public lkjscript 0.1.89 executable, SHA256
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.
The detached application file SHA256 is
`a2f6846f9b78163e9da9c5b7ebbf027d0e1f312ce3989513c6ae82e041067c54`.
The graph revision is
`rev_d4b39265aab9ec63d63508fbc1ef57e5deca20089684a23d728ccb914623a95e`.
The internal artifact identity is
`artifact_bundle_46ef8fa47e84000620c20cf65165c0249632492a33a6b0306db85edc27d96bbc`.
The bundle contains 7,143,196 bytes. Internal artifact identity and file SHA256 are
different identifiers and are not interchangeable.

Native verification passed 358 tests, zero failed, with equal production/reference
outcomes. A fresh loopback store then passed 50 grouped browser checks: 12 account,
17 content/media, 8 reading-context and 13 responsive/security checks. Layout
coverage includes six authenticated pages at 320, 390, 768 and 1440 CSS pixels in
light and dark mode. This is not full accessibility certification or a load test.

After stopping that server, the complete synthetic data/object store was copied to
an independent directory. A cold restart and the independent restored copy each
passed seven persistence checks, including fresh sign-in, retained administration,
a Members post, PNG/video/audio byte equality and continued guest access denial.

The local evidence is under `.build/browser-7WKHxN1M`; build receipts are under
`.build/acceptance/build-release.log`. Test source hashes were recorded before the
fresh suite. Generated logs, screenshots, stores, binaries and credentials are not
versioned. No synthetic fixture is eligible for public deployment.

## Deliberate corrections and remaining limits

All product-owned UI copy is English. Reading actions retain their collection,
cursor and article anchor. The browser-origin defect caused by no-referrer was
fixed with same-origin; strict Host, Origin and CSRF enforcement was not relaxed.

Media HEAD exposed a native-runtime representation-length limitation. It now
returns an explicit 405 after authorization rather than a misleading 200 with a
zero Content-Length. GET and single-range delivery were verified with exact bytes.
This is a documented unsupported capability, not claimed HEAD conformance.

Upload originals retain metadata; there is no transcoding, thumbnail service,
federation or email recovery. See [interaction and media decisions](ENGLISH-READING.md).

## Publication

Public service replacement is a separate operation from this accepted candidate.
Record its verified outcome in RELEASE.md; do not infer exposure from a build,
loopback server, source commit or branch push.
