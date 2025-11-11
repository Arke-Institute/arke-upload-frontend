/**
 * Main HTML Layout
 */
import { styles } from '../styles/styles';
import { renderUploadForm } from './components/upload-form';
import { renderProgressDisplay } from './components/progress-display';
import { renderSuccessDisplay } from './components/success-display';
import type { Env } from '../types/env';
import { sdkBundle, clientBundle } from '../client-bundle';

export function renderLayout(env: Env): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arke Institute - Upload</title>
  <script src="https://cdn.tailwindcss.com"></script>
  ${styles}
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- Header -->
  <div class="text-center pt-12 pb-6">
    <h1 class="text-4xl font-bold text-gray-900 mb-2">Arke Institute</h1>
    <p class="text-gray-600">Digital Archive Upload</p>
  </div>

  <!-- Main Content -->
  <div class="max-w-2xl mx-auto px-4 py-6">
    ${renderUploadForm()}
    ${renderProgressDisplay()}
    ${renderSuccessDisplay()}
  </div>

  <!-- Configuration -->
  <script>
    window.CONFIG = {
      ingestWorkerUrl: '${env.INGEST_WORKER_URL}',
      arkeInstituteUrl: '${env.ARKE_INSTITUTE_URL}'
    };
  </script>

  <!-- Upload SDK (UMD bundle - creates global ArkeUploadClient) -->
  <script>${sdkBundle}</script>

  <!-- Client Bundle -->
  <script>${clientBundle}</script>
</body>
</html>`;
}
