# Attention relationships

Attention is the product vocabulary for **both** a person's ongoing interest in
another person and a reaction to a particular post. These remain separate state:
a post reaction never subscribes to its author, and giving attention to a person
does not react to any of their posts.

The profile and timeline use **Attention**. Profile navigation uses **Attention
to** (outgoing) and **Attention from** (incoming). Notifications disambiguate
**Post attention** and **People attention**. Existing post buttons still say
Attention, not Like or React. Product-owned copy remains English.

## Profile-first interaction

The profile exposes both directions as ordinary links below the bio. Each list
keeps the person's identity at the top and provides the two direction tabs; it
does not add a redundant visible page title, modal layer, confirmation step,
separate View profile button, or a count-driven popularity display.

A person's avatar, name, handle and short bio form one real profile link. The
Attention control is a sibling button, never a button nested inside that link.
Its visible and accessible labels stay stable while `aria-pressed`, the check
mark and native desired state change. The same control works on a profile and
inside a list without JavaScript. Self-attention is not offered.

**Mutual attention** and **Attention to you** describe the relationship to the
viewer, not an unrelated person's reciprocal state. Your own profile does not
repeat a **You** badge. Relationship-list rows retain **You** when needed to
identify the viewer among other people. List
changes return to the viewed person's original direction, cursor and bounded
history trail. They do not navigate to the person just acted on. Profile changes
return to that profile. Return locations are assembled from validated handles,
direction and numeric cursors; the form never accepts an arbitrary destination.

Lists are member-only, consistent with the member directory. Guest profiles do
not disclose relationship lists. Missing/suspended people do not render. Muted
people are hidden from incoming and third-person lists; your own outgoing list
retains a Muted label so that a quieted relationship does not become impossible
to manage. Muting remains independent of giving/removing attention. Member-audience
posts remain readable by all registered members, not only by attention contacts.

## Native data and bounded reads

`User.attention` is the canonical outgoing membership list. The maximum remains
512 accounts, independent of the 512-account mute limit. The old serialized
`following` field and old notification kind are recognized only in the
`accountcodec` compatibility boundary. This preserves existing passwords,
sessions, profile versions, bookmarks, storage usage and relationship meaning.
The next ordinary account write uses the canonical Attention field.

A relation transition writes its outgoing membership, current-edge pointer,
immutable edge event and both directional indexes in one native transaction.
Repeated desired-state submissions do not toggle or create duplicate notices.
Removal invalidates the edge pointer; re-adding creates a new event. Rendering
checks the current pointer and outgoing membership together, so historical
indexes cannot resurrect removed relationships or duplicate re-added people.

Both directions use native indexed pages, not a per-request scan of every
account. Newest relationship events appear first. Legacy incoming order reflects the
stable backfill order, because the preceding account records did not store a
creation timestamp for each relationship. A page inspects 30 events and
may skip up to four wholly empty windows, for at most 120 inspected events per
request. Inactive, missing, suspended or muted records can make a visible page
shorter. The next cursor remains available when more history exists; an empty
bounded window is not described as the end of the relationship graph. Prev uses
the bounded native trail and supports operation without browser scripting.

The index is append-only history plus current pointers. Heavy repeated
add/remove activity can create sparse historical pages; bounded reads prevent a
request from growing with the entire history. Compaction and larger outgoing
limits are future work, not silently promised capabilities of this change.

## Existing-store cutover

The native `attention-index` command creates both indexes from existing outgoing
membership, in resumable transactions of at most 16 account/edge steps. A batch
has at most 96 relation/index mutations plus its checkpoint, below the existing
128-mutation grant. It does not emit new notifications, rewrite posts, manipulate
object files or run a host-language data migration.

Stop the selected service and retain a private quiescent snapshot first. Then
run `ops/index-attention.sh SERVICE_JSON` against the new selected artifact and
existing store, with its ordinary bootstrap secret supplied through the existing
environment. Repeated completed runs do not append relationship events. A failed
or intentionally limited run retains its checkpoint and must be resumed before
serving. Incomplete index pages return 503 rather than a misleading empty list.

This command has no HTTP route. It needs the same selected native runtime and
store authority as the application. A rollback after canonical account writes
requires the retained old store snapshot, not merely the old application bundle.
Do not promote synthetic stores or change the live origin/grants as a shortcut.

## Verification

`tests/ux/attention.cjs` exercises real native forms, independent directions,
replay/concurrency, notifications, mutes, no-script interactions, malformed
requests, a 34-person incoming graph, pagination, responsive layout and optional
axe checks. `tests/ux/attention-upgrade.sh` separately creates a fresh store with
the exact preceding published artifact, builds 56 directed legacy relationships,
interrupts/resumes indexing, then checks old sessions and new writes with the
candidate. These are test definitions; completion belongs in the release record.

## Design references

Mastodon's account API treats outgoing and incoming relationships as separate
paginated collections and includes relationship inspection alongside profiles:
<https://docs.joinmastodon.org/methods/accounts/>. This informs the two directions,
not federation compatibility or an identical privacy policy.

Bluesky's feed design separates the choice of people from other feed algorithms:
<https://bsky.social/about/blog/7-27-2023-custom-feeds>. The lkjsns Attention feed
continues to show the chosen people's posts and the viewer's own posts; this
change does not add recommendations or infer subscriptions from reactions.

The WAI-ARIA button pattern specifies a stable toggle label with a separate
pressed state: <https://www.w3.org/WAI/ARIA/apg/patterns/button/>. Native links and
buttons retain standard keyboard behavior and work without a JavaScript router.
