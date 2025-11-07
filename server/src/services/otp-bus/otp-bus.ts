import WaitForSubscriber from "./wait-for-sub";

export default class OTPBus {
	private listeners = new Map<string, Set<(otp: string) => void>>();
	private subscriberWaiter = new WaitForSubscriber();

	publish(channel: string, otp: string) {
		const subs = this.listeners.get(channel);
		if (!subs?.size) return;
		for (const fn of subs) fn(otp);
	}

	subscribeOnce(channel: string, ms: number): Promise<string> {
		return new Promise((resolve, reject) => {
			const set = this.listeners.get(channel) ?? new Set();
			const wasEmpty = set.size === 0;
			this.listeners.set(channel, set);

			const onOtp = (otp: string) => {
				clearTimeout(timer);
				set.delete(onOtp);
				resolve(otp);
			};

			set.add(onOtp);

			// Notify waiters that someone has subscribed
			if (wasEmpty) {
				this.subscriberWaiter.notify(channel);
			}

			const timer = setTimeout(() => {
				set.delete(onOtp);
				reject(new Error("Timeout waiting for OTP"));
			}, ms);
		});
	}

	hasSubscriber(channel: string) {
		return (this.listeners.get(channel)?.size ?? 0) > 0;
	}

	async waitForSubscriber(channel: string, ms: number): Promise<void> {
		return this.subscriberWaiter.wait(channel, ms, () => this.hasSubscriber(channel));
	}
}