const s3Util = require('./s3-util');
const path = require('path');
const os = require('os');
const spawnChildProcessPromise = require('./child-process-promise');

const EXTENSION = '.jpg';
const OUTPUT_BUCKET = 'video-post-process';
const MIME_TYPE = 'image';

/**
 * Generates a set of dimensions with a max width and height while maintaining
 * the video's original aspect ratio.
 * @param {string} metadata ffprobe metadata
 * @param {number} maxWidth Max width for resize
 * @param {number} maxHeight Max height for resize
 * @returns {string} Dimensions string (i.e. "400x125")
 */
function getSize(metadata, maxWidth, maxHeight) {
  const [_, match] = /DAR\s(\d+:\d+)/.exec(metadata);
  const [x, y] = match.split(':');
  const aspectRatio = x / y;

  // If aspect ratio is greater than 1, width is set to max and height will
  // adjust. If less than 1, height is set to max and width will adjust.
  return aspectRatio > 1
    ? `${maxWidth}x${Math.floor(maxHeight / aspectRatio)}`
    : `${Math.floor(maxWidth / aspectRatio)}x${maxHeight}`;
}

/**
 * Generates a videos duration midpoint in seconds.
 * @param {string} metadata ffprob metadata
 * @returns {number} Midpoint in seconds (i.e. 1.5)
 */
function getMidpoint(metadata) {
  // Pull duration from metadata and split into parts.
  const [_, match] = /Duration: (([0-9]+):([0-9]{2}):([0-9]{2}).([0-9]+))/.exec(
    metadata
  );
  const [hours, minutes, seconds] = match
    .split(':')
    .map((n) => Math.ceil(parseInt(n)));

  // Total the seconds then half it.
  return (hours * 3600 + minutes * 60 + seconds) / 2;
}

/**
 * Pulls screen cap from midpoint of video and saves it to S3 bucket.
 * @param {string} label Descriptor added to output filename
 * @param {string} inputFile Path to video to be screen capped
 * @param {string} inputKey Key of input file
 * @param {string} tempDir Directory to place output image
 * @param {number} maxWidth Max width of screen cap
 * @param {number} maxHeight Max height of screen cap
 * @return {Promise<void>}
 */
function screenCapAndSave(
  label,
  inputFile,
  inputKey,
  tempDir,
  maxWidth,
  maxHeight
) {
  const outputKey = inputKey.replace(/\.[^.]+$/, `-${label}` + EXTENSION);
  const outputFile = path.join(tempDir, label + EXTENSION);

  return (
    // Pulls metadata from video needed to produce start time and sizing
    spawnChildProcessPromise('/opt/bin/ffprobe', [inputFile])
      .then(
        // ffprobe uses stderr as its default buffer
        ({ stderr: metadata }) =>
          // Processes video to produce screen cap
          spawnChildProcessPromise(
            '/opt/bin/ffmpeg',
            [
              '-loglevel',
              'error',
              '-y',
              '-ss',
              getMidpoint(metadata),
              '-i',
              inputFile,
              '-s',
              getSize(metadata, maxWidth, maxHeight),
              '-frames:v',
              '1',
              outputFile
            ],
            // Options object requrired to execute above command in tempDir
            { env: process.env, cwd: tempDir }
          ),
        (error) => console.error('ffprobe error:', error)
      )
      .then(
        () =>
          s3Util.uploadFileToS3(
            OUTPUT_BUCKET,
            outputKey,
            outputFile,
            MIME_TYPE
          ),
        (error) => console.error('ffmpeg error:', error)
      )
  );
}

exports.handler = function (eventObject, context) {
  const tempDir = os.tmpdir();
  const eventRecord = eventObject.Records[0];
  const inputBucket = eventRecord.s3.bucket.name;
  const requestId = context.awsRequestId;
  const inputKey = eventRecord.s3.object.key;
  const inputFile = path.join(tempDir, requestId + path.extname(inputKey));

  return s3Util
    .downloadFileFromS3(inputBucket, inputKey, inputFile)
    .then(
      () =>
        screenCapAndSave(
          'thumbnail-big',
          inputFile,
          inputKey,
          tempDir,
          400,
          400
        ),
      (error) => console.error('S3 Download Error:', error)
    )
    .then(
      () =>
        screenCapAndSave(
          'thumbnail-small',
          inputFile,
          inputKey,
          tempDir,
          250,
          250
        ),
      (error) => console.error('S3 Upload Error:', error)
    )
    .then(
      () => {},
      (error) => console.error('S3 Upload Error:', error)
    );
};
