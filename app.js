const express = require('express');
const { S3Client, HeadObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 2525;

// AWS S3 client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Middleware to validate API request parameters
function validateParameters(req, res, next) {
  const { projectId, modelId, env } = req.query;
  if (!projectId || !modelId || !env) {
    return res.status(400).json({ message: 'Missing parameters' });
  }
  next();
}

// Endpoint to download file from S3
app.get('/download', validateParameters, async (req, res) => {
  const { projectId, modelId, env } = req.query;
  const bucketName = `lora-${env}-lora-model-bucket`;
  const key = `${projectId}/${modelId}/${modelId}.safetensors`;

  // Set the destination path to have the same filename as in S3
  const destinationPath = `/home/ubuntu/stable-diffusion-webui-forge/models/Lora/${modelId}.safetensors`;

  // Check if the file already exists at the destination
  if (fs.existsSync(destinationPath)) {
    console.log(`File already exists at the destination: ${destinationPath}`);
    return res.status(200).json({ message: 'File already exists in the destination' });
  }

  // Download the file
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    const { Body } = await s3Client.send(getObjectCommand);

    // Read data from the stream and write to the file
    const fileStream = fs.createWriteStream(destinationPath);
    Body.pipe(fileStream);

    fileStream.on('finish', () => {
      console.log(`File downloaded successfully: ${destinationPath}`);
      res.status(200).json({ message: 'File downloaded successfully' });
    });

  } catch (err) {
    console.error('Error occurred during file download:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});