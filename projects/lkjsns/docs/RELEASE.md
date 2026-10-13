# Quiet workflow release — October 13, 2026

The quiet-writing and reading-navigation update is live at the existing
[Coder entrypoint](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
The actual service replacement completed at **2026-10-13 17:42:02 JST**
(2026-10-13T08:42:02Z), with the application still hosted inside the same workspace
on port **8793**. The custom domain remains a read-redirect alias.

## What changed

The new-post composer has **Attach file** and **Post**, without a Save draft
button, a preview step, a draft collection, or routine saving notices. Attachment
selection, upload, removal, and file options retain the same private text,
content warning, audience, and reply identity. Published editing retains Save
changes. The existing confirmation and optimistic-conflict boundaries remain.

**More** now contains secondary navigation and service information. Settings has
profile/security settings and sign-out. Desktop navigation adds More, while the
mobile dock contains only **Home, Post, Notifications, More**. The old persistent
About footer link is removed. All product labels remain English.

Bookmarks show the most recently bookmarked item first, with no private-bookmarks
notice. **Next** spans its feed's width; a top **Prev** restores the exact previous
cursor and filters. This native history also survives reactions and picker
selection. A directly opened cursor without a history offers First, not a guessed
previous destination.

Post links open separately with opener/referrer protection. Native link rendering
handles HTTP(S), Unicode and sentence punctuation without accepting user markup
or fetching third-party previews. Reply labels include counts of directly
readable replies. The bounded 256-record scan marks incomplete positive counts
with a plus sign and never presents hidden records as a visible count.

Drive places Upload beside the storage meter and consistently insets file-card
text. Used in renders normal post cards, including media and actions. Actions
return to the same file page and preserve its paging context. File options have
a direct return to the owned writing workspace.

More links to public About, Privacy policy, Terms of service, Community guidelines,
and Contact pages; registration links to the relevant documents. Copy describes
implemented behavior rather than promising automatic account closure, exports,
metadata stripping, end-to-end encryption, or guaranteed backup erasure.
[Operator-specific responsibilities](OPERATOR-RESPONSIBILITIES.md), including
appropriate identity disclosures and an actual request-handling process, are not
certified by this technical release.

The boundary tests also exposed and fixed a pre-existing text-admission mismatch:
the SNS advertised 16,000 bytes but reused the sample editor's 4,096-byte check.
The application now owns its bounded native validation and newline normalization,
retaining disallowed-control-character rejection and each field's smaller limits.

## Exact executable

Executable source commit: `19786dac85341cf15bd68f67eec425f15caa7dec`

Source tree: `bbbf87ed6ea6f9652f162a5308ec02a5f5fc25d9`

Application SHA-256:
`04d56071771afe60c2e64747e7659590218d16c53d451d84c5f96adb305d867a`

Application size: **11,172,487 bytes**.

Native graph:
`rev_7751a476c9489d957f5e2ae2dd2b49852dcbef8f98e24cb4720a0c88c6ad9a1a`

Runtime: the unchanged, checksum-pinned **lkjscript 0.1.89** executable, SHA-256
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.

The executable source was ordinarily fast-forwarded to main and independently
read back from GitHub. A subsequent release-document commit does not change this
executable source identity. No paid agent or external model API was launched.
The application does not use a Node/Python server; those tools were used only
for authoring and isolated development tests.

## Completed verification

**547 native tests passed**, zero failed, with equal production/reference outcomes
on the selected complete source set. The selected graph, bundle checksum, source
manifest, authored assets, and runtime checksum were bound before acceptance.

A fresh isolated native service passed **99 synthetic browser groups**, including
accounts, invitation controls, native writing and conflict recovery, link security,
media visibility, private tags, search, direct interaction, bidirectional paging,
Used in, input retention through file options, and native restart. The restart
also rechecked a previously acknowledged incomplete upload and completed it
without resending the durable part.

The suite uploaded and downloaded an actual **256 MiB** file using 64 native
4 MiB parts, checked exact hashes and cross-part ranges, rejected oversized or
invalid transfers, and exercised no-JavaScript writing, attachment upload, and
confirmed deletion. These are loopback acceptance results, not public-network
throughput measurements.

Responsive checks exercised **17 routes at 320, 390, 768, and 1280 pixels** in
light and dark modes without horizontal overflow. Selected automated accessibility
rules reported **zero violations across 13 primary/service routes and 3 reply
scenarios**. This is Chromium automation, not physical-device or Safari/iOS
certification. Large text, a long Unicode URL, and the 128-link rendering bound
were exercised through actual native HTTP requests.

Read-only checks of the running public service passed **47 groups**, including
10 guest/service pages in four width/theme combinations, native sign-in
requirements, exact CSS/script/icon bytes, unknown paths, and health. A separate
**8-group routing check** verified the Coder entrypoint, alias redirects, and
Host/Origin/session/CSRF rejection. Its deliberately invalid unauthenticated
submissions did not create or mutate application data. No real-user account was
used for browser acceptance.

The lightweight repository checker also passed for **615 source paths**, syntax,
configuration, documentation links, and dispatcher failures. Historical browser
suites with old UI assumptions were not claimed as newly rerun; tests/ux is the
current release gate. Expensive remote game CI was not requested.

## State and rollback preservation

The preceding application and storage were copied into a private quiescent
snapshot before replacement. All metadata/object paths and SHA-256 values matched
before the swap, after the swap, and after the updated service started. The
existing public profile-image bytes also matched exactly before and after.

The bootstrap secret, Coder origin, capability grants, runtime binary, service
launch configuration, and unrelated services were unchanged. No synthetic state
was promoted. Both old dedicated tunnel services remain disabled. The private
snapshot includes a rollback copy of the preceding application; its credentials,
user data, and internal operational receipts are intentionally not in Git.

Previous bundle SHA-256:
`beaf52afd7e20ce5d03c742b9ecd9202c128be2a8255357c68b33472946396d2`.
The [personal-favicon release](RELEASE-PERSONAL-FAVICON-2026-10-13.md) is archived.
This update preserves that favicon and the original user profile image.

See [the design and boundaries](QUIET-WORKFLOWS.md),
[Coder hosting](CODER-HOSTING.md), and [the checkpoint](CHECKPOINT.md).
