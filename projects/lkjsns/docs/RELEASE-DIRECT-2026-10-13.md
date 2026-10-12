# Direct-interaction release — October 13, 2026

The direct-interaction update is live at
[the existing Coder public entry](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
Promotion completed at **2026-10-13 03:21:14 JST** (2026-10-12T18:21:14Z).
The same native service, origin, account data, posts, media, and invitation records
were retained. The custom-domain alias and Coder port 8793 topology are unchanged.

## What changed

**Drive is back in primary navigation**, alongside Home, Search, Notifications,
Bookmarks, and Settings. It is included in mobile navigation too.

Normal pages no longer display a duplicate page-name banner at the top, including
Search, Bookmarks, Settings, Drive, Drafts, member pages, administration, and their
children. Browser titles and an assistive heading are retained. Meaningful content
sections, errors, and confirmation messages are not indiscriminately hidden.

In the attachment picker, the preview is the selection control. Clicking its
image, filename, or tile selects or deselects it, with a checked indicator. There
is no separate Attach/Remove button strip below the preview. A filtered picker
retains access to its selected tiles. Native version/ownership checks and the
four-file limit are unchanged.

The profile-image picker likewise uses the image itself, not a Use as profile
image button. Clicking the existing profile image in settings opens that picker.
The default is another tile. The redundant action in the file toolbar is removed.
Drafts are whole-card native links, with no Continue writing button. They open
writing by pointer or keyboard, also with application JavaScript disabled.

View original post / Open original post buttons are removed. A readable parent
preview is itself linked, retaining context without another action row. The
additional reply button below a post's own reply action, the redundant View profile
shortcut in settings, and the extra file-detail attachment panel are also removed.

## URLs

Post, draft, and file-detail identities are in **`/<id>`**, without a `/note` or
`/file` prefix and without an ID query parameter. The existing IDs are retained.
A draft's root URL opens writing for its owner; published editing is `/<id>/edit`.
Original bytes use `/<id>/raw`, with parent-post context where needed for access.

Old `/note?id=...`, `/file?id=...`, `/compose?id=...`, and `/media?id=...` links
redirect to their path-based equivalents. Cursor/draft/preview context remains
supported. Creation, search and transfer operations can still use legitimate
query parameters; this update moves resource identity, not every possible query,
into the path.

The native path router still checks current ownership, publication, audience,
deletion and media references. An incoming `id` query field cannot overwrite the
path ID. Colliding record kinds fail closed. Private file/draft root URLs remain
unavailable to other users and guests.

## Invitations

The arbitrary **20-person / 30-day caps are removed**. Positive whole-number
counts and durations can exceed those former ranges. Blank people means
**unlimited uses**; blank days means **no expiration**. Defaults remain one person
and seven days, so creating an invitation does not silently widen its scope.

Unlimited links can be reused and explicitly revoked. Finite-use links still
become unavailable after their last successful registration. Existing invitations
are preserved. Invalid, fractional, negative, zero, or overflowing values are
rejected. The storage format uses checked signed 64-bit integers and checked
expiry arithmetic; unlimited/never is an explicit policy, not numeric overflow.

## Exact executable

Source commit: `553ff649075c172b0e68bce9987b0bfd2df1ecd0`

Source tree: `659ded137f4b4d93840ffced8c13373f964396c2`

Application SHA-256: `68f9ae90b43ec2e9be05c09569df4f0abdf307362ece12d2e187c10a019b27fb`

Application bytes: **9,255,650**.

Runtime remains the same checksum-pinned public **lkjscript 0.1.89**, executable
SHA-256 `e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.

Native graph: `rev_5e6c621dca6a27be054b3f151c07e030e9989945eb5c356a246cb74bb299dd61`

Internal artifact identity:
`artifact_bundle_89761fd752f680b2bb386310fad217fc8e02df8f159afafaa03ba9d4c173c074`

The internal artifact identity differs from the bundle file checksum. Release-
record commits do not change this executable source identity.

## Verification

The exact bundle passed **472 native tests**, with zero failures and equal
production/reference outcomes. **68 synthetic browser groups** passed: the prior
60 updated for canonical URLs plus eight direct-interaction groups. These include
image/keyboard selection, no-script whole-draft navigation, selected/unselected
states, legacy redirects, root ownership denial, query-ID override rejection,
large invitation values, unlimited reuse, revocation, exhaustion and overflow.

The complete regression run also verified the existing 256 MiB upload/download,
cross-part ranges and SHA-256, lost-acknowledgement recovery, native restart,
pending-upload resumption, profile/media privacy, and no-script core forms.
The deterministic 256 MiB SHA-256 remained `3f13c3ef45598616756bcb55f8fb0a9fc2115ccdee314d03df82ce54beefbc17`.
These are isolated loopback tests, not authenticated writes to public user data.

Responsive checks covered **96 page/theme/width combinations**. The optional axe
run checked **eight primary pages**, including the avatar picker, and reported
zero violations in its selected rule set. These are automated Chromium checks,
not full accessibility conformance or physical-device/cross-browser certification.

Read-only public verification passed **25 groups**: 20 guest page/theme/width
combinations without title banners, private-route admission, exact public CSS and
both scripts, branded unavailable routes, root-ID redirect/query authority, and
health/browser checks. It did not create accounts, invitations, posts or uploads
on production.

## Preservation and operating boundaries

A quiescent snapshot retained the preceding executable, bundle, descriptor,
secret, metadata, and objects. Data/object paths and SHA-256 values were identical
before and after replacing the application files. The bootstrap secret, origin,
native runtime binary, capability grants and service dependencies are unchanged.
No synthetic fixture was deployed and no unrelated service was restarted.

The preceding bundle SHA-256 was `f1ac426364ebc7f9ba28ee4b21a101b5690454d47a91dbd98abfcb7174f0e451`.
Its release is archived in
[the community UX record](RELEASE-COMMUNITY-2026-10-13.md).
The restart is not a zero-downtime guarantee. An older binary is not promised to
understand new unlimited-invitation semantics or the new URLs after later writes.

Explicit post saving, 256 MiB/file, 2 GiB/account, four attachments/post, 8 MiB
profile images, native media HEAD refusal, bounded search, and transfer-page
resumption limits remain unchanged. The application logo was not part of this
update. See [direct interactions](DIRECT-INTERACTIONS.md),
[operations](OPERATIONS.md), and [Coder hosting](CODER-HOSTING.md).
