# Connected native interface

These UI modules are included in the native HTTP application built by
`../../sandbox lkjsns build` from the repository root. They are no longer
unconnected proposals. The exact runnable status and release gates are recorded
in [the current checkpoint](../../docs/CHECKPOINT.md).

`controls` and `admission` handle strict, escaped form controls and field-set
admission. `journal` and `journalview` implement versioned text notes, editing,
recovery, feeds, details, replies and bookmarks. `attachments` and `fileactions`
connect owned drafts to ready private Drive files; both sides of the reference are
updated in the same native data transaction. `mediaui` renders owned originals,
attachment views and explicit sensitive-media disclosure. These modules must not
be called outside the router's session, form, ownership and transaction gates.

Successful native unit tests are not a substitute for authenticated browser,
media-byte, recovery and populated-layout acceptance. Preserve test evidence
and keep generated stores and credentials out of the repository.
