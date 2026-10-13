# lkjsns checkpoint — October 13, 2026

The quiet workflow release is live through the existing Coder public port 8793.
Promotion completed at **2026-10-13 17:42:02 JST** with existing accounts, posts,
metadata, files, and the original profile image preserved.

Executable source: `19786dac85341cf15bd68f67eec425f15caa7dec`

Application SHA-256:
`04d56071771afe60c2e64747e7659590218d16c53d451d84c5f96adb305d867a`

Runtime remains checksum-pinned lkjscript **0.1.89**. The exact candidate passed
**547 native tests**, **99 fresh synthetic browser groups**, **47 read-only public
groups**, and **8 public routing/security groups**. See [RELEASE.md](RELEASE.md)
for the exact source tree, graph, scope, preservation proof, and limitations.

## Current product contract

Keep the composer focused on Attach file and Post. Attachment transitions retain
text, content warning, audience, reply identity, and file selection privately,
without presenting a drafts feature, Save draft button, preview step, or normal
saving notices. Existing working copies and conflict input remain recoverable.

Desktop navigation includes More. Mobile has only Home, Post, Notifications,
More. Secondary destinations and service documents belong in More; actual
profile/security settings belong in Settings. About is not a fixed footer link.

Bookmarks are newest-bookmarked first. Next is feed-width and Prev restores an
exact bounded native cursor history. Reaction and selection forms preserve their
current list context. Used in reuses normal post cards with file-page returns.
Upload sits beside storage capacity, and file-card text has consistent padding.

Post links are native, escaped HTTP(S) anchors with new-tab opener/referrer
protection. Counts reflect directly readable replies and mark bounded incomplete
results honestly. Keep visibility, mute, suspension, deletion, and object access
checks intact. The textinput module owns SNS text admission instead of inheriting
the sample web editor's unrelated 4 KiB limit.

## Retained infrastructure and artwork

Keep exact Coder Host/Origin checks, native session/CSRF, port 8793, private tags,
4 MiB upload parts, 256 MiB file limit, and 2 GiB account allowance. Do not start
either disabled dedicated tunnel or promote test fixtures. Keep object effects
outside retried metadata transactions.

The personal four-panel/white-circle **lkjsns** favicon remains unchanged, with
content revision `b7cf1e2c2a49`. Original avatar bytes and all stored metadata and
objects were checked across this application-only replacement.

Read [quiet workflows](QUIET-WORKFLOWS.md),
[operator responsibilities](OPERATOR-RESPONSIBILITIES.md),
[the favicon contract](PERSONAL-FAVICON.md), and
[Coder hosting](CODER-HOSTING.md). Do not publish private receipts, fixtures,
credentials, internal snapshots, or user data.
