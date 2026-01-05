# Customer-Side API Endpoints for Postman Testing

This document lists all customer-facing API endpoints with their request methods, JSON payloads, and authentication requirements.

**Base URL**: `http://localhost:3000` (or your production URL)

**Authentication**: Most endpoints require authentication via:

- **Cookies** (browser): Automatic via `sb-*-auth-token` cookies
- **Bearer Token** (Postman/API): `Authorization: Bearer <access_token>`

To get an access token, use the `/api/auth/signin` endpoint first.

---

## Authentication Endpoints

### 1. Sign Up

**POST** `/api/auth/signup`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "message": "Signup successful, please check your email.",
  "user": { ... }
}
```

---

### 2. Sign In

**POST** `/api/auth/signin`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "ok": true,
  "userId": "uuid",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_at": 1234567890,
  "expires_in": 3600
}
```

**Note**: Save the `access_token` for use in other requests.

---

### 3. Sign Out

**POST** `/api/auth/signout`

**Request Body:** None

**Response:**

```json
{
  "message": "Signed out successfully"
}
```

---

### 4. Update Profile

**POST** `/api/auth/update-profile`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "avatar_data_url": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

**Response:**

```json
{
  "message": "Profile updated successfully"
}
```

---

### 5. Change Password

**POST** `/api/auth/change-password`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response:**

```json
{
  "message": "Password updated successfully"
}
```

---

### 6. Forgot Password

**POST** `/api/auth/forgot-password`

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "message": "Password reset email sent"
}
```

---

### 7. Reset Password

**POST** `/api/auth/reset-password`

**Headers:** `Authorization: Bearer <access_token>` (from reset email link)

**Request Body:**

```json
{
  "password": "newpassword123"
}
```

**Response:**

```json
{
  "message": "Password updated successfully"
}
```

---

### 8. Resend Verification Email

**POST** `/api/auth/resend`

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "message": "Verification email resent"
}
```

---

## Session Endpoints

### 9. Get Current Session

**GET** `/api/session`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** None

**Response:**

```json
{
  "ok": true,
  "user": { ... },
  "profile": {
    "users_id": "uuid",
    "users_email": "user@example.com",
    "users_role": "user",
    "users_avatar_url": "https://...",
    "users_referral_code": "ABC123",
    "users_is_verified": true,
    "mobile_number": "+1234567890"
  },
  "role": "user",
  "kyc": {
    "status": "VERIFIED"
  },
  "isKycVerified": true,
  "needs_onboarding": false
}
```

---

## User Endpoints

### 10. Get User Addresses

**GET** `/api/user/addresses`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** None

**Response:**

```json
{
  "data": [
    {
      "user_address_id": "uuid",
      "user_id": "uuid",
      "user_address_label": "Home",
      "user_address_line1": "123 Main St",
      "user_address_line2": "Apt 4B",
      "user_address_city": "Manila",
      "user_address_region": "NCR",
      "user_address_postal": "1000",
      "user_address_is_default": true
    }
  ]
}
```

---

### 11. Create User Address

**POST** `/api/user/addresses`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "label": "Home",
  "line1": "123 Main Street",
  "line2": "Apt 4B",
  "city": "Manila",
  "region": "NCR",
  "postal": "1000",
  "is_default": true
}
```

**Response:**

```json
{
  "data": { ... }
}
```

---

### 12. Update User Address

**PUT** `/api/user/addresses/{id}`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "label": "Work",
  "line1": "456 Business Ave",
  "line2": "Suite 200",
  "city": "Makati",
  "region": "NCR",
  "postal": "1200",
  "is_default": false
}
```

**Response:**

```json
{
  "ok": true,
  "address": { ... }
}
```

---

### 13. Delete User Address

**DELETE** `/api/user/addresses/{id}`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** None

**Response:**

```json
{
  "ok": true
}
```

---

### 14. Submit KYC

**POST** `/api/user/kyc`

**Headers:** `Authorization: Bearer <access_token>`

**Content-Type:** `multipart/form-data`

**Form Data:**

- `document_type`: "PASSPORT" | "DRIVERS_LICENSE" | "NATIONAL_ID" | "SSS_ID" | "TIN_ID" | "POSTAL_ID" | "VOTERS_ID" | "PHILHEALTH_ID" | "PRC_ID" | "SCHOOL_ID" | "COMPANY_ID" | "OTHER"
- `document_number`: "string"
- `first_name`: "string"
- `last_name`: "string"
- `address_line1`: "string"
- `address_line2`: "string" (optional)
- `city`: "string" (optional)
- `region`: "string" (optional)
- `postal`: "string" (optional)
- `birth_date`: "YYYY-MM-DD" (optional)
- `front`: File (required, max 10MB)
- `back`: File (required, max 10MB)

**Response:**

```json
{
  "ok": true,
  "kyc": { ... }
}
```

---

### 15. Get KYC Status

**GET** `/api/user/kyc`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** None

**Response:**

```json
{
  "ok": true,
  "kyc": {
    "user_kyc_id": "uuid",
    "user_id": "uuid",
    "user_kyc_status": "SUBMITTED",
    "user_kyc_id_document_type": "PASSPORT",
    ...
  }
}
```

---

### 16. Get Verification Status

**GET** `/api/user/verification-status`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** None

**Response:**

```json
{
  "ok": true,
  "status": "VERIFIED" | "SUBMITTED" | "REJECTED" | "UNVERIFIED"
}
```

---

### 17. Update Package

**PATCH** `/api/user/packages/{id}`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "status": "STORED" | "RELEASED" | "RETRIEVED" | "DISPOSED" | "REQUEST_TO_RELEASE" | "REQUEST_TO_DISPOSE" | "REQUEST_TO_SCAN",
  "selected_address_id": "uuid" | null,
  "forward_address": "string" (optional),
  "forward_tracking_number": "string" (optional),
  "forward_3pl_name": "string" (optional),
  "forward_tracking_url": "string" (optional),
  "release_to_name": "string" (optional),
  "notes": "string" | {
    "pickup_on_behalf": true,
    "name": "John Doe",
    "mobile": "+1234567890",
    "contact_mode": "SMS" | "CALL" | "EMAIL"
  } (optional)
}
```

**Response:**

```json
{
  "ok": true,
  "mailbox_item": { ... }
}
```

---

## Mailroom Endpoints

### 18. Get Mailroom Plans

**GET** `/api/plans`

**Request Body:** None

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Basic Plan",
    "price": 500,
    "description": "Basic mailroom service",
    "storageLimit": 10,
    "canReceiveMail": true,
    "canReceiveParcels": true,
    "canDigitize": false
  }
]
```

---

### 19. Get Mailroom Locations

**GET** `/api/mailroom/locations`

**Request Body:** None

**Response:**

```json
{
  "data": [
    {
      "mailroom_location_id": "uuid",
      "mailroom_location_name": "Manila Branch",
      "mailroom_location_address": "123 Main St",
      "mailroom_location_city": "Manila",
      "mailroom_location_region": "NCR",
      "mailroom_location_postal": "1000"
    }
  ]
}
```

---

### 20. Get Location Availability

**GET** `/api/mailroom/locations/availability`

**Request Body:** None

**Response:**

```json
{
  "data": [
    {
      "mailroom_location_id": "uuid",
      "available_lockers": 10,
      "total_lockers": 50
    }
  ]
}
```

---

### 21. Get User Scans

**GET** `/api/user/scans?registrationId={registrationId}`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**

- `registrationId`: string (required)

**Request Body:** None

**Response:**

```json
{
  "scans": [
    {
      "mailroom_file_id": "uuid",
      "mailbox_item_id": "uuid",
      "mailroom_file_name": "scan.pdf",
      "mailroom_file_url": "https://...",
      "mailroom_file_size_mb": 2.5,
      "mailroom_file_mime_type": "application/pdf",
      "mailroom_file_uploaded_at": "2024-01-01T00:00:00Z"
    }
  ],
  "usage": {
    "scans_count": 10,
    "scans_limit": 100
  }
}
```

---

### 22. Get User Storage

**GET** `/api/user/storage`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** None

**Response:**

```json
{
  "scans": [
    {
      "id": "uuid",
      "file_name": "scan.pdf",
      "file_url": "https://...",
      "file_size_mb": 2.5,
      "uploaded_at": "2024-01-01T00:00:00Z",
      "mime_type": "application/pdf",
      "package_id": "uuid",
      "package": {
        "id": "uuid",
        "package_name": "Package 1"
      }
    }
  ],
  "usage": {
    "used_mb": 25.5,
    "limit_mb": 100,
    "percentage": 25.5
  }
}
```

---

### 23. Delete Scan

**DELETE** `/api/user/storage/{id}`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** None

**Response:**

```json
{
  "success": true
}
```

---

### 24. Get Mailroom Registrations

**GET** `/api/mailroom/registrations`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** None

**Response:**

```json
{
  "data": [
    {
      "mailroom_registration_id": "uuid",
      "mailroom_registration_code": "MR-12345",
      "user_id": "uuid",
      "mailroom_location_id": "uuid",
      "mailroom_plan_id": "uuid",
      "mailroom_registration_created_at": "2024-01-01T00:00:00Z",
      ...
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 1,
    "stats": {
      "total_packages": 10,
      "total_scans": 5
    }
  }
}
```

---

### 25. Get Mailroom Registration by ID

**GET** `/api/mailroom/registrations/{id}`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** None

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "mailroom_code": "MR-12345",
    "created_at": "2024-01-01T00:00:00Z",
    "months": 3,
    "mailroom_plan_table": { ... },
    "subscription_table": { ... },
    "expiry_at": "2024-04-01T00:00:00Z",
    "mailroom_location_table": { ... },
    "mailbox_item_table": [ ... ],
    "users_table": { ... },
    "user_kyc_table": { ... },
    "lockers": [ ... ]
  }
}
```

---

### 26. Cancel Mailroom Registration

**PATCH** `/api/mailroom/registrations/{id}/cancel`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** None

**Response:**

```json
{
  "success": true
}
```

---

### 27. Lookup Registration by Order

**GET** `/api/mailroom/lookup-by-order?order={orderId}`

**Query Parameters:**

- `order`: string (required)

**Request Body:** None

**Response:**

```json
{
  "data": {
    "mailroom_registration_id": "uuid",
    "mailroom_registration_code": "MR-12345",
    ...
  }
}
```

---

## Payment Endpoints

### 28. Create Payment

**POST** `/api/payments/create`

**Request Body:**

```json
{
  "orderId": "reg_{userId}_{timestamp}",
  "amount": 150000,
  "currency": "PHP",
  "type": "gcash" | "paymaya" | "card" | "grab_pay" | "shopee_pay" | "qrph" | "all",
  "show_all": true (optional),
  "payment_method_types": ["gcash", "paymaya", "card"] (optional),
  "quantity": 1 (optional),
  "successUrl": "https://yourdomain.com/mailroom/register/success?order=reg_{userId}_{timestamp}" (optional),
  "failedUrl": "https://yourdomain.com/mailroom/register/failed?order=reg_{userId}_{timestamp}" (optional),
  "metadata": {
    "order_id": "reg_{userId}_{timestamp}",
    "user_id": "uuid",
    "location_id": "uuid",
    "plan_id": "uuid",
    "locker_qty": "1",
    "months": "3",
    "referral_code": "ABC123"
  } (optional)
}
```

**Note**: The `orderId` format for mailroom registration is `reg_{userId}_{timestamp}` (e.g., `reg_550e8400-e29b-41d4-a716-446655440000_1704067200000`). The `successUrl` and `failedUrl` are optional. If not provided, PayMongo will use default redirect URLs. Common patterns used in the application:

- **Mailroom Registration**:
  - `successUrl`: `{origin}/mailroom/register/success?order={orderId}`
  - `failedUrl`: `{origin}/mailroom/register/failed?order={orderId}`
- **Test Payments**:
  - `successUrl`: `{origin}/payments/test/success?order={orderId}`
  - `failedUrl`: `{origin}/payments/test/failed?order={orderId}`

Replace `{origin}` with your actual domain (e.g., `https://localhost:3000` for local development or your production domain).

**Important**: For mailroom registration, include the registration metadata in the `metadata` field (e.g., `user_id`, `location_id`, `plan_id`, `locker_qty`, `months`). When the payment is successfully completed, Paymongo will send a webhook to `/api/payments/webhook`, which automatically creates the mailroom registration, subscription, and payment transaction records. The registration is created asynchronously after payment confirmation, not during the initial payment creation.

**Response:**

```json
{
  "data": {
    "id": "checkout_session_id",
    "attributes": {
      "checkout_url": "https://paymongo.com/checkout/...",
      ...
    }
  }
}
```

---

### 29. Verify Payment

**GET** `/api/payments/verify?id={id}&type={type}`

**Query Parameters:**

- `id`: string (required) - Payment ID
- `type`: "source" | "payment" | "payment_intent" | "paymentintent" | "pi" (optional, default: "source")

**Request Body:** None

**Response:**

```json
{
  "status": 200,
  "ok": true,
  "resource": {
    "data": {
      "id": "payment_id",
      "attributes": {
        "status": "paid",
        ...
      }
    }
  }
}
```

---

### 30. Lookup Payment by Order

**GET** `/api/payments/lookup-by-order?order={orderId}`

**Query Parameters:**

- `order`: string (required)

**Request Body:** None

**Response:**

```json
{
  "source": "db" | "paymongo",
  "type": "payment_transaction" | "payment_intent" | "source",
  "resource": { ... }
}
```

---

## Referral Endpoints

### 31. Generate Referral Code

**POST** `/api/referrals/generate`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** None

**Response:**

```json
{
  "referral_code": "ABC123"
}
```

---

### 32. List Referrals

**GET** `/api/referrals/list?user_id={userId}`

**Query Parameters:**

- `user_id`: string (required)

**Request Body:** None

**Response:**

```json
{
  "referrals": [
    {
      "referral_id": "uuid",
      "referrer_user_id": "uuid",
      "referred_email": "newuser@example.com",
      "service_type": "MAILROOM",
      "referral_status": "PENDING",
      "referral_created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 33. Validate Referral Code

**POST** `/api/referrals/validate`

**Request Body:**

```json
{
  "code": "ABC123",
  "currentUserId": "uuid"
}
```

**Response:**

```json
{
  "valid": true,
  "message": "Referral code is valid",
  "discount": 0.1
}
```

---

### 34. Add Referral

**POST** `/api/referrals/add`

**Request Body:**

```json
{
  "user_id": "uuid" (optional, if using referral_code),
  "referral_code": "ABC123" (optional, if using user_id),
  "referred_email": "newuser@example.com",
  "service_type": "MAILROOM"
}
```

**Response:**

```json
{
  "message": "Referral added successfully"
}
```

---

## Rewards Endpoints

### 35. Get Reward Status

**GET** `/api/rewards/status?userId={userId}`

**Query Parameters:**

- `userId`: string (required)

**Request Body:** None

**Response:**

```json
{
  "total_rewards": 1000,
  "available_rewards": 500,
  "pending_rewards": 300,
  "claimed_rewards": 200,
  "claims": [
    {
      "reward_claim_id": "uuid",
      "reward_claim_amount": 200,
      "reward_claim_status": "PENDING",
      "reward_claim_created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 36. Claim Reward

**POST** `/api/rewards/claim`

**Request Body:**

```json
{
  "userId": "uuid",
  "paymentMethod": "GCASH" | "PAYMAYA" | "BANK_TRANSFER",
  "accountDetails": {
    "account_name": "John Doe",
    "account_number": "1234567890",
    "account_type": "MOBILE" | "BANK_ACCOUNT",
    "bank_name": "BPI" (if BANK_TRANSFER)
  }
}
```

**Response:**

```json
{
  "ok": true,
  "claim": {
    "reward_claim_id": "uuid",
    "reward_claim_amount": 500,
    "reward_claim_status": "PENDING",
    ...
  }
}
```

---

## Notification Endpoints

### 37. Get Notifications

**GET** `/api/notifications?userId={userId}`

**Query Parameters:**

- `userId`: string (required)

**Request Body:** None

**Response:**

```json
{
  "notifications": [
    {
      "notification_id": "uuid",
      "user_id": "uuid",
      "notification_title": "Package Received",
      "notification_message": "Your package has been received",
      "notification_type": "PACKAGE_RECEIVED",
      "notification_link": "/packages/123",
      "notification_read": false,
      "notification_created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 38. Mark Notifications as Read

**PUT** `/api/notifications?userId={userId}`

**Query Parameters:**

- `userId`: string (required)

**Request Body:** None

**Response:**

```json
{
  "ok": true
}
```

---

### 39. Send Notification (Testing)

**POST** `/api/notifications`

**Request Body:**

```json
{
  "userId": "uuid",
  "title": "Test Notification",
  "message": "This is a test notification",
  "type": "PACKAGE_RECEIVED" | "SCAN_COMPLETE" | "PAYMENT_SUCCESS" | "KYC_APPROVED" | "KYC_REJECTED" | "GENERAL",
  "link": "/packages/123" (optional)
}
```

**Response:**

```json
{
  "ok": true
}
```

---

## Onboarding Endpoints

### 40. Complete Onboarding

**POST** `/api/onboarding`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "avatar": "data:image/png;base64,iVBORw0KGgoAAAANS..." (optional)
}
```

**Response:**

```json
{
  "ok": true,
  "needs_onboarding": false
}
```

---

## Authentication Notes

### Getting an Access Token for Postman

1. **Sign In** using `/api/auth/signin` endpoint
2. Copy the `access_token` from the response
3. In Postman, set the **Authorization** header:
   - Type: `Bearer Token`
   - Token: `<paste_access_token_here>`

### Alternative: Using Cookies

If testing in a browser environment, cookies are automatically sent. For Postman:

1. After signing in, check the response cookies
2. Copy the `sb-*-auth-token` cookie value
3. Add it as a Cookie header in Postman

---

## Common Response Formats

### Success Response

```json
{
  "ok": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "error": "Error message here"
}
```

### Status Codes

- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Testing Tips

1. **Start with Authentication**: Always sign in first to get an access token
2. **Save Tokens**: Use Postman variables to store the access token
3. **Check Headers**: Ensure `Content-Type: application/json` is set for JSON requests
4. **Form Data**: For KYC submission, use `multipart/form-data` instead of JSON
5. **Query Parameters**: Some endpoints use query parameters instead of request body
6. **Error Handling**: Check the `error` field in responses for detailed error messages

---

## Postman Collection Setup

### Environment Variables

Create a Postman environment with:

- `base_url`: `http://localhost:3000`
- `access_token`: (set after sign in)
- `user_id`: (set after sign in)

### Pre-request Script (for authenticated endpoints)

```javascript
pm.request.headers.add({
  key: "Authorization",
  value: "Bearer " + pm.environment.get("access_token"),
});
```

---

**Last Updated**: 2024-01-01
