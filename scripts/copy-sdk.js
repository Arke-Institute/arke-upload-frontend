#!/usr/bin/env node
/**
 * Copy the SDK browser bundle from node_modules to dist/
 * This ensures we always use the installed SDK version
 */
const fs = require('fs');
const path = require('path');

const sdkSourcePath = path.join(__dirname, '../node_modules/@arke/upload-client/dist/browser.js');
const sdkDestPath = path.join(__dirname, '../dist/upload-client.js');

try {
  // Ensure dist directory exists
  const distDir = path.dirname(sdkDestPath);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy SDK bundle
  fs.copyFileSync(sdkSourcePath, sdkDestPath);

  const stats = fs.statSync(sdkDestPath);
  console.log(`✓ SDK bundle copied successfully (${Math.round(stats.size / 1024)}KB)`);
  console.log(`  From: node_modules/@arke/upload-client/dist/browser.js`);
  console.log(`  To:   dist/upload-client.js`);
} catch (error) {
  console.error('✗ Failed to copy SDK bundle:', error.message);
  console.error('  Make sure @arke/upload-client is installed:');
  console.error('  npm install github:Arke-Institute/upload-client#main');
  process.exit(1);
}
