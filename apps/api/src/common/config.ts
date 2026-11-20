import { z } from 'zod';

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  /** Límite de peticiones/min globales y para /auth (configurable para tests). */
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(120),
  THROTTLE_AUTH_LIMIT: z.coerce.number().int().min(1).default(10),
});

export type AppConfig = z.infer<typeof esquema> & { corsOrigins: string[]; isProd: boolean };

export function parseConfig(env: NodeJS.ProcessEnv): AppConfig {
  const r = esquema.safeParse(env);
  if (!r.success) {
    const detalle = r.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configuración inválida:\n${detalle}`);
  }
  const c = r.data;
  return {
    ...c,
    corsOrigins: c.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    isProd: c.NODE_ENV === 'production',
  };
}

let cache: AppConfig | undefined;
/** Configuración validada (falla al arrancar si falta algo). */
export function getConfig(): AppConfig {
  return (cache ??= parseConfig(process.env));
}
