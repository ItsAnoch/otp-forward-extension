export default class WaitForSubscriber {
	private waiters = new Map<string, Set<() => void>>();

	wait(channel: string, ms: number, hasSubscriber: () => boolean): Promise<void> {
		// If someone is already subscribed, return instantly
		if (hasSubscriber()) {
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			const set = this.waiters.get(channel) ?? new Set();
			this.waiters.set(channel, set);

			const onSubscribe = () => {
				clearTimeout(timer);
				set.delete(onSubscribe);
				resolve();
			};

			set.add(onSubscribe);

			const timer = setTimeout(() => {
				set.delete(onSubscribe);
				resolve(); // Resolve anyway after timeout
			}, ms);
		});
	}

	notify(channel: string) {
		const waiters = this.waiters.get(channel);
		if (!waiters?.size) return;
		for (const fn of waiters) fn();
		waiters.clear();
	}
}
