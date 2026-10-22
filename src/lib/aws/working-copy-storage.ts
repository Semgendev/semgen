import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

// Working copies live in a private S3 bucket in the same region as the render machines
// (Stockholm): fast for Lambda, and no size limit like the free Supabase Storage.
const configSchema = z.object({
  bucket: z.string().min(3),
  region: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
});

function client() {
  const config = configSchema.parse({
    bucket: process.env.WORKING_COPY_BUCKET,
    region: process.env.REMOTION_AWS_REGION,
    accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY,
  });
  const s3 = new S3Client({
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  return { s3, bucket: config.bucket };
}

export function isWorkingCopyStorageConfigured(): boolean {
  return Boolean(process.env.WORKING_COPY_BUCKET);
}

export async function uploadWorkingCopy(key: string, filePath: string): Promise<void> {
  const { s3, bucket } = client();
  const { size } = await stat(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(filePath),
      ContentLength: size,
      ContentType: "video/mp4",
    }),
  );
}

export async function signWorkingCopyUrl(key: string, expiresInSeconds: number): Promise<string> {
  const { s3, bucket } = client();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}

// Deleting a missing object succeeds, so this is safe to repeat.
export async function deleteWorkingCopy(key: string): Promise<void> {
  const { s3, bucket } = client();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
