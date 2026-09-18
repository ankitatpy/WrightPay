# WrightPay API Documentation

This directory contains the authoritative API contracts and documentation for the WrightPay platform.

## OpenAPI 3.0 Specification

- **File Location:** [`docs/WrightPay-API.yaml`](./WrightPay-API.yaml)
- **Specification Version:** OpenAPI `3.0.3`
- **Document Version:** `1.0.0`
- **Current Scope:** Fully specifies all 21 REST API endpoints implemented in the NestJS backend.

> **Note:** This specification accurately reflects the **CURRENT** codebase implementation (including business rules, status codes, DTO constraints, and error codes) rather than future or planned features.

---

## API Connection Details

| Property | Value | Notes |
|---|---|---|
| **API Base URL** | `http://localhost:3001/api/v1` | All REST routes are prefixed with `/api/v1` |
| **Local Swagger UI** | `http://localhost:3001/api/docs` | Built-in NestJS interactive documentation |
| **Authentication** | `Authorization: Bearer <token>` | HTTP Bearer authentication using signed JWT |
| **Transfer Idempotency** | `Idempotency-Key: <key>` | Required header on `POST /api/v1/transfers` |

---

## Viewing the Specification

You can view and interact with the OpenAPI definition using any standard tooling:

1. **Swagger Editor (Online):**  
   Paste the contents of `WrightPay-API.yaml` into [editor.swagger.io](https://editor.swagger.io/).
2. **VS Code / Cursor Extensions:**  
   Open with extensions such as *OpenAPI (Swagger) Editor* or *Swagger Viewer*.
3. **Local Swagger UI:**  
   Start the backend (`cd backend && npm run start:dev`) and navigate to `http://localhost:3001/api/docs`.
