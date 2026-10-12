# lkjsns checkpoint — 2026-10-12

## Current public release

The native writing/library release is live through
[Coder public port 8793](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
The user reaffirmed workspace hosting, and the previous Coder entrypoint was
restored on October 12, 2026 at **17:22:50 JST**. The app already ran in the
workspace; only listener/origin configuration and routing changed. The dedicated
named tunnel was stopped at 17:25 JST. The old domain redirects GET/HEAD visits
to Coder; the legacy app and quick tunnel remain stopped and disabled.
See [CODER-HOSTING.md](CODER-HOSTING.md) for the current operating contract.

Released source: `7a5d8032a2c5ff97f5407775b0f439e2cde70ec6`

Application SHA-256:
`60fce5fc6ec5b9acb52d061ccdabfdf62dafaf3ea2cbf42d4a94fa6ab28dba11`

Runtime: checksum-pinned public lkjscript 0.1.89, executable SHA-256
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.

The exact selected bundle passed 435 native tests, 77 grouped browser checks,
60 automated accessibility combinations with zero detected violations, and 44
persistence checks across restart, restoration, upgrade, and binary rollback.
The upgraded preceding store also passed 12 new-workflow checks. Shell and actual
native launcher checks were separate; see [RELEASE.md](RELEASE.md) for scope.

Public checks used HTTPS and read-only guest browsing: 16 page/theme/width
combinations, a private-route redirect, and exact stylesheet byte equality.
Authenticated acceptance stayed on isolated synthetic loopback stores.

## Connected implementation

Accounts, invitations, profiles, posts, replies, following, muting, Likes,
bookmarks, private drafts, and reusable image/video/audio Drive are native
lkjscript. Rendering and forms do not require application browser JavaScript.

`writingintents` and `writingview` provide save-before-media actions and an
owner-only saved-draft preview. `journalsubmit` separates submission/conflict
handling from the journal domain and view modules, avoiding an unnecessary
circular dependency in native review. Published attachment immutability remains.

`librarypath` validates picker filter context and local return locations. Drive
selection retains filters and pagination, shows a persistent selected-file tray,
and finds older ASCII-case-insensitive matches through bounded empty-window scans.

`origin.sh` and `live-run.sh` support the exact Coder HTTPS origin without an
application rebuild. The current unit has no dependency on either dedicated
tunnel. Do not reintroduce the stopped tunnel units through Wants or After.
Read the effective dependency set; empty assignments in a drop-in do not remove
existing dependencies.

## Evidence and source selection

`./sandbox lkjsns browser` runs the optional installed Playwright suites.
`tests/browser/restart.sh` checks restart or independent offline restoration.
`tests/browser/upgrade.sh` exercises the new flows on a preceding native fixture,
then checks the preceding binary against that updated data.
`tests/ops/native-origin.sh` checks the actual detached launcher on loopback;
`tests/ops/public-read.cjs` is a separate, write-blocked public guest smoke runner.

The manifest binds all native source inputs, authored CSS, operations scripts,
and the development descriptor. Executable-input changes need a fresh build.
Documentation/test-runner-only commits do not change the released source identity.

## Remaining priorities

Preserve the quiet chronological feed and the distinction between reading,
writing, and organizing reusable files. The next substantial usability needs are
reliable unsaved-input recovery, account recovery, and safer media handling.
Do not claim autosave, recovery codes, EXIF removal, transcoding, or cross-browser
support before those workflows are implemented and tested.

The Coder entrypoint is restored; legacy account/data migration is intentionally
absent. The native store was preserved with stopped-service snapshots. Keep all
credentials, operator paths, backup contents, and private execution evidence out
of the public repository. [RELEASE.md](RELEASE.md) is the current release authority.
