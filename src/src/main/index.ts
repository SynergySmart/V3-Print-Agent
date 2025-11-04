/**
 * V3 Print Agent - Main Process
 *
 * Electron app that provides auto-printing capabilities for V3 Inventory
 */

import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { startServer, stopServer } from './server';
import { loadConfig, getStationId } from './config';
import { checkForUpdates } from './updater';

let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;

// Enable auto-launch on Windows startup
app.setLoginItemSettings({
  openAtLogin: true,
  openAsHidden: true,
  path: app.getPath('exe')
});

/**
 * Create system tray icon
 */
function createTray() {
  // Create tray icon - use placeholder if icon file doesn't exist
  let icon: any;
  try {
    const iconPath = path.join(__dirname, '../../assets/icon.ico');
    icon = nativeImage.createFromPath(iconPath);

    // If icon is empty, use built-in placeholder
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
      // Create simple 16x16 icon (printer emoji as placeholder)
      icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAg0lEQVR4nGNgoBAwUqifYTQDRjNgNAOogVEXDLoMYPj//z/DlClTGBgZGRkuXLjAwMDAwPDr1y8GExMTBgYGBgZra2sGBgYGhtu3bzMwMjIyXLp0ieHChQsMDAwMDP/+/WNgYmJiYGBgYDA3N2dgYGBguHPnDgMjIyPDv3//GBgYGBj+/fvHQLl3AQB/bBam6p0uPwAAAABJRU5ErkJggg==');
    }
  } catch (error) {
    // Fallback to empty icon
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'V3 Print Agent',
      type: 'normal',
      enabled: false
    },
    { type: 'separator' },
    {
      label: `Station: ${getStationId()}`,
      type: 'normal',
      enabled: false
    },
    {
      label: 'Settings',
      type: 'normal',
      click: () => {
        openSettings();
      }
    },
    {
      label: 'Check for Updates',
      type: 'normal',
      click: async () => {
        await checkForUpdates(true);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      type: 'normal',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('V3 Print Agent - Running');
  tray.setContextMenu(contextMenu);
}

/**
 * Open settings window
 */
function openSettings() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    title: 'V3 Print Agent Settings',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, '../preload/index.js')
    }
  });

  // In dev mode, load from src. In production, load from dist
  const settingsPath = app.isPackaged
    ? path.join(__dirname, '../renderer/settings.html')
    : path.join(__dirname, '../../src/renderer/settings.html');

  settingsWindow.loadFile(settingsPath);

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

/**
 * App ready - initialize everything
 */
app.whenReady().then(async () => {
  console.log('[Main] V3 Print Agent starting...');

  // Load configuration
  await loadConfig();

  // Check for updates on startup
  await checkForUpdates(false);

  // Start HTTP server
  const port = 8080;
  await startServer(port);
  console.log(`[Main] Print Agent HTTP server running on http://localhost:${port}`);

  // Create system tray
  createTray();

  console.log('[Main] V3 Print Agent ready');
});

/**
 * Cleanup on quit
 */
app.on('before-quit', async () => {
  console.log('[Main] Shutting down...');
  await stopServer();
});

/**
 * Prevent app from quitting when all windows are closed (run in background)
 */
app.on('window-all-closed', () => {
  // Don't quit - stay in system tray
});

/**
 * Handle activation (macOS)
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    openSettings();
  }
});
