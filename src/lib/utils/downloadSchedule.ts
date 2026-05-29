import {
	DOWNLOAD_CANVAS_BACKGROUND,
	DOWNLOAD_CANVAS_HEIGHT_FALLBACK,
	DOWNLOAD_CANVAS_SCALE,
	DOWNLOAD_CANVAS_TEXT,
	DOWNLOAD_FOOTER_FONT,
	DOWNLOAD_FOOTER_HEIGHT,
	DOWNLOAD_FOOTER_PADDING,
	DOWNLOAD_TABLE_WIDTH_PX
} from '$lib/config/ui';

export interface DownloadOptions {
	/**
	 * Overrides the default modern-screenshot scale (device-pixel multiplier).
	 * Lower values render faster; higher values increase sharpness.
	 */
	scale?: number;
	footer?: {
		term?: string | null;
		locale?: string;
		showTimestamp?: boolean;
		labels?: {
			termLabel?: string;
		};
	};
}

export const downloadScheduleAsImage = async (
	scheduleRef: HTMLElement,
	scrollRef: HTMLElement | null,
	tabNumber: number,
	onError: (message: string) => void,
	options: DownloadOptions = {}
): Promise<void> => {
	let captureHost: HTMLDivElement | null = null;

	try {
		// Dynamically import modern-screenshot only when needed
		const { domToCanvas } = await import('modern-screenshot');

		// Clone offscreen to avoid distorting the on-screen UI while capturing
		captureHost = document.createElement('div');
		captureHost.style.position = 'fixed';
		captureHost.style.left = '-20000px';
		captureHost.style.top = '0';
		captureHost.style.pointerEvents = 'none';
		captureHost.style.zIndex = '-1';
		document.body.appendChild(captureHost);

		const targetEl = scheduleRef.cloneNode(true) as HTMLElement;
		targetEl.classList.add('download-mode');
		captureHost.appendChild(targetEl);

		// Remove any native title tooltips from the cloned subtree
		// (Tooltips are not part of the rendered output, but removing them avoids flicker)
		targetEl.querySelectorAll('[title]').forEach((el) => el.removeAttribute('title'));

		// Try to size capture to the full timetable width
		const scrollBox =
			(targetEl.querySelector('.timetable-scroll') as HTMLElement | null) ??
			(scrollRef ? (targetEl.querySelector('table')?.parentElement as HTMLElement | null) : null);
		const table = targetEl.querySelector('table') as HTMLTableElement | null;

		if (scrollBox) {
			scrollBox.scrollLeft = 0;
			scrollBox.style.overflowX = 'visible';
		}

		let captureWidth = DOWNLOAD_TABLE_WIDTH_PX;
		if (table) {
			captureWidth = Math.max(DOWNLOAD_TABLE_WIDTH_PX, table.scrollWidth || table.clientWidth);
			table.style.width = `${captureWidth}px`;
			table.style.maxWidth = 'none';
		}
		targetEl.style.width = `${captureWidth}px`;

		// Allow layout to settle
		await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

		const canvas = await domToCanvas(targetEl, {
			width: captureWidth,
			height: targetEl.scrollHeight || targetEl.clientHeight || DOWNLOAD_CANVAS_HEIGHT_FALLBACK,
			scale: options.scale ?? DOWNLOAD_CANVAS_SCALE,
			backgroundColor: DOWNLOAD_CANVAS_BACKGROUND
		});

		let finalCanvas: HTMLCanvasElement = canvas;

		// Draw footer if requested
		if (options.footer) {
			const { term, locale = 'en', showTimestamp = true, labels } = options.footer;
			const footerHeight = DOWNLOAD_FOOTER_HEIGHT;
			const padded = document.createElement('canvas');
			padded.width = canvas.width;
			padded.height = canvas.height + footerHeight;
			const ctx = padded.getContext('2d');
			if (ctx) {
				ctx.fillStyle = DOWNLOAD_CANVAS_BACKGROUND;
				ctx.fillRect(0, 0, padded.width, padded.height);
				ctx.drawImage(canvas, 0, 0);
				ctx.fillStyle = DOWNLOAD_CANVAS_TEXT;
				ctx.font = DOWNLOAD_FOOTER_FONT;
				ctx.textBaseline = 'middle';
				const timestamp = showTimestamp ? new Date().toLocaleString(locale) : '';
				const termLabel = labels?.termLabel || 'Term';
				const leftText = term ? `${termLabel}: ${term}` : '';
				const rightText = timestamp;
				const padding = DOWNLOAD_FOOTER_PADDING;
				ctx.fillText(leftText, padding, canvas.height + footerHeight / 2);
				if (rightText) {
					const rtWidth = ctx.measureText(rightText).width;
					ctx.fillText(
						rightText,
						padded.width - padding - rtWidth,
						canvas.height + footerHeight / 2
					);
				}
			}
			finalCanvas = padded;
		}

		const blob: Blob = await new Promise((resolve, reject) => {
			finalCanvas.toBlob((b) => {
				if (!b) {
					reject(new Error('Failed to generate image blob'));
					return;
				}
				resolve(b);
			}, 'image/png');
		});

		const url = URL.createObjectURL(blob);
		try {
			const link = document.createElement('a');
			link.download = `schedule-${tabNumber + 1}.png`;
			link.href = url;
			link.click();
		} finally {
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
	} catch (error) {
		onError(
			error instanceof Error ? error.message : 'Failed to download schedule. Please try again.'
		);
	} finally {
		captureHost?.remove();
	}
};
