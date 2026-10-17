# Reading flow, resource addresses and completed edits

## Two different kinds of going back

Pagination changes the window inside a collection. Its single Prev/Next row
belongs **after that collection**, never before a profile identity, feed tabs,
search input, file details or the post being discussed. The two search result
collections retain independent cursor histories and named pagination controls.
A direct cursor without an observed history offers First rather than inventing
an earlier window. Next remains full-width when it is the only direction.

An individual post has a separate **Back** link at the top. The native fallback
uses a bounded, validated same-host reading referrer; direct, foreign, self-post
and editor entries fall back to Home. It never accepts an arbitrary return URL
or issues a GET mutation. The link works without JavaScript.

The existing first-party script additionally remembers a bounded set of this
tab's reading addresses and scroll offsets. It restores the exact feed/filter/
page after opening a post and avoids bouncing between a post and its reaction
or editing submission. Native browser history is used only when the immediately
preceding entry is known to match; otherwise the validated link is used. A tab
stores at most 24 positions and 24 post-return records, and only records observed
within the preceding 30 minutes are eligible for restoration. These are addresses
and offsets, not post bodies, session credentials or a server-side browsing log.
Sign-out clears this reading state. This is progressive enhancement, not a
JavaScript application router or a change to native authentication.

## Short post addresses and real profile paths

New posts and working copies receive 16-character lowercase Crockford-base32
identifiers, encoded from 80 random bits. Their addresses are `/<post-id>` and
`/<post-id>/edit`. Random generation checks for an existing post or legacy alias,
and every write is still authorized by account ownership, audience, CSRF and
current version. A post identifier is not an access-control credential.

Accounts have `/@handle` profiles and `/@handle/attention/to` or
`/@handle/attention/from` relationship pages. The handle/direction are extracted
from the path; attempts to override them through query parameters are rejected.
Older profile/attention query URLs redirect while preserving their valid cursor
and trail. Product-owned profile links use the new paths. Avatar asset endpoints
and independent media identifiers are not renamed just to resemble profile URLs.

Authentication, CSRF, invitation, object/media and digest tokens retain their
full-length validators. `util::post-id` is a distinct predicate; the security
primitive `util::token` is not shortened globally.

## Existing posts and safe indexing

Old 64-character post identifiers remain the stored identity of existing posts.
The first 80 bits deterministically map to a short public address, with an
explicit alias record pointing back to the original. Reply indexes, attachments,
bookmarks, ownership and existing working copies keep their original references.
Requests and accepted forms resolve post aliases before using those references.
Old readable post URLs redirect to the short address, including editing URLs.
No real-user content, account, password, avatar or file needs to be replaced.

The offline native `post-index` command indexes the published timeline and each
account's working-copy index in resumable batches of at most 16 steps. It writes
only aliases and its progress record. `ops/index-posts.sh SERVICE_JSON` selects
that non-HTTP target and removes resident HTTP topology from its descriptor.
Stop the selected service and retain a private quiescent snapshot before running
it. Development and synthetic acceptance run both relationship and post-address
indexes before starting their own listener.

A short-address collision is detected, never overwritten or resolved by returning
the wrong post. A fresh candidate chooses another random identifier; a conflicting
legacy mapping stops indexing and requires operator inspection. Incomplete indexes
return a preparation error instead of publishing broken links or accepting writes.
Re-running a completed index is an idempotent no-op. A production cutover must
finish indexing before accepting traffic; do not substitute synthetic data or
roll back to an old application against later short-ID user writes.

## Parent above, reply below

A readable immediate parent and its reply form two stacked siblings in a
conversation group. The parent is not a colored quotation nested inside the
reply's article. It has the normal avatar, identity and text treatment, a bounded
three-line excerpt and a quiet connecting line. There is no heavy In reply to
banner. The parent is a native link; the reply retains its own action controls.
Thread children do not repeat the parent already displayed above the thread.

The same readability check remains authoritative. A content warning summarizes
the warning without leaking its body; a private, deleted, suspended or muted
parent remains unavailable. Parent previews do not render unapproved media.
Composition keeps the safe separate-tab parent link and its retained reply target.

## A successful save completes the task

Save profile returns to the resulting profile. Saving a published post returns
to that post. Saving file settings opened independently returns to Drive and the
file's anchor; settings opened while writing return directly to the same working
copy. These are successful-write redirects only: invalid, unauthorized or
conflicting input stays recoverable rather than being discarded during navigation.
Selecting a profile image remains a child step that returns to the profile editor;
changing a password retains the intentional fresh-sign-in requirement.

## Verification sources

The current `tests/ux` suites exercise the native application, including the
bottom placement of sixteen collection types, no-script operation, exact reading
history, short IDs, path-authoritative profiles, completed saves, stacked replies,
privacy and existing media workflows. `flow-upgrade.cjs` separately exercises
legacy posts against the preceding published artifact and the new native index.
Test definitions are not completion receipts; exact execution and publication
belong in RELEASE.md and the retained private evidence.

Primary references consulted for the distinction between replies and their
parent conversation, and for browser history behavior:

- <https://help.x.com/ja/using-x/mentions-and-replies>
- <https://developer.mozilla.org/en-US/docs/Web/API/History>
- <https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration>
