# lkjsns release — October 11, 2026

## Released artifact

The native application was promoted at **2026-10-11 20:18:34 JST**
(11:18:34 UTC). This is an actual public-service update, not only a candidate build.

Application source commit:
`1a859236e9036f9e9900fd9d1161c59e9c97984f`

Application source tree:
`dbb03845661aaa5029302fa29a7ff263b8cbad92`

Detached application SHA-256:
`55745f7ead25bfff5bc33295876af0a8ef89ac262c8627fe346b2a023d634d03`

Application size: **7,454,657 bytes**.

Pinned public runtime: **lkjscript 0.1.89**. Runtime executable SHA-256:
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`

The selected graph revision is
`rev_3d40907a5cdcb7753228da1ed7bd7a4c7bd0601267f083c45beec9c7406e5e30`.
The graph's internal artifact identity is
`artifact_bundle_f7b25fa7b416ee1e2cc85b399812c5307ac03093515e36cef4b3aebb65778cb2`.
An internal artifact identity is not a file checksum.

The application source was normally fast-forwarded to main and independently
read back from GitHub. Later documentation-only commits do not change this
released executable source identity.

## Verified public-service state

The legacy application is stopped and its automatic startup is disabled.
The new native application and the existing HTTPS tunnel were running after
promotion. The tunnel process and its hostname were retained, not recreated.

Promotion verified the live executable and application checksums, the new native
process, external health response, and exact equality between the externally
served stylesheet and the accepted source stylesheet. A transient HTTP 502 was
observed while the application restarted; the subsequent health and stylesheet
checks passed. This was not a zero-downtime deployment.

The legacy application's data was not migrated. The new application's public
state is separate from synthetic acceptance fixtures. A stopped-service snapshot
was taken before promotion. Updating the binary did not discard the new
application's data or objects.

The public endpoint still uses a **temporary HTTPS tunnel hostname**. A permanent
custom-domain deployment is not complete. Operator paths, invitation secrets,
accounts, runtime stores, and private execution logs are not published here.

## Acceptance performed on the released bundle

| Verification | Result |
| --- | --- |
| Native graph tests | 392 passed, 0 failed; production/reference outcomes equal |
| Account browser checks | 12 passed |
| Content and media browser checks | 17 passed |
| Reading-location browser checks | 8 passed |
| Conversation and activity browser checks | 15 passed |
| Responsive and request-security checks | 13 passed |
| Automated accessibility audit | 48 page/theme/width combinations, 0 violations |
| Cold restart | 7 persistence checks passed |
| Independent offline restoration | 7 persistence checks passed |
| Upgrade from the preceding native bundle | 7 persistence checks passed |
| Binary rollback after that upgrade | 7 persistence checks passed |

The five browser suites total **65 grouped checks**. The four persistence phases
total **28 checks**. These are distinct from the 392 native tests and 48 automated
accessibility combinations.

Browser acceptance used Chromium and fresh synthetic loopback state. It exercised
real forms and HTTP actions; it did not inject synthetic records into public
storage. Authenticated browser journeys were not run against live user data.
Browser test source hashes were recorded and verified before promotion.

Responsive checks covered six authenticated pages at 320, 390, 768, and 1440 CSS
pixels in both themes. The axe audit covered four guest and eight authenticated
routes at 390 and 1440 pixels in light and dark themes. Its script injection and
CSP bypass were confined to the inspection browser. The application still sends
`script-src 'none'`. These results do not establish complete WCAG conformance,
physical-device coverage, cross-browser coverage, or a production load limit.

Persistence checks used fresh sign-in, retained administrator/profile state, a
Members post, exact PNG/video/audio original bytes, and continued denial of
anonymous access after deletion or for Members-only references. Upgrade and
rollback operated on a copied, stopped synthetic store. Rollback changed only the
binary, without restoring the data to an earlier snapshot.

Normal repository CI remains lightweight. Native builds and browser acceptance
were run in the development workspace; no paid external coding agent was used.

## Changes included in this release

The product-owned interface is English throughout. Mobile navigation now exposes
Home, Drive, Write, Activity, and Account directly. Profile display names are
separate from navigation location, including names such as Home and Drive.

Reply actions in collections open the conversation before its editor. The editor
includes the current original-post context, without exposing content-warning
bodies, inaccessible posts, or muted authors. The original can be opened in a
separate tab while the reply remains in place.

Activity supports All, Replies, Likes, and Follows. Filters retain their cursor,
reject unsupported query values, and recheck current visibility. Entirely
unrelated windows can be skipped, with a strict maximum of four 30-entry windows
per request. Older matching activity remains reachable through Next page.
There are no claimed unread counters, read receipts, or push notifications.

Published-post deletion returns Home; draft deletion returns Drafts. Both confirm
the result and explain that files remain in Drive. Guest and empty collection
states distinguish public posts, Members conversations, drafts, and sparse pages.
Like and bookmark actions continue to preserve the reading location.

## Remaining product boundaries

Draft saving is explicit, not automatic. Members means all registered members,
not a private selection of followers and not end-to-end encryption. Mute is not
a block. Accounts do not yet have email-based password recovery.

Drive accepts image, video, and audio originals, with a 32 MiB per-file limit,
2 GiB of account storage, and four attachments per post. It does not transcode,
strip location metadata, provide generated thumbnails, or guarantee every codec
will play in every browser. Native GET and single byte ranges are supported;
authorized media HEAD remains explicitly unsupported with 405 and Allow: GET.

Deleting a post or file does not recall downloaded copies or promise physical
erasure from all retained history and backups. Federation is not implemented.

See [the checkpoint](CHECKPOINT.md) for the current source summary and the
[project README](../README.md) for development commands and application boundaries.
