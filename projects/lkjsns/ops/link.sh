#!/usr/bin/env bash
# Operational assembly of authored native fragments into a complete public draft.
# Sourced by build.sh; no application behavior is generated in a host language.
link_http_target() {
  local module draft
  draft="$work/service.draft.$(date +%s%N).lkjc"
  "$LKJ" --project "$project" query find module service > "$work/service.query.log"
  mapfile -t modules < <(grep -oE 'mod_[0-9a-f]{32}' "$work/service.query.log" | sort -u)
  [[ ${#modules[@]} == 1 ]] || { echo 'The service module was not resolved uniquely.' >&2; return 1; }
  module=${modules[0]}
  "$LKJ" --project "$project" change draft --owner "$module" --output "$draft" > "$work/service.draft.log"
  [[ "$(grep -c '^[[:space:]]*(component edit ' "$draft")" == 1 ]]
  # The only existing port is the permanent, non-routing health port. Preserve
  # its exact identity; attach the real router as a second port in this draft.
  [[ "$(grep -c '^[[:space:]]*(port edit ' "$draft")" == 1 ]] || {
    echo 'Expected exactly the existing health port.' >&2
    return 1
  }
  awk '
    /^    \(port create view/{copy=1}
    /^  \)\)/{copy=0}
    copy{print}
  ' "$ROOT/src/service.lkjc" > "$work/http-port.fragment.lkjc"
  sed -n '/^(target create lkjsns/,$p' "$ROOT/src/service.lkjc" > "$work/http-target.fragment.lkjc"
  [[ -s "$work/http-port.fragment.lkjc" && -s "$work/http-target.fragment.lkjc" ]]
  # Insert literal native declarations. All existing draft text and exact child
  # identities are retained. Require exactly one of each structural anchor.
  awk -v aliases="$ROOT/src/00-types.lkjc" \
      -v port="$work/http-port.fragment.lkjc" \
      -v target="$work/http-target.fragment.lkjc" '
    function emit(path, line, result) {
      while ((result = getline line < path) > 0) print line
      if (result < 0) failed=1
      close(path)
    }
    $0 == "(units" {print; emit(aliases); units++; next}
    /^[[:space:]]*\(component edit / {print; emit(port); components++; next}
    $0 == ")" {emit(target); endings++}
    {print}
    END {if (failed || units != 1 || components != 1 || endings != 1) exit 2}
  ' "$draft" > "$work/http-link.request.lkjc" || {
    echo 'Public draft shape changed; inspect it without editing canonical storage.' >&2
    return 1
  }
  apply_request http-link "$work/http-link.request.lkjc"
}
