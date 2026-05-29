import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import BottomActionBar from './BottomActionBar.svelte';

const baseProps = () => ({
	visible: true,
	generating: false,
	canDownload: true,
	downloading: false,
	canSave: true,
	onDownload: vi.fn(),
	onSave: vi.fn(),
	onLoad: vi.fn()
});

// The bar is visually mobile-only (CSS), so query including hidden elements.
const button = (name: string) => screen.getByRole('button', { name, hidden: true });

describe('BottomActionBar', () => {
	it('renders the download, save and load actions when visible', () => {
		render(BottomActionBar, { props: baseProps() });
		expect(button('Download')).toBeInTheDocument();
		expect(button('Save Schedule')).toBeInTheDocument();
		expect(button('Load Schedule')).toBeInTheDocument();
	});

	it('renders nothing when not visible', () => {
		render(BottomActionBar, { props: { ...baseProps(), visible: false } });
		expect(screen.queryByRole('button', { name: 'Download', hidden: true })).toBeNull();
	});

	it('calls onDownload when the download button is clicked', async () => {
		const props = baseProps();
		render(BottomActionBar, { props });
		await fireEvent.click(button('Download'));
		expect(props.onDownload).toHaveBeenCalledOnce();
	});

	it('disables the save button when canSave is false', () => {
		render(BottomActionBar, { props: { ...baseProps(), canSave: false } });
		expect(button('Save Schedule')).toBeDisabled();
	});

	it('reflects the downloading state on the download button', () => {
		render(BottomActionBar, { props: { ...baseProps(), downloading: true } });
		expect(button('Preparing image…')).toBeDisabled();
	});
});
