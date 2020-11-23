/*global module, require, Promise, console */

const aws = require('aws-sdk');
const fs = require('fs');

const s3 = new aws.S3();

/**
 * Downloads a file from S3 and places it in local filesystem.
 * @param {string} bucket S3 bucket name
 * @param {string} fileKey Key of file to download
 * @param {string} filePath Path where file will be saved
 * @returns {Promise<void>}
 */
function downloadFileFromS3(bucket, fileKey, filePath) {
  return new Promise(function (resolve, reject) {
    const stream = s3
      .getObject({
        Bucket: bucket,
        Key: fileKey
      })
      .createReadStream();
    stream.on('error', reject);

    const file = fs.createWriteStream(filePath);
    file.on('error', reject);
    file.on('finish', function () {
      resolve(filePath);
    });

    stream.pipe(file);
  });
}

/**
 * Uploads a file to S3 from local filesystem.
 * @param {string} bucket S3 bucket to save to
 * @param {string} fileKey Key to save file under
 * @param {string} filePath Path of file to be saved
 * @param {string} contentType MIME type of content
 * @returns {Promise<void>}
 */
function uploadFileToS3(bucket, fileKey, filePath, contentType) {
  return s3
    .upload({
      Bucket: bucket,
      Key: fileKey,
      Body: fs.createReadStream(filePath),
      ACL: 'private',
      ContentType: contentType
    })
    .promise();
}

module.exports = {
  downloadFileFromS3,
  uploadFileToS3
};
