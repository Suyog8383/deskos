'use strict';

/**
 * macros.js — Maps WebSocket action strings to PC keystrokes via @nut-tree-fork/nut-js
 *
 * Each entry defines:
 *   keys   : array of Key constants to press together (held simultaneously)
 *   desc   : human-readable description for logging
 */

const { keyboard, Key } = require('@nut-tree-fork/nut-js');

// Speed up nut.js typing for instant macro response
keyboard.config.autoDelayMs = 0;

/**
 * Action → keystroke map
 * Add or modify entries here to support new gestures from the phone.
 */
const ACTION_MAP = {
  // ── Virtual Desktop Navigation ──────────────────────────────────────────
  SWIPE_RIGHT:    { keys: [Key.LeftControl, Key.LeftSuper, Key.Right], desc: 'Next virtual desktop' },
  SWIPE_LEFT:     { keys: [Key.LeftControl, Key.LeftSuper, Key.Left],  desc: 'Previous virtual desktop' },

  // ── Media Controls ───────────────────────────────────────────────────────
  MEDIA_PLAY_PAUSE: { keys: [Key.AudioPlay],         desc: 'Play / Pause media' },
  MEDIA_NEXT:       { keys: [Key.AudioNext],         desc: 'Next track' },
  MEDIA_PREV:       { keys: [Key.AudioPrev],         desc: 'Previous track' },

  // ── Volume ───────────────────────────────────────────────────────────────
  VOLUME_UP:   { keys: [Key.AudioVolUp],   desc: 'Volume up' },
  VOLUME_DOWN: { keys: [Key.AudioVolDown], desc: 'Volume down' },
  VOLUME_MUTE: { keys: [Key.AudioMute],    desc: 'Mute / Unmute' },

  // ── Window Management ────────────────────────────────────────────────────
  SHOW_DESKTOP:  { keys: [Key.LeftSuper, Key.D],    desc: 'Show / hide desktop' },
  TASK_VIEW:     { keys: [Key.LeftSuper, Key.Tab],  desc: 'Open Task View' },
  CLOSE_WINDOW:  { keys: [Key.LeftAlt, Key.F4],     desc: 'Close active window' },
  MINIMIZE_WIN:  { keys: [Key.LeftSuper, Key.Down], desc: 'Minimize active window' },
  MAXIMIZE_WIN:  { keys: [Key.LeftSuper, Key.Up],   desc: 'Maximize active window' },

  // ── System ───────────────────────────────────────────────────────────────
  LOCK_SCREEN:  { keys: [Key.LeftSuper, Key.L],                    desc: 'Lock screen' },
  SCREENSHOT:   { keys: [Key.LeftSuper, Key.LeftShift, Key.S],     desc: 'Snipping tool screenshot' },
  TASK_MANAGER: { keys: [Key.LeftControl, Key.LeftShift, Key.Escape], desc: 'Open Task Manager' },
};

/**
 * Execute a macro by action name.
 * @param {string} action - One of the keys in ACTION_MAP
 * @returns {Promise<{success: boolean, desc?: string, error?: string}>}
 */
async function executeMacro(action) {
  const macro = ACTION_MAP[action];

  if (!macro) {
    return { success: false, error: `Unknown action: "${action}"` };
  }

  try {
    await keyboard.pressKey(...macro.keys);
    await keyboard.releaseKey(...macro.keys);
    console.log(`[MACRO] ✅ ${action} → ${macro.desc}`);
    return { success: true, desc: macro.desc };
  } catch (err) {
    console.error(`[MACRO] ❌ ${action} failed:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Returns the list of all supported action names (useful for debugging / phone UI).
 */
function listActions() {
  return Object.entries(ACTION_MAP).map(([action, { desc }]) => ({ action, desc }));
}

module.exports = { executeMacro, listActions };
