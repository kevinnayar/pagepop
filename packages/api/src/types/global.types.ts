import { Express } from 'express';
import IORedis from 'ioredis';
import { Sql } from 'postgres';
import { ConfigurationType } from '../config';
import multer from 'multer';

export type ControllerOpts = {
  app: Express;
  config: ConfigurationType;
  upload: multer.Multer;
  redisConnection: IORedis;
  sql: Sql<any>;
};
