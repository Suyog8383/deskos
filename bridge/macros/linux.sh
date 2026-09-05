#!/usr/bin/env bash
# DeskOS bridge macros — Linux.
#
# Not one of the hackathon's target laptop platforms, but kept so the
# bridge can be developed and demoed end-to-end on a Linux machine.
# Relies on whatever of these is installed: playerctl, wmctrl, xdotool,
# amixer. Missing tools make an action a silent no-op rather than a
# crash, so the demo degrades gracefully.
#
# Called by macroExecutor.js as: bash linux.sh <action>

set -uo pipefail

action="${1:-}"

need() { command -v "$1" >/dev/null 2>&1; }

# A missing helper tool is treated as a no-op, not a macro failure — it's
# an expected state on a bare dev box, not a bug in the bridge.
skip() { echo "[linux.sh] '$1' not installed — skipping '$action'" >&2; }

case "$action" in
  play_pause) need playerctl && playerctl play-pause || skip playerctl ;;
  next_track) need playerctl && playerctl next || skip playerctl ;;
  prev_track) need playerctl && playerctl previous || skip playerctl ;;
  volume_up)   need amixer && amixer -q sset Master 5%+ || skip amixer ;;
  volume_down) need amixer && amixer -q sset Master 5%- || skip amixer ;;
  mute_toggle) need amixer && amixer -q sset Master toggle || skip amixer ;;
  desktop_left)
    if need wmctrl; then
      cur=$(wmctrl -d | awk '/\*/{print $1}')
      [ -n "$cur" ] && [ "$cur" -gt 0 ] && wmctrl -s $((cur - 1))
    else
      skip wmctrl
    fi
    ;;
  desktop_right)
    if need wmctrl; then
      cur=$(wmctrl -d | awk '/\*/{print $1}')
      total=$(wmctrl -d | wc -l)
      [ -n "$cur" ] && [ $((cur + 1)) -lt "$total" ] && wmctrl -s $((cur + 1))
    else
      skip wmctrl
    fi
    ;;
  app_switch)
    need xdotool && xdotool key alt+Tab || skip xdotool
    ;;
  *)
    echo "Unknown action: $action" >&2
    exit 1
    ;;
esac

exit 0
