function formatMs(ms: number) {
	const s = Math.max(0, Math.floor(ms / 1000));
	return `${s}s`;
}

async function requestOtp() {
	const el = document.getElementById("otp-text");
	const ttl = document.getElementById("otp-ttl");
	if (!el || !ttl) return;

	el.textContent = "----";
	ttl.textContent = "";

	chrome.runtime.sendMessage({ type: "GET_OTP" }, response => {
		if (!response) {
			el.textContent = "Error";
			ttl.textContent = "";
			return;
		}

		if (response.type !== "OTP") {
			el.textContent = "No OTP";
			ttl.textContent = "";
			return;
		}

		const otp = response.otpCode || response.otp || "----";
		el.textContent = otp;

		let remaining = response.remainingMs ?? 0;
		ttl.textContent = formatMs(remaining);

		const interval = setInterval(() => {
			remaining -= 1000;
			ttl.textContent = formatMs(remaining);
			if (remaining <= 0) {
				clearInterval(interval);
				el.classList.add("is-expired");
			}
		}, 1000);
	});
}

function copyOtp() {
	const el = document.getElementById("otp-text");
	if (!el || !el.textContent) return;

	navigator.clipboard.writeText(el.textContent).then(() => {
		el.classList.add("copied");
		setTimeout(() => el.classList.remove("copied"), 600);
	});
}

function refreshOtp() {
    chrome.runtime.sendMessage({ type: "CLEAR_OTP" }, () => {
        requestOtp();
    });
}

document.addEventListener("DOMContentLoaded", () => {
	const refreshBtn = document.getElementById("refresh");
	const copyBtn = document.getElementById("copy");

	if (refreshBtn) {
		refreshBtn.addEventListener("click", refreshOtp);
	}

	if (copyBtn) {
		copyBtn.addEventListener("click", copyOtp);
	}

	requestOtp();
});
