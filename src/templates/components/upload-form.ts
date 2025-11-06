/**
 * Upload Form Component
 */
export function renderUploadForm(): string {
  return `
    <div id="uploadForm" class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h2 class="text-2xl font-semibold text-gray-900 mb-6">Upload Directory</h2>

      <form id="form" class="space-y-6">
        <!-- Uploader Name -->
        <div>
          <label for="uploader" class="block text-sm font-medium text-gray-700 mb-2">
            Your Name
          </label>
          <input
            type="text"
            id="uploader"
            name="uploader"
            required
            placeholder="Jane Doe"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          >
        </div>

        <!-- Institution -->
        <div>
          <label for="institution" class="block text-sm font-medium text-gray-700 mb-2">
            Institution
          </label>
          <input
            type="text"
            id="institution"
            name="institution"
            required
            placeholder="University Library, Museum of Art, etc."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          >
          <p class="mt-1 text-sm text-gray-500">Institution or organization name</p>
        </div>

        <!-- Parent PI (Optional) -->
        <div>
          <label for="parentPi" class="block text-sm font-medium text-gray-700 mb-2">
            Parent Entity ID (Optional)
          </label>
          <input
            type="text"
            id="parentPi"
            name="parentPi"
            placeholder="01234567890123456789012345"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          >
          <p class="mt-1 text-sm text-gray-500">Connect this upload to an existing archive entity</p>
        </div>

        <!-- Directory Picker -->
        <div>
          <label for="folderInput" class="block text-sm font-medium text-gray-700 mb-2">
            Select Directory
          </label>
          <input
            type="file"
            id="folderInput"
            webkitdirectory
            directory
            multiple
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          >
          <p class="mt-1 text-sm text-gray-500" id="fileCount">No directory selected</p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          id="submitBtn"
          class="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
        >
          Start Upload
        </button>
      </form>
    </div>
  `;
}
