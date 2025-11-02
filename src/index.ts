import { z } from "zod";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

const otpSchema = z.object({
    otp: z.string().regex(/^\d{4,8}$/, "OTP must be a 4 to 8 digit number"),
});

const app = new Hono();

class OTPEvents {
    private listeners: ((otp: string) => void)[] = [];

    publish(otp: string) {
        this.listeners.forEach((listener) => listener(otp));
    }

    waitForSubscriber() {
        const currentTime = Date.now();
        const timeout = 10_000; // 10 seconds
        return new Promise<void>((resolve, reject) => {
            const check = () => {
                if (this.listeners.length > 0) {
                    resolve();
                } else if (Date.now() - currentTime > timeout) {
                    reject(new Error("Timeout waiting for subscriber"));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    subscribe(listener: (otp: string) => void) {
        this.listeners.push(listener);
    }
} 

const bus = new OTPEvents();

app.post("/otp", async (c) => {
    const body = await c.req.json();
    const { data, success } = otpSchema.safeParse(body);

    if (!success) {
        return c.text("Invalid OTP", { status: 400 });
    }

    bus.waitForSubscriber(); // Needed for serverless functions
    bus.publish(data.otp);

    return c.text("OTP received", { status: 200 });
});

app.get("/otp", async (c) => {
    return streamSSE(c, async (stream) => {
        bus.subscribe(async (otp) => {
            await stream.writeSSE({ data: otp });
            await stream.close();
        });

        // Timeout
        await stream.writeln("");
        await stream.sleep(60_000);
        await stream.close();
    })
});

export default app;

/*
const app = Bun.serve({
    port: 3000,
    routes: {
        "/otp": {
            async POST(req, server) {
                const body = await req.json();
                const parsed = otpSchema.safeParse(body);

                if (!parsed.success) {
                    return new Response("Invalid OTP", { status: 400 });
                }

                server.publish("otp", parsed.data.otp);

                return new Response("OTP received", { status: 200 });
            },
            async GET(req, server) {
                // Changes to websocket
                if (server.upgrade(req)) {
                    return;
                }
                return new Response("Upgrade failed", { status: 500 });
            }
        },
    },
    websocket: {
        idleTimeout: 30_000,
		message(ws, message) {},
        open(ws) {
            console.log("WebSocket connection opened");
            ws.subscribe("otp");
        },
        close(ws, code, message) {
            ws.unsubscribe("otp");
        },
	},
});

console.log(`Server started on http://localhost:${app.port}`);
*/