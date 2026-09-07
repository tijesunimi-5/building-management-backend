# ApexCare Property Maintenance — Backend REST API

This is the Node.js / Express / TypeScript backend service for the ApexCare Property Services Platform.

## Architecture

* **Framework**: Express.js with TypeScript
* **Database Schema**: Prisma ORM with PostgreSQL schema definition (`src/db/schema.prisma`)
* **API Versioning**: `/api/v1`

## Data Models

1. **User**: Roles: `CLIENT`, `ADMIN`, `WORKER`.
2. **Property**: Represents client-owned real estate assets with address and location metadata.
3. **ServiceRequest**: Intake submitted by Clients with service category, description, and attachments.
4. **Project**: Conversion of a service request into an actionable project with assigned worker, priority, and timeline.
5. **Task**: Individual checklist items for a project (calculates completion % dynamically).
6. **Photo**: Evidence photographs tagged as `BEFORE`, `DURING`, or `AFTER` with timestamp and worker attribution.
7. **TimelineEvent**: Chronological audit trail for client visibility without requiring status calls.

## API Endpoints

* `GET /api/v1/health` - Server health check
* `GET /api/v1/properties` - List properties
* `POST /api/v1/requests` - Submit a service request
* `GET /api/v1/projects` - List active & historical projects
* `POST /api/v1/projects/:id/tasks` - Update task status
* `POST /api/v1/projects/:id/photos` - Upload evidence photo

## Setup & Run

```bash
# Install dependencies
npm install

# Run dev mode
npm run dev

# Build production bundle
npm run build
```
