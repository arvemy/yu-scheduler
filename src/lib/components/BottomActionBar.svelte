<script lang="ts">
  import { t } from "$lib/i18n";
  import { fade, fly } from "svelte/transition";

  let {
    visible,
    generating,
    canDownload,
    canGenerate = false,
    downloading = false,
    canSave = false,
    onGenerate,
    onDownload,
    onSave,
    onLoad,
  }: {
    visible: boolean;
    generating: boolean;
    canDownload: boolean;
    canGenerate?: boolean;
    downloading?: boolean;
    canSave?: boolean;
    onGenerate?: () => void;
    onDownload: () => void;
    onSave?: () => void;
    onLoad?: () => void;
  } = $props();
</script>

{#if visible}
  <div
    class="bottom-action-bar"
    role="toolbar"
    aria-label={$t("courseSelector.actions")}
    transition:fade={{ duration: 200 }}
  >
    <div class="action-buttons" in:fly={{ y: 20, duration: 300, delay: 50 }}>
      <!-- Generating indicator (shown when generating and no generate button) -->
      {#if generating && !onGenerate}
        <div class="generating-indicator">
          <svg
            class="spinner"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
          >
            <path
              d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
            />
          </svg>
        </div>
      {/if}

      <!-- Generate Button (only if onGenerate is provided) -->
      {#if onGenerate}
        <button
          class="fab-btn primary"
          onclick={onGenerate}
          disabled={!canGenerate || generating}
          aria-label={generating
            ? $t("courseSelector.generatingSchedule")
            : $t("courseSelector.generateSchedule")}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path
              d="M19 9l-1.25-2.75L15 5l2.75-1.25L19 1l1.25 2.75L23 5l-2.75 1.25L19 9zm0 6l-1.25-2.75L15 11l2.75-1.25L19 7l1.25 2.75L23 11l-2.75 1.25L19 15zM9 22l-2-4-4-2 4-2 2-4 2 4 4 2-4 2-2 4z"
            />
          </svg>
          <span
            >{generating
              ? $t("courseSelector.generatingShort")
              : $t("courseSelector.generateShort")}</span
          >
        </button>
      {/if}

      <!-- Download Button -->
      <button
        class="fab-btn outlined"
        onclick={onDownload}
        disabled={!canDownload || downloading}
        aria-label={downloading
          ? $t("courseSelector.downloadingImage")
          : $t("courseSelector.download")}
        title={downloading
          ? $t("courseSelector.downloadingImage")
          : $t("courseSelector.downloadImage")}
      >
        {#if downloading}
          <svg
            class="spinner"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="currentColor"
          >
            <path
              d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
            />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
        {/if}
      </button>

      <!-- Save Button -->
      {#if onSave}
        <button
          class="fab-btn outlined secondary"
          onclick={onSave}
          disabled={!canSave}
          aria-label={$t("savedSchedules.saveSchedule")}
          title={canSave
            ? $t("savedSchedules.saveSchedule")
            : $t("courseSelector.generateScheduleFirst")}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path
              d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"
            />
          </svg>
        </button>
      {/if}

      <!-- Load Button -->
      {#if onLoad}
        <button
          class="fab-btn outlined info"
          onclick={onLoad}
          aria-label={$t("savedSchedules.loadSchedule")}
          title={$t("savedSchedules.loadSchedule")}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path
              d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"
            />
          </svg>
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .bottom-action-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(var(--bottom-action-bar-offset) + var(--safe-area-bottom));
    z-index: var(--z-float);
    display: none;
    pointer-events: none;
    justify-content: center;
  }

  /* Only show on mobile */
  @media (max-width: 768px) {
    .bottom-action-bar {
      display: flex;
    }
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    pointer-events: auto;
    background: transparent;
  }

  .generating-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 999px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(6px);
  }

  .generating-indicator .spinner {
    animation: spin 1s linear infinite;
    color: var(--primary);
  }

  .fab-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    border-radius: 999px;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.3px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(6px);
  }

  .fab-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .fab-btn.primary {
    background: var(--primary);
    color: white;
    padding: 8px 14px;
  }

  .fab-btn.primary:hover:not(:disabled) {
    background: var(--primary-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
  }

  .fab-btn.outlined {
    background: rgba(255, 255, 255, 0.9);
    color: var(--primary);
    border: 1px solid var(--primary);
    padding: 8px 10px;
    min-width: auto;
  }

  .fab-btn.outlined:hover:not(:disabled) {
    background: var(--primary);
    color: white;
    transform: translateY(-1px);
  }

  .fab-btn.outlined.secondary {
    color: var(--secondary);
    border-color: var(--secondary);
  }

  .fab-btn.outlined.secondary:hover:not(:disabled) {
    background: var(--secondary);
    color: white;
  }

  .fab-btn.outlined.info {
    color: var(--info);
    border-color: var(--info);
  }

  .fab-btn.outlined.info:hover:not(:disabled) {
    background: var(--info);
    color: white;
  }

  .fab-btn svg {
    flex-shrink: 0;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
