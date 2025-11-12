/**
 * Error Display Component
 */
export function renderErrorDisplay(): string {
  return `
    <div id="errorDisplay" class="hidden bg-white rounded-lg shadow-sm border border-red-200 p-8 mt-6">
      <div class="text-center">
        <div class="mb-4">
          <svg class="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <!-- Error content will be populated by JavaScript -->
      </div>
    </div>
  `;
}
