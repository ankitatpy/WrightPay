# Architecture

WrightPay V1 uses a modular, Domain-Driven NestJS architecture.

## Overview
```
HTTP Request -> Controller -> Service -> Repository (TypeORM) -> PostgreSQL
```

## Core Infrastructure
- **NestJS**: Acts as the dependency injection and routing framework.
- **TypeORM**: Used for interacting with PostgreSQL. Crucial for explicit transaction boundaries and pessimistic `FOR UPDATE` locking to prevent race conditions during transfers.
- **PostgreSQL**: Source of truth for financial and user data.
- **Redis**: Handles exchange rate caching, idempotency keys, and acts as the broker for BullMQ.
- **JWT**: Authenticates user sessions using `Passport`. Ownership is determined purely from the JWT context via the `@CurrentUser` decorator, meaning user IDs sent from client bodies are ignored.

## Modules
- **Auth**: Manages registration, hashing with Argon2id, and JWT issuance.
- **Users**: Profile management.
- **Wallets**: Resolves native balances and calculates cross-currency equivalent balances using current exchange rates.
- **Exchange Rates**: Provides currency conversion logic, including triangulated and inverse rates.
- **Beneficiaries**: Manages cross-border contacts with a strict limit of 3. Enforces the UPI-INR rule securely on the backend.
- **Cards**: Manages active/frozen/deactivated lifecycle states. Discards PAN/CVV immediately upon tokenization.
- **Transfers**: Central transactional engine handling idempotency, rate resolution, locking, balance checking, deduction, and transaction ledger emission atomically.
- **Transactions**: Read-only ledger queries.
