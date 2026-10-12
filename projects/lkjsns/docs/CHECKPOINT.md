# lkjsns checkpoint — October 13, 2026

The profile-derived **lkjsns** favicon is live through
[Coder public port 8793](https://8793--main--tomato-ocelot-73--lkjsxc.apps.coder.lkjsxc.com).
Promotion completed at **2026-10-13 07:04:03 JST** with existing data and the original lkjsxc
profile image preserved.

Executable source: `72ff3cbbeb8483b06e5b9e66d32e3a80c6c8d234`

Application SHA-256: `beaf52afd7e20ce5d03c742b9ecd9202c128be2a8255357c68b33472946396d2`

Runtime remains the unchanged checksum-pinned lkjscript 0.1.89 executable.

## Current favicon contract

Use the four-panel/white-circle personal icon, slightly recolored with outlined
**lkjsns** lettering. Do not revert to the generic lk/ mark. The current content
revision is `b7cf1e2c2a49`; document heads use versioned icon filenames, and legacy
icon paths remain compatible. All SVG/ICO/PNG variants are first-party native
assets, not runtime font-dependent text or user avatar replacements.

The reviewed SVG is the source artwork. The optional render-icons.cjs generator
creates its small indexed PNG/ICO representations. Then embed-icons.cjs updates
the split native icondata payloads, native links and versioned routes together.
The ordinary build manifest and exact-byte browser tests bind these to a selected
bundle. No original avatar image or font file is part of the public source export.

The release passed 487 native tests, 86 synthetic browser groups and 27 read-only
public groups. Data/object hashes and the original avatar bytes were preserved.
See [RELEASE.md](RELEASE.md) and [PERSONAL-FAVICON.md](PERSONAL-FAVICON.md).

## Retained application behavior

Bounded readable reply previews, root resource IDs, Drive in primary navigation,
no normal page-title banners, direct attachment/avatar selection, whole-draft
links, uncapped/explicitly unlimited invitations, search, private tags and bounded
256 MiB transfer remain unchanged. Keep object effects outside retried metadata
transactions and preserve the existing Coder Host/Origin and port 8793.

Keep private fixtures, raw source-avatar captures, fonts, credentials and snapshots
out of Git. Do not restart or enable stopped tunnel dependencies. Public smoke
checks remain read-only and distinct from authenticated synthetic acceptance.
