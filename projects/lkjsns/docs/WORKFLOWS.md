> Historical authoring notes below. The current connected runtime and verification
> state are recorded in [CHECKPOINT.md](CHECKPOINT.md). Do not interpret earlier unconnected-source status as current.

# Workflow continuation — 2026-10-11

## Delivery boundary

This is a **source-only, unconnected continuation**, based on the native rebuild
checkpoint `30ba4dea3421f89a0c4051a4a52b06da12abc986`. It is not a usable SNS,
a completed UI, an accepted new graph, or a deployment. The original
[checkpoint](CHECKPOINT.md) remains the authority for executable delivery.

Only three native proposal fragments under `src/ui/` and their documentation
are added. The existing build script, pinned runtime, HTTP target, stylesheet,
accepted source manifest and legacy application remain unchanged. In particular,
`./sandbox lkjsns build` does **not** include these new fragments, and `run` still
refuses to start an application. Do not merge this checkpoint into main or expose
it as a product merely because the proposal files are present.

## Authored source

`controls.lkjc` has seven functions and six pure test declarations. It supplies
escaped labels, inputs and textareas, visible audience selection, explicit desired
membership state, and exact form-field admission. Setting a reaction or bookmark
to an explicit state is intended to make repeated delivery idempotent; that claim
still needs routed concurrent-request tests.

`journal.lkjc` has nine functions and five pure test declarations. It proposes
versioned text drafts, first publication, immutable published audience/reply
fields, note deletion and Eyes/bookmark state changes. The prospective indices
are `draft/<author>`, `timeline`, `author/<author>` and `replies/<parent>`.
These index names have not been reconciled with the older unconnected domain
modules and are not a migration contract.

`journalview.lkjc` has nine functions. It proposes a composer, submitted-input
recovery, stored/submitted conflict comparison, chronological Everyone/Following
feeds, drafts, note details, replies and private bookmarks. It emits HTML using
native functions; it introduces no application JavaScript, foreign application
server or remote visual assets. The existing page shell is reused unchanged.
No screenshots or browser tests substantiate its visual quality yet.

The totals are **25 authored functions and 11 unexecuted new pure tests**. The
account-management and notification authoring attempt did not produce delivered
native modules. There is no new account router, attachment picker, upload screen,
media renderer, HTTP adapter wiring or operational deployment descriptor.

## Static corrections retained in the final source

New reply indexing now uses the candidate's reply field, including publication
from a fresh composer. A genuinely missing data row is distinguished from an
existing row that failed to decode; the latter must not be treated as a new note.
Already-published content can be edited without requiring its unchanged parent
to remain present. Published audience and reply fields still have to match.

Mutation entry functions require a signed context and a syntactically valid note
ID before their data reads. Reaction dispatch accepts only Eyes or bookmark,
rather than treating every unrecognized intent as a bookmark. These are local
guards, not a substitute for current-session validation and HTTP admission.

Saving and deleting notes containing media is explicitly refused at this stage.
The view does not render attachments, so accepting media notes would conceal
content or imply an unverified lifecycle. Media-only publication remains a product
requirement, not a feature removed from the design.

The composer constructs its new draft once instead of repeating an effectful
random-ID expression for each record field. Feed cards receive the already-read
viewer record rather than fetching it again for every card. Neither change has
been benchmarked; they are source-level elimination of duplicate work.

Drafts no longer receive a misleading published-edit label. Save-related notices
are tied to the stored note state and use wording that does not assert a new
commit merely because a query parameter is present. The detail-page note-state
notice is restricted to the owner.

## Evidence, with source boundaries

The original selected graph was checked again with the pinned public lkjscript
**0.1.89**. The observed result was **251 passed, 0 failed, differential equal**,
with 106,695 production instructions and 60,953 reference expressions. This is
exactly the pre-existing graph, not the added workflow proposal. The 251 tests
include 217 inherited/template tests and 34 original project-authored pure tests.

The original accepted revision remains:

`rev_d9cd7c4a8bac57dc68958581879ce1e19611c194d24c47a72f5a716b984ebb01`

An **earlier version** of all three new modules successfully completed public
`change plan`, without applying its result. It selected 11 tests, reported
`tests-passed=0`, and listed 36 compiler units. Those tests were not executed;
zero is not a report of failing tests. The plan did not change the accepted graph.

That plan predates the retained static corrections and must not be cited as
native validation of the final files. Its input hashes were:

- controls: `d62f2206ff0616fa170c27daae47b9d6660f92fa325b97391df0b61946feadcb`
- journal: `63c11ec6263136a4ca1fb03a2567b53ba2ae42bd3a4f1839080374ade0caf608`
- journalview: `cc751a11b4a2a4839c9c10d8c424d0242154b42a43c300c6b03c7668b242d329`

The **final files** received an independent static S-expression inspection:
parentheses/declarations, `if` arity, authored cross-module call targets and call
arity were checked. It also found exactly one syntactic random-ID call in the
composer and only the author lookup in each card. This inspection is not the
lkjscript type checker, native execution, an effect test or a browser test.

Final source SHA-256 values:

- controls: `d62f2206ff0616fa170c27daae47b9d6660f92fa325b97391df0b61946feadcb`
- journal: `4b0175c162687d5cdfbdecd808cf481f7ac1c8effd3fe40efaf4c4b76b5494a0`
- journalview: `6c51637589ecf9000fe4c115683d39d4b18bec67e3bc9d78098c648311749dd8`

## Tool interruption and preserved limits

OpenAI tool-call verification rejected a grouped read of the old social/media
modules, an account-authoring correction, integration of the new modules into the
build, and a later combined regression-test edit/non-applying-plan request. The
rejected operations were not replayed through another tool or disguised path.
Recovery/status inspection found no operation record for the integration and
final-plan requests; source inspection confirmed their proposed edits did not
land. No extra eight-test set or nonnegative-version guard from the rejected
request is included in this checkpoint.

Independent baseline checking, an earlier non-applying plan, source-only review,
and selected source corrections did succeed. It would therefore be inaccurate
to describe the entire environment as inaccessible. The exact boundary is that
this session did not obtain accepted native or browser evidence for the final
workflow source and did not connect it to an application.

## Required integration work

The central missing owner is HTTP admission and completed transaction handling.
It must check Host, Origin, bounded form decoding, duplicate/unknown/missing
fields, the current session and CSRF before dispatch. Private GET views also
require fresh authorization. A form token or a Context-shaped value alone does
not establish a live session.

Every metadata mutation and its index/reference writes must share the appropriate
native transaction. Only its committed outcome may release a success response or
session cookie. Conflict/aborted outcomes must not reuse a tentative redirect.
After an abort, recovery must re-read owned current content and preserve the
submitted input; no form schema error should silently erase a legitimate draft.
Object I/O must not be folded into a claim of cross-store atomicity.

The prospective exact form sets for the authored note UI are:

| Intent | Fields, including common fields |
| --- | --- |
| note | intent, csrf, id, version, reply, body, cw, audience, mode |
| delete-note | intent, csrf, id, version, confirm |
| eyes / bookmark | intent, csrf, id, enabled |

These are design inputs for the missing router, not implemented route contracts.
Rejected identifiers must not be turned into new objects; corrupt records must
fail closed. Nonnegative stored-version admission remains an explicit unresolved
review item. The current generic input helper accepts a literal HTML input type;
`new-password` is an autocomplete value, not a type, and must not be passed as
its `kind` by a future account screen.

Before accepting a graph, reconcile the new note/index paths with the existing
unconnected modules, review replay/conflict semantics, and run the final native
tests. Exercise synthetic users through real HTTP for registration, login,
publication, direct reply indexing, cross-user denial, stale-tab recovery,
repeated requests, deletion and restart. Invalid, revoked and duplicate session
cookies, forged Origin/Host and missing/duplicate CSRF need effect-level tests.

The media milestone must then connect persisted drafts, an owned-file picker,
atomic forward/reverse references, upload-return context, ready-state admission,
reference-safe deletion and current-note-based byte delivery. Prove actual
image/video decoding, Range byte equality, unauthorized reads, revocation,
interruption reconciliation, quota accounting and backup/restore in isolated
stores. See [DESIGN.md](DESIGN.md) for the unchanged underlying release gates.

Finally, test the real native pages on desktop and 390px mobile, keyboard-only,
light/dark, reduced motion and 200% zoom. Verify successful navigation and actual
outcomes, not just screenshots or the existence of controls. A separate review
entrypoint comes only after those gates; legacy retirement is a separate change.
