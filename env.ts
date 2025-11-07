import { z } from "zod";

export const EnvSchema = z.object({
    PHONE_AUTH_TOKEN: z.string(),
    PUBLIC_EXTENSION_TOKEN: z.string(),
    PUBLIC_SERVER_URL: z.string()
});

export const Env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;