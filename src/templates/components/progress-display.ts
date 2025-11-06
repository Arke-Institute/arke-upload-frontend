/**
 * Progress Display Component
 */
export function renderProgressDisplay(): string {
  return `
    <div id="progressDisplay" class="hidden bg-white rounded-lg shadow-sm border border-gray-200 p-8 mt-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-6">Upload Progress</h2>

      <!-- Session Info -->
      <div class="mb-6 p-4 bg-gray-50 rounded-lg">
        <p class="text-sm text-gray-600">Session ID</p>
        <p class="font-mono text-sm text-gray-900" id="sessionId">-</p>
      </div>

      <!-- Status -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">Status</span>
          <span class="text-sm font-semibold text-blue-600" id="status">-</span>
        </div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">Phase</span>
          <span class="text-sm text-gray-600" id="phase">-</span>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">Overall Progress</span>
          <span class="text-sm font-semibold text-gray-900" id="percentage">0%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div id="progressBar" class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
        </div>
      </div>

      <!-- File/Directory Stats -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="p-4 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">Processed</p>
          <p class="text-2xl font-bold text-gray-900" id="filesProcessed">0</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600 mb-1">Total</p>
          <p class="text-2xl font-bold text-gray-900" id="filesTotal">0</p>
        </div>
      </div>

      <!-- Current File -->
      <div class="mb-6">
        <p class="text-sm font-medium text-gray-700 mb-2">Current Item</p>
        <p class="text-sm text-gray-600 font-mono truncate" id="currentFile">-</p>
      </div>

      <!-- Root PI Link Container (shown early) -->
      <div id="rootPiLinkContainer" class="hidden"></div>

      <!-- Loading Spinner -->
      <div id="spinner" class="flex items-center justify-center py-4">
        <div class="spinner"></div>
      </div>

      <!-- Error Display -->
      <div id="errorDisplay" class="hidden p-4 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm font-medium text-red-800 mb-2">Processing Failed</p>
        <p class="text-sm text-red-700" id="errorMessage">-</p>
      </div>
    </div>
  `;
}
