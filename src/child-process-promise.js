const childProcess = require('child_process');

/**
 * @typedef ChildProcessBuffers
 * @type {object}
 * @property {string} stdout - Standard output result string
 * @property {string} stderr - Standard error resulf string
 */

/**
 * Wraps spawned child process in a promise.
 * @param {string} command Command to run
 * @param {string[]} argsarray Array of command-line arguments
 * @param {object} envOptions child_process.spawn option object
 * @return {ChildProcessBuffers} Process's stderr output
 */
module.exports = function spawnPromise(command, argsarray, envOptions) {
  return new Promise((resolve, reject) => {
    const childProc = childProcess.spawn(
      command,
      argsarray,
      envOptions || { env: process.env, cwd: process.cwd() }
    );

    const stdoutBuffer = [];
    const stderrBuffer = [];

    childProc.stdout.on('data', (buffer) => {
      stdoutBuffer.push(buffer);
    });

    childProc.stderr.on('data', (buffer) => {
      stderrBuffer.push(buffer);
    });

    childProc.on('exit', (code, signal) => {
      if (code !== 0) {
        reject(`${command} failed with ${code || signal}`);
      } else {
        resolve({
          stdout: Buffer.concat(stdoutBuffer).toString().trim(),
          stderr: Buffer.concat(stderrBuffer).toString().trim()
        });
      }
    });
  });
};
