import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { locationHash } from "./middleware/location-hash";
import { phoneAuth, extensionAuth } from "./middleware/token-auth";
import { bus } from "./services/otp-bus";
import { otpSchema } from "./schemas/otp";

const app = new Hono();
app.use(cors());
app.use(locationHash);
app.use(logger());

const isProd = process.env.NODE_ENV === "production";
const PublisherTimeout = isProd ? 25_000 : 1_000;
const SubscriberTimeout = isProd ? 60_000 : 1_000;

app.post("/otp", locationHash, phoneAuth, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = otpSchema.safeParse(body);

	if (!parsed.success) {
		return c.text("Invalid OTP payload", 400);
	}

    const { otp } = parsed.data;
	const locationHash = c.req.header("x-location-hash") || "unknown";

	await bus.waitForSubscriber(locationHash, PublisherTimeout);

	bus.publish(locationHash, otp);
	return c.text("OTP received", 200);
});

app.get("/otp", locationHash, extensionAuth, async (c) => {
	const locationHash = c.req.header("x-location-hash") || "unknown";

	try {
		const otp = await bus.subscribeOnce(locationHash, SubscriberTimeout);
		return c.text(otp, 200);
	} catch {
		return c.body(null, 204);
	}
});

export default app;