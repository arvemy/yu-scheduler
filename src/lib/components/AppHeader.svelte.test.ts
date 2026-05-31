import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { setLocale } from '$lib/i18n';
import AppHeader from './AppHeader.svelte';

const setMatchMedia = (matches: boolean) => {
	window.matchMedia = vi.fn((query: string) => ({
		matches,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}));
};

const props = () => ({
	terms: ['2025-2026 Fall', '2025-2026 Spring'],
	currentTerm: '2025-2026 Fall',
	termsLoading: false,
	termsError: false,
	onChangeTerm: vi.fn(),
	onOpenWelcome: vi.fn()
});

describe('AppHeader', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		setLocale('en');
		setMatchMedia(false);
	});

	it('renders the desktop header controls with accessible names', () => {
		render(AppHeader, { props: props() });

		expect(screen.getByRole('heading', { name: 'YU Scheduler' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
			'href',
			'https://github.com/arvemy/yu-scheduler'
		);
		expect(screen.getByRole('button', { name: 'About' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Switch language/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Fall 2025-2026' })).toBeInTheDocument();
	});

	it('shows a term loading error state', () => {
		render(AppHeader, {
			props: { ...props(), terms: [], currentTerm: null, termsError: true }
		});

		expect(screen.getByText('Unable to load terms. Please refresh the page.')).toBeInTheDocument();
	});

	it('switches to the compact mobile menu when matchMedia matches', async () => {
		setMatchMedia(true);
		render(AppHeader, { props: props() });

		expect(await screen.findByRole('button', { name: 'More' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'GitHub' })).not.toBeInTheDocument();
	});
});
