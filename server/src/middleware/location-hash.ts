import { createMiddleware } from "hono/factory";
import { getConnInfo } from "hono/cloudflare-workers";

export interface ConnLocationInfo {
    ipVersion: number
    ipAddress: string
    latitude: number
    longitude: number
    countryName: string
    countryCode: string
    capital: string
    phoneCodes: number[]
    timeZones: string[]
    zipCode: string
    cityName: string
    regionName: string
    continent: string
    continentCode: string
    currencies: string[]
    languages: string[]
    asn: string
    asnOrganization: string
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
    const data = `${info.countryName}|${info.regionName}|${info.cityName}`;
    const hasher = new Bun.CryptoHasher('sha256');
	hasher.update(data);
	return hasher.digest('hex');
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
    c.req.raw.headers.set("x-location-hash", locationHash);

    return next();
});