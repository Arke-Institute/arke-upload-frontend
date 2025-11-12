/**
 * URL State Manager
 *
 * Manages batch ID in URL hash for shareable links and state persistence
 */

export class URLStateManager {
  private static readonly BATCH_ID_KEY = 'batchId';

  /**
   * Set batch ID in URL hash
   * Updates URL to #batchId=01K9...
   */
  setBatchId(batchId: string): void {
    const hash = `#${URLStateManager.BATCH_ID_KEY}=${encodeURIComponent(batchId)}`;
    window.history.pushState(null, '', hash);
  }

  /**
   * Get batch ID from URL hash
   * Returns null if no batch ID present
   */
  getBatchId(): string | null {
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) {
      return null;
    }

    // Parse hash: #batchId=01K9...
    const params = new URLSearchParams(hash.substring(1));
    const batchId = params.get(URLStateManager.BATCH_ID_KEY);

    return batchId || null;
  }

  /**
   * Clear batch ID from URL hash
   * Resets to clean URL
   */
  clearBatchId(): void {
    window.history.pushState(null, '', window.location.pathname);
  }

  /**
   * Listen for hash changes (browser back/forward)
   */
  onHashChange(callback: (batchId: string | null) => void): void {
    window.addEventListener('hashchange', () => {
      const batchId = this.getBatchId();
      callback(batchId);
    });
  }
}

// Export singleton instance
export const urlState = new URLStateManager();
