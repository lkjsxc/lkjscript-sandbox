# lkjsns

An invitation-only community built with native lkjscript inside lkjscript-sandbox.
The interface is English, with chronological posts, explicit audiences, reusable
files, private tags, and a focused writing workspace.

Open [lkjsns on Coder](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
The native app runs in workspace `tomato-ocelot-73` on public port **8793**.
The custom domain redirects to this Coder entrypoint. Guest pages do not require
Coder authentication; community accounts require an application invitation.
[The release record](docs/RELEASE.md) identifies the exact deployed bundle and
separates local acceptance from public-service verification.

## Reading, writing, and settings

Home, Search, Notifications, Bookmarks, Drive, and Settings are the primary destinations.
Clicking the account identity opens its profile. Drafts and Members remain reachable from Settings. Drive also keeps its
Settings shortcut. Profile, profile image, and password changes have their
own settings pages. Admin has an overview and an Invitations child page.

The composer is focused on entry and has a visible text boundary. Save draft,
Save & preview, Save & choose files, and Post share one action group. The selected
audience persists for the next post. Preview shows the actual post before its
audience summary. Uploading from the picker saves the file, attaches it to the
saved draft, and returns to writing without publishing.

Posts support replies, following, muting, Attention, private bookmarks, and
notifications. Clicking a post's body opens its permalink without taking over
links, media controls, or text selection. Deletion asks for confirmation after
the delete action; cancelling the browser dialog retains unsubmitted writing.
Stale-version conflicts preserve submitted text or tags rather than overwriting
another tab's work.

Search has a single query field. It finds readable published posts and, for signed-in
viewers, people by handle or display name. It supports literal substring matching,
ASCII case folding, and Unicode text. Drafts, deleted posts, and muted authors are
not exposed. Work per request is bounded; older results remain paginated.

## Drive and profile images

Drive accepts **any file type up to 256 MiB**. Multiple private tags replace the
folder interface. The main library has no name-search, type, or folder form.
Uploading does not publish a file. Up to four files can be attached to a post.

Recognized images, audio, and video can render inline. Other formats, including
text, HTML, and SVG, are downloadable attachments rather than executable pages.
Original filenames are preserved for downloads, but uploading does not require
editing a filename or description. Existing descriptions and files are retained.

Profile images can be selected from ready, nonsensitive Drive images up to 8 MiB.
Their selected representation is public; that does not make the original's private
Drive URL public. Files currently used by a profile or post cannot be deleted
until those references are removed.

Normal pages do not repeat their name in a visible top banner. Draft previews are
whole-card links. Attachment and profile-image pickers use the preview itself as
the selection control, without separate Attach or Use as profile image buttons.

Posts and files use `/<id>` addresses, with `/<id>/edit` for published editing and
`/<id>/raw` for originals. Existing query-style resource links redirect to these
addresses. Invitation counts and durations no longer have the old 20-person/
30-day caps; blank fields explicitly mean unlimited uses or no expiration.

## Native server and bounded transfer

Authentication, authorization, posts, settings, tags, search, storage, and HTML
rendering remain native lkjscript. There is no Node/Python application server.
Browser JavaScript provides post-card navigation, preference delivery, confirmation
dialogs, and file-transfer progress/resumption.

Large files use native 4 MiB upload parts, not a 256 MiB HTTP body. Completed parts
are acknowledged durably; the browser can resume an interrupted transfer while
the upload page and selected file remain available. Downloads use validated byte
ranges. The portable browser save path can temporarily buffer a large file.

Core forms, writing, preview, confirmation pages, and the multipart upload fallback
work with JavaScript disabled. Files larger than 32 MiB require JavaScript for
uploading and full-file downloading. Media HEAD is deliberately unsupported: an
authorized request returns 405 with Allow: GET, not incorrect zero-length metadata.

## Development

The checksum-pinned public runtime is lkjscript **0.1.89**. Setup verifies it and
does not silently switch to a moving latest release.

```sh
./sandbox lkjsns setup
./sandbox lkjsns build
./sandbox lkjsns check
./sandbox lkjsns prepare
./sandbox lkjsns run
```

The source manifest binds every native source fragment, authored stylesheet,
browser script, operation script, and deployment configuration to the selected
bundle. Executable-input changes require rebuilding. Development binds loopback;
prepare/run do not deploy the public service.

Optional browser acceptance uses an already-installed Node/Playwright toolchain:

```sh
LKJSNS_PLAYWRIGHT=/absolute/path/to/playwright \
LKJSNS_AXE=/absolute/path/to/axe.min.js \
./sandbox lkjsns browser
```

`LKJSNS_AXE` is optional; omission explicitly skips the automated accessibility
audit. `tests/ux/run.sh` creates a fresh private synthetic store and exercises real
forms, media, search, request security, responsive layout, a 256 MiB upload/download,
no-script operation, and native restart. It stops its own service afterward.
`tests/ux/public-read.cjs` is a separate read-only public check, not authenticated
production acceptance. Normal repository CI remains lightweight.

## Boundaries

Post saving is explicit, not automatic. Navigating away can lose unsubmitted text;
cancelling a delete dialog does not. A Members post is readable by all registered
members, not followers only. Public posts and their attachments are readable
without signing in. Removing a reference revokes future access, not copies that
someone already downloaded.

The account allowance is **2 GiB**, including incomplete upload reservations.
Incomplete uploads can be removed after the existing five-minute stale-upload
interval. Originals are not transcoded, compressed, or stripped of location
metadata. Browser codec support varies. There is no federation, email-based
password recovery, or promise of physical erasure from retained history/backups.

See [direct interactions and resource paths](docs/DIRECT-INTERACTIONS.md),
[community UX and transfer architecture](docs/COMMUNITY-UX.md),
[the current checkpoint](docs/CHECKPOINT.md),
[the release record](docs/RELEASE.md),
[Coder workspace hosting](docs/CODER-HOSTING.md), and
[operations](docs/OPERATIONS.md).
