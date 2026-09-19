# Frontend-Backend Mapping

This document maps the previous frontend mock functions in `frontend/lib/mock/*` to their new backend API counterparts.

## Authentication (auth.ts)
- `mockSignup()` -> `POST /api/v1/auth/signup`
- `mockLogin()` -> `POST /api/v1/auth/login`
- `verifyMockCode()` -> `POST /api/v1/auth/verify-email`
- `mockLogout()` -> `POST /api/v1/auth/logout`

## Users (users.ts/auth.ts)
- `getCurrentMockUser()` -> `GET /api/v1/users/me`

## Wallets (wallets.ts)
- `getUserWallet()` -> `GET /api/v1/wallets/me`

## Beneficiaries (beneficiaries.ts)
- `getUserBeneficiaries()` -> `GET /api/v1/beneficiaries`
- `addMockBeneficiary()` -> `POST /api/v1/beneficiaries`
- `removeMockBeneficiary()` -> `DELETE /api/v1/beneficiaries/:id`

## Cards (cards.ts)
- `getUserCards()` -> `GET /api/v1/cards`
- `addMockCard()` -> `POST /api/v1/cards`
- `freezeCard()` -> `POST /api/v1/cards/:id/freeze`
- `unfreezeCard()` -> `POST /api/v1/cards/:id/unfreeze`
- `deactivateCard()` -> `POST /api/v1/cards/:id/deactivate`
- `removeMockCard()` -> `DELETE /api/v1/cards/:id`

## Transactions (transactions.ts)
- `getUserTransactions()` -> `GET /api/v1/transactions`

## Transfers (transfers.ts)
- `createAndPersistTransaction()` + `deductUserWalletBalance()` -> `POST /api/v1/transfers`
