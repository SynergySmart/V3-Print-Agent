/**
 * Shared types for V3 Print Agent
 */

export type DocumentType = 'shipping-label' | 'invoice' | 'packing-slip' | 'pick-list';

export type PrintFormat = 'ZPL' | 'ZPLII' | 'PDF' | 'PNG';

export type PrintStatus = 'pending' | 'converting' | 'printing' | 'completed' | 'failed';

export interface PrintJobRequest {
  jobId: string;
  type: DocumentType;
  orderId?: string;
  documentId?: string;
  format: PrintFormat;
  data: string; // Base64 data URL
  metadata?: {
    trackingNumber?: string;
    carrier?: string;
    orderNumber?: string;
    [key: string]: any;
  };
}

export interface PrintJobResponse {
  success: boolean;
  jobId: string;
  printer?: string;
  status: PrintStatus;
  error?: string;
  timestamp: string;
  duration?: number;
}

export interface BatchPrintRequest {
  jobs: PrintJobRequest[];
}

export interface BatchPrintResponse {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    jobId: string;
    error: string;
  }>;
  duration: number;
}

export interface PrinterInfo {
  name: string;
  isDefault: boolean;
  status: 'idle' | 'printing' | 'offline' | 'error';
  type: 'zebra' | 'standard' | 'unknown';
  connection?: 'usb' | 'network' | 'bluetooth';
}

export interface StationConfig {
  stationId: string;
  stationName: string;
  printers: {
    [key in DocumentType]?: {
      name: string;
      autoPrint: boolean;
      enabled: boolean;
      is4x6: boolean; // True for thermal label printers, false for standard letter-size printers
    };
  };
  apiUrl: string;
  lastModified: string;
}

export interface AgentStatus {
  version: string;
  stationId: string;
  stationName: string;
  uptime: number;
  apiConnected: boolean;
  printers: PrinterInfo[];
  queueLength: number;
  totalPrinted: number;
  lastJobAt: string | null;
}
