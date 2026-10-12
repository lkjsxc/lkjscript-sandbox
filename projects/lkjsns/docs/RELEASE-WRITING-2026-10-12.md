# lkjsns release — October 12, 2026

**Hosting correction, 17:22:50 JST:** The unchanged release is now hosted through
[Coder public port 8793](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
The custom domain redirects read requests there. The dedicated connector was
stopped at 17:25 JST; app and data checksums were preserved. The initial-release
record below describes the earlier deployment. See
[the verified Coder correction](CODER-HOSTING.md) for current routing and checks.

## Public release

The writing/library application was promoted at **2026-10-12 15:38:03 JST**
(06:38:03 UTC). Its initial public origin was
[https://lkjsns.lkjsxc.com](https://lkjsns.lkjsxc.com), now a redirect to Coder.

This is an actual public-service update, not only a source commit or local build.
The native application and its dedicated, remotely managed named tunnel were
verified running. The legacy standalone application and temporary-tunnel service
are stopped and disabled. Legacy data was not migrated. The newer native store
and its objects were preserved through promotion, with stopped-service snapshots.

Released source commit: `7a5d8032a2c5ff97f5407775b0f439e2cde70ec6`

Released source tree: `8345a7b95820220814a819fcfd9a0ad612ea06a8`

Application SHA-256:
`60fce5fc6ec5b9acb52d061ccdabfdf62dafaf3ea2cbf42d4a94fa6ab28dba11`

Application size: **7,902,878 bytes**.

Pinned runtime: **lkjscript 0.1.89**. Runtime executable SHA-256:
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`

Selected graph revision:
`rev_66b5e455d59099a6dc8325e7bfd5a1605c0eaa3f0ebc1c79565dd9b6185666a0`

Internal artifact identity:
`artifact_bundle_acad68f078030361e4787bdb60e30b47b4ad607d28327a01bf0ff53622fb179e`

The internal artifact identity is not the application file checksum. The source
was normally fast-forwarded to main and independently read back through GitHub.
Subsequent documentation and test-runner changes do not change this released
executable identity. The preceding release is archived in
[the October 11 record](releases/2026-10-11.md).

## Writing and library changes

The product-owned interface remains English throughout, including labels,
confirmations, errors, document language, and accessibility names. User-authored
content may use any language. The chronological, reading-first layout retains
its desktop sidebar, compact mobile navigation, and light/dark appearance.

Writing now has **Save & preview**, an owner-only saved-draft review using the
same body and media renderer as a real post. It explicitly describes the audience,
keeps content warnings closed initially, and calls out missing media descriptions.
Previewing does not publish. Publishing rechecks the current version, attachment
ownership, audience, and access to the original post when replying.

**Save & upload**, **Save & choose files**, **Save & edit details**, and
**Save & remove** preserve submitted writing before moving between media steps.
Attachment removal saves the text and both reference directions in the same
metadata transaction. It does not delete the original from Drive. A stale edit
or preview opens conflict recovery rather than silently overwriting another tab.

Enter in a single-line field saves a new draft instead of opening the picker or
posting it. Published text edits keep their separate Save changes behavior.
The full writing/preview flow was also exercised in a touch-sized Chromium
viewport with application JavaScript disabled.

The picker retains its file-name query, media type, folder, and cursor when
attachments change. A separate selected-file tray remains available when the
current filter hides a selected file. Search ignores ASCII letter case and can
skip empty windows, considering at most four 30-entry windows per request. Older
matches remain reachable with Next page; an empty bounded window does not claim
that the whole Drive has no match.

MIME part-header names now accept ordinary lowercase and mixed-case spelling.
The change preserves filename bytes and the existing single-file, header-shape,
size, media-signature, and authorization checks.

See [the writing/library decisions](WRITING-LIBRARY.md) and
[reviewed synthetic screenshots](screenshots/README.md).

## Acceptance on the released artifact

| Verification | Result |
| --- | --- |
| Native graph tests | 435 passed, 0 failed; production/reference outcomes equal |
| Account browser checks | 12 passed |
| Content and media browser checks | 17 passed |
| Reading-location browser checks | 8 passed |
| Conversation and activity browser checks | 15 passed |
| Writing and library browser checks | 12 passed |
| Responsive and request-security browser checks | 13 passed |
| Automated accessibility inspection | 60 page/theme/width combinations, 0 detected violations |
| Shell origin/launcher contracts | 28 passed |
| Actual prepared native custom-origin launcher | 6 grouped checks passed |
| Cold restart | 11 persistence checks passed |
| Independent offline restoration | 11 persistence checks passed |
| Upgrade from the preceding native bundle | 11 persistence checks passed |
| Binary rollback after that upgrade | 11 persistence checks passed |
| New writing/library actions on the upgraded preceding store | 12 grouped checks passed again |

The six main browser suites total **77 grouped checks**. The four persistence
phases total **44 checks**. The additional 12 writing checks after upgrade are a
repeat on a different store, not 12 new kinds of behavior. These counts are
separate from native tests, accessibility combinations, and launcher checks.

The synthetic suites ran on loopback using the exact selected bundle. They
exercise real forms and HTTP actions, not direct fixture insertion into public
storage. The library suite uploads 125 additional private originals to test
bounded search and older matching files. Both upgrade and rollback operate on
one copied, stopped synthetic store; rollback changes the binary without
restoring an earlier data snapshot. Test-source hashes were checked afterward.

The accessibility run covers four guest and eleven authenticated routes at 390
and 1440 CSS pixels, in both light and dark themes. Additional layout checks cover
320, 390, 768, and 1440 pixels. These are Chromium and automated checks, not full
WCAG conformance, physical-device coverage, cross-browser certification, or a
community load limit. Normal CI remains the small repository publication check.

## Public verification and deployment incident

Public verification checked exact-Host loopback health, external HTTPS health,
four anonymous routes, native executable and bundle hashes, and byte equality
between externally served CSS and the selected authored stylesheet. A separate
read-only public Chromium run checked **16 page/theme/width combinations**, the
private-route sign-in redirect, and exact stylesheet bytes. It did not register
accounts, upload fixtures, or exercise authenticated writes on live user data.

At **15:39:26 JST**, a named-connector restart was verified to leave the native
application process and canonical origin unchanged; external health recovered.
The connector is separately supervised and enabled for startup. This does not
claim uninterrupted service during tunnel restarts or origin-host failure.

The preceding temporary hostname had stopped resolving, and its connector logged
that its tunnel no longer existed. The first fixed-hostname promotion attempt
then found a second problem: old systemd dependencies survived the attempted
empty dependency reset in a drop-in. Starting the app restarted the old tunnel,
which overwrote the public-origin file with another temporary URL. The exact-Host
check rejected the resulting mismatch, and the promotion returned to the prior
binary without reverting or deleting stored data.

The service definition was then replaced and obsolete dependency drop-ins were
archived. The effective dependency set was inspected to confirm that it no longer
starts the old tunnel. The final promotion and connector-restart verification
above passed. The update was not zero-downtime; a connection refusal during the
native restart was observed before health checks succeeded. Exact Host/Origin
checks, CSRF, and TLS verification were not weakened to make promotion pass.

Operator paths, snapshots, credentials, internal account/tunnel identifiers,
and private logs are not published in this repository. See
[fixed-hostname hosting](HOSTING.md) for the operating model.

## Remaining boundaries

Saving is explicit, not automatic. Closing a tab or leaving through an unrelated
link can still lose unsubmitted edits. Members means all registered members,
not followers-only or end-to-end encryption. Mute is not a block.

There is no email-based account recovery or federation. Media limits remain
32 MiB per original, 2 GiB per account, and four attachments per post. Originals
are not transcoded, compressed, or stripped of location metadata. Codec playback
depends on the browser. Authorized media HEAD remains explicitly unsupported
with 405 and Allow: GET; GET and single byte ranges are supported.

Deleting a post or file does not recall downloaded copies or promise physical
erasure from retained history or backups. Fixed DNS removes the temporary-URL
dependency, not the need to operate and back up the origin host.
