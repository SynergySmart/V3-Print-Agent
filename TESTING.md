# Testing V3 Print Agent

## Quick Start (Development Mode)

### 1. Start the Agent

```bash
cd print-agent
npm run dev
```

**What should happen:**
- Electron window may briefly appear (or not, depending on setup)
- System tray icon appears (bottom-right of taskbar)
- HTTP server starts on localhost:8080
- Console shows: `[Server] Listening on http://localhost:8080`

### 2. Verify Agent is Running

Open browser and go to:
```
http://localhost:8080/health
```

**Should see:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "stationId": "STATION-XXXXX",
  "stationName": "Station YOUR-PC-NAME",
  "timestamp": "2025-11-03T..."
}
```

### 3. Configure Printers

**Right-click system tray icon → Settings**

1. Enter Station Name (e.g., "Packing Station 1")
2. Select printer for Shipping Labels
3. Check "Auto-print" checkbox
4. Click "Save Settings"

### 4. Test from Web App

**Go to:** http://localhost:3001/orders/scan-and-ship

**Should see:**
- ✅ Green banner: "Print Agent Connected • Station Name"

**If you see yellow banner:**
- Agent isn't running
- Or firewall blocking localhost:8080

### 5. Test Print (Manual API Call)

```bash
curl -X POST http://localhost:8080/print/job \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-123",
    "type": "shipping-label",
    "format": "PDF",
    "data": "data:application/pdf;base64,..."
  }'
```

**Should see:**
```json
{
  "success": true,
  "jobId": "test-123",
  "printer": "Your Configured Printer",
  "status": "completed"
}
```

## Troubleshooting

**Agent won't start:**
- Check if port 8080 is available: `netstat -ano | findstr :8080`
- Check logs in AppData

**Printers not showing:**
- Make sure printers are installed in Windows
- Try "Refresh Printers" button

**Print fails:**
- Check printer name matches exactly (case-sensitive)
- Verify printer is online and ready
- Check Windows printer queue

**Web app can't detect agent:**
- Verify agent is running (check system tray)
- Check http://localhost:8080/health in browser
- Check browser console for errors

## Next Steps

Once basic printing works:
1. Test ZPL label printing
2. Test batch printing
3. Build installer (`npm run build`)
4. Test installation on clean machine
