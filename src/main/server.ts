/**
 * HTTP Server for Print Agent
 * Listens on localhost:8080 for print requests from web app
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { PrintJobRequest, PrintJobResponse, BatchPrintRequest, BatchPrintResponse } from '../shared/types';
import { printDocument } from './printer';
import { getStationConfig } from './config';
import { logPrintJob } from './logger';

let server: Server | null = null;
const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3001',      // Local frontend dev
    'http://localhost:3002',      // Local backend dev
    'https://www.regrade.io',     // Production frontend
    'https://regrade.io'          // Production frontend (no www)
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Large limit for batch jobs

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  const config = getStationConfig();

  res.json({
    status: 'healthy',
    version: '1.0.3',
    stationId: config.stationId,
    stationName: config.stationName,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get available printers
 */
app.get('/printers', async (req: Request, res: Response) => {
  try {
    const { getAvailablePrinters } = await import('./printer');
    const printers = await getAvailablePrinters();

    res.json({
      success: true,
      printers
    });
  } catch (error: any) {
    console.error('[Server] Error getting printers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get printers'
    });
  }
});

/**
 * Print single document
 */
app.post('/print/job', async (req: Request, res: Response) => {
  const jobRequest: PrintJobRequest = req.body;

  console.log(`[Server] Received print job: ${jobRequest.jobId} (${jobRequest.type})`);

  try {
    const startTime = Date.now();

    // Print the document
    const result = await printDocument(jobRequest);

    const duration = Date.now() - startTime;

    // Log to backend (fire and forget)
    logPrintJob(jobRequest, 'completed', duration).catch(err =>
      console.error('[Server] Failed to log print job:', err)
    );

    const response: PrintJobResponse = {
      success: true,
      jobId: jobRequest.jobId,
      printer: result.printer,
      status: 'completed',
      timestamp: new Date().toISOString(),
      duration
    };

    res.json(response);
  } catch (error: any) {
    console.error('[Server] Print job failed:', error);

    // Log failure to backend
    logPrintJob(jobRequest, 'failed', undefined, error.message).catch(err =>
      console.error('[Server] Failed to log print error:', err)
    );

    const response: PrintJobResponse = {
      success: false,
      jobId: jobRequest.jobId,
      status: 'failed',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * Batch print multiple documents
 */
app.post('/print/batch', async (req: Request, res: Response) => {
  const batchRequest: BatchPrintRequest = req.body;

  console.log(`[Server] Received batch print: ${batchRequest.jobs.length} jobs`);

  const startTime = Date.now();
  let successful = 0;
  let failed = 0;
  const errors: Array<{ jobId: string; error: string }> = [];

  // Process jobs sequentially to avoid overwhelming the printer
  for (const job of batchRequest.jobs) {
    try {
      await printDocument(job);
      successful++;

      // Log success to backend (fire and forget)
      logPrintJob(job, 'completed').catch(err =>
        console.error('[Server] Failed to log print job:', err)
      );
    } catch (error: any) {
      failed++;
      errors.push({
        jobId: job.jobId,
        error: error.message || 'Unknown error'
      });

      // Log failure to backend
      logPrintJob(job, 'failed', undefined, error.message).catch(err =>
        console.error('[Server] Failed to log print error:', err)
      );
    }
  }

  const duration = Date.now() - startTime;

  const response: BatchPrintResponse = {
    total: batchRequest.jobs.length,
    successful,
    failed,
    errors,
    duration
  };

  console.log(`[Server] Batch complete: ${successful}/${batchRequest.jobs.length} successful in ${duration}ms`);

  res.json(response);
});

/**
 * Get station configuration
 */
app.get('/config', (req: Request, res: Response) => {
  const config = getStationConfig();
  res.json(config);
});

/**
 * Update station configuration
 */
app.post('/config', (req: Request, res: Response) => {
  try {
    const { saveStationConfig } = require('./config');
    saveStationConfig(req.body);

    res.json({
      success: true,
      message: 'Configuration saved'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Start the HTTP server
 */
export async function startServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(port, 'localhost', () => {
        console.log(`[Server] Listening on http://localhost:${port}`);
        resolve();
      });

      server.on('error', (error) => {
        console.error('[Server] Server error:', error);
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Stop the HTTP server
 */
export async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[Server] Server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}
