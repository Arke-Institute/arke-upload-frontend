/**
 * Success Display Component
 */
export function renderSuccessDisplay(): string {
  return `
    <div id="successDisplay" class="hidden bg-white rounded-lg shadow-sm border border-gray-200 p-8 mt-6">
      <div class="text-center">
        <div class="mb-4">
          <svg class="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-semibold text-gray-900 mb-2">Upload Complete!</h2>
        <p class="text-gray-600 mb-6">Your files have been successfully processed and archived.</p>

        <a
          id="viewLink"
          href="#"
          target="_blank"
          class="inline-block bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
        >
          View Archive →
        </a>

        <button
          onclick="location.reload()"
          class="block w-full mt-4 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          Upload Another Directory
        </button>
      </div>
    </div>
  `;
}
