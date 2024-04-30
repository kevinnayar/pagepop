import { z } from 'zod';

const port = z
  .string()
  .transform(Number)
  .parse(process.env.NEXT_PUBLIC_API_PORT);

const baseUrl = z.string().parse(process.env.NEXT_PUBLIC_API_BASE_URL);

export function getConfig() {
  const config = {
    apiBaseUrl: `${baseUrl}:${port}`,
  };

  return config;
}

export type ConfigurationType = ReturnType<typeof getConfig>;
