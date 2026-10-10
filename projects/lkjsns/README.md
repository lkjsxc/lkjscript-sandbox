# lkjsns

A native lkjscript social application being rebuilt inside lkjscript-sandbox.

**Status: implementation checkpoint, not a usable or deployed SNS.** Authentication,
text-social domain functions, a private-media lifecycle and byte-range delivery
functions have been authored and accepted by public lkjscript **0.1.89**. The current
HTTP target deliberately exposes only a `native boundary` probe. The replacement
must not be deployed as a finished application.

The legacy private repository, running service, accounts and media-free store have
not been changed or imported. See [checkpoint and remaining work](docs/CHECKPOINT.md).

## Product direction

A chronological, invitation-only community with Japanese UI, reusable private Drive,
photos, videos, audio, explicit publishing scopes and a small set of predictable
controls. Preserve input before opening an attachment picker, show where files are
used, and never interpret uploading as publishing. See [design decisions](docs/DESIGN.md).

## Reproduce the accepted native checkpoint

Linux x86-64, Bash, curl, tar, sha256sum and the ordinary core utilities are required.
No Node.js or Python is required by the checked-in build workflow.

```sh
./sandbox lkjsns setup
./sandbox lkjsns build
./sandbox lkjsns check
```

Setup verifies both the archive and executable SHA-256. Build creates a new isolated
native graph from the embedded `web-editor` foundation, applies the reviewed fragments
through the public CLI, runs graph tests and writes a detached bundle. Build selects
an output only after success. It does not initialize application data, acquire any
legacy credentials, start a listener, or choose a public deployment.

`run` intentionally refuses: end-to-end routing and the new user-facing flows are not
ready. `test` is an alias for native `check`, not a browser or datastore integration
suite. The previous accepted graph passed **251 tests**, including **34 project-authored
pure tests** and 217 inherited standard/template tests. This does not test account,
media lifecycle or browser effects end-to-end.

## Source boundaries

`src/` contains native declaration fragments; `web/style.css` is the authored design
reference embedded in `src/assets.lkjc`. `ops/` owns the Bash build/verification entry
points. Accepted graphs, installed runtimes and detached bundles remain untracked.
The build retains each request, plan and acceptance result beside its selected graph.

The implementation separates social metadata in native DataStore from private bytes
in ObjectStorage. Uploads reserve quota before object I/O, then become readable only
after metadata publication. Rejected uploads are removed before quota is released.
Interrupted uploads retain an explicit incomplete state rather than pretending to
roll back an external object effect. These are implemented domain paths, not yet
verified application-level guarantees.

## Known limitations

The native compiler and pure checks pass, but **login, feeds, forms, Drive and direct
media routes are not wired into the HTTP target**. Text-note saving currently rejects
notes with media until atomic attachment/reference handling is connected. The staged
Drive UI work is not part of this accepted checkpoint. There is no migration, public
cutover, browser verification, federation, DM, passkey, email recovery, transcoding,
thumbnail generation or metadata removal.

Planned initial limits are 32 MiB per file and 2 GiB charged storage per account, with
four attachments per note. Only the per-file/quota domain checks are currently
implemented; the attachment limit is a design decision awaiting its write path.
Native data history is retained, so logical deletion is not a promise of physical
history or backup erasure. Do not put real private data into a development fixture.
