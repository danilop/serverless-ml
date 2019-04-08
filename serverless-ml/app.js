const AWS = require('aws-sdk');

const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();

const json2csv = require('json2csv').parse;

const INDEX_BUCKET = process.env.INDEX_BUCKET;

async function processObject(s3bucket, s3key) {
    
    const image = {
        S3Object: {
            Bucket: s3bucket,
            Name: s3key
        }
    };
    console.log('image:', image);

    const rekognitionPromises = [
        rekognition.detectModerationLabels({
            Image: image,
            MinConfidence: 50
        }).promise(),
        rekognition.detectLabels({
            Image: image,
            MaxLabels: 100,
            MinConfidence: 50
        }).promise(),
        rekognition.detectText({
            Image: image
        }).promise(),
        rekognition.detectFaces({
            Image: image,
            Attributes: ['ALL']
        }).promise()
    ];

    try {
        const results = await Promise.all(rekognitionPromises);
        results.forEach(function (r) { r.fileName = s3key });
        console.log(results);

        const fields = [
            "fileName",
            "Labels.Name",
            "Labels.Confidence",
            "ModerationLabels.Name",
            "ModerationLabels.ParentName",
            "ModerationLabels.Confidence",
            "TextDetections.DetectedText",
            "TextDetections.Type",
            "TextDetections.Id",
            "TextDetections.ParentId",
            "TextDetections.Confidence",
            "TextDetections.Geometry",
            "FaceDetails.BoundingBox",
            "FaceDetails.AgeRange",
            "FaceDetails.Smile",
            "FaceDetails.Eyeglasses",
            "FaceDetails.Sunglasses",
            "FaceDetails.Gender",
            "FaceDetails.Beard",
            "FaceDetails.Mustache",
            "FaceDetails.EyesOpen",
            "FaceDetails.MouthOpen",
            "FaceDetails.Emotions.Type",
            "FaceDetails.Emotions.Confidence",
            "FaceDetails.Landmarks",
            "FaceDetails.Pose",
            "FaceDetails.Quality",
            "FaceDetails.Confidence"
        ];
        const unwind = [
            "Labels",
            "ModerationLabels",
            "TextDetections",
            "FaceDetails",
            "FaceDetails.Emotions"
        ];
        const csv = json2csv(results, { fields, unwind, flatten: true, quote: '' });
        console.log(csv);

        const s3Data = await s3.putObject({
            Bucket: INDEX_BUCKET,
            Key: s3key + '.csv',
            Body: csv
        }).promise();
        console.log(s3Data);

    } catch (err) {
        console.error(err);
    }
}

exports.lambdaHandler = async (event, context) => {
    console.log(event);

    for (const element of event.Records) {

        const s3bucket = element.s3.bucket.name;
        const s3key = element.s3.object.key;
        console.log('object:', s3bucket, s3key);

        const extension = s3key.split('.').pop();
        console.log('extension: ', extension);

        await processObject(s3bucket, s3key);


    }
};
