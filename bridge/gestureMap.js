'use strict';

/**
 * Maps a gesture command name (sent by the phone's on-device MediaPipe
 * pipeline) to a macro action name (handled by macroExecutor.js). Kept as
 * a flat, editable table so the mapping can be retuned during the demo
 * without touching server or macro logic.
 */
const GESTURE_TO_ACTION = {
  OPEN_PALM: 'play_pause',
  FIST: 'mute_toggle',
  SWIPE_LEFT: 'desktop_left',
  SWIPE_RIGHT: 'desktop_right',
  THUMBS_UP: 'volume_up',
  THUMBS_DOWN: 'volume_down',
  POINT_UP: 'next_track',
  POINT_DOWN: 'prev_track',
  PINCH: 'app_switch',
};

function resolveAction(command) {
  if (typeof command !== 'string') return null;
  return GESTURE_TO_ACTION[command.toUpperCase()] || null;
}

module.exports = { GESTURE_TO_ACTION, resolveAction };
