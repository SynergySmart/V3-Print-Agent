/**
 * ZPL to PDF Converter
 * Uses Labelary API to convert ZPL thermal labels to PDF
 */

import axios from 'axios';

/**
 * Convert ZPL code to PDF buffer using Labelary API
 *
 * @param zplDataUrl - ZPL as data URL (data:text/plain;base64,...)
 * @returns PDF as Buffer
 */
export async function convertZPLtoPDF(zplDataUrl: string): Promise<Buffer> {
  try {
    // Extract base64 part
    const base64Data = zplDataUrl.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid ZPL data URL format');
    }

    // Decode base64 to ZPL text
    const zplCode = Buffer.from(base64Data, 'base64').toString('utf-8');

    console.log(`[Converter] Converting ZPL to PDF (${zplCode.length} chars)...`);

    // Call Labelary API
    // Documentation: http://labelary.com/service.html
    const labelaryUrl = 'http://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/pdf';

    const response = await axios.post(labelaryUrl, zplCode, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/pdf'
      },
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const pdfBuffer = Buffer.from(response.data);

    console.log(`[Converter] ZPL converted to PDF (${pdfBuffer.length} bytes)`);

    return pdfBuffer;
  } catch (error: any) {
    console.error('[Converter] Failed to convert ZPL:', error);
    throw new Error(`ZPL conversion failed: ${error.message}`);
  }
}
