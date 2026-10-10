# Unconnected workflow proposal fragments

These native lkjscript fragments are **source-only continuation work**, not an
accepted application graph. The current `ops/build.sh` deliberately does not load
this directory. The HTTP target still serves only the original boundary probe.

Read [the continuation record](../../docs/WORKFLOWS.md) and
[the UX refinements](../../docs/WORKFLOW-UX.md) before changing or connecting them.
The original project AGENTS.md and release gates continue to apply.

`controls` contains escaped form controls, explicit membership state, and exact
field-set admission helpers. `journal` proposes text-note mutations. `journalview`
contains the corresponding composer, recovery, chronological feed, permalink,
reply-list and bookmark view functions. There are 25 functions and 11 unexecuted
pure test declarations across the three modules.

Do not call `journal` mutations directly from an HTTP route. They require a freshly
validated session, exact form admission, ownership checks and a router-owned,
completed native data transaction. The proposed responses are tentative until
that transaction commits. No such router is delivered here. A planning receipt is
not graph acceptance, a passing test, a working account or a deployed service.

Do not reuse ignored development generators: some are incomplete and others
would overwrite later source corrections. The reviewed fragments themselves,
not those helpers, are the continuation inputs. Native planning and tests of the
final source remain outstanding.
