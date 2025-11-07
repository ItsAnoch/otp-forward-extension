import { createMiddleware } from "hono/factory";
import { Env } from "@/env";

export const tokenAuth = (validToken: string) => createMiddleware(async (c, next) => {
    const authHeader = c.req.header("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Missing or malformed Authorization header" }, 401);
    }
    const token = authHeader.replace("Bearer ", "").trim();

    if (token !== validToken) {
        return c.json({ error: "Invalid Authorization token" }, 401);
    }

    return next();
});

export const phoneAuth = tokenAuth(Env.PHONE_AUTH_TOKEN);
export const extensionAuth = tokenAuth(Env.PUBLIC_EXTENSION_TOKEN);