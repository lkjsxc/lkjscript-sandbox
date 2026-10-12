# Community UX release — October 13, 2026

The community UX and bounded-media release was promoted to the existing Coder
service at **2026-10-13 00:24:41 JST** (2026-10-12T15:24:41Z).
[Open lkjsns](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
The application runs in the same Coder workspace on public port **8793**; the
custom domain remains a read-redirect alias. This record describes an actual
public cutover, not only a committed source tree or loopback candidate.

## Exact release identity

Executable source commit: `1656119117b6de975daeed9c01d46cc74f07f652`

Executable source tree: `2f00919b5d55ef0e9046504fa0bfb7824d760e84`

Application SHA-256: `f1ac426364ebc7f9ba28ee4b21a101b5690454d47a91dbd98abfcb7174f0e451`

Application size: **8,992,945 bytes**.

Pinned runtime: **lkjscript 0.1.89**. Runtime executable SHA-256:
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.

Selected native graph: `rev_7a7228fa47fe9351ca5896163c3fb94217cf841ad6c9a49b086735a235e5a9bb`

Internal bundle identity: `artifact_bundle_8b36e352199ccad3a9226ca32c624488aee02ab38cdd278c44b477d85599a5a1`

The internal bundle identity is not the file checksum. Subsequent release-record
commits do not change the executable source identity above. The feature commit
was normally fast-forwarded to main and its reference independently checked with
GitHub. The preceding application SHA-256 was
`60fce5fc6ec5b9acb52d061ccdabfdf62dafaf3ea2cbf42d4a94fa6ab28dba11`; its historical acceptance remains in
[the preceding writing/library record](RELEASE-WRITING-2026-10-12.md).

## Product changes

Primary navigation is Home, Search, Notifications, Bookmarks, and Settings.
The account identity opens its profile. Drive, Drafts, and Members are settings
destinations rather than primary navigation items. Profile, profile-image, and
password settings have child pages. Admin has an overview, with Invitations as a
child and an accurately labeled Admin entry.

The composer receives focus on entry, has a visible text boundary, and no longer
requires a redundant Your post label or a long audience explanation. The next
post remembers the chosen audience, including a changed audience followed by
navigation without saving a draft. Save draft, Save & preview, Save & choose
files, and Post share one action group; Upload belongs in the attachment picker.
A preview renders the actual post before its audience summary.

Delete post and Delete file lead directly to a confirmation. In supported
browsers a dialog preserves unsubmitted writing when cancelled. Native
confirmation pages remain available without JavaScript. Post-body clicks open
the permalink without taking over links, text selection, or media controls.
The reaction is Attention. Visible redundant Home, Notifications, and profile
headers are removed, as is the Refresh action. Feed/activity tabs have large
interactive areas.

Drive accepts all file types up to **256 MiB**. The chooser has no `accept` type
restriction, so it does not initially narrow the picker to a custom media list.
Private multi-tags replace the folder UI. Drive has no name/type/folder search
form. Filename and media-description editors are removed from the normal media
workflow; existing metadata is retained, and generic file downloads still keep
their original filenames. A file's Delete action is directly visible.

The single-query Search page finds readable published posts and, for signed-in
viewers, handles/display names. It preserves Unicode text and folds ASCII case.
Visibility is checked against current records: unpublished drafts, deleted posts,
and muted authors are not exposed. Profile images can be selected from owned,
ready, nonsensitive images up to 8 MiB. Their public avatar representation does
not grant access to the private original's generic media URL.

## Transfer implementation

A 256 MiB file uses **64 immutable 4 MiB parts**. Each part is admitted against an
owner-bound pending upload and acknowledged in native metadata. Finalization
requires every part. Object writes/deletes remain outside retried metadata
transactions. The whole file size is reserved against the existing 2 GiB account
allowance before parts are accepted.

Recognized images/audio/video can render inline. Unrecognized formats, including
text, HTML, SVG, and arbitrary binary files, are stored as safe downloadable
attachments with application/octet-stream, Content-Disposition, and nosniff.
Uploading alone never posts a file. Uploading from the picker attaches the
completed file to the saved draft and returns to writing, without publishing.

Full responses remain bounded to 32 MiB; ranges are bounded to 8 MiB. Larger full
requests lead to a native download screen whose browser control retrieves and
validates ranges. The portable browser fallback accumulates a Blob; supported
file-system writers save progressively. This avoids an invalid attempt to raise
the native transport descriptor to a 256 MiB HTTP envelope.

Authentication, authorization, search, settings, posts, tags, object operations,
and HTML rendering remain native lkjscript. Browser scripts handle interaction
conveniences and byte transfer. There is no Node/Python application server and
no paid external agent/API in this work.

## Acceptance on this exact bundle

| Verification | Observed result |
| --- | --- |
| Native tests | 450 passed, 0 failed; production/reference outcomes equal |
| Synthetic browser groups | 60 passed across accounts, writing, media, search, request security, transfer recovery, layout, large files, no-script operation, and restart |
| Responsive layout | 12 routes × 4 widths × 2 color schemes = 96 combinations; no horizontal overflow |
| Automated accessibility | 7 primary routes checked; 0 reported violations in the selected WCAG A/AA rules |
| Largest original | 268,435,456 bytes uploaded through 64 parts; 256 MiB + 1 byte rejected in browser and server |
| Download integrity | All 256 MiB returned, including cross-part ranges and the portable browser save path; SHA-256 matched |
| Interrupted transfer | Lost acknowledgement recovered without resending confirmed parts |
| Native restart | Profile, private tags, avatar, query results, audience and large-file access preserved; an incomplete upload resumed after restart |
| No-script operation | Native writing, preview, picker, multipart attachment, cancellation, deletion, and audience defaults passed |
| Native data verification | Synthetic retained store and stopped-service production snapshot verified |
| Repository publication | Syntax, tracked-path policy, documentation links, dispatcher checks, and staged credential-pattern review passed |

The 60 browser groups comprise 7 account, 7 writing, 7 media, 6 search, 6 request
security, 4 transfer-recovery, 10 layout/accessibility, 7 large-file, 3 no-script,
and 3 restart groups. The 96 layout combinations and accessibility pages are
included in those grouped checks, not an additional 103 independent test suites.

The deterministic 256 MiB fixture SHA-256 was
`3f13c3ef45598616756bcb55f8fb0a9fc2115ccdee314d03df82ce54beefbc17`.
In the final **loopback synthetic run**, browser upload took
**1,879 ms**; the sampled native-server peak RSS during
the measured large-transfer phase was **48,648 KiB**.
These are observations on the test host, not Internet throughput, a concurrency
benchmark, a memory guarantee, or physical-device/cross-browser certification.

The suite verifies private-media denial, ownership, Host/Origin/CSRF checks,
exact form schemas, stale-edit input retention, repeated transfer finalization,
wrong-size/out-of-order part rejection, post-delete access revocation, profile
image access, WAV/WebM browser metadata, and safe delivery of text/HTML/SVG/binary
and empty files. Tests run against private synthetic loopback stores, not live
user accounts. The older historical browser suites were not misrepresented as
newly rerun against the redesigned UI.

## Public cutover and preservation

Only the existing lkjsns public service was stopped and restarted. A quiescent
snapshot retained the exact preceding binary, bundle, descriptor, secret,
metadata, and object storage. All data/object file paths and SHA-256 values were
identical before and after replacing the application files. The bootstrap secret
and canonical origin were unchanged. No synthetic store was promoted, no user
account was reset, and no unrelated service or workspace was restarted.

The native runtime binary and all decoded capability grants are unchanged.
Application concurrency changes from eight to four tasks and the deadline from
120 to 300 seconds. The 768 MiB service memory limit stays in place. There is no
new tunnel dependency; the same 8793 Coder entry and custom-domain read redirect
were verified after the update. The restart is not a zero-downtime guarantee.

Read-only public Chromium acceptance passed **24 groups**: 20 guest page/theme/
width combinations, eleven private-route sign-in checks grouped together, exact
CSS and both script bytes, branded unavailable routes, and health/script checks.
It did not register a user or upload authenticated synthetic data to production.

A separate 4 MiB unauthenticated public POST reached the native transfer endpoint
and was rejected with 403, without reserving or publishing a file. This confirms
that the public proxy accepts the part-sized envelope. **The authenticated 256 MiB
round trip was verified on loopback, not against the public user store.**

## Remaining boundaries

Post saving is explicit; this is not general autosave or cross-tab draft recovery.
Transfer resumption in the browser requires the same page and selected file.
Files larger than 32 MiB require JavaScript for upload/full download. The native
core forms and small multipart fallback work without it.

Search is bounded literal substring search, not ranked/fuzzy/federated full-text
search. The router provides branded capture fallbacks for one through eight
nonempty path segments, not an arbitrary-depth transport fallback. Media HEAD
remains accurately unsupported with 405/Allow: GET. Originals are not transcoded,
compressed, or stripped of location metadata. Published post attachments remain
immutable; four attachments and 2 GiB total account storage are unchanged.

Core account/post/session/legacy-media record layouts are preserved, but the old
binary does not understand new chunk-backed media. After new writes, an old-binary
rollback is not claimed safe; recovery needs an explicit compatible strategy and
must not discard newer user data automatically.

The requested recolored lkjsxc-derived application logo is not included. The
existing application mark was retained pending an identified original image.
Profile-image configuration is implemented and tested independently.

See [the UX and architecture decisions](COMMUNITY-UX.md),
[operations](OPERATIONS.md), and [Coder hosting](CODER-HOSTING.md).
