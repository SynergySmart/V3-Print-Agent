# V3 Print Agent

Auto-print shipping labels and documents to configured printers without dialogs.

## Features

- ✅ Auto-print labels to Zebra thermal printers
- ✅ Auto-print invoices/documents to standard printers
- ✅ ZPL to PDF conversion (Labelary API)
- ✅ Batch printing for bulk shipping
- ✅ Station-based configuration
- ✅ System tray application
- ✅ Auto-start with Windows
- ✅ Auto-update on startup

## Installation

### Prerequisites

- Windows 10/11
- Node.js 18+ (for development)

### Setup for Development

```bash
cd print-agent
npm install
npm run dev
```

### Build Installer

```bash
npm run build
```

Installer will be in `out/make/squirrel.windows/x64/`

## Usage

### 1. Install & Configure

1. Install V3 Print Agent
2. Right-click system tray icon → Settings
3. Configure printers for each document type
4. Enable auto-print for desired types
5. Save

### 2. From V3 Web App

```typescript
// Print single label
const response = await fetch('http://localhost:8080/print/job', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobId: 'print-uuid-123',
    type: 'shipping-label',
    orderId: 'order-uuid-456',
    format: 'ZPL',
    data: 'data:text/plain;base64,...'
  })
});

// Batch print (bulk shipping)
const response = await fetch('http://localhost:8080/print/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobs: [
      { jobId: '1', type: 'shipping-label', ... },
      { jobId: '2', type: 'shipping-label', ... },
      ...
    ]
  })
});
```

## API Endpoints

### Print Single Job
```
POST http://localhost:8080/print/job

Request:
{
  "jobId": "uuid",
  "type": "shipping-label" | "invoice" | "packing-slip" | "pick-list",
  "orderId": "uuid",
  "format": "ZPL" | "PDF" | "PNG",
  "data": "data:text/plain;base64,...",
  "metadata": { ... }
}

Response:
{
  "success": true,
  "jobId": "uuid",
  "printer": "Zebra ZTC GK420d",
  "status": "completed",
  "timestamp": "2025-11-03T23:59:00Z",
  "duration": 1234
}
```

### Batch Print
```
POST http://localhost:8080/print/batch

Request:
{
  "jobs": [...]
}

Response:
{
  "total": 50,
  "successful": 48,
  "failed": 2,
  "errors": [...],
  "duration": 12500
}
```

### Get Printers
```
GET http://localhost:8080/printers

Response:
{
  "success": true,
  "printers": [
    {
      "name": "Zebra ZTC GK420d",
      "isDefault": true,
      "status": "idle",
      "type": "zebra"
    }
  ]
}
```

### Health Check
```
GET http://localhost:8080/health

Response:
{
  "status": "healthy",
  "version": "1.0.0",
  "stationId": "STATION-ABC123",
  "stationName": "Packing Station 1",
  "timestamp": "2025-11-03T23:59:00Z"
}
```

## Configuration

Configuration stored in: `C:\Users\{username}\AppData\Roaming\v3-print-agent-config\config.json`

```json
{
  "station": {
    "stationId": "STATION-ABC123",
    "stationName": "Packing Station 1",
    "printers": {
      "shipping-label": {
        "name": "Zebra ZTC GK420d",
        "autoPrint": true,
        "enabled": true
      },
      "invoice": {
        "name": "HP LaserJet Pro",
        "autoPrint": true,
        "enabled": true
      }
    },
    "apiUrl": "http://localhost:3002",
    "lastModified": "2025-11-03T23:59:00Z"
  }
}
```

## Development Roadmap

**Phase 1 (Week 1):** Core Printing ✅
- HTTP server with print endpoints
- Printer detection
- PDF printing
- ZPL conversion
- Local configuration

**Phase 2 (Week 2):** Web Integration
- Sync settings from web
- Cache user/company preferences
- Backend logging

**Phase 3 (Week 3):** Monitoring & UI
- React settings page
- Job monitoring
- Stuck job detection

**Phase 4 (Week 4):** Distribution
- Windows installer
- Auto-updater
- Documentation

## Troubleshooting

**Agent not starting:**
- Check if port 8080 is available
- Check logs in AppData/Roaming/v3-print-agent-config/

**Printer not found:**
- Make sure printer is installed in Windows
- Check printer name matches exactly (case-sensitive)
- Try "Refresh Printers" in settings

**ZPL conversion fails:**
- Requires internet connection (Labelary API)
- Check firewall settings
- Verify ZPL format is valid

## License

MIT
