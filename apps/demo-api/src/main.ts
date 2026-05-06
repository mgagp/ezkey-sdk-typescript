import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RequestMethod } from '@nestjs/common';
import { config as loadEnv } from 'dotenv';
import express from 'express';
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../.env') });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const originsRaw = process.env.DEMO_UI_ORIGIN ?? 'http://localhost:5173';
  const origins = originsRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port);
  console.log(`Ezkey demo API listening on http://localhost:${port}`);
  console.log(`  Health: GET http://localhost:${port}/health`);
  console.log(`  CORS origins: ${origins.join(', ')}`);
}

void bootstrap();
