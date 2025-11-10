import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  type CreateBucketCommandInput,
  type CreateBucketConfiguration,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createHash, randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { env } from '@/env'

/**
 * Create S3 client configured for localstack or AWS
 */
function createS3Client(): S3Client {
  const endpoint = env.AWS_S3_ENDPOINT
  const region = env.AWS_S3_REGION

  return new S3Client({
    endpoint,
    region,
    forcePathStyle: true, // Required for localstack
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  })
}

export const s3Client = createS3Client()

/**
 * Get default bucket name from environment
 */
function getDefaultBucket(): string {
  return env.AWS_S3_BUCKET
}

/**
 * Ensure S3 bucket exists, create if it doesn't
 */
export async function ensureBucketExists(
  bucket: string,
  region?: string,
): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch (error) {
    const isNotFound =
      error instanceof Error &&
      (error.name === 'NotFound' ||
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404)

    if (isNotFound) {
      const createBucketParams: CreateBucketCommandInput = {
        Bucket: bucket,
      }

      if (region && region !== 'us-east-1') {
        const config: CreateBucketConfiguration = {
          LocationConstraint:
            region as CreateBucketConfiguration['LocationConstraint'],
        }
        createBucketParams.CreateBucketConfiguration = config
      }

      await s3Client.send(new CreateBucketCommand(createBucketParams))
    } else {
      throw error
    }
  }
}

/**
 * Format file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Calculate MD5 hash of a file
 */
export async function calculateMD5Hash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return createHash('md5').update(buffer).digest('hex')
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * Generate a presigned URL for downloading a file from S3
 * @param bucket S3 bucket name
 * @param key S3 object key
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 * @returns Presigned URL
 */
export async function getFileUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

async function bufferFromReadable(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of readable) {
    chunks.push(
      typeof chunk === 'string'
        ? Buffer.from(chunk)
        : Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(chunk),
    )
  }
  return Buffer.concat(chunks)
}

async function bufferFromWebStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
    }
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
}

async function bodyToBuffer(
  body: GetObjectCommandOutput['Body'],
): Promise<Buffer> {
  if (!body) {
    throw new Error('S3 object has no body')
  }

  if (body instanceof Readable) {
    return bufferFromReadable(body)
  }

  if (typeof (body as ReadableStream<Uint8Array>)?.getReader === 'function') {
    return bufferFromWebStream(body as ReadableStream<Uint8Array>)
  }

  if (typeof (body as Blob)?.arrayBuffer === 'function') {
    const arrayBuffer = await (body as Blob).arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  if (typeof body === 'string') {
    return Buffer.from(body)
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body)
  }

  throw new Error('Unsupported S3 body type')
}

export async function downloadS3Object(params: {
  bucket: string
  key: string
}): Promise<{
  buffer: Buffer
  contentLength: number
  contentType: string | undefined
  lastModified: Date | undefined
}> {
  const command = new GetObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
  })

  const response = await s3Client.send(command)
  const buffer = await bodyToBuffer(response.Body)

  return {
    buffer,
    contentLength: response.ContentLength ?? buffer.byteLength,
    contentType: response.ContentType,
    lastModified: response.LastModified,
  }
}

/**
 * Upload a file to S3 and return file metadata
 * @param file File to upload
 * @param bucket Optional bucket name (uses default if not provided)
 * @param key Optional S3 key (generates UUID-based key if not provided)
 * @returns File metadata including bucket, key, filename, extension, fileSize, mimeType, and md5Hash
 */
export async function uploadFile(
  file: File,
  bucket?: string,
  key?: string,
): Promise<{
  bucket: string
  key: string
  filename: string
  extension: string
  fileSize: number
  mimeType: string
  md5Hash: string
}> {
  const targetBucket = bucket || getDefaultBucket()

  // Generate key if not provided (use UUID + original filename)
  const fileKey = key || `${randomUUID()}-${file.name}`

  // Read file as buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Calculate MD5 hash
  const md5Hash = createHash('md5').update(buffer).digest('hex')

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: targetBucket,
    Key: fileKey,
    Body: buffer,
    ContentType: file.type || 'application/octet-stream',
    Metadata: {
      originalFilename: file.name,
      md5Hash,
    },
  })

  await s3Client.send(command)

  return {
    bucket: targetBucket,
    key: fileKey,
    filename: file.name,
    extension: getFileExtension(file.name),
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    md5Hash,
  }
}

/**
 * Check if a file exists in S3
 * @param bucket S3 bucket name
 * @param key S3 object key
 * @returns True if file exists, false otherwise
 */
export async function fileExists(
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
    await s3Client.send(command)
    return true
  } catch (error) {
    return false
  }
}
