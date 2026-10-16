# lkjsns checkpoint — October 17, 2026

Attention relationships and the genuinely circular shared icon are live on
Coder workspace **devmain**, agent **main**, public port **8793**. Promotion
completed at **2026-10-17 02:52:20 JST**. Existing accounts, sessions, posts,
media and the original lkjsxc profile image were preserved.

Executable source: `8e0b2e9f19faebacb7c474cf3d00fb25c7f0cb72`

Application SHA-256:
`e1f55a8b462f9b4e3da6ad3bdffecc64d489a136d886864f70ff89bc5b6b4b16`

Native graph:
`rev_00e650f80cf974ef6cef0fc3485f9a8343f5209ede76278b39ebe0202ee0bcc2`

Runtime remains checksum-pinned **lkjscript 0.1.89**. The final exact candidate
passed **607 native tests**, **120 synthetic browser groups**, a separate
**56-edge legacy-store upgrade**, **49 public read-only browser groups**, and
**8 public routing/security groups**. See [RELEASE.md](RELEASE.md) for exact
identities, verification boundaries, public cutover and state preservation.

## Attention contract

Both post reactions and user relationships use **Attention**. Notifications
separate **Post attention** and **People attention**. Do not restore Follow,
Following or Follower labels, or rename post reactions Like/React.

Profiles expose Attention to / Attention from as native links. Lists are
member-only, bounded and indexed in both directions. Row identities are profile
links; their sibling desired-state buttons retain the viewed subject, direction,
cursor and trail. Mutual-state badges describe the relationship to the viewer.
Mutes remain independent and your own outgoing muted relations stay manageable.

The canonical account field is attention. Legacy serialization and notice names
belong only in the codec boundary. The offline native attention-index command
must complete before serving an old store. It is resumable, has no HTTP route,
and never substitutes notifications for the original graph. Preserve a quiescent
snapshot; rollback after canonical writes requires the matching old state.
Read [ATTENTION.md](ATTENTION.md) before changing this model.

## Circular identity and retained workflow

The shared icon catalog revision is **23eb76263041**. The original composition
is clipped to a circle; all raster representations carry actual alpha. Old URLs
alias current circular bytes. Keep common icons::brand / icons::links components,
source-byte equality, compact bounded decoding and independent user profile images.
Read [CIRCULAR-IDENTITY.md](CIRCULAR-IDENTITY.md).

The composer remains Attach file / Post, without a drafts collection or preview
step. Preserve More navigation, the four-item mobile dock, bookmark history,
readable reply context, safe links, private Drive tags, 4 MiB transfer parts,
256 MiB file limit, and the 2 GiB allowance. No Node/Python application server,
paid API, Codex task or new runtime dependency was introduced.

The custom-domain redirect now targets devmain, not the historical workspace.
Keep the exact Coder Host/Origin, native authentication, port 8793 and stopped
legacy tunnels. Do not change unrelated services or promote synthetic fixtures.
See [hosting](CODER-HOSTING.md), [quiet workflows](QUIET-WORKFLOWS.md), and
[operator responsibilities](OPERATOR-RESPONSIBILITIES.md).
