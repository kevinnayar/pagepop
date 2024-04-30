import express from 'express';
import cors from 'cors';
import multer from 'multer';
import StorageController from './core/storage/storage.controller';
import ExtractionController from './core/extraction/extraction.controller';
import TranslationController from './core/translation/translation.controller';
import AdminController from './core/admin/admin.controller';
import { getConfig } from './config';
import { LOGO } from './consts/branding.consts';
import { getRedisConnection } from './clients/redis.client';
import { getPostgresInstance } from './clients/postgres.client';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const config = getConfig();
const upload = multer({ storage: multer.memoryStorage() });
const redisConnection = getRedisConnection(config.redis.url);
const sql = getPostgresInstance(config.postgres.url);
const opts = {
  app,
  config,
  upload,
  redisConnection,
  sql,
};

const controllers = {
  StorageController,
  ExtractionController,
  TranslationController,
  AdminController,
};

for (const [name, controller] of Object.entries(controllers)) {
  controller(opts);
  console.log(`✅ Ready => ${name}\n`);
}

const {
  api: { baseUrl, port },
} = config;

app.listen(port, () => {
  console.log(LOGO);
  console.log(`🚀 PagePop API Server is running at ${baseUrl}:${port}\n`);
});
