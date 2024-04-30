import { z } from 'zod';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({
  path: join(__dirname, '../../../.env.local'),
});

export function getConfig() {
  const config = {
    api: {
      port: z.string().transform(Number).parse(process.env.API_PORT),
      baseUrl: z.string().parse(process.env.API_BASE_URL),
    },
    aws: {
      accessKeyId: z.string().parse(process.env.AWS_ACCESS_KEY_ID),
      secretAccessKey: z.string().parse(process.env.AWS_SECRET_ACCESS_KEY),
      region: z.string().parse(process.env.AWS_DEFAULT_REGION),
      uploadsBucket: z.string().parse(process.env.FILE_UPLOADS_BUCKET),
    },
    openAI: {
      apiKey: z.string().parse(process.env.OPENAI_API_KEY),
    },
    googleGenAI: {
      apiKey: z.string().parse(process.env.GOOGLE_API_KEY),
    },
    redis: {
      url: z.string().parse(process.env.REDIS_URL),
    },
    postgres: {
      url: z.string().parse(process.env.POSTGRES_URL),
    },
  };

  return config;
}

export type ConfigurationType = ReturnType<typeof getConfig>;
