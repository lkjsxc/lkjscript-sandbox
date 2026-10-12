# Personal-icon favicon release — October 13, 2026

The favicon based on **lkjsxc's current profile icon** is now live at
[the existing Coder entry](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
Promotion completed at **2026-10-13 07:04:03 JST** (2026-10-12T22:04:03Z). This is an actual
running-service update, not only an image proposal or source commit.

## Artwork

The current live lkjsxc avatar and the public GitHub avatar were inspected. Both
show the same four-panel background, white circle, and dark lkjsxc lettering.
The new favicon retains that composition, slightly adjusts the blue/periwinkle
colors, and replaces the lettering with the complete **lkjsns** name.

The circle retains its original relative size. The dark ink remains #0b1020.
The lettering is SVG outlines: no font file, external font request or client font
substitution is required. The original profile image itself is unchanged; its
public bytes were compared before and after the update and matched exactly.
See [the artwork and color specification](PERSONAL-FAVICON.md) and
[the touch-size preview](../web/apple-touch-icon.png).

SVG, 16/32px ICO, 32px PNG and 180px touch variants all use this same design. The
raster palette preserves the four panels, white disk and dark lettering rather
than using the former single-blue palette. At a 16px tab size, the composition is
the main recognition cue; the word has not been substituted with an abbreviation.

## Cache-safe delivery

Normal and error-page heads now refer to content-versioned filenames. The content
revision is **b7cf1e2c2a49**, derived from all four reviewed asset files. This changes
the browser's icon resource URL instead of relying only on expiry of its old
favicon cache. Existing unversioned icon URLs remain compatible aliases to the
new bytes. Exact Host and query checks are retained.

The assets are embedded in the native application and delivered without sign-in.
No Node/Python asset server, image CDN, font file or paid external agent was added.
Raster payloads use separate small public declaration proposals to remain within
the pinned runtime's normal review budget. The source manifest includes every
native payload and the SVG/ICO/PNG source bytes.

## Exact executable and verification

Source commit: `72ff3cbbeb8483b06e5b9e66d32e3a80c6c8d234`

Source tree: `032d7db16bc03fa6cbc814203639b6f480b0ff62`

Application SHA-256: `beaf52afd7e20ce5d03c742b9ecd9202c128be2a8255357c68b33472946396d2`

Application size: **10,316,248 bytes**.

Runtime: unchanged checksum-pinned **lkjscript 0.1.89**, executable SHA-256
`e24c054f9b3e44a71a8875aba5385aad82dc391a1eae88a6c115fca75bc5c9a9`.

Native graph: `rev_74886aacaeb6f32b5a2725fd910cea4c861b4174d23bb7a11e8ae710ed47cc7c`

The exact bundle passed **487 native tests**, with zero failures and equal
production/reference outcomes, and **86 synthetic browser groups**. The favicon
tests verify linked resource revisions, legacy aliases, MIME types, source/native
byte equality, ICO structure, browser decoding, all four exact panel colors,
white circle, dark lettering and absence of runtime font dependencies.

The full regression suite also rechecked accounts, invitations, explicit drafts,
reply rendering, media privacy, direct selection, 256 MiB transfer integrity,
request admission and cold restart. The optional accessibility inspection retained
eight primary and three reply scenarios without reported selected-rule violations.
These are synthetic loopback Chromium checks, not public-user writes or physical
Safari/iOS certification.

Read-only verification of the actual public service passed **27 groups**, including
normal/error-page declarations and exact bytes from both old and new favicon URLs.
It did not create production accounts, posts, invitations or files. Subsequent
release-document commits do not change the executable source identity above.

## Preserved state

A quiescent snapshot retained the preceding application and storage before the
short service restart. All metadata/object file paths and SHA-256 values matched
before and after the application replacement. The bootstrap secret, origin,
runtime binary, capability grants and service dependencies are unchanged. No
synthetic fixture was promoted and no unrelated service was restarted.

The preceding bundle SHA-256 was `777bedfe7300593453775c88051fa6f4151cb77b6a8be2e3b260b1f76cd85051`. Its
[reply-rendering release](RELEASE-REPLIES-2026-10-13.md) is archived. This update does
not change post/reply/account behavior, profile-image selection, stored schemas,
media limits or the site's main navigation. It changes only icon artwork/delivery
and associated authoring, build and verification inputs. The restart is not a
zero-downtime guarantee.
