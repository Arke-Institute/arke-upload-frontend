/**
 * Progress Display Component
 */
export function renderProgressDisplay(): string {
  return `
    <div id="progressDisplay" class="hidden bg-white rounded-lg shadow-sm border border-gray-200 p-8 mt-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-6">Upload Progress</h2>

      <!-- Loading Spinner -->
      <div id="spinner" class="flex justify-center mb-6">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>

      <!-- Stage Progress -->
      <div class="text-center mb-6">
        <div id="stageNumber" class="text-sm text-gray-500 mb-1">Stage 0 of 7</div>
        <div id="stageName" class="text-xl font-semibold text-gray-800 mb-2">Preparing...</div>
        <div id="phase" class="text-sm text-gray-600">Initializing</div>
        <div id="filesInfo" class="text-xs text-gray-500 mt-2"></div>
      </div>

      <!-- Retry Warning Container (shown during retries) -->
      <div id="retryWarningContainer" class="hidden"></div>

      <!-- Root PI Link Container (shown when available) -->
      <div id="rootPiLinkContainer" class="hidden"></div>
    </div>
  `;
}
