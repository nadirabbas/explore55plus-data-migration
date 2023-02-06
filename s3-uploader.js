require("dotenv").config();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { agents } = require("./export-crm");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch-commonjs");

const uploaded = {};

const client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const avatars = _.flattenDeep([
  agents.map((agent) => agent.details.avatar),
]).map((img) => img.replace(/\.flywheelstaging|www\./g, ""));

(async () => {
  let i = 0;
  for (const link of avatars) {
    fetch(link)
      .then((res) => res.buffer())
      .then((buffer) => {
        const command = new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: "avatars/" + link.split("/").pop(),
          Body: buffer,
        });
        client
          .send(command)
          .then((res) => {
            console.log(`Done ${i} / ${avatars.length}`);
          })
          .catch((err) => console.log(link, "Error uploading", err))
          .finally(() => {
            i++;
          });
      })
      .finally(() => {
        i++;
      });
  }
})();
