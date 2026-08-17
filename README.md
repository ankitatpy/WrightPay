# WrightPay

**WrightPay** is a fictional full-stack cross-border payments platform built as a portfolio project and SDET (Software Development Engineer in Test) testing framework demonstration.

## Project Overview

WrightPay is a monorepo containing two independent applications:

- **Frontend**: Next.js, React, TypeScript
- **Backend**: NestJS, Node.js, TypeScript

The platform will enable peer-to-peer (P2P) and business payments across borders, featuring real-time transaction processing, multi-currency support, and secure payment handling.

## Technology Stack

### Frontend
- **Framework**: Next.js (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Linting**: ESLint

### Backend
- **Framework**: NestJS
- **Runtime**: Node.js
- **Language**: TypeScript
- **Build Tool**: TypeScript Compiler

### Infrastructure & Services (Planned)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Caching**: Redis
- **Job Queue**: BullMQ
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render

### Testing & Quality Assurance (Planned)
- SDET framework and end-to-end testing suite will be added in future iterations
- Testing and QA infrastructure development is deferred

## Project Structure

```
WrightPay/
├── frontend/              # Next.js application
│   ├── app/              # App router pages
│   ├── public/           # Static assets
│   ├── package.json      # Frontend dependencies
│   └── tsconfig.json     # Frontend TypeScript config
├── backend/              # NestJS application
│   ├── src/              # Source code
│   ├── test/             # Test files
│   ├── package.json      # Backend dependencies
│   └── tsconfig.json     # Backend TypeScript config
├── docs/                 # Documentation
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Git

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

```bash
cd backend
npm install
npm run start:dev
```

The backend will be available at `http://localhost:3001`

## Configuration

Environment variables should be set in individual `.env.local` files within the `frontend/` and `backend/` directories. Use `.env.example` in the root as a reference.

**Important**: Never commit `.env`, `.env.local`, or any files containing secrets or credentials to the repository.

## Current Status

🚧 **Foundation Phase**: This project is in the initial setup phase with the monorepo structure and core tooling established. Business logic, APIs, authentication, and database integration are not yet implemented.

### What's Not Yet Implemented
- Authentication system
- Database schemas and ORM configuration
- API endpoints
- Business logic and payment processing
- Testing framework and SDET suite
- CI/CD pipeline
- Docker configuration
- Deployment configuration

## Development Guidelines

1. Keep frontend and backend as independent applications with separate dependency management
2. Each application has its own `package.json` and configuration
3. Maintain TypeScript strict mode across both applications
4. Follow ESLint rules defined in each application

## License

ISC

## Notes

This is a fictional project created by Ankit Pandey for educational and portfolio purposes. All features, company names, and business logic are simulated and not intended to represent actual payment processing systems.
