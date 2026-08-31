import "dotenv/config";

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
});

async function test() {
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: "test/deneme.txt",
        Body: "Neon Object Storage çalışıyor.",
        ContentType: "text/plain",
      })
    );

    console.log("✅ Dosya yüklendi");

    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME,
      })
    );

    console.log(
      "Dosyalar:",
      result.Contents?.map((item) => item.Key)
    );
  } catch (error) {
    console.error("❌ Hata:", error);
  }
}

test();