# API Pattern Guide

## Architecture Overview

```
Component/Page → fetchFromAPI → API Endpoint → RPC Function → Database
```

## Pattern Flow

### 1. **Component/Page Layer**

Use `fetchFromAPI` with endpoints from `API_ENDPOINTS`:

```typescript
import { fetchFromAPI } from "@/utils/fetcher";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

// In your page/component
const response = await fetchFromAPI<ResponseType>(
  API_ENDPOINTS.mailroom.registrations,
);
```

### 2. **Endpoints Constants** (`utils/constants/endpoints.ts`)

Centralized endpoint definitions:

```typescript
export const API_ENDPOINTS = {
  mailroom: {
    registrations: "/api/mailroom/registrations",
    locations: "/api/mailroom/locations",
    // ...
  },
} as const;
```

### 3. **API Route Layer** (`app/api/**/route.ts`)

API routes call RPC functions:

```typescript
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabaseAdmin = createSupabaseServiceClient();

  const { data, error } = await supabaseAdmin.rpc(
    "get_user_mailroom_registrations",
    { input_user_id: userId },
  );

  return NextResponse.json({ data });
}
```

### 4. **RPC Functions** (`supabase/migrations/*.sql`)

Database functions that return JSON:

```sql
CREATE OR REPLACE FUNCTION get_user_mailroom_registrations(input_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
  -- Complex query logic here
  RETURN JSON_AGG(...);
END;
$$;
```

## Example: Complete Flow

### Step 1: Create RPC Function

```sql
-- supabase/migrations/xxx_add_rpc.sql
CREATE OR REPLACE FUNCTION get_user_data(input_user_id UUID)
RETURNS JSON AS $$
  -- Your query logic
$$;
```

### Step 2: Create API Route

```typescript
// app/api/user/data/route.ts
export async function GET(req: Request) {
  const { user } = await getAuthenticatedUser();
  const supabase = createSupabaseServiceClient();

  const { data } = await supabase.rpc("get_user_data", {
    input_user_id: user.id,
  });

  return NextResponse.json({ data });
}
```

### Step 3: Add to Endpoints

```typescript
// utils/constants/endpoints.ts
export const API_ENDPOINTS = {
  user: {
    data: "/api/user/data",
  },
} as const;
```

### Step 4: Use in Component

```typescript
// app/(private)/dashboard/page.tsx
const response = await fetchFromAPI<{ data: UserData }>(
  API_ENDPOINTS.user.data,
);
```
