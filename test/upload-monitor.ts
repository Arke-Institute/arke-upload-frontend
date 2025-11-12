#!/usr/bin/env tsx
/**
 * Upload Monitor Test Script
 *
 * Performs a real upload and logs all orchestrator responses to understand
 * the actual status values and progress data being returned at each stage.
 */

import { ArkeUploader } from '@arke/upload-client';
import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  phase: 'upload' | 'status';
  event: string;
  data: any;
}

interface Config {
  ingestWorkerUrl: string;
  statusApiUrl: string;
  arkeInstituteUrl: string;
  uploader: string;
  rootPath: string;
  testFilesPath: string;
  statusPollInterval: number; // ms
}

class UploadMonitor {
  private config: Config;
  private logs: LogEntry[] = [];
  private logFilePath: string;
  private uniqueStatuses = new Set<string>();

  constructor(config: Config) {
    this.config = config;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFilePath = path.join(__dirname, 'logs', `upload-${timestamp}.json`);
  }

  /**
   * Log an event with timestamp
   */
  private log(phase: 'upload' | 'status', event: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      phase: phase as any,
      event,
      data,
    };

    this.logs.push(entry);

    // Console output with colors
    const phaseColors = {
      upload: '\x1b[36m',       // Cyan
      status: '\x1b[35m',       // Magenta
    };
    const reset = '\x1b[0m';
    const color = phaseColors[phase];

    console.log(`${color}[${entry.timestamp}] [${phase.toUpperCase()}]${reset} ${event}`);

    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }

    // Track unique stages
    if (data && data.stage) {
      this.uniqueStatuses.add(data.stage);
    }

    // Save to file after each log
    this.saveLogs();
  }

  /**
   * Save logs to JSON file
   */
  private saveLogs(): void {
    fs.writeFileSync(
      this.logFilePath,
      JSON.stringify({
        logs: this.logs,
        uniqueStatuses: Array.from(this.uniqueStatuses),
        summary: {
          totalLogs: this.logs.length,
          phases: {
            upload: this.logs.filter(l => l.phase === 'upload').length,
            status: this.logs.filter(l => l.phase === 'status').length,
          },
        },
      }, null, 2)
    );
  }

  /**
   * Phase 1: Upload files using SDK
   */
  private async uploadPhase(): Promise<string> {
    this.log('upload', 'Starting upload phase');

    const uploader = new ArkeUploader({
      workerUrl: this.config.ingestWorkerUrl,
      uploader: this.config.uploader,
      rootPath: this.config.rootPath,
      processing: {
        ocr: true,
        describe: true,
        pinax: true,
      },
      parallelUploads: 3,
    });

    this.log('upload', 'ArkeUploader configured', {
      workerUrl: this.config.ingestWorkerUrl,
      uploader: this.config.uploader,
      rootPath: this.config.rootPath,
      testFilesPath: this.config.testFilesPath,
    });

    // Count files in directory
    const files = fs.readdirSync(this.config.testFilesPath).filter(f => !f.startsWith('.'));
    this.log('upload', `Found ${files.length} test files in directory`, {
      directory: this.config.testFilesPath,
      files,
    });

    this.log('upload', 'Starting batch upload from directory');

    // In Node.js, the SDK expects a directory path, not File objects
    const result = await uploader.uploadBatch(this.config.testFilesPath, {
      onProgress: (progress) => {
        this.log('upload', 'Upload progress', {
          phase: progress.phase,
          percentComplete: progress.percentComplete,
          filesUploaded: progress.filesUploaded,
          filesTotal: progress.filesTotal,
          bytesUploaded: progress.bytesUploaded,
          bytesTotal: progress.bytesTotal,
          currentFile: progress.currentFile,
        });
      },
    });

    this.log('upload', 'Upload complete', {
      batchId: result.batchId,
      filesUploaded: result.filesUploaded,
      bytesUploaded: result.bytesUploaded,
    });

    return result.batchId;
  }

  /**
   * Phase 2: Monitor via unified Status API
   */
  private async monitorStatusAPI(batchId: string): Promise<void> {
    this.log('status', 'Starting status monitoring via unified API', { batchId });

    let attempts = 0;
    const maxAttempts = 200; // ~16 minutes at 5 second intervals
    let isDone = false;

    while (attempts < maxAttempts && !isDone) {
      attempts++;

      try {
        const response = await fetch(`${this.config.statusApiUrl}/${batchId}`);

        if (!response.ok) {
          const errorText = await response.text();
          this.log('status', `Error response (attempt ${attempts})`, {
            status: response.status,
            error: errorText,
          });

          // If batch not found and early attempts, keep trying
          if (response.status === 404 && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, this.config.statusPollInterval));
            continue;
          }

          if (attempts >= 10 && response.status === 404) {
            throw new Error('Batch not found after 10 attempts');
          }
        } else {
          const data = await response.json();

          this.log('status', `Status update (attempt ${attempts})`, data);

          // Check for completion or error
          if (data.stage === 'completed') {
            this.log('status', 'Processing complete!', {
              stage: data.stage,
              rootPi: data.results?.root_pi
            });
            isDone = true;

            // Continue polling for a bit to see if status changes
            this.log('status', 'Continuing to poll for 15 more seconds to observe final state');
            for (let i = 0; i < 3; i++) {
              await new Promise(resolve => setTimeout(resolve, 5000));
              const finalResponse = await fetch(`${this.config.statusApiUrl}/${batchId}`);
              const finalData = await finalResponse.json();
              this.log('status', `Post-completion check ${i + 1}`, finalData);
            }

            break;
          }

          // Check for error
          if (data.stage === 'error') {
            this.log('status', 'Processing failed', {
              stage: data.stage,
              phase: data.phase,
              error: data.error,
            });
            isDone = true;
            break;
          }
        }
      } catch (error) {
        this.log('status', 'Error during monitoring', {
          error: error instanceof Error ? error.message : String(error),
        });

        // Don't break on error, keep trying
      }

      await new Promise(resolve => setTimeout(resolve, this.config.statusPollInterval));
    }

    if (!isDone) {
      this.log('status', 'Monitoring timed out', { maxAttempts });
    }
  }

  /**
   * Run the full monitoring workflow
   */
  async run(): Promise<void> {
    console.log('\n=== Arke Upload Monitor ===\n');
    console.log(`Log file: ${this.logFilePath}\n`);

    try {
      // Phase 1: Upload
      const batchId = await this.uploadPhase();

      // Phase 2: Monitor via Status API
      await this.monitorStatusAPI(batchId);

      // Final summary
      console.log('\n=== MONITORING COMPLETE ===\n');
      console.log(`Total logs: ${this.logs.length}`);
      console.log(`Unique stages encountered: ${Array.from(this.uniqueStatuses).join(', ')}`);
      console.log(`\nFull logs saved to: ${this.logFilePath}\n`);
    } catch (error) {
      this.log('status', 'Fatal error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      console.error('\n=== ERROR ===\n');
      console.error(error);
      console.error(`\nLogs saved to: ${this.logFilePath}\n`);
    }
  }
}

// Run the monitor
const config: Config = {
  ingestWorkerUrl: process.env.INGEST_WORKER_URL || 'https://ingest.arke.institute',
  statusApiUrl: process.env.STATUS_API_URL || 'https://status.arke.institute/status',
  arkeInstituteUrl: process.env.ARKE_INSTITUTE_URL || 'https://arke.institute',
  uploader: process.env.UPLOADER || 'test-monitor-script',
  rootPath: process.env.ROOT_PATH || '/test-upload-' + Date.now(),
  testFilesPath: process.env.TEST_FILES_PATH || path.join(__dirname, '..', 'drexel_1'),
  statusPollInterval: Number(process.env.STATUS_POLL_INTERVAL) || 5000,
};

const monitor = new UploadMonitor(config);
monitor.run();
