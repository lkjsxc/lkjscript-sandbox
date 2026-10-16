# lkjsns checkpoint — October 17, 2026

The redundant **You** badge is removed from the viewer's own profile. The fix is
live in Coder workspace **devmain**, agent **main**, public port **8793**, since
**2026-10-17 04:06:06 JST**. Other profile badges and list identity are unchanged.

Executable source: `864d16814ef77b8f22a5da0bc453bd14e0a42255`

Application SHA-256:
`611d0fa2e469066a4749f510df08f829f8e8eb65de1cdec76e95844e3b892205`

Native graph:
`rev_4439c2926d26f4afa97ce4ba2ef6a73442bf9e9c1160bcd08e511f365dc6088c`

Runtime remains checksum-pinned **lkjscript 0.1.89**. The exact candidate passed
**613 native tests**, **29 focused synthetic browser groups**, including **48
own-profile combinations**, and **49 public read-only browser groups**. Stored
data, objects and configuration remained unchanged through cutover. No migration
was required. See [RELEASE.md](RELEASE.md) for verification boundaries; earlier
media/upgrade suites are historical, not newly rerun for this small correction.

## Attention contract

Both post reactions and user relationships use **Attention**. Notifications
separate **Post attention** and **People attention**. Do not restore Follow,
Following or Follower labels, or rename post reactions Like/React.

Profiles expose Attention to / Attention from as native links. Lists are
member-only, bounded and indexed in both directions. Row identities are profile
links; their sibling desired-state buttons retain the viewed subject, direction,
cursor and trail. Mutual-state badges describe the relationship to the viewer.
The own profile must not display a redundant You badge.
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
