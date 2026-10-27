# Collection pagination

Previous and Next use one shared native control. Both directions remain visible;
the unavailable direction is disabled. Timeline pages after the first show the
control before and after the post collection. The top control follows identity,
tabs, and filters. Other collections retain a control after their contents.

A bounded trail of numeric cursors restores the exact preceding page and filters.
A direct cursor without history shows a disabled Previous and a separate First
link; it never guesses from a sparse or filtered index. Search maintains separate
post and people histories. Forms keep their reading context.

Home and Attention render the first ten indexed entries, then load the remainder
of the same thirty-entry window progressively. A snapshot cursor prevents new
posts from moving that window between requests. A normal link loads the full
page when JavaScript is unavailable or incremental loading fails. Each request
rechecks the current viewer and visibility.
