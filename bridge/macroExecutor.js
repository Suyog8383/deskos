'use strict';

const path = require('path');
const { spawn } = require('child_process');

const MACROS_DIR = path.join(__dirname, 'macros');

// Keep this list in sync with every action name used in gestureMap.js and
// in the macro scripts themselves — the gestureMap test suite checks it.
const VALID_ACTIONS = new Set([
  'play_pause',
  'next_track',
  'prev_track',
  'volume_up',
  'volume_down',
  'mute_toggle',
  'desktop_left',
  'desktop_right',
  'app_switch',
]);

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'ignore' });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function runMacro(action) {
  if (!VALID_ACTIONS.has(action)) {
    throw new Error(`unknown macro action: ${action}`);
  }

  switch (process.platform) {
    case 'win32':
      return run('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        path.join(MACROS_DIR, 'windows.ps1'),
        '-Action',
        action,
      ]);
    case 'darwin':
      return run('osascript', [path.join(MACROS_DIR, 'mac.applescript'), action]);
    case 'linux':
      // Not part of the hackathon target platforms, but handy for
      // developing/testing the bridge itself on a Linux laptop.
      return run('bash', [path.join(MACROS_DIR, 'linux.sh'), action]);
    default:
      throw new Error(`unsupported platform: ${process.platform}`);
  }
}

module.exports = { runMacro, VALID_ACTIONS };
