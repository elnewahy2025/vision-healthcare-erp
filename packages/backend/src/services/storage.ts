import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getEnv } from '@healthcare/shared/config';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

interface UploadResult {
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

function generatePath(tenantId: string, category: string, originalName: string): { filePath: string; fileName: string } {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(8).toString('hex');
  const date = new Date();
  const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  const fileName = `${hash}${ext}`;
  const filePath = `${tenantId}/${category}/${datePath}/${fileName}`;
  return { filePath, fileName };
}

export async function uploadFile(
  tenantId: string,
  category: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<UploadResult> {
  const { filePath, fileName } = generatePath(tenantId, category, originalName);
  const env = getEnv();

  // Try Supabase Storage first
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
    try {
      const response = await fetch(
        `${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET || 'documents'}/${filePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': mimeType,
            'x-upsert': 'true',
          },
          body: fileBuffer as any,
        }
      );
      if (response.ok) {
        return { storagePath: filePath, fileName, fileSize: fileBuffer.length, mimeType };
      }
    } catch (err: any) {
      console.warn('⚠️ Supabase storage failed, falling back:', err.message);
    }
  }

  // Try MinIO (S3-compatible)
  if (env.MINIO_ENDPOINT && env.MINIO_ENDPOINT !== 'localhost') {
    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const client = new S3Client({
        endpoint: `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
        region: 'us-east-1',
        credentials: { accessKeyId: env.MINIO_ACCESS_KEY, secretAccessKey: env.MINIO_SECRET_KEY },
        forcePathStyle: true,
      });
      await client.send(new PutObjectCommand({
        Bucket: env.MINIO_BUCKET, Key: filePath, Body: fileBuffer, ContentType: mimeType,
      }));
      return { storagePath: filePath, fileName, fileSize: fileBuffer.length, mimeType };
    } catch (err: any) {
      console.warn('⚠️ MinIO storage failed, falling back:', err.message);
    }
  }

  // Local filesystem
  const fullPath = path.join(UPLOAD_DIR, filePath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, fileBuffer);
  return { storagePath: filePath, fileName, fileSize: fileBuffer.length, mimeType };
}

export async function getFile(storagePath: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const env = getEnv();

  // Try Supabase Storage
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
    try {
      const response = await fetch(
        `${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_BUCKET || 'documents'}/${storagePath}`,
        { headers: { 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}` } }
      );
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return { buffer: Buffer.from(arrayBuffer), mimeType: response.headers.get('content-type') || 'application/octet-stream' };
      }
    } catch {}
  }

  // Try MinIO
  if (env.MINIO_ENDPOINT && env.MINIO_ENDPOINT !== 'localhost') {
    try {
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      const client = new S3Client({
        endpoint: `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
        region: 'us-east-1',
        credentials: { accessKeyId: env.MINIO_ACCESS_KEY, secretAccessKey: env.MINIO_SECRET_KEY },
        forcePathStyle: true,
      });
      const result = await client.send(new GetObjectCommand({ Bucket: env.MINIO_BUCKET, Key: storagePath }));
      const chunks: Buffer[] = [];
      const bodyStream = result.Body as any;
      for await (const chunk of bodyStream) chunks.push(Buffer.from(chunk));
      return { buffer: Buffer.concat(chunks), mimeType: result.ContentType || 'application/octet-stream' };
    } catch {}
  }

  // Local filesystem
  const fullPath = path.join(UPLOAD_DIR, storagePath);
  if (fs.existsSync(fullPath)) {
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
      '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain', '.csv': 'text/csv', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return { buffer: fs.readFileSync(fullPath), mimeType: mimeTypes[ext] || 'application/octet-stream' };
  }
  return null;
}

export function deleteFile(storagePath: string): void {
  try {
    const fullPath = path.join(UPLOAD_DIR, storagePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {}
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}
