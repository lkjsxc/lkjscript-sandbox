#!/usr/bin/env bash
# Validate an operator-selected HTTPS origin; this never authorizes another Host.
valid_public_origin() {
  local value=${1:-} host LC_ALL=C
  [[ "$value" == https://* ]] || return 1
  host=${value#https://}
  [[ ${#host} -le 253 ]] || return 1
  [[ "$host" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$ ]]
}
