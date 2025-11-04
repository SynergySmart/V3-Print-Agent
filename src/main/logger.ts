/**
 * Backend Logger
 * Logs print jobs to V3 backend for monitoring
 */

import axios from 'axios';
import { PrintJobRequest, PrintStatus } from '../shared/types';
import { getStationConfig } from './config';

/**
 * Log print job to backend
 */
export async function logPrintJob(
  job: PrintJobRequest,
  status: PrintStatus,
  duration?: number,
  errorMessage?: string
): Promise<void> {
  try {
    const config = getStationConfig();

    // TODO: Get userId from web app authentication
    // For now, will be added in Phase 2

    const logData = {
      stationId: config.stationId,
      jobId: job.jobId,
      jobType: job.type,
      documentId: job.orderId || job.documentId,
      printerName: status === 'completed' ? 'Configured Printer' : undefined,
      status,
      errorMessage,
      duration,
      metadata: {
        format: job.format,
        ...job.metadata
      }
    };

    // Send to backend (fire and forget)
    await axios.post(
      `${config.apiUrl}/print-jobs`,
      logData,
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Logger] Print job logged: ${job.jobId} - ${status}`);
  } catch (error: any) {
    // Don't throw - logging failure shouldn't stop printing
    console.error('[Logger] Failed to log to backend:', error.message);
  }
}
