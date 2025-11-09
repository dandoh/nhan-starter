import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createHash, randomUUID } from 'node:crypto'

/**
 * Create S3 client configured for localstack or AWS
 */
function createS3Client(): S3Client {
  const endpoint = process.env.AWS_S3_ENDPOINT || 'http://localhost:4566'
  const region = process.env.AWS_S3_REGION || 'us-east-1'
  
  return new S3Client({
    endpoint,
    region,
    forcePathStyle: true, // Required for localstack
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  })
}

const s3Client = createS3Client()

/**
 * Get default bucket name from environment or use a default
 */
function getDefaultBucket(): string {
  return process.env.AWS_S3_BUCKET || 'nhan-starter-files'
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

