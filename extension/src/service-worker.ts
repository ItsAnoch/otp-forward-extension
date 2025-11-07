const OTP_TTL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;
const OVERALL_WAIT_MS = 25_000;

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

async function requestOTPOnce(): Promise<string | null> {
	const url = `${process.env.PUBLIC_SERVER_URL}/otp`;
	const token = process.env.PUBLIC_EXTENSION_TOKEN;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const res = await fetch(url, {
			method: "GET",
			headers: token ? { authorization: `Bearer ${token}` } : {},
			signal: controller.signal
		});

		if (res.status === 200) {
			const otp = await res.text();
			return otp || null;
		}

		if (res.status === 204) {
			return null;
		}

		return null;
	} catch {
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}

async function waitForOTPWithin(budgetMs: number): Promise<string | null> {
	const start = Date.now();
	while (Date.now() - start < budgetMs) {
		const otp = await requestOTPOnce();
		if (otp) return otp;

        await sleep(600);
	}
	return null;
}

async function getOTP(): Promise<{ otp: string; otpExpiresAt: number } | null> {
	const { otp, otpExpiresAt } = await chrome.storage.local.get(["otp", "otpExpiresAt"]);
	if (otp && otpExpiresAt && Date.now() < otpExpiresAt) {
		return { otp, otpExpiresAt };
	}

	const freshOtp = await waitForOTPWithin(OVERALL_WAIT_MS);
	if (freshOtp) {
		const expiresAt = Date.now() + OTP_TTL_MS;
		await chrome.storage.local.set({
			otp: freshOtp,
			otpExpiresAt: expiresAt
		});
		return { otp: freshOtp, otpExpiresAt: expiresAt };
	}

	return null;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "GET_OTP") {
        (async () => {
            try {
                const result = await getOTP();
                if (!result) {
                    sendResponse({ type: "NO_OTP" });
                    return;
                }
                const { otp, otpExpiresAt } = result;
                sendResponse({ type: "OTP", otp, remainingMs: Math.max(0, otpExpiresAt - Date.now()) });
            } catch {
                sendResponse({ type: "ERROR" });
            }
        })();
    }
    else if (msg.type === "CLEAR_OTP") {
        (async () => {
            await chrome.storage.local.remove(["otp", "otpExpiresAt"]);
            sendResponse({ type: "CLEARED" });
        })();
    };

	return true;
});
