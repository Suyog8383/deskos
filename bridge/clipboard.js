'use strict';

const { spawn } = require('child_process');

function pipeToCommand(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'ignore'] });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    child.stdin.end(input);
  });
}

async function writeClipboard(text) {
  switch (process.platform) {
    case 'win32':
      // Windows' `clip` expects UTF-16LE on stdin.
      return pipeToCommand('clip', [], Buffer.from(text, 'utf16le'));
    case 'darwin':
      return pipeToCommand('pbcopy', [], text);
    case 'linux':
      try {
        return await pipeToCommand('xclip', ['-selection', 'clipboard'], text);
      } catch {
        return pipeToCommand('xsel', ['--clipboard', '--input'], text);
      }
    default:
      throw new Error(`unsupported platform: ${process.platform}`);
  }
}

module.exports = { writeClipboard };
