async function requestOtp(): Promise<string | null> {
    return new Promise(res => {
        chrome.runtime.sendMessage({ type: 'GET_OTP' }, r => {
            if (r?.type === 'OTP') return res(r.otp);
            res(null);
        });
    });
}

const OTP_INPUT_SELECTOR = [
	'input[autocomplete="one-time-code"]',
	'input[name*="otp" i]',
	'input[id*="otp" i]',
    'input[name*="code" i]',
    'input[aria-describedby="otp_code"]'
].join(",");

async function typeIntoInput(el: HTMLInputElement, text: string) {
    el.focus();
    document.execCommand('insertText', false, text);
}

const otpWatcher = new MutationObserver(async mutations => {
	for (const mutation of mutations) {
		for (const node of mutation.addedNodes) {
			if (node.nodeType !== Node.ELEMENT_NODE) continue;
			const el = node as HTMLElement;

            if (el.matches?.(OTP_INPUT_SELECTOR)) {
                const otp = await requestOtp();
                if (!otp) return;
                typeIntoInput(el as HTMLInputElement, otp);
                break;
			}
		}
	}
});

otpWatcher.observe(document.documentElement, {
	childList: true,
	subtree: true
});

async function init() {
    const otpInput = document.querySelector(OTP_INPUT_SELECTOR);

    if (otpInput) {
        const otp = await requestOtp();
        if (!otp) return;

        typeIntoInput(otpInput as HTMLInputElement, otp);
    }
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
