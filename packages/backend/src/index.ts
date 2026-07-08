import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { getEnv } from '@healthcare/shared/config';
import { registerAuthModule } from './modules/auth/index.js';
import { registerPatientModule } from './modules/patient/index.js';
import { registerAppointmentModule } from './modules/appointment/index.js';
import { registerEmmModule } from './modules/emr/index.js';
import { registerBillingModule } from './modules/billing/index.js';
import { registerCommonModule } from './modules/common/index.js';
import { errorHandler } from './core/error-handler.js';
import { db } from './core/database.js';
import { redis } from './core/redis.js';

import { registerLaboratoryModule } from './modules/laboratory/index.js';
import { registerRadiologyModule } from './modules/radiology/index.js';
import { registerPharmacyModule } from './modules/pharmacy/index.js';
import { registerQueueModule } from './modules/queue/index.js';
import { registerReferralModule } from './modules/referral/index.js';
import { registerNotificationModule } from './modules/notification/index.js';
import { registerNursingModule } from './modules/nursing/index.js';
import { registerHomeVisitsModule } from './modules/home-visits/index.js';
import { registerTelemedicineModule } from './modules/telemedicine/index.js';

const env = getEnv();

async function buildApp() {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Plugins
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Vision Healthcare ERP API',
        description: 'Enterprise Healthcare ERP SaaS Platform API',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // Register modules
  await registerCommonModule(app);
  await registerAuthModule(app);
  await registerPatientModule(app);
  await registerAppointmentModule(app);
  await registerEmmModule(app);
  await registerBillingModule(app);
  await registerLaboratoryModule(app);
  await registerRadiologyModule(app);
  await registerPharmacyModule(app);
  await registerQueueModule(app);
  await registerReferralModule(app);
  await registerNotificationModule(app);
  await registerNursingModule(app);
  await registerHomeVisitsModule(app);
  await registerTelemedicineModule(app);


  return app;
}

async function start() {
  try {
    await db.raw('SELECT 1');
    console.log('✓ Database connected');
  } catch (err) {
    console.error('✗ Database connection failed:', err);
    process.exit(1);
  }

  try {
    await redis.ping();
    console.log('✓ Redis connected');
  } catch (err) {
    console.error('✗ Redis connection failed:', err);
  }

  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`✓ Server running on http://${env.HOST}:${env.PORT}`);
    console.log(`✓ API Docs at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
