# lkjsns

An invitation-only community built with native lkjscript inside lkjscript-sandbox.
The interface is English, with chronological posts, explicit audiences, reusable
files, private tags, and a focused writing workspace.

Open [lkjsns on Coder](https://8793--main--devmain--lkjsxc.apps.coder.lkjsxc.com).
The native app runs in workspace `devmain` on public port **8793**.
The custom domain redirects to this Coder entrypoint. Guest pages do not require
Coder authentication; community accounts require an application invitation.
[The release record](docs/RELEASE.md) identifies the exact deployed bundle and
separates local acceptance from public-service verification.

## Reading, writing, and navigation

The composer has **Attach file** and **Post**. File selection, uploading, removal,
and file options retain the text, audience, content warning, and reply identity
without publishing. There is no visible draft collection, Save draft control, or
preview step. Existing owned working copies remain private and editable.
Published posts have **Save changes** and a separate confirmed deletion action.

Home, Search, Notifications, Bookmarks, Drive, Settings, and More are the desktop
destinations. The mobile dock has only **Home, Post, Notifications, More**.
More links to search, bookmarks, files, members, your profile, settings, authorized
administration, and service information. Settings contains profile/security
settings and sign-out rather than a second site map. About is no longer pinned
to the sidebar footer. Every product-owned label remains English.

Bookmarks put the most recently bookmarked item first. Next spans its feed's
width, and a top Prev restores the exact preceding page and filter. The bounded
native cursor trail also survives reactions and attachment selection; it works
without JavaScript. Direct cursor URLs without a preceding trail offer First.

Posts support replies, muting, Attention, bookmarks, and notifications.
User relationships also use Attention: profiles link to Attention to and
Attention from, with native in-list controls and mutual-state labels.
Notifications distinguish Post attention from People attention.
Reply counts follow current readability, mute, and deletion checks, not a count
of hidden records. Up to 256 indexed replies are inspected per card; an incomplete
positive count carries a plus sign rather than pretending to be exact.

HTTP(S) links in posts and profile text open separately, with opener/referrer
protection and a small external-link indicator. Native rendering escapes content,
handles punctuation and Unicode, and does not fetch remote previews. Clicking
other post content still opens its permalink without intercepting controls or
text selection. Conflicting versions retain the attempted input for comparison.

Search finds readable published posts and, for signed-in viewers, people by
handle or display name. Literal substring matching, ASCII case folding, Unicode,
and bounded pagination are supported. Private working copies, deleted posts,
and muted authors are not exposed in search.

About, Privacy policy, Terms of service, Community guidelines, and Contact are
publicly readable from More. Registration links to the terms and privacy copy.
The operator contact uses the public address on lkjsxc's GitHub profile. The
service documents describe the implementation, not unimplemented encryption,
automated account deletion, or a promise of immediate backup erasure. See
[operator responsibilities](docs/OPERATOR-RESPONSIBILITIES.md).

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

Normal pages do not repeat their name in a visible top banner. Attachment and
profile-image pickers use the preview itself as the selection control, without
separate Attach or Use as profile image buttons. Upload sits beside the storage
meter. File tiles have inset text padding, and Used in renders normal post cards
with native actions that return to the same file page.

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

Core forms, writing, attachment selection, confirmation pages, and the multipart upload fallback
work with JavaScript disabled. Files larger than 32 MiB require JavaScript for
uploading and full-file downloading. Media HEAD is deliberately unsupported: an
authorized request returns 405 with Allow: GET, not incorrect zero-length metadata.

Reply cards show their immediate parent as a bounded, readable preview. Long
parents do not push the reply body out of view, and warnings/private/deleted
parents retain their access boundaries. The site includes native SVG/ICO favicons
and a touch icon based on lkjsxc's personal four-panel/white-circle artwork,
with slightly adjusted colors and outlined lkjsns lettering, clipped to a circle
with transparent corners in every SVG/ICO/PNG representation. Content-versioned
icon URLs replace the preceding cached mark while old asset URLs still work.
The desktop sidebar, mobile header, and standalone error pages share this same
image rather than a separate `lk/` glyph. A browser manifest supplies 192px and
512px application/home-screen icons from the same source. See
[shared application identity](docs/SHARED-BRAND.md).

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

A Members post is readable by all registered
members, independently of attention relationships. Public posts and their attachments are readable
without signing in. Removing a reference revokes future access, not copies that
someone already downloaded.

The account allowance is **2 GiB**, including incomplete upload reservations.
Incomplete uploads can be removed after the existing five-minute stale-upload
interval. Originals are not transcoded, compressed, or stripped of location
metadata. Browser codec support varies. There is no federation, email-based
password recovery, or promise of physical erasure from retained history/backups.

See [attention relationships](docs/ATTENTION.md),
[circular identity](docs/CIRCULAR-IDENTITY.md),
[quiet workflows](docs/QUIET-WORKFLOWS.md),
[the profile-derived favicon](docs/PERSONAL-FAVICON.md),
[reply rendering and favicon](docs/REPLIES-FAVICON.md),
[direct interactions and resource paths](docs/DIRECT-INTERACTIONS.md),
[community UX and transfer architecture](docs/COMMUNITY-UX.md),
[the current checkpoint](docs/CHECKPOINT.md),
[the release record](docs/RELEASE.md),
[Coder workspace hosting](docs/CODER-HOSTING.md), and
[operations](docs/OPERATIONS.md).
