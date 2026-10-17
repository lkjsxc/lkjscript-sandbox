# lkjsns checkpoint — October 17, 2026

The reading-flow release is live in Coder workspace **devmain**, agent **main**,
public port **8793**. Cutover completed at **2026-10-17 14:27:21 JST**.
Existing accounts, posts, private working copies, media and the actual lkjsxc
profile image were preserved.

Executable source: `3c750cb9005456593923d9c5480ab4dbe6f5c83e`

Application SHA-256:
`d9c8f5d9169c46bf9e1f32a25b6075608c2b1a778c177e36cb28e2e7646e2c22`

Native graph:
`rev_18b30daec91a23471842fb901930df013f4f3f0e922bb4726585167320c23a11`

Runtime remains checksum-pinned lkjscript **0.1.89**. The final exact candidate
passed **650 native tests**, **139 full browser groups**, a separate **39-resource
legacy-store upgrade**, **49 public read-only groups**, **16 public pagination
cases**, **8 public reading/resource groups**, and **8 routing/security groups**.
Read [RELEASE.md](RELEASE.md) for actual identities, observed verification limits,
public cutover and preservation evidence.

## Collection navigation and completed tasks

Prev/Next sit after their own collection, not before profiles, tabs or context.
A post's top Back link is separate from pagination; its native fallback accepts
only safe same-host reading locations. The first-party enhancement retains bounded
per-tab addresses/scroll offsets and skips reaction/editor loops. Direct or foreign
entries fall back to Home. Search post/people histories stay independent.

Successful profile saves go to the profile; published post saves go to that post.
Independent file settings return to Drive, while settings entered from writing
return to the same retained working copy. Failed/conflicting input stays recoverable.

Parents and replies are stacked siblings with neutral styling and a quiet line.
Do not restore the dark nested In reply to box. Keep the three-line preview bound,
warning/privacy/mute/deletion checks, and the composer’s safe original-post link.
Read [READING-FLOW.md](READING-FLOW.md) and [PAGINATION.md](PAGINATION.md).

## Stable identity, short addresses

New post IDs have 16 lowercase base32 characters. Existing 64-character post
records keep their stored identity and use indexed short public aliases. Profiles
use /@handle, and relationship lists use /@handle/attention/to or /from. Old
readable links redirect; path-derived identities cannot be overridden by queries.
Authentication, CSRF, invitations and media/digest validators are not shortened.

The offline post-index command must complete before an old store serves the new
application. It is resumable and has no HTTP route. Incomplete indexes and colliding
aliases fail closed. Preserve a stopped-service snapshot before indexing; do not
restore an old application over later short-ID user writes without reconciling data.

Both post reactions and relationships remain Attention. Post attention and People
attention notifications stay distinct. The own-profile You badge remains absent;
other relationship states and mutes retain their existing meaning. The circular
icon catalog is still 23eb76263041, with native/browser asset-byte equality and
independent user-uploaded profile images.

Keep the Coder origin, port, strict Host/Origin/session/CSRF checks and disabled
legacy tunnels. No unrelated service, runtime budget or paid dependency was changed.
See [ATTENTION.md](ATTENTION.md), [CIRCULAR-IDENTITY.md](CIRCULAR-IDENTITY.md),
[CODER-HOSTING.md](CODER-HOSTING.md), and [OPERATOR-RESPONSIBILITIES.md](OPERATOR-RESPONSIBILITIES.md).
