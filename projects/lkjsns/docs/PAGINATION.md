# Collection-local pagination

Prev and Next belong together at the end of the collection they paginate.
The old layout emitted two independent navigation landmarks: Prev above the
content (sometimes above a profile, breadcrumb or filter) and Next below it.
Every current renderer now emits one shared bottom row. DOM order, keyboard
order and visual order agree; there is no CSS reordering or JavaScript relocation.

The backward link sits on the left. Next takes the remaining width and retains
its existing shape, height and arrow. On the first page, Next alone spans the
full row as before. On the last page, Prev stays left-aligned rather than moving
to the centre. Empty single-page lists render no empty navigation or spacer.
Buttons have at least 54px height with separate hit targets, including on mobile.

This applies to Home, the Attention feed, Bookmarks, profiles, members, both
Attention directions, notification filters, Drive, attachment selection, profile
image selection, file usage, reply threads, invitations, and both Search lists.
The controls follow the relevant list rather than a neighbouring header or form.

## Native history, not arithmetic

The existing numeric cursor trail remains bounded to 64 positions / 704 bytes.
Prev restores an observed preceding cursor; it never guesses by adding a page
size to a filtered or sparse index. A direct cursor URL without history offers
First (`rel=first`), not a fictitious Prev. Filters, profile identities, selected
drafts, file identities and relationship directions stay in their native routes.
Existing bookmark/reaction and attachment-selection return paths are retained.

`paging::group`, `paging::button` and `paging::render` own the single landmark and
link markup. Standard pages call `paging::controls` at the former Next position.
The former top-level `paging::previous` calls are removed from all page renderers.
Both native rendering and source tests prevent a future return to split controls.

## Two independent Search collections

Search uses `cursor` / `trail` for posts and `members` / `members-trail` for people.
Changing one collection preserves the other pair and the original search query.
Each pager is named for its collection (`Post pagination`, `People pagination`)
for assistive technology. The existing More people forward label remains; its
backward link now uses the same bottom-row component. Empty filtered people
windows retain context rather than showing an unexplained backward button.

The additional people history is checked with the same bounded native validator.
Duplicate, unknown and malformed query fields still reject. Search autofocus
remains on initial/search submissions, not on subsequent cursor pages where it
would pull keyboard focus away from the results. No account data or store format
changes are involved.

## Verification definitions

`tests/ux/pager-position.cjs` reproduces the old split landmarks on a three-page
feed. `pager-contract.cjs` checks native DOM order, bottom placement, alignment,
minimum targets and a single nonnested navigation landmark. `pager-all.cjs`
exercises sixteen collection contexts using synthetic accounts, real uploads,
invites, reply posts and relationship changes, including four widths, both color
schemes and JavaScript enabled/disabled. Existing history/attachment/relationship
regressions remain in the normal suite. Actual execution and deployment evidence
are recorded separately in RELEASE.md.
