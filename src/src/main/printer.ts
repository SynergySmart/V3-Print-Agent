/**
 * Printer Management
 * Handles printer detection and document printing
 */

import { print, getPrinters as getSystemPrinters } from 'pdf-to-printer';
import { PrintJobRequest, PrinterInfo, DocumentType } from '../shared/types';
import { getStationConfig } from './config';
import { convertZPLtoPDF } from './converter';

/**
 * Get all available printers on this system
 */
export async function getAvailablePrinters(): Promise<PrinterInfo[]> {
  try {
    // pdf-to-printer provides getPrinters() function
    const printers = await getSystemPrinters();

    return printers.map((p: any) => ({
      name: p.name,
      isDefault: false, // pdf-to-printer doesn't provide default status
      status: 'idle' as const,
      type: detectPrinterType(p.name),
      connection: detectConnectionType(p.name)
    }));
  } catch (error) {
    console.error('[Printer] Failed to get printers:', error);
    return [];
  }
}

/**
 * Detect printer type from name
 */
function detectPrinterType(name: string): 'zebra' | 'standard' | 'unknown' {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('zebra') || nameLower.includes('ztc') || nameLower.includes('zd')) {
    return 'zebra';
  }

  return 'standard';
}

/**
 * Detect connection type from name/attributes
 */
function detectConnectionType(name: string): 'usb' | 'network' | 'bluetooth' | undefined {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('usb')) return 'usb';
  if (nameLower.includes('network') || nameLower.includes('ip')) return 'network';
  if (nameLower.includes('bluetooth') || nameLower.includes('bt')) return 'bluetooth';

  return undefined;
}


/**
 * Resolve which printer to use for a document type
 */
function resolvePrinter(type: DocumentType): { name: string; autoPrint: boolean; is4x6: boolean } {
  const config = getStationConfig();

  // Check station config (this PC)
  const stationPrinter = config.printers[type];

  if (stationPrinter && stationPrinter.enabled) {
    return {
      name: stationPrinter.name,
      autoPrint: stationPrinter.autoPrint,
      is4x6: stationPrinter.is4x6 || false
    };
  }

  // No printer configured for this document type
  throw new Error(`No printer configured for ${type}. Please configure in settings.`);
}

/**
 * Print a document
 */
export async function printDocument(job: PrintJobRequest): Promise<{ printer: string }> {
  console.log(`[Printer] Processing job ${job.jobId} (${job.type}, ${job.format})`);

  // 1. Resolve printer
  const printerConfig = resolvePrinter(job.type);

  if (!printerConfig.autoPrint) {
    throw new Error('Auto-print is disabled for this document type. Please enable in settings.');
  }

  console.log(`[Printer] Will print to: ${printerConfig.name}`);

  // 2. Convert to PDF if needed
  let pdfBuffer: Buffer;

  if (job.format === 'ZPL' || job.format === 'ZPLII') {
    console.log(`[Printer] Converting ZPL to PDF...`);
    pdfBuffer = await convertZPLtoPDF(job.data);
  } else if (job.format === 'PDF') {
    // Extract base64 data
    const base64Data = job.data.split(',')[1];
    pdfBuffer = Buffer.from(base64Data, 'base64');
  } else if (job.format === 'PNG') {
    // For now, treat PNG as PDF (most printers handle it)
    const base64Data = job.data.split(',')[1];
    pdfBuffer = Buffer.from(base64Data, 'base64');
  } else {
    throw new Error(`Unsupported format: ${job.format}`);
  }

  // 3. Print to configured printer
  console.log(`[Printer] Sending to printer ${printerConfig.name}...`);
  console.log(`[Printer] Printer type: ${printerConfig.is4x6 ? '4x6 thermal' : '8.5x11 standard'}`);

  try {
    // Save buffer to temp file (pdf-to-printer requires file path)
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const tempFile = path.join(os.tmpdir(), `v3-print-${Date.now()}.pdf`);
    fs.writeFileSync(tempFile, pdfBuffer);

    // Scale strategy based on printer type:
    // - 4x6 thermal printer: 'noscale' (print at actual size, paper matches label)
    // - 8.5x11 standard printer: 'shrink' (shrink to fit with margins, prevents clipping)
    const scaleOption = printerConfig.is4x6 ? 'noscale' : 'shrink';

    await print(tempFile, {
      printer: printerConfig.name,
      scale: scaleOption,  // Smart scaling based on printer type
      // No orientation specified - let PDF's natural orientation be used
    });

    // Cleanup temp file
    fs.unlinkSync(tempFile);

    console.log(`[Printer] Job ${job.jobId} sent to printer successfully (scale: ${scaleOption})`);

    return {
      printer: printerConfig.name
    };
  } catch (printError: any) {
    // Enhance error message
    if (printError.message?.includes('not found')) {
      throw new Error(`Printer "${printerConfig.name}" not found. Please check printer name in settings.`);
    }

    if (printError.message?.includes('offline') || printError.message?.includes('not ready')) {
      throw new Error(`Printer "${printerConfig.name}" is offline or not ready.`);
    }

    throw new Error(`Failed to print: ${printError.message}`);
  }
}
