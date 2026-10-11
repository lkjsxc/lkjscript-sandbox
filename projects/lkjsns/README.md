# lkjsns

An invitation-only community application built with native lkjscript inside
lkjscript-sandbox. The interface is English-first, with a chronological feed,
explicit audiences, private drafts and a reusable media Drive.

## What is implemented

Accounts and invitations, profiles, following and muting, posts and replies,
bookmarks, Likes and notifications are connected to persistent native data.
Drive supports image, video and audio originals, folders, descriptions, sensitive
media controls, and up to four attachments per post. Uploading alone does not make
a file public. Versioned edits preserve submitted input when another tab wins.

Reading actions keep the current feed, page, profile or parent conversation.
The responsive interface has light and dark modes, keyboard focus states and
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
native fragments, authored CSS, operations scripts and deployment configuration to
the selected detached bundle. Changed inputs require a new build.

An optional browser suite uses an already-installed Node/Playwright toolchain:

```sh
LKJSNS_PLAYWRIGHT=/absolute/path/to/playwright ./sandbox lkjsns browser
```

The browser suite creates isolated synthetic data, checks real HTTP/browser
journeys, writes private evidence under `.build`, and stops its own process. It
refuses non-loopback test URLs. Node is a development-test dependency only; the
application server and its behavior remain native lkjscript. Normal CI stays a
lightweight repository check.

## Important boundaries

Public means readable without signing in. Members means all registered members,
not just followers. Unattached files are owner-only; posted file access is checked
against a current readable post reference. Removing the last public reference
revokes future anonymous delivery, not already downloaded copies.

Limits are 32 MiB per file, 2 GiB of reserved/used storage per account and four
attachments per post. Originals are not transcoded, compressed or stripped of
location metadata. Codec support depends on the browser. There is no email-based
password recovery, federation or promised physical erasure from retained history.
Media GET and single byte ranges are supported. Media HEAD is explicitly unavailable
with this runtime: authorized requests return 405/Allow: GET, not incorrect zero-
length metadata. Unauthorized requests remain 404.

See [the current checkpoint](docs/CHECKPOINT.md),
[English-first interaction decisions](docs/ENGLISH-READING.md), and
[the native architecture](docs/DESIGN.md).
