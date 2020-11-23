# Serverless Video Thumbnail Generator

Takes video files and generates screen caps allowing for custom image sizes and labels. Images are pulled from the midpoint of video and resizing respects the video's original aspect ratio.

### Instructions

The steps below are loosely based off of this tutorial: [Using AWS Lambda with Amazon S3](https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html)

1. Create two S3 buckets, one for pre-processing and one for post-processing
2. Setup policies and roles to allow lambda to access buckets
3. Create lamda and apply newly created role
4. Add ffmpeg layer to lambda which can be found here: [ffmpeg layer](https://serverlessrepo.aws.amazon.com/applications/arn:aws:serverlessrepo:us-east-1:145266761615:applications~ffmpeg-lambda-layer)
5. Add event handler to pre-processing S3 bucket to trigger lambda on object creation
6. Update bucket name in provided code
7. Create a zip file of source code and upload it to the lambda
8. Test by uploading a video file to pre-processing bucket.
9. Post-processing bucket should contain two thumbnails if all went well

### Acknowledgements

This code was originally forked from this repo: [s3-lambda-ffmpeg-thumbnail-builder](https://github.com/serverlesspub/s3-lambda-ffmpeg-thumbnail-builder). I ended up changing a lot of the code in order to add the features that I wanted like the midpoint and aspect ratio features, but the repo was a great jumping off point.
