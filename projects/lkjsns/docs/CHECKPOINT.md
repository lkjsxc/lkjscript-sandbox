# lkjsns checkpoint — October 13, 2026

The direct-interaction release is live through
[Coder public port 8793](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
Promotion completed at **2026-10-13 03:21:14 JST** with existing data preserved.

Executable source: `553ff649075c172b0e68bce9987b0bfd2df1ecd0`

Application SHA-256: `68f9ae90b43ec2e9be05c09569df4f0abdf307362ece12d2e187c10a019b27fb`

Runtime: the unchanged checksum-pinned lkjscript 0.1.89 executable.

## Current product contract

Drive is in the primary desktop/mobile navigation. Normal page names do not
appear as top banners; browser titles and assistive headings remain. Drafts are
whole-item native links. Attachment and avatar selection uses the preview itself,
not a second textual action strip. A linked parent preview replaces the explicit
original-post button. Redundant file/profile/reply shortcuts are removed.

Resource IDs live in `/<id>` paths, with `/edit` and `/raw` suffixes for operations.
Old resource query URLs redirect. The native router, not browser scripting,
distinguishes record kinds and enforces current access. Incoming query IDs never
overwrite path identity. Existing account/post/session/media records and IDs remain.

Invitation counts/durations no longer have 20/30 product caps. Blank count is
unlimited; blank duration never expires. Finite exhaustion and explicit revocation
still apply. Numeric parsing/expiry arithmetic remain checked. Existing finite
invitations continue to be recognized.

`paths`, `resources`, and `invitations` own these native primitives. The prior
native tagged Drive, bounded media parts, search, private previews, profile-image
privacy, explicit saving, and data/objects transaction separation remain intact.
No Node/Python application server or paid external execution was introduced.

## Verification and promotion

The exact bundle passed 472 native tests and 68 synthetic browser groups,
including the new direct-interaction suite, 256 MiB integrity, and cold restart.
Layout covered 96 combinations. Eight axe pages reported no selected-rule
violations. Public read-only verification passed 25 groups. See
[RELEASE.md](RELEASE.md) for identities, scope, and preserved-data cutover.

Use `tests/ux/run.sh` via the usual browser command for current optional local
acceptance. Test stores and credentials remain private. Public verification is
read-only and separate from authenticated loopback acceptance. Do not reintroduce
stopped tunnel dependencies; retain the exact Coder Host/Origin and port 8793.

A new browser script is delivered at the same no-store asset URLs; existing tabs
should reload to use the updated interaction and resource-address behavior.
Keep snapshots, credentials and private execution paths out of Git. See
[DIRECT-INTERACTIONS.md](DIRECT-INTERACTIONS.md) for lasting UI/routing choices.
