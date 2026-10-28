# Markdown in lkjsns

Posts, replies, and profile bios are rendered on the server from their original
Markdown source. Editing retains that source. Content-warning labels, names, and
attachment metadata remain plain text; a warning never reveals its hidden body
in a reply or activity preview.

The supported CommonMark-based subset includes ATX headings (`#` through
`######`), emphasis (`*`, `_`, `**`, `__`), strikethrough (`~~`), unordered and
ordered lists with nested items, read-only task lists, block quotes, horizontal
rules, inline code, backtick or tilde fenced code, inline links, and bare HTTP(S)
links. A single newline remains a visible line break. GFM-style pipe tables are
supported without alignment attributes. Escape punctuation with a backslash.
Markdown headings are nested under the page heading. Inline links accept
HTTP(S) or root-relative destinations; external links open
in a separate tab. Link reference definitions and raw HTML are not interpreted.

Markdown image syntax renders its alt text as an ordinary link, without fetching
the remote image. Use the existing attachment flow for images and other media.
Malformed or unsupported syntax is displayed safely as text. Parsing work is
bounded: nesting stops at 16 levels, inline matching scans at most 2,048 bytes
per candidate, and excess inline tokens, lines, list items, or table cells fall
back to text or additional blocks without silently dropping the input.

Rendering and excerpts run only after the existing access and mute checks.
Reply and activity excerpts parse the first 2,048 source bytes, rounded forward
to a UTF-8 boundary, before applying their existing 360-byte display bound.
There is no schema migration, no remote Markdown resource fetching, and no new
JavaScript dependency. Search continues to match the stored source text.
