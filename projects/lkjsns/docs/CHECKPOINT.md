# Native rebuild checkpoint — 2026-10-11

## Delivery status

This is an unfinished branch checkpoint. No replacement SNS has been deployed and no
legacy repository, process, data store or public entrypoint was changed. The current
native HTTP target has only GET `/`, returning `native boundary`. Do not use that probe
as evidence that registration, social actions or media upload works through the browser.

The selected public release was re-read from GitHub Releases during this session:
**v0.1.89**, published 2026-10-09 at 11:45:05 UTC. This is the latest **published
release observed**, not a claim that it equals the latest development main.

Archive SHA-256:
`3b4ced16faa94142c3bcf70098be4168a462dc661d0d3095089dcfd9b0860418`

Executable SHA-256:
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`

## Accepted native source

The development graph before clean reconstruction is:

```text
repository repo_2e083a5f032af51c5428629cbd646ad8
package    pkg_12f36b6a920873e8fcf561cff8d23702
revision   rev_72b9f97f5e4fede1260d35897cce743b3536f9bbfe8911b764f8827a89b840f2
state      semantic_state_dee0e467063425abd73ad07428b0220d85f6320babfd5a3af4e48d8ee79520fb
```

A fresh `check` of that exact graph passed **251 tests, 0 failures**, with production
and reference results equal. There are **34 project-authored pure tests**: util 7,
access 3, codec 22, compose 2; the other 217 come from the selected standard/template.
Authentication and media lifecycle task effects were compiled but not tested through
HTTP, real accounts, a real object adapter or a browser in this checkpoint.

Authored native modules include account/session/invite functions, conditional typed
metadata storage, Eyes/bookmark/follow/mute/notification functions, text-note draft and
version-conflict paths, and responsive page primitives. `drive` adds quota reservation,
private object upload, metadata finalization, file edits, folder creation/rename,
reference helpers and deletion states. `delivery` adds ACL-checked payload range reads.

## What remains unconnected

- Implement the actual GET/POST router with strict Host, Origin, CSRF and form admission.
  Bind completed transactions around mutations, and keep object effects outside them.
- Implement and verify login/join, timelines, profile/settings/admin, notifications,
  note details/replies and the working Drive screens. The layout/CSS is not browser-tested.
- Connect persisted-draft attachment picking and atomic reverse references. Current
  note save/delete explicitly reject notes containing media. The Drive reference
  helpers exist but are not connected to those paths.
- Preserve the draft context across upload completion. Current completion redirects
  to file details without retaining a draft ID; the upload UI sketch must not hide this.
- Verify real JPEG/PNG/GIF/WebP, MP4/WebM and audio, malformed input, range byte equality,
  quota/conflict/interruption cleanup, privacy revocation, restart and backup/restore.
- Decide and test the deployment descriptor, then expose a separate review entrypoint.
  No new deployment descriptor or public URL is accepted at this checkpoint.

The pure MIME code is signature recognition, not a complete decoder or codec guarantee.
No EXIF removal, transcoding, thumbnailing, physical metadata-history erasure or
federation is implemented. See the concrete risks in [DESIGN.md](DESIGN.md).

## Tool interruption

A combined call to correct and emit the in-progress Drive-view draft and plan its
native modules was explicitly blocked with: “the safety of the request could not be
verified.” That specific operation was not replayed through a different tool or path.
Subsequent independent reads and verification of the previously accepted graph worked;
it would be inaccurate to call the entire environment inaccessible.

The blocked operation did not change the accepted graph. The Drive UI sketch is not
among the checked-in native fragments and must not be counted as implementation.
Do not attempt to disguise or route around the blocked call. Continue only through
permitted operations and report the exact boundary when a tool refuses an operation.

## Reproduction and preservation

The checked-in Bash workflow reconstructs the accepted fragment set through the public
CLI and keeps per-step requests, plans, acceptance results, graph, check output and
bundle under an ignored `.build/bootstrap-*` directory. Re-running build creates new
identities in a separate graph; a passing fresh result is evidence for that fresh graph,
not identity equality with the development graph above.

Never publish private development helpers, runtime stores, credentials, installed
binaries or full operational logs. The branch checkpoint is suitable for continuation,
not main integration or production cutover. Use the current root AGENTS.md and this
project's AGENTS.md, avoid paid tools/Codex execution, and preserve all unrelated work.

## Clean reconstruction completed

The new checked-in Bash workflow was run against the reviewed native fragments in a
fresh graph, without the private authoring helper. It passed 251/251 differential
tests and produced a detached checkpoint bundle. No listener or operational store
was started.

Fresh repository: `repo_722f4ee55218494f1c05d291f10697e8`
Fresh package: `pkg_ea4494c1b01b43cd0fd575c48e9071d0`
Fresh revision: `rev_2ef54e3764a2504f4a661523c7106c7dafef0eb48eaa8225481f2ce8fd10e262`
Bundle bytes: 4,297,338
Bundle SHA-256: `7b45440dccf55bb193eb2d7823478e08f3b282d1cbc88f15b8f0accbaf0f1f4e`

The graph is fresh rather than byte-identical to the development graph. Both runs
reported 106,699 production instructions and 60,956 reference expressions for the
same 251 tests. This is pure test equivalence, not a server load or media benchmark.

### Final publication-source reconstruction

After removing trailing formatting whitespace, the final native source files were
reconstructed again from scratch and checked before publication. This is the selected
checkpoint associated with the final staged sources; documentation-only changes do
not change the selected source manifest.

`repo_63051abbbbd48f2173b829892f691bce`

`pkg_84cde2f20cbc337ea0582c4cefad319b`

`rev_d9cd7c4a8bac57dc68958581879ce1e19611c194d24c47a72f5a716b984ebb01`

Tests: 251 passed, 0 failed, differential equal. Production instructions: 106,695;
reference expressions: 60,953. These counters are reported observations, not a
performance comparison between randomly re-identified fresh graphs.

Bundle size: 4,301,426 bytes. Bundle SHA-256:
`1c18b9cd254291156781112b4630d61babe9049f14919609501ecec109ebcac3`

Repository validation passed for 485 staged source paths, including syntax,
documentation links and dispatcher failure cases. A separate staged-path and
credential-pattern scan passed for the 26 changed files. No runtime stores, private
helpers, installed executable, binary bundle or credentials were included in Git.
