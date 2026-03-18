# FleetTracker

A modern, full-stack fleet management application with real-time features, advanced security, and comprehensive vehicle tracking capabilities.

## Table of Contents

- [About](#about)
- [Features](#features)
- [Issues Fixed](#issues-fixed)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Security](#security)
- [Open Source](#open-source)
- [API Documentation](#api-documentation)
- [License](#license)

## About

FleetTracker is an open-source fleet management system designed for businesses and organizations to manage their vehicle fleets efficiently. It provides real-time tracking, comprehensive reporting, and robust security features.

### Problem Statement

Many fleet management solutions are expensive, closed-source, or lack essential features like:
- Real-time vehicle status updates
- Comprehensive security measures
- Modern, responsive user interfaces
- Flexible reporting and analytics

FleetTracker addresses these issues by providing a free, open-source alternative with modern features and best-practice security.

## Features

### Core Features
- **Vehicle Management** - Track fleet vehicles, assignments, and status
- **Trip Tracking** - Record checkouts, check-ins, mileage, and purposes
- **Service Scheduling** - Schedule and track maintenance services
- **User Management** - Role-based access control (Admin/User)
- **Real-time Updates** - Live socket.io notifications for vehicle status changes

### Security Features
- JWT authentication with access/refresh tokens
- Brute force protection (5 attempts, 15-min lockout)
- XSS input sanitization
- CSRF protection
- Rate limiting
- Request ID tracing
- Security headers (HSTS, CSP, X-Frame-Options)
- Password strength validation

### UI/UX Features
- Dark/Light mode toggle
- Responsive design (mobile-friendly)
- Keyboard shortcuts for navigation
- Real-time notifications
- Loading states and skeletons
- Pagination for tables

### Advanced Features
- **Trip Map Visualization** - View trips on an interactive map
- **Vehicle Calendar** - Calendar view for vehicle assignments
- **Dashboard Customization** - Customize widgets
- **Address Autocomplete** - Location suggestions using Nominatim
- **Bulk Operations** - Select and manage multiple vehicles
- **Import/Export** - CSV import/export with validation
- **Push Notifications** - WebPush support for mobile
- **Email Notifications** - Password reset, service reminders
- **Advanced Reports** - Cost analysis, fuel efficiency, depreciation

## Issues Fixed

This project addresses several common fleet management issues:

1. **Registration Bug** - Fixed registration endpoint returning false success
2. **Hardcoded Secrets** - Removed hardcoded passwords, now generates secure randoms
3. **Missing Authentication** - Socket.io now requires JWT authentication
4. **No Rate Limiting** - Added comprehensive rate limiting per endpoint
5. **Unresponsive UI** - Added loading skeletons, optimistic UI updates
6. **Missing Security Headers** - Added Helmet with CSP, HSTS, X-Frame-Options
7. **No Input Validation** - Added express-validator for all inputs
8. **Broken Real-time** - Server now emits socket events on trips/checkout/checkin

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite (dev) / PostgreSQL (prod) with Prisma ORM
- **Real-time**: Socket.io
- **Authentication**: JWT (access + refresh tokens)
- **Security**: Helmet, express-rate-limit, express-validator

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State**: React Context API
- **Real-time**: Socket.io-client
- **Maps**: Leaflet

### DevOps
- **Package Manager**: npm
- **Database**: SQLite for local testing

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/TechNomadTalks/FleetTracker.git
cd FleetTracker
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

4. Set up environment variables:
```bash
cp server/.env.example server/.env
```

5. Initialize the database:
```bash
cd server
npx prisma db push
npm run seed
```

6. Start the development servers:

**Server** (Terminal 1):
```bash
cd server
npm run dev
```

**Client** (Terminal 2):
```bash
cd client
npm run dev
```

7. Open http://localhost:5173 in your browser

### Default Credentials

After seeding, you can log in with:
- **Admin**: admin@fleettracker.com / (check server console for generated password)
- **User**: user@fleettracker.com / (check server console for generated password)

## Environment Variables

### Server (.env)

```env
# Required
DATABASE_URL=file:./dev.db
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Optional
PORT=5000
NODE_ENV=development
ADMIN_SECRET=your-admin-secret
ALLOWED_ORIGINS=http://localhost:5173

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-app-password
SMTP_FROM=FleetTracker <noreply@fleettracker.com>

# WebPush
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Client URL
CLIENT_URL=http://localhost:5173
```

### Client (.env)

```env
VITE_API_URL=http://localhost:5000
```

## Security

This project follows security best practices:

- **Authentication**: JWT with short-lived access tokens and long-lived refresh tokens
- **Password Hashing**: Bcrypt with 12 rounds
- **Input Validation**: All inputs validated with express-validator
- **Output Encoding**: XSS protection via input sanitization
- **Rate Limiting**: Per-endpoint rate limits to prevent abuse
- **CORS**: Configurable allowed origins
- **Security Headers**: Helmet.js with CSP, HSTS, X-Frame-Options
- **Request Tracing**: Unique request IDs for debugging

### Security Headers Implemented
- Content-Security-Policy (CSP)
- Strict-Transport-Security (HSTS)
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## Open Source

FleetTracker is open source software. You are welcome to:

- **Use** the software for personal or commercial projects
- **Modify** the source code to suit your needs
- **Share** the software with others
- **Contribute** improvements back to the community

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Building for Production

**Server**:
```bash
cd server
npm run build
npm start
```

**Client**:
```bash
cd client
npm run build
```

The built files will be in the `client/dist` directory.

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Vehicle Endpoints
- `GET /api/vehicles` - List all vehicles
- `POST /api/vehicles` - Create vehicle
- `GET /api/vehicles/:id` - Get vehicle details
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Trip Endpoints
- `GET /api/trips` - List trips
- `POST /api/trips/checkout` - Checkout vehicle
- `POST /api/trips/:id/checkin` - Checkin vehicle

### Service Endpoints
- `GET /api/services` - List service logs
- `POST /api/services` - Create service log

### Admin Endpoints
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/audit` - View audit logs

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ by the FleetTracker community
