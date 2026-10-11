# lkjsns

A native lkjscript social application inside lkjscript-sandbox: chronological notes,
replies, persistent drafts, and a reusable private Drive, with a Japanese interface.

**Status: runnable local candidate, not a verified public replacement.** The complete
HTTP application now builds on checksum-pinned **lkjscript 0.1.89**. Native tests and
anonymous HTTP checks have run; authenticated browser flows have not. The legacy
service, store, repository and public entrypoint remain unchanged. The exact evidence
and remaining release gates are in [CHECKPOINT.md](docs/CHECKPOINT.md).

## Read, write, keep your place

Home is chronological and refreshes only when requested. Writing, saving a draft,
selecting attachments and publishing are separate actions. Opening the picker saves
the draft first. File details retain that draft context and offer an explicit return
to the composer; uploading alone never publishes a note. Validation/conflict pages
retain submitted text instead of pretending a rejected write succeeded.

Drive has file cards, folders, kind/name filters, quota, descriptions, sensitive-media
controls and reverse usage lists. An unposted ready file is owner-private, including
its byte URL. Deletion is rejected while any note or draft references the file.
See [product decisions](docs/DESIGN.md) and [usability decisions](docs/USABLE-CORE.md).

## Build and check

Linux x86-64, Bash, curl, tar, sha256sum and ordinary core utilities are required.
The application and checked-in build need neither Node.js nor Python.

```sh
./sandbox lkjsns setup
./sandbox lkjsns build
./sandbox lkjsns check
```

Build creates an isolated native graph using public proposal plan/apply operations,
connects the real HTTP router, runs native tests, and builds a detached bundle. A
selection is published only after success. Both source content and the entire source
file set must still match before `check`, `prepare` or `run`. The bundle checksum is
also checked. Build does not initialize a store, start a listener or deploy anything.

`test` is an alias for native `check`; it is not a browser acceptance suite.

## Start an isolated local candidate

Local operations additionally require `jq` and `flock`. This recipe intentionally has
no public-host option and does not change DNS, tunnels, proxy routes or the old app.

```sh
./sandbox lkjsns prepare   # once; refuses to overwrite an existing store
./sandbox lkjsns run       # foreground; localhost only, port 19272
```

Open `http://127.0.0.1:19272` from the same machine. In a remote workspace, this address
is on the workspace, not the reader's computer. Do not make an unverified fixture
public merely to access it. Private data is under `runtime/development/`, ignored by
Git. The one-time bootstrap invitation is in `bootstrap.secret` inside that directory;
it is never printed, committed or inserted into a URL by the launcher. The recipe
creates no user account. Keep test data synthetic until acceptance is complete.

Rebuilding then running stages a new content-addressed bundle without reinitializing
that development store. Stop the foreground process before running a new candidate.
The local process lock rejects a second launcher. See [operations](docs/OPERATIONS.md)
for the distinction between local rehearsal, backup and production release.

## Boundaries and limits

All application behavior, HTML generation, authentication, metadata transactions,
media access checks and HTTP routing are native lkjscript. CSS is authored in
`web/style.css` and embedded in `src/assets.lkjc`. Bash/jq are operations tooling,
not an application backend. Accepted graphs, bundles, local credentials, data, logs,
screenshots and optional development helpers stay out of Git.

Initial limits are 32 MiB of media payload, 2 GiB of charged storage per account and
four attachments per note. Incomplete reservations count against quota. Object I/O
and metadata are separate authorities, with explicit intermediate states rather
than a claimed cross-store rollback. These limits are not measured capacity.

There is no federation, direct messaging, passkey/email recovery, transcoding,
thumbnail service, EXIF removal or guarantee of codec compatibility. Signature checks
are not full decoding. HTTP media GET/HEAD/Range, authenticated revocation, interrupted
upload cleanup, restart with populated data and backup/restore still require end-to-end
acceptance. Logical deletion does not physically erase retained metadata history or
backups. Do not treat this local candidate as production-ready.
