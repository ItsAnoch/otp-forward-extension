import { z } from "zod";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

const otpSchema = z.object({
    otp: z.string().regex(/^\d{4,8}$/, "OTP must be a 4 to 8 digit number"),
});


const app = new Hono();

const otpQueue: string[] = [];

app.post("/otp", async (c) => {
    const body = await c.req.json();
    const { data, success } = otpSchema.safeParse(body);

    if (!success) {
        return c.text("Invalid OTP", { status: 400 });
    }

    otpQueue.push(data.otp);

    return c.text("OTP received", { status: 200 });
});

app.get("/otp", async (c) => {
    return streamSSE(c, async (stream) => {
        // while (true) {
        // const message = `It is ${new Date().toISOString()}`
        // await stream.writeSSE({
        //     data: message,
        //     event: 'time-update',
        // })
        // await stream.sleep(1000)
        // }

        

        for (let i = 0; i < 10; i++) {
            const otp = otpQueue.shift();
            if (otp) {
                await stream.writeSSE({ data: otp });
                break;
            };
            await stream.sleep(1000);
        }
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