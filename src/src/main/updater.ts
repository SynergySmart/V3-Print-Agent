/**
 * Auto-Updater
 * Checks for new versions on startup and downloads updates in background
 */

import { app, dialog, shell, Notification } from 'electron';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

const UPDATE_CHECK_URL = 'https://api.github.com/repos/SynergySmart/V3-Print-Agent/releases/latest';
const CURRENT_VERSION = '1.0.7';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

let downloadedInstallerPath: string | null = null;

/**
 * Compare semantic versions (e.g., "1.0.2" vs "1.0.1")
 */
function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true;
    if (latestParts[i] < currentParts[i]) return false;
  }

  return false; // Versions are equal
}

/**
 * Download installer to temp directory
 */
async function downloadInstaller(downloadUrl: string): Promise<string> {
  console.log(`[Updater] Downloading installer from: ${downloadUrl}`);

  const response = await axios.get(downloadUrl, {
    responseType: 'arraybuffer',
    onDownloadProgress: (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
      console.log(`[Updater] Download progress: ${percentCompleted}%`);
    },
  });

  const tempDir = os.tmpdir();
  const installerPath = path.join(tempDir, 'V3-Print-Agent-Update.exe');

  fs.writeFileSync(installerPath, Buffer.from(response.data));
  console.log(`[Updater] Installer downloaded to: ${installerPath}`);

  return installerPath;
}

/**
 * Show update notification and handle install
 */
function showUpdateNotification(release: GitHubRelease, installerPath: string): void {
  const version = release.tag_name.replace('v', '');
  const firstLine = release.body.split('\n').find(line => line.trim() && !line.startsWith('#')) || 'New version available';

  const notification = new Notification({
    title: `Update Available: v${version}`,
    body: `New version ready! Click to install.\n${firstLine}`,
    icon: path.join(__dirname, '../../assets/icon.ico'),
    actions: [
      { text: 'Install Now', type: 'button' },
      { text: 'Later', type: 'button' },
    ],
  });

  notification.on('click', () => {
    promptInstall(release, installerPath);
  });

  notification.on('action', (event, index) => {
    if (index === 0) {
      // Install Now
      promptInstall(release, installerPath);
    }
    // "Later" - do nothing, notification closes
  });

  notification.show();
}

/**
 * Prompt user to install update
 */
function promptInstall(release: GitHubRelease, installerPath: string): void {
  const version = release.tag_name.replace('v', '');

  const response = dialog.showMessageBoxSync({
    type: 'info',
    title: 'Install Update?',
    message: `Install V3 Print Agent v${version}?`,
    detail: `The installer will open and the current app will close. Your settings will be preserved.\n\nSee full release notes at:\nhttps://github.com/SynergySmart/V3/releases/tag/${release.tag_name}`,
    buttons: ['Install Now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 0) {
    // Install Now
    console.log(`[Updater] Launching installer: ${installerPath}`);
    shell.openPath(installerPath);
    app.quit(); // Close current app so installer can run
  }
}

/**
 * Check for updates
 *
 * @param manual - If true, shows "no updates" message. If false, silent check.
 */
export async function checkForUpdates(manual: boolean = false): Promise<void> {
  try {
    console.log('[Updater] Checking for updates...');
    console.log(`[Updater] Current version: ${CURRENT_VERSION}`);

    // Fetch latest release from GitHub
    const response = await axios.get<GitHubRelease>(UPDATE_CHECK_URL, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'application/vnd.github+json',
      },
    });

    const release = response.data;
    const latestVersion = release.tag_name.replace('v', ''); // Remove 'v' prefix
    console.log(`[Updater] Latest version: ${latestVersion}`);

    // Find the installer asset
    const installerAsset = release.assets.find(asset =>
      asset.name.endsWith('.exe') && asset.name.includes('Setup')
    );

    if (!installerAsset) {
      throw new Error('No installer found in latest release');
    }

    // Compare versions
    if (isNewerVersion(CURRENT_VERSION, latestVersion)) {
      console.log('[Updater] New version available!');

      if (manual) {
        // Manual check - show dialog immediately
        const dialogResponse = dialog.showMessageBoxSync({
          type: 'info',
          title: 'Update Available',
          message: `Version ${latestVersion} is available!`,
          detail: `You're running v${CURRENT_VERSION}.\n\nSee release notes at:\nhttps://github.com/SynergySmart/V3/releases/tag/${release.tag_name}`,
          buttons: ['Download & Install', 'Cancel'],
          defaultId: 0,
          cancelId: 1,
        });

        if (dialogResponse === 0) {
          // Download and install
          const installerPath = await downloadInstaller(installerAsset.browser_download_url);
          promptInstall(release, installerPath);
        }
      } else {
        // Silent check - download in background, then notify
        const installerPath = await downloadInstaller(installerAsset.browser_download_url);
        downloadedInstallerPath = installerPath;
        showUpdateNotification(release, installerPath);
      }
    } else {
      console.log('[Updater] Already on latest version');

      if (manual) {
        dialog.showMessageBox({
          type: 'info',
          title: 'No Updates Available',
          message: `You're running the latest version (v${CURRENT_VERSION})`,
          buttons: ['OK'],
        });
      }
    }
  } catch (error: any) {
    console.error('[Updater] Failed to check for updates:', error.message);

    if (manual) {
      dialog.showMessageBox({
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not check for updates. Please try again later.',
        detail: error.message || 'Network error',
        buttons: ['OK'],
      });
    }
  }
}

/**
 * Get current version
 */
export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}
