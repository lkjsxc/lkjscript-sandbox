# Post storage and long posts — October 28, 2026

The post-storage release is live at [lkjsns](https://lkjsns.lkjsxc.com/). The
application source is commit `1e5c696eea91236b0705f439b87fd007ca507f76` and the
native bundle SHA-256 is
`402a525f52cde178e64a5a356a4c6d4325475b478eac03970f33372b13cdeb2b`.
The pinned runtime remains lkjscript 0.1.89.

Post text has no separate application length limit. Text and attributable
post records and indexes share the existing 2 GiB Drive allowance with files;
attached files are counted once and posts do not become Drive files. Text over
64 KiB needs JavaScript for upload. Timelines show a compact preview and long
bodies have a paged reading view and a bounded long-post search. A Markdown
construct spanning a page boundary in an unusually long unbroken line may be
displayed literally at that boundary.

Before cutover, the accounting migration was rehearsed on a private copy of the
current store while the site remained online. The service was then stopped for
verified snapshots of its data and objects, migration of a separate copy, and
installation of the migrated store and bundle. The previous store and private
snapshots were retained. The application and public proxy passed health checks;
the scheduled cleanup is enabled and its worker completed successfully.

The exact candidate passed 689 native tests, the complete synthetic browser
suite, quota-boundary and multi-part Unicode tests, and a previous-release upgrade
with repeat migration and preserved files and posts. A separate synthetic cutover
and local snapshot/restart test passed. The production check was read-only: 49
public page, asset, privacy-boundary and health checks passed, and no test content
was created on the live service. The optional automated axe audit was not run.
