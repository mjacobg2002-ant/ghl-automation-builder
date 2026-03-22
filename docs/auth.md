# Authentication

## Overview

The GHL internal API uses Firebase Authentication, not OAuth Bearer tokens. The auth model is fundamentally different from the public API.

| Aspect | Public API | Internal API |
|--------|-----------|--------------|
| Base URL | `services.leadconnectorhq.com` | `backend.leadconnectorhq.com` |
| Auth header | `Authorization: Bearer <pit-token>` | `token-id: <firebase-jwt>` |
| Token type | PIT (Private Integration Token) or OAuth | Firebase ID Token (JWT) |
| Token lifetime | Long-lived (PIT) or refreshable (OAuth) | ~1 hour |
| Scope | Per-endpoint scopes | Full user permissions |

## Required Headers

Every request to the internal API requires these headers:

```
token-id: <firebase-jwt>
channel: APP
Content-Type: application/json    # for POST/PUT requests
```

The `channel: APP` header is mandatory. Requests without it are rejected.

## Firebase JWT Structure

The JWT is issued by Firebase Authentication for the `highlevel-backend` project.

### JWT Header
```json
{
  "alg": "RS256",
  "kid": "<key-id>",
  "typ": "JWT"
}
```

### JWT Payload
```json
{
  "user_id": "YewkebOufK3hmeP1gx4B",
  "company_id": "R1HWQKyMMoj4PJ5mAYed",
  "role": "admin",
  "type": "agency",
  "version": 2,
  "locations": ["2hP6rCb3COd2HUjD25w2", "W7BRJwzJCvFs9r0xZHrE"],
  "permissions": {
    "workflows_enabled": true,
    "workflows_read_only": false
  },
  "iss": "securetokern.google.com/highlevel-backend",
  "aud": "highlevel-backend",
  "auth_time": 1700000000,
  "sub": "YewkebOufK3hmeP1gx4B",
  "iat": 1700000000,
  "exp": 1700003600
}
```

### Key Fields

| Field | Purpose |
|-------|---------|
| `user_id` | GHL user ID -- used in `updatedBy` fields |
| `company_id` | GHL agency/company ID |
| `role` | `admin`, `user` -- determines write access |
| `locations` | Array of location IDs the user can access |
| `permissions.workflows_enabled` | Whether user can access workflows |
| `permissions.workflows_read_only` | If true, user can only read (no create/update/delete) |
| `exp` | Expiration timestamp (~1 hour from issue) |

## Obtaining a Token

### Method 1: Browser DevTools (Manual)

1. Log into `app.gohighlevel.com`
2. Open DevTools > Network tab
3. Navigate to Automations > Workflows
4. Find any request to `backend.leadconnectorhq.com`
5. Copy the `token-id` header value

This token is valid for ~1 hour from the time it was issued.

### Method 2: Firebase SDK (Programmatic)

GHL's frontend uses the Firebase JS SDK to manage authentication. The flow:

1. User logs in via GHL's auth form
2. GHL backend issues a Firebase custom token
3. Firebase SDK exchanges custom token for an ID token
4. ID token auto-refreshes via Firebase SDK's `onIdTokenChanged` listener
5. Every API call uses the current ID token as `token-id`

To replicate programmatically, you would need:
- Firebase project config for `highlevel-backend`
- A valid Firebase custom token (issued by GHL's auth endpoint)
- Firebase Admin SDK or REST API for token exchange

### Method 3: Firebase REST Token Refresh

If you have a Firebase refresh token, you can exchange it for a new ID token:

```bash
# Exchange refresh token for new ID token
curl -s -X POST "https://securetoken.googleapis.com/v1/token?key=FIREBASE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

Response:
```json
{
  "access_token": "new-firebase-jwt...",
  "expires_in": "3600",
  "token_type": "Bearer",
  "refresh_token": "new-refresh-token",
  "id_token": "new-firebase-jwt...",
  "user_id": "YewkebOufK3hmeP1gx4B",
  "project_id": "highlevel-backend"
}
```

Use the `id_token` value as your `token-id` header.

## Token Expiry Handling

Firebase ID tokens expire after approximately 1 hour. When a token expires:

- API returns `401 Unauthorized`
- You must obtain a fresh token before continuing

For scripts that run longer than 1 hour, implement a refresh loop:

```bash
#!/bin/bash
# Check if token is still valid before each request
check_token() {
  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE/workflow/$LOC/list?limit=1" \
    -H "token-id: $TOKEN" \
    -H "channel: APP")

  if [ "$response" = "401" ]; then
    echo "Token expired, refreshing..."
    refresh_token  # your refresh implementation
  fi
}
```

## Permission Model

The JWT's `permissions` object controls access:

| Permission | Effect |
|-----------|--------|
| `workflows_enabled: true` | Can access workflow endpoints |
| `workflows_enabled: false` | All workflow endpoints return 403 |
| `workflows_read_only: true` | Can GET but not POST/PUT/DELETE |
| `workflows_read_only: false` | Full CRUD access |

The `role` field also matters:
- `admin` -- full access to all locations in the company
- `user` -- access restricted to locations in the `locations` array

## Security Notes

- Firebase JWTs contain your full user context. Treat them as secrets.
- Never commit tokens to version control.
- The `token-id` header is sent in plaintext over HTTPS -- the connection is encrypted but the header name is non-standard, which may confuse security tooling.
- GHL's internal API does not use CSRF tokens or API keys -- the Firebase JWT is the sole auth mechanism.
