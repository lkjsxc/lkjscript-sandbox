# lkjsns checkpoint — October 13, 2026

## Current public application

The community UX release is live through
[Coder public port 8793](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
Promotion completed at **2026-10-13 00:24:41 JST**. The existing native account,
post, session, and object data was preserved with a stopped-service snapshot.
No synthetic store was deployed. The custom domain remains a read redirect.

Executable source: `1656119117b6de975daeed9c01d46cc74f07f652`

Application SHA-256: `f1ac426364ebc7f9ba28ee4b21a101b5690454d47a91dbd98abfcb7174f0e451`

Pinned executable: lkjscript 0.1.89,
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.

The exact bundle passed **450 native tests**, **60 synthetic browser groups**,
96 responsive combinations, seven automated accessibility pages with no reported
violations, exact 256 MiB upload/download integrity, and native restart/resumption.
Read-only public acceptance passed 24 groups. Public checks are not described as
authenticated production upload tests. See [RELEASE.md](RELEASE.md) for the complete
scope, identities, measurements, and cutover evidence.

## Connected implementation

Primary navigation separates reading from Settings, private Drive, and drafts.
Profile/password settings and Invitations have real child pages; Admin is an
overview. Composer focus/borders, persisted audience, grouped save actions,
content-first preview, Attention, post-card navigation, and in-page delete
confirmation are connected. Cancelling deletion retains unsubmitted writing.
Native confirmation pages and core forms still work without JavaScript.

Drive accepts arbitrary file types up to 256 MiB, uses private multi-tags instead
of a folder UI, and offers directly visible file deletion. Profile-image selection
has a separate public avatar rule without exposing private originals. Query-only
search checks current readability and excludes unpublished/deleted/muted content.

`preferences`, `tags`, `identity`, `searchtext`, and `searchview` own additive native
metadata and views. `transfers` contains bounded part plans, native object I/O,
admission/finalization, and range download. Part writes and deletion stay outside
retried metadata transactions. A bounded optimistic metadata-only retry prevents
preference/post overlap from spuriously losing a submission; stale versions still
require explicit recovery.

The source manifest includes all native fragments, CSS, both browser scripts,
operations scripts, and the deployment descriptor. Changed executable inputs
require a fresh native build. `tests/ux/run.sh`, reached through the normal browser
command, is the current optional release suite. Legacy tests/browser UI suites
are historical rather than implicitly compatible with the redesign.

## Operations and next boundaries

Keep the exact Coder Host/Origin and port 8793. Do not reintroduce the stopped
Cloudflare tunnel units through systemd dependencies. Preserve the current store,
objects, and secret during promotion. The old binary cannot read new chunk-backed
files; do not improvise an old-binary rollback against a post-release store.

General autosave, account recovery, federation, transcoding/metadata stripping,
and ranked/fuzzy search remain separate future work. Browser transfer resumption
requires the current page/file handle. The application logo is unchanged pending
the original lkjsxc image; profile-image settings are already implemented.

Keep operator paths, snapshots, credentials, and private test evidence out of Git.
[RELEASE.md](RELEASE.md) is the deployment authority;
[COMMUNITY-UX.md](COMMUNITY-UX.md) records the design/transport boundaries.
