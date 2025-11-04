/**
 * Configuration Management
 * Manages station-specific configuration stored locally
 */

import Store from 'electron-store';
import { StationConfig, DocumentType } from '../shared/types';
import crypto from 'crypto';
import os from 'os';

// Persistent store for station configuration
const store = new Store<{ station: StationConfig }>({
  name: 'v3-print-agent-config'
});

let stationConfig: StationConfig | null = null;

/**
 * Generate unique station ID
 */
function generateStationId(): string {
  return `STATION-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Get MAC address of primary network interface
 */
function getMacAddress(): string | null {
  try {
    const interfaces = os.networkInterfaces();

    // Prioritize Ethernet, then Wi-Fi, then any other active interface
    const priorityOrder = ['Ethernet', 'Wi-Fi', 'en0', 'eth0', 'wlan0'];

    for (const name of priorityOrder) {
      if (interfaces[name]) {
        for (const iface of interfaces[name] || []) {
          if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
            return iface.mac.toUpperCase();
          }
        }
      }
    }

    // Fallback: first non-internal interface with valid MAC
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          return iface.mac.toUpperCase();
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[Config] Failed to get MAC address:', error);
    return null;
  }
}

/**
 * Get system information
 */
function getSystemInfo() {
  return {
    hostname: os.hostname(),
    osType: os.type(), // 'Windows_NT', 'Darwin', 'Linux'
    osVersion: os.release(),
    platform: os.platform(),
  };
}

/**
 * Load configuration on startup
 */
export async function loadConfig(): Promise<StationConfig> {
  console.log('[Config] Loading configuration...');

  // Try to load existing config
  let config = store.get('station');

  if (!config) {
    // First time setup - create default config
    console.log('[Config] No existing config found, creating defaults...');

    config = {
      stationId: generateStationId(),
      stationName: `Station ${require('os').hostname()}`,
      printers: {
        'shipping-label': {
          name: '',  // User must configure
          autoPrint: false,
          enabled: false
        },
        'invoice': {
          name: '',
          autoPrint: false,
          enabled: false
        },
        'packing-slip': {
          name: '',
          autoPrint: false,
          enabled: false
        },
        'pick-list': {
          name: '',
          autoPrint: false,
          enabled: false
        }
      },
      apiUrl: 'http://localhost:3002',
      lastModified: new Date().toISOString()
    };

    store.set('station', config);
  }

  stationConfig = config;

  console.log(`[Config] Station ID: ${config.stationId}`);
  console.log(`[Config] Station Name: ${config.stationName}`);
  console.log(`[Config] API URL: ${config.apiUrl}`);

  return config;
}

/**
 * Get current station configuration
 */
export function getStationConfig(): StationConfig {
  if (!stationConfig) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }

  return stationConfig;
}

/**
 * Get station ID
 */
export function getStationId(): string {
  return getStationConfig().stationId;
}

/**
 * Save station configuration
 */
export function saveStationConfig(config: Partial<StationConfig>): void {
  const current = getStationConfig();

  const updated: StationConfig = {
    ...current,
    ...config,
    lastModified: new Date().toISOString()
  };

  store.set('station', updated);
  stationConfig = updated;

  console.log('[Config] Configuration saved');
}

/**
 * Update printer configuration for a specific document type
 */
export function updatePrinterConfig(
  type: DocumentType,
  printerName: string,
  autoPrint: boolean
): void {
  const config = getStationConfig();

  config.printers[type] = {
    name: printerName,
    autoPrint,
    enabled: true
  };

  saveStationConfig(config);
}

/**
 * Get MAC address (exported for heartbeat/registration)
 */
export function getStationMacAddress(): string | null {
  return getMacAddress();
}

/**
 * Get system info (exported for heartbeat/registration)
 */
export function getStationSystemInfo() {
  return getSystemInfo();
}
