import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from '../config/env.js'

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
})

export async function uploadBuffer(key: string, body: Buffer | Uint8Array, contentType: string) {
  await s3.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`
}

export async function uploadText(key: string, text: string, contentType: string) {
  return uploadBuffer(key, Buffer.from(text, 'utf8'), contentType)
}
