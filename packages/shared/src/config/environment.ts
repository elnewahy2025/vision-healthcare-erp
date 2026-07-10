export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;

  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;

  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;

  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;

  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_BUCKET: string;

  ELASTICSEARCH_URL: string;

  CORS_ORIGIN: string;

  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;

  SENDGRID_API_KEY?: string;

  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
  SUPABASE_BUCKET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  FAWRY_MERCHANT_CODE?: string;
  FAWRY_SECURITY_KEY?: string;
  INSTAPAY_WALLET?: string;

  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  WHATSAPP_API_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_BUSINESS_ACCOUNT_ID?: string;
  WHATSAPP_WEBHOOK_VERIFY_TOKEN?: string;

  SENTRY_DSN?: string;
  APP_VERSION?: string;
  BACKUP_S3_BUCKET?: string;
  BACKUP_ENCRYPTION_KEY?: string;
  BACKUP_RETENTION?: string;

  APP_URL: string;
}

export function getEnv(): Environment {
  return {
    NODE_ENV: (process.env.NODE_ENV as Environment['NODE_ENV']) || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    HOST: process.env.HOST || '0.0.0.0',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_NAME: process.env.DB_NAME || 'healthcare',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost',
    MINIO_PORT: parseInt(process.env.MINIO_PORT || '9000', 10),
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || 'minioadmin',
    MINIO_BUCKET: process.env.MINIO_BUCKET || 'healthcare',
    ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    SMTP_HOST: process.env.SMTP_HOST || 'localhost',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM: process.env.SMTP_FROM || 'noreply@visionhealthcare.com',
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    SUPABASE_BUCKET: process.env.SUPABASE_BUCKET || 'documents',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    FAWRY_MERCHANT_CODE: process.env.FAWRY_MERCHANT_CODE,
    FAWRY_SECURITY_KEY: process.env.FAWRY_SECURITY_KEY,
    INSTAPAY_WALLET: process.env.INSTAPAY_WALLET,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    APP_URL: process.env.APP_URL || 'http://localhost:5173',
    WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    SENTRY_DSN: process.env.SENTRY_DSN,
    APP_VERSION: process.env.APP_VERSION || '1.0.0',
    BACKUP_S3_BUCKET: process.env.BACKUP_S3_BUCKET,
    BACKUP_ENCRYPTION_KEY: process.env.BACKUP_ENCRYPTION_KEY,
    BACKUP_RETENTION: process.env.BACKUP_RETENTION || '7',
  };
}
