# API Endpoints

All endpoints are prefixed with `/api/v1`. Detailed interactive documentation is available via Swagger at `http://localhost:3001/api/docs`.

### Auth
- `POST /auth/signup`: Registers a new user and wallet. Returns pending status.
- `POST /auth/verify-email`: Accepts OTP to activate an account.
- `POST /auth/login`: Issues a JWT access token.
- `POST /auth/logout`: Invalidates the session.

### Users
- `GET /users/me`: Gets the profile of the current JWT user.
- `PATCH /users/me`: Updates profile details (name, country).

### Wallets
- `GET /wallets/me`: Returns the primary wallet balance and equivalent balances in the 5 other supported currencies.

### Exchange Rates
- `GET /exchange-rates`: Returns all cached/stored rates.
- `GET /exchange-rates/quote`: Returns a transfer quote resolving from/to parameters, calculated fees, and expiration time.

### Beneficiaries
- `GET /beneficiaries`: List all active beneficiaries for the user.
- `POST /beneficiaries`: Create a beneficiary. Enforces maximum 3.
- `DELETE /beneficiaries/:id`: Soft deletes a beneficiary.

### Cards
- `GET /cards`: List user cards.
- `POST /cards`: Create/Tokenize a card.
- `POST /cards/:id/freeze`: Freeze an active card.
- `POST /cards/:id/unfreeze`: Unfreeze a card.
- `POST /cards/:id/deactivate`: Permanently deactivate a card.
- `DELETE /cards/:id`: Delete a card.

### Transfers
- `POST /transfers`: Executes an atomic money transfer. **Requires `Idempotency-Key` header**.

### Transactions
- `GET /transactions`: Query the historical ledger with `status`, `reference`, `limit`, and `offset` query parameters.
