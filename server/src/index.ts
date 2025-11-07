import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { locationHash } from "./middleware/locationHash";
import { phoneAuth, extensionAuth } from "./middleware/token-auth";
import { bus } from "./services/otp-bus";
import { otpSchema } from "./schemas/otp";

const app = new Hono();
app.use(cors());
app.use(locationHash);
app.use(logger());

app.post("/otp", phoneAuth, async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = otpSchema.safeParse(body);

	if (!parsed.success) {
		return c.text("Invalid OTP payload", 400);
	}

    const { otp } = parsed.data;
    const locationHash = c.req.header("x-location-hash") || "unknown";

	// Wait for a subscriber (returns instantly if already subscribed)
	await bus.waitForSubscriber(locationHash, 25_000);

	bus.publish(locationHash, otp);
	return c.text("OTP received", 200);
});

app.get("/otp", extensionAuth, async (c) => {
	if (process.env.NODE_ENV === "development") {
		const randomCode = `${Math.floor(Math.random() * 100000)}`;
		await Bun.sleep(Math.random() * 5000);
		return c.text(randomCode, 200);
	}

	const url = new URL(c.req.url);
	const locationHash = url.searchParams.get("locationHash") || "unknown";

	try {
		const otp = await bus.subscribeOnce(locationHash, 60_000);
		return c.text(otp, 200);
	} catch {
		return c.body(null, 204);
	}
});

export default app;