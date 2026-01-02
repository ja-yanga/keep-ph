# Next.js Middleware Authentication & Authorization

This middleware handles authentication and role-based access control for your Next.js application using Supabase.

## 📋 Overview

The middleware runs on every request and:
1. ✅ Verifies user authentication
2. ✅ Checks user roles from session metadata
3. ✅ Enforces route-level access control
4. ✅ Redirects unauthorized access
5. ✅ Maintains session cookies

## 🔧 Configuration

### Route Types

```typescript
// Auth pages - only for non-authenticated users
const AUTH_PAGES = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/unauthorized",
] as const;

// Public routes - accessible to everyone
const PUBLIC_PAGES = [
  "/",
  "/api/auth/callback",
  "/api/auth/callback/google",
  "/update-password",
  "/unauthorized",
] as const;

// Private routes - role-based access
const PRIVATE_ROLE_PAGES: Record<string, Array<string>> = {
  user: [
    "/dashboard",
    "/mailroom/:path*", // Catch-all for /mailroom/*
    "/referrals",
    "/storage",
    "/account",
    "/unauthorized",
  ],
  admin: [
    "/admin/dashboard",
    "/admin/kyc",
    "/admin/locations",
    // ... more admin routes
    "/admin/lockers",
    "/admin/mailrooms",
    "/admin/packages",
    "/admin/plans",
    "/admin/rewards",
    "/admin/stats",
    "/unauthorized",
  ],
};

// Default landing pages per role
const ROLE_DEFAULT_PAGES: Record<string, string> = {
  user: "/dashboard",
  admin: "/admin/dashboard",
};
```

## 🚀 How It Works

### Authentication Flow

```
Request → proxy() → updateSession() → Check Session → Check Role → Allow/Redirect
```

### Core Functions

The middleware uses several helper functions:

1. **`copyCookies(from, to)`** - Copies cookies between NextResponse objects to maintain session state
2. **`createRedirect(url, supabaseResponse)`** - Creates a redirect response while preserving cookies from the Supabase response
3. **`isPathAllowed(currentPath, allowedPath)`** - Checks if a path matches an allowed pattern (exact, dynamic, or catch-all)
4. **`proxy(request)`** - Main middleware function that handles all routing logic

#### Path Matching Logic

The `isPathAllowed` function supports three types of patterns:

1. **Exact Match**: `/dashboard` matches only `/dashboard`
2. **Catch-all Wildcard**: `/mailroom/:path*` or `/mailroom/*` matches:
   - `/mailroom`
   - `/mailroom/123`
   - `/mailroom/123/edit`
   - Any path starting with `/mailroom/`
3. **Dynamic Single Parameter**: `/mailroom/:id` matches:
   - `/mailroom/123`
   - `/mailroom/abc`
   - But NOT `/mailroom` or `/mailroom/123/edit`

### 1️⃣ Public Pages
```
User requests: /
Action: Allow immediately (no auth check)
Returns: supabaseResponse with session cookies
```

### 2️⃣ Auth Pages (Login/Signup)
```
Not logged in → requests /signin
Action: Allow access to login page

Logged in → requests /signin
Action: Redirect to role's default page (/dashboard or /admin/dashboard)
```

### 3️⃣ Protected Pages
```
Not logged in → requests /dashboard
Action: Redirect to /signin

Logged in (no role) → requests /dashboard
Action: Redirect to /unauthorized

Logged in (user) → requests /dashboard
Action: Check role → Allow access

Logged in (user) → requests /admin/dashboard
Action: Check role → Redirect to /dashboard (no access)
```

## 🛣️ Route Patterns

### Exact Match
```typescript
"/dashboard" → matches only /dashboard
```

### Single Dynamic Parameter
```typescript
"/mailroom/:id" → matches /mailroom/123
                → matches /mailroom/abc
                ❌ doesn't match /mailroom
                ❌ doesn't match /mailroom/123/edit
```

### Catch-All Wildcard
```typescript
"/mailroom/:path*" → matches /mailroom
                   → matches /mailroom/123
                   → matches /mailroom/123/edit
                   → matches /mailroom/a/b/c/d
```

### Alternative Wildcard Syntax
```typescript
"/mailroom/*" → same behavior as /:path*
```

## 📝 Examples

### Example 1: User accessing allowed route
```
User: role = "user"
Requests: /dashboard

Flow:
1. Check if public → No
2. Check if authenticated → Yes
3. Get role from session metadata → "user"
4. Check if /dashboard in user's allowed paths → Yes
5. Result: ✅ Allow access (return supabaseResponse)
```

### Example 2: User accessing admin route
```
User: role = "user"
Requests: /admin/dashboard

Flow:
1. Check if public → No
2. Check if authenticated → Yes
3. Get role from session metadata → "user"
4. Check if /admin/dashboard in user's allowed paths → No
5. Result: ❌ Redirect to /dashboard (with cookies preserved)
```

### Example 3: Not logged in accessing protected route
```
User: Not authenticated
Requests: /dashboard

Flow:
1. Check if public → No
2. Check if authenticated → No
3. Result: ❌ Redirect to /signin (with cookies preserved)
```

### Example 4: User with no role
```
User: Authenticated but no role in metadata
Requests: /dashboard

Flow:
1. Check if public → No
2. Check if authenticated → Yes
3. Get role from session metadata → null
4. Result: ❌ Redirect to /unauthorized
```

### Example 5: Dynamic route access
```
User: role = "user"
Requests: /mailroom/abc-123-xyz

Flow:
1. Check if public → No
2. Check if authenticated → Yes
3. Get role from session metadata → "user"
4. Check patterns using isPathAllowed():
   - "/mailroom/:path*" matches? → Yes!
5. Result: ✅ Allow access
```

## 🔐 Security Layers

### Layer 1: Middleware (Current)
- Prevents unauthorized route access
- Runs on Edge (fast)
- Redirects before page renders

### Layer 2: API Routes (Required)
```typescript
// app/api/admin/users/route.ts
export async function DELETE(request: Request) {
  // ✅ Always verify auth in API
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // ✅ Verify role from session metadata
  const session = await supabase.auth.getSession();
  const role = session?.data.session?.user?.user_metadata?.role;
  
  if (role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Now safe to perform action
}
```

### Layer 3: Database RLS (Recommended)
```sql
-- Supabase Row Level Security
CREATE POLICY "Users can only see their own data"
ON users_table
FOR SELECT
TO authenticated
USING (auth.uid() = users_id);
```

## 🎯 Adding New Routes

### Add Public Route
```typescript
const PUBLIC_PAGES = [
  "/",
  "/about",        // ✅ Add here
  "/contact",      // ✅ Add here
  "/unauthorized", // Keep this for error handling
] as const;
```

### Add User Route
```typescript
const PRIVATE_ROLE_PAGES: Record<string, Array<string>> = {
  user: [
    "/dashboard",
    "/profile",      // ✅ Add exact route
    "/settings/:id", // ✅ Add dynamic route
    "/messages/:path*",   // ✅ Add catch-all
    "/unauthorized", // Keep this for error handling
  ],
  // ...
};
```

### Add New Role
```typescript
const PRIVATE_ROLE_PAGES: Record<string, Array<string>> = {
  user: [...],
  admin: [...],
  moderator: [     // ✅ Add new role
    "/mod/dashboard",
    "/mod/reports",
    "/unauthorized",
  ],
};

const ROLE_DEFAULT_PAGES: Record<string, string> = {
  user: "/dashboard",
  admin: "/admin/dashboard",
  moderator: "/mod/dashboard",  // ✅ Add default page
};
```

## ⚙️ Configuration Details

### Imports and Dependencies

The middleware imports from Next.js and a custom Supabase middleware utility:

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
```

The `updateSession` function handles:
- Session refresh
- Cookie management
- User authentication state
- Returns `{ supabaseResponse, user, supabase }`

### Matcher Config
```typescript
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     *
     * Note: If you want middleware to run on /api routes too, remove |api from the negative lookahead.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
  ],
};
```

**What it does:**
- ✅ Runs on all routes
- ❌ Skips static files (`_next/static`)
- ❌ Skips images (`_next/image`)
- ❌ Skips files with extensions (`*.png`, `*.css`)
- ❌ Skips API routes (handled separately)

### Role Retrieval

Roles are retrieved from the session's user metadata:
```typescript
const session = await supabase.auth.getSession();
const role = session?.data.session?.user?.user_metadata?.role || null;
```

**Important:** Ensure roles are set in `user_metadata` during user creation or signup.

## 🐛 Troubleshooting

### Issue: Infinite redirect loop
**Cause:** User doesn't have access to their default page
**Solution:** Ensure user's role has access to their default page
```typescript
const PRIVATE_ROLE_PAGES = {
  user: [
    "/dashboard",  // ✅ Must be in allowed paths
    // ...
  ],
};

const ROLE_DEFAULT_PAGES = {
  user: "/dashboard",  // ✅ Must match
};
```

### Issue: Dynamic routes not working
**Cause:** Pattern not defined correctly
**Solution:** Use `:path*` for catch-all
```typescript
// ❌ Wrong
"/mailroom"

// ✅ Correct for catch-all
"/mailroom/:path*"

// ✅ Correct for single param
"/mailroom/:id"
```

### Issue: Always redirected to signin
**Cause:** Route not added to allowed paths
**Solution:** Add route to `PRIVATE_ROLE_PAGES`
```typescript
const PRIVATE_ROLE_PAGES: Record<string, Array<string>> = {
  user: [
    "/dashboard",
    "/new-page",  // ✅ Add your route
  ],
};
```

### Issue: Redirected to /unauthorized
**Cause:** User is authenticated but has no role in session metadata
**Solution:** Ensure role is set in `user_metadata` during signup or user creation
```typescript
// When creating user or updating metadata
await supabase.auth.updateUser({
  data: { role: 'user' } // or 'admin'
});
```

## 🚫 What NOT To Do

### ❌ Don't add auth checks in page components
```typescript
// ❌ BAD - Redundant and creates loading flash
export default function Dashboard() {
  const { user } = useAuth();
  
  if (!user) {
    redirect('/signin');  // Middleware already did this!
  }
  
  return <div>Dashboard</div>;
}
```

```typescript
// ✅ GOOD - Middleware handles it
export default function Dashboard() {
  return <div>Dashboard</div>;
}
```

### ❌ Don't rely only on frontend checks
```typescript
// ❌ BAD - Can be bypassed
'use client';
export default function AdminPanel() {
  const { user } = useAuth();
  if (user.role !== 'admin') return null;
  return <DeleteButton />;  // Anyone can call the API!
}
```

```typescript
// ✅ GOOD - Always verify in API
export async function DELETE(request: Request) {
  const user = await getUser();
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Proceed...
}
```

## 📚 Best Practices

1. **Always verify on the backend** - Middleware protects routes, APIs protect data
2. **Use catch-all patterns** - `/mailroom/:path*` is more maintainable than listing every route
3. **Preserve cookies on redirects** - Use `createRedirect()` to maintain session state
4. **Handle missing roles** - Redirect to `/unauthorized` when role is not found
5. **Set roles in user_metadata** - Ensure roles are properly set during signup/user creation
6. **Test all roles** - Ensure each role can only access their allowed routes
7. **Include /unauthorized in routes** - Allow access to error pages for all authenticated users

## 🔄 Testing Checklist

- [ ] Public pages accessible without login
- [ ] Auth pages redirect when logged in
- [ ] Protected pages redirect when not logged in
- [ ] Users with no role redirect to /unauthorized
- [ ] Users can only access their role's routes
- [ ] Dynamic routes work correctly
- [ ] Catch-all routes work correctly
- [ ] Default redirects work for each role
- [ ] No infinite redirect loops
- [ ] Cookies persist correctly on redirects
- [ ] API routes verify auth independently
- [ ] /unauthorized page is accessible to all authenticated users

---

**Remember:** Middleware is the first line of defense, not the only one. Always verify permissions in your API routes and database!