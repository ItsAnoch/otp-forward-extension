import { expect, describe, it } from "bun:test";
import { Env } from "@/env" 
import app from "@server";

const BaseUrl = Env.PUBLIC_SERVER_URL;
const validPhoneToken = Env.PHONE_AUTH_TOKEN;
const validExtensionToken = Env.PUBLIC_EXTENSION_TOKEN;

async function postOtp(token: string, otp: string, ip?: string) {
    const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`,
    };
    if (ip) headers["x-forwarded-for"] = ip;

    const request = new Request(
        `${BaseUrl}/otp`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                otp: otp
            }),
        }
    );

    return app.request(request);
}

async function getOtp(token: string, ip?: string) {
    const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`,
    };
    if (ip) headers["x-forwarded-for"] = ip;

    const request = new Request(
        `${BaseUrl}/otp`,
        {
            method: "GET",
            headers,
        }
    );

    return app.request(request);
}

describe.concurrent("unauthorized requests", async () => {
    it("returns 401 for invalid phone token", async () => {
        const res = await postOtp("invalid-token", "123456");
        expect(res.status).toBe(401);
    });

    it("returns 401 for invalid extension token", async () => {
        const res = await getOtp("invalid-token");
        expect(res.status).toBe(401);
    });

    it("returns nothing for differing geolocations", async () => {
        const [ postRes, getRes ] = await Promise.all([
            postOtp(validPhoneToken, "6676767", "1.1.1.1"),
            getOtp(validExtensionToken, "8.8.8.8")
        ]);

        expect(getRes.status).toBe(204);
    });
});

describe("authorized requests", async () => {
    it("otp comes first, get later", async () => {
        const otp = "123456";
        const [ postRes, getRes ] = await Promise.all([
            postOtp(validPhoneToken, otp, "1.1.1.1"),
            (async () => {
                await Bun.sleep(500);
                return getOtp(validExtensionToken, "1.1.1.1");
            })(),
        ]);

        expect(postRes.status).toBe(200);
        expect(getRes.status).toBe(200);
        
        const resOtp = await getRes.text();
        expect(resOtp).toBe(otp);
    });

    it("get first, otp arrives later", async () => {
        const otp = "123456";
        const [ postRes, getRes ] = await Promise.all([
            (async () => {
                await Bun.sleep(500);
                return postOtp(validPhoneToken, otp, "1.1.1.1");
            })(),
            getOtp(validExtensionToken, "1.1.1.1")
        ]);

        expect(postRes.status).toBe(200);
        expect(getRes.status).toBe(200);
        
        const resOtp = await getRes.text();
        expect(resOtp).toBe(otp);
    });
});