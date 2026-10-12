# lkjsns

An invitation-only community application built with native lkjscript inside
lkjscript-sandbox. The product interface is English, with a chronological feed,
explicit audiences, saved drafts, and a reusable media Drive.

Open [lkjsns on Coder](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
The native app runs in workspace `tomato-ocelot-73` on public port **8793**.
The custom domain now redirects to this Coder entrypoint. No Coder login is
required for guest pages; application accounts are still invitation-only.
See [Coder hosting](docs/CODER-HOSTING.md) for the verified October 12 routing
correction and [the release record](docs/RELEASE.md) for the unchanged app bundle.

## What is implemented

Accounts and invitations, profiles, following and muting, posts and replies,
bookmarks, Likes, and notifications are connected to persistent native data.
Drive supports image, video, and audio originals, folders, descriptions, sensitive
media controls, and up to four attachments per post. Uploading alone does not make
a file public. Versioned edits preserve submitted input when another tab wins.

Writing has a saved, owner-only preview with the actual post renderer and explicit
audience information. Save & upload, Save & choose files, Save & edit details, and
Save & remove submit the current writing before changing steps or attachments.
The preview never bypasses the normal publishing and conflict checks.

The picker retains its name query, type, folder, and page after a selection
changes. A separate tray shows selected attachments independently of those
filters. ASCII case-insensitive file-name matching and bounded empty-window
scanning keep older files reachable without an unbounded per-request search.

Reading actions keep the current feed, page, profile, or parent conversation.
The responsive interface has light and dark modes, keyboard focus states, and
mobile navigation. Forms and rendering work without application JavaScript.

## Development

The checksum-pinned public runtime is lkjscript 0.1.89. Setup downloads that pinned
runtime; it does not silently switch to a moving latest release.

```sh
./sandbox lkjsns setup
./sandbox lkjsns build
./sandbox lkjsns check
./sandbox lkjsns prepare
./sandbox lkjsns run
```

The local development configuration binds loopback. The source manifest binds
native fragments, authored CSS, operations scripts, and deployment configuration
to the selected detached bundle. Changed inputs require a new build.

An optional browser suite uses an already-installed Node/Playwright toolchain:

```sh
LKJSNS_PLAYWRIGHT=/absolute/path/to/playwright ./sandbox lkjsns browser
```

Set `LKJSNS_AXE` to an installed `axe.min.js` to include the optional automated
accessibility audit. Without it, the browser runner explicitly reports that the
axe audit was not run.

The browser suite creates isolated synthetic data, checks real HTTP/browser
journeys, writes private evidence under `.build`, and stops its own process. It
refuses non-loopback test URLs. `tests/browser/restart.sh` checks a stopped fixture
or an independent offline copy. `tests/browser/upgrade.sh` checks the new binary
against a preceding native fixture, then checks binary rollback against the same
updated data. Neither script accepts public-service storage paths.

Node is a development-test dependency only; the application server and its
behavior remain native lkjscript. Normal CI stays a lightweight repository check.

## Important boundaries

Saving is explicit, not automatic. Closing a tab or leaving through an unrelated
link can lose unsubmitted edits. The preview is not a browser-local recovery copy.

Public means readable without signing in. Members means all registered members,
not just followers. Unattached files are owner-only; posted file access is checked
against a current readable post reference. Removing the last public reference
revokes future anonymous delivery, not already downloaded copies.

Limits are 32 MiB per file, 2 GiB of reserved/used storage per account, and four
attachments per post. Originals are not transcoded, compressed, or stripped of
location metadata. Codec support depends on the browser. There is no email-based
password recovery, federation, or promised physical erasure from retained history.
Media GET and single byte ranges are supported. Media HEAD is explicitly unavailable
with this runtime: authorized requests return 405/Allow: GET, not incorrect zero-
length metadata. Unauthorized requests remain 404.

See [the current checkpoint](docs/CHECKPOINT.md),
[the verified release](docs/RELEASE.md),
[writing and library decisions](docs/WRITING-LIBRARY.md),
[Coder workspace hosting](docs/CODER-HOSTING.md),
[synthetic acceptance screenshots](docs/screenshots/README.md),
[English-first interaction decisions](docs/ENGLISH-READING.md), and
[the native architecture](docs/DESIGN.md).
