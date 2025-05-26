# Delivery Optimization System

A comprehensive delivery management system with a dispatcher-facing web app and a driver-facing mobile app.

## Project Structure

```
.
├── web/                 # React web application
├── backend/            # Node.js backend API
├── optimization/       # Python route optimization service
└── mobile/            # Flutter mobile application
```

## Prerequisites

- Node.js >= 18.0.0
- Python 3.9+
- Flutter SDK
- Docker and Docker Compose
- PostgreSQL
- Google Cloud Platform account (for Maps API)

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env` in each service directory
   - Fill in required API keys and configuration

3. Start development servers:
   ```bash
   # Start all services
   docker-compose up

   # Start web app
   npm run dev:web

   # Start backend
   npm run dev:backend
   ```

## Features

- Delivery job creation and management
- Route optimization using VRP algorithms
- Real-time driver tracking
- Customer notifications
- Mobile app for drivers
- Bulk delivery import
- Interactive route management

## Development

- Web App: React + Tailwind CSS
- Backend: Node.js + Express
- Optimization: Python + OR-Tools
- Mobile: Flutter
- Database: PostgreSQL
- Maps: Google Maps Platform

## Testing

```bash
# Run all tests
npm test

# Run web app tests
npm run test:web

# Run backend tests
npm run test:backend
```

## License

MIT 