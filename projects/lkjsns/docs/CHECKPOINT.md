# lkjsns checkpoint — 2026-10-11

## Current released source

Application source `1a859236e9036f9e9900fd9d1161c59e9c97984f` was promoted to
the public native service on October 11, 2026 at 20:18:34 JST. The legacy service
is stopped and disabled. The temporary HTTPS tunnel was retained.

The selected application file SHA-256 is
`55745f7ead25bfff5bc33295876af0a8ef89ac262c8627fe346b2a023d634d03`.
The runtime is the checksum-pinned public lkjscript 0.1.89 executable, SHA-256
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.

Acceptance completed on that exact application bundle: 392 native tests,
65 grouped browser checks, 48 automated accessibility combinations with zero
violations, and 28 persistence checks across restart, offline restoration,
cross-build upgrade, and binary rollback. The repository publication check passed.
See [the release record](RELEASE.md) for the precise scope and qualifications.

## Connected implementation

Accounts, invitations, profiles, chronological posts, replies, following, muting,
Likes, bookmarks, drafts, and reusable media Drive are native lkjscript. Product
rendering and forms have no browser application JavaScript dependency.

`src/reading/conversation.lkjc` provides admitted original-post context and
reading-first reply destinations. `src/reading/activity.lkjc` provides filtered,
visibility-checked activity with bounded empty-window scanning. Profile headings
are distinct from navigation location. Product-owned UI text remains English.

Browser tests in `tests/browser` are optional development tools, not application
runtime dependencies. `./sandbox lkjsns browser` runs the core suites using an
installed Playwright package. Set `LKJSNS_AXE` to an installed `axe.min.js` to add
the automated accessibility audit. `tests/browser/upgrade.sh` checks a selected
candidate against a copied, stopped synthetic fixture and then the preceding
binary against the same data. It does not operate on public storage.

Source selection binds the complete native input set, CSS, operations scripts,
and configuration. Changed executable inputs require a new build. A test report
from another candidate is not sufficient for promotion.

## Scope and unfinished work

Legacy account/data migration is intentionally absent. Public state is separate
from all synthetic fixtures. The latest promotion preserved the new application's
state and retained a stopped-service snapshot.

A permanent hostname, account recovery, automatic draft saving, federation, media
transcoding, and location-metadata removal are not complete. Media HEAD remains
explicitly unsupported after authorization; GET and single ranges are verified.
There is no guarantee of physical erasure from all retained copies.

The [release record](RELEASE.md) supersedes the earlier candidate-only checkpoint.
Keep runtime data, private evidence, owner invitations, and machine-specific
operator details out of the public repository.
