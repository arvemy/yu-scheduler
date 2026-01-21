import { STORAGE_KEYS } from './keys';

const WELCOME_MODAL_KEY = STORAGE_KEYS.WELCOME_DISMISSED;

export const shouldShowWelcomeModal = (): boolean => {
	try {
		const dismissed = localStorage.getItem(WELCOME_MODAL_KEY);
		return dismissed !== 'true';
	} catch {
		return true;
	}
};

export const dismissWelcomeModal = (): void => {
	try {
		localStorage.setItem(WELCOME_MODAL_KEY, 'true');
	} catch {
		// ignore
	}
};

export const resetWelcomeModal = (): void => {
	try {
		localStorage.removeItem(WELCOME_MODAL_KEY);
	} catch {
		// ignore
	}
};
