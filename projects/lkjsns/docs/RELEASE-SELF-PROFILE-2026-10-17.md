# Quiet own profile — October 17, 2026

The fix was deployed at **2026-10-17 04:06:06 JST** (2026-10-16T19:06:06Z) to
Coder workspace **devmain**, agent **main**, public port **8793**.
[Open lkjsns](https://8793--main--devmain--lkjsxc.apps.coder.lkjsxc.com).

## Changed behavior

Your own profile no longer renders the redundant **You** badge. The server
omits its HTML rather than hiding it with CSS or JavaScript. Edit profile and
Attention to / Attention from remain in place. Other profiles retain **Mutual
attention** and **Attention to you**. Relationship-list rows still identify the
viewer with **You**, separately from the own-profile presentation.

Only two executable fragments changed: a scoped profile-badge helper and the
profile renderer's call to it. The shared list badge is unchanged. Post reactions
remain Attention. No relationship, account, notification, schema, media, routing,
style, icon or runtime behavior was changed, and no migration was performed.

## Exact deployed identity

Executable source: `864d16814ef77b8f22a5da0bc453bd14e0a42255`

Source tree: `736540e5cee7ab3f68f0c80cab580faa63689233`

Application SHA-256:
`611d0fa2e469066a4749f510df08f829f8e8eb65de1cdec76e95844e3b892205`

Application size: **11,011,047 bytes**.

Native graph:
`rev_4439c2926d26f4afa97ce4ba2ef6a73442bf9e9c1160bcd08e511f365dc6088c`

Runtime remains checksum-pinned **lkjscript 0.1.89**. The previous accepted
project was copied into a separate candidate. Both scoped changes were accepted
through public native draft/plan/apply, followed by a complete check/build with
an exact source-input manifest. Canonical meaning was not edited directly.
The ordinary main push was independently read back with Git and the GitHub API.
This later documentation commit does not change the executable identity.

## Completed verification

The new regression test failed against the preceding published bundle because
its own-profile badge was present. The corrected candidate passed **613 native
tests**, zero failed, with equal production/reference outcomes.

A fresh isolated store passed **29 browser groups**: accounts, writing, attention,
and own-profile regression. The own profile was checked in **48 combinations**
of four widths (320/390/768/1280px), two themes, JavaScript on/off, and three
paging-URL variants. Tests assert server-side omission, intact profile controls,
other people's incoming/mutual state, unchanged list identity, guest boundaries,
and unchanged user-avatar bytes. The test restores its initial relationships.
Selected accessibility checks found zero violations in mobile/desktop light/dark
own-profile views. Native synthetic-store verification also passed.

After cutover, **49 read-only public browser groups** passed. Public CSS, scripts,
icons and manifest still match their unchanged source bytes. Health and the
custom-domain profile redirect passed. Authenticated own-profile assertions use
synthetic accounts only; no real-user login or synthetic write was performed on
the public store. The preceding full 120-group media/transfer suite is historical,
not claimed as rerun for this presentation-only correction.

## Preserved state

A private stopped-service snapshot was retained. Stored data/object paths and
hashes were identical before replacement, after replacement and immediately after
restart. Runtime, bootstrap secret, origin and launch-configuration hashes were
unchanged. No proxy, tunnel or unrelated service was changed.

Previous bundle:
`e1f55a8b462f9b4e3da6ad3bdffecc64d489a136d886864f70ff89bc5b6b4b16`.

The [Attention and circular-identity release](RELEASE-ATTENTION-2026-10-17.md)
is archived. See [the Attention contract](ATTENTION.md) for retained behavior.
