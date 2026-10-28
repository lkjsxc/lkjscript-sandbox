# Continuous long-post reading — October 28, 2026

The continuous reader is live at [lkjsns](https://lkjsns.lkjsxc.com/).
The application source is commit fd83f592ed9fcbfa9a37dea5741d2c346fff7972
and the native bundle SHA-256 is
9271a26f3a8d1336e692f24dd1092914240fdac5c429d24d5f65799e699a64e3.
The checksum-pinned runtime remains lkjscript 0.1.89.

Timelines retain compact post previews. The full-post link now opens one
continuous reading view, loading bounded authorized fragments automatically.
Content warnings remain closed until opened; interrupted loading can be retried.
JavaScript is required for the complete view of a large post, and its preview
remains available without JavaScript. The existing Markdown parsing limits and
the account's shared Drive allowance are unchanged.

The exact candidate passed 691 native tests and 173 browser check groups,
including multi-part Unicode text, fenced Markdown, retry, content warnings,
link-only and member-only access, edits during loading, the full site acceptance
suite, storage verification, and restart persistence. The public checks were
read-only: 49 current browser groups and 16 independent smoke cases passed,
public CSS and scripts matched the candidate, private routes remained protected,
and invalid fragment requests failed closed. The independent public smoke was
updated to check the existing first-party script policy instead of the retired
no-script policy.

The dedicated service was stopped for verified private snapshots of its current
data, objects, and previous bundle before the new bundle was installed. No data
migration was needed. The service, public edge, and scheduled cleanup timer were
healthy after cutover; no synthetic posts or uploads were placed in production.
