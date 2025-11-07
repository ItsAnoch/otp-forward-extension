import { createMiddleware } from "hono/factory";
import { getConnInfo } from "hono/cloudflare-workers";

type ConnLocationInfo = {
	ip: string
	version: 4 | 6
	country: string
	region: string
	city: string
	zip?: string
	latitude: number
	longitude: number
	timeZone: string
	asn: number
	org: string
	isProxy: boolean
}

async function getIpInfo(address: string): Promise<ConnLocationInfo | null> {
    try {
        const res = await fetch(
            `https://free.freeipapi.com/api/json/${address}`,
            { method: "GET" }
        );

        return await res.json() as ConnLocationInfo;
    } catch {
        return null;
    }
}

function hashLocation(info: ConnLocationInfo): string {
    const data = `${info.country}|${info.region}|${info.city}`;
    const hash = Bun.hash(data);
    return hash.toString(16);
}

export const locationHash = createMiddleware(async (c, next) => {
    const { remote: { address } } = getConnInfo(c) // info is `ConnInfo`
    const forwardedFor = c.req.header("x-forwarded-for");

    const ip = address || forwardedFor;

    if (!ip) {
        return next();
    }

    const info = await getIpInfo(ip);
    if (!info) {
        return next();
    }
    const locationHash = hashLocation(info);
    c.set("X-Location-Hash", locationHash);

    return next();
});