# Protected Routes Implementation

This document explains the protected route implementation using better-auth in your TanStack Router application.

## Overview

The application now has two types of protected routes:
1. **UI Routes** - Protected by layout route pattern (`_authed`)
2. **API Routes** - Protected by handler wrapper utility (`_authed-api`)

## Structure

```
src/
├── auth/
│   ├── auth-config.ts              # Better-auth configuration
│   ├── auth-schema.ts              # Database schema for auth tables
│   └── protected-handler.ts        # NEW: Wrapper for protected API handlers
├── routes/
│   ├── _authed.tsx                 # NEW: Layout route for protected UI routes
│   ├── _authed/                    # NEW: Folder for protected UI routes
│   │   └── profile.tsx             # Example protected UI route
│   └── _authed-api/                # NEW: Folder for protected API routes
│       └── db-chat-api.ts          # Example protected API route (moved from demo/)
```

## 1. Protected UI Routes

### How it works:
- Routes inside `src/routes/_authed/` are automatically protected
- The `_authed.tsx` layout route checks authentication in `beforeLoad`
- Unauthenticated users are redirected to `/demo/auth`
- User and session data are available via `Route.useRouteContext()`

### Creating a new protected UI route:

```typescript
// src/routes/_authed/my-page.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/my-page')({
  component: MyPage,
})

function MyPage() {
  // Access authenticated user from context
  const { user, session } = Route.useRouteContext()
  
  return (
    <div>
      <h1>Welcome {user.name}!</h1>
      <p>Email: {user.email}</p>
    </div>
  )
}
```

### Example:
- Visit `/profile` to see the example protected page
- Try visiting it without logging in - you'll be redirected to `/demo/auth`

## 2. Protected API Routes

### How it works:
- API handlers in `src/routes/_authed-api/` use the `createProtectedHandler` wrapper
- The wrapper automatically checks authentication before calling your handler
- Returns 401 Unauthorized if no valid session
- User and session are injected into your handler parameters

### Creating a new protected API route:

```typescript
// src/routes/_authed-api/my-api.ts
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { createProtectedHandler } from '@/auth/protected-handler'

export const Route = createFileRoute('/_authed-api/my-api')({
  server: {
    handlers: {
      GET: createProtectedHandler(async ({ user, session, request }) => {
        // User is automatically authenticated here!
        // No need for manual getSession() calls
        
        console.log('Authenticated user:', user.id, user.email)
        
        return json({ message: `Hello ${user.name}!` })
      }),
      
      POST: createProtectedHandler(async ({ user, session, request }) => {
        const body = await request.json()
        
        // Do something with the authenticated user's data
        console.log(`User ${user.email} posted:`, body)
        
        return json({ success: true })
      }),
    },
  },
})
```

### Example:
- The chat API has been moved to `/_authed-api/db-chat-api`
- POST requests require authentication
- The hook in `src/hooks/demo.useChat.ts` now uses the protected endpoint

## Benefits

✅ **No repetitive authentication checks** - Authentication is handled automatically  
✅ **Type-safe user access** - User and session data are properly typed  
✅ **Clear organization** - Protected routes are in dedicated folders  
✅ **Consistent error handling** - 401 responses for unauthenticated API requests  
✅ **TanStack Router native** - Uses framework patterns (beforeLoad for UI, wrappers for API)

## Testing

1. **Protected UI Route:**
   - Visit `/profile` without logging in → redirected to `/demo/auth`
   - Login at `/demo/auth` → visit `/profile` → see your user data

2. **Protected API Route:**
   - Try POSTing to `/_authed-api/db-chat-api` without auth → 401 error
   - Login and POST → succeeds, console shows your user details

## Migration Guide

### Moving existing API routes to protected:

1. Move the file to `src/routes/_authed-api/`
2. Import `createProtectedHandler` from `@/auth/protected-handler`
3. Wrap your handlers with `createProtectedHandler`
4. Replace manual `getSession()` calls with the injected `user` and `session` parameters
5. Update the route path in `createFileRoute()` to reflect the new location
6. Regenerate routes: `npx @tanstack/router-cli generate`

Before:
```typescript
POST: async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }
  console.log('User:', session.user)
  // ... handler logic
}
```

After:
```typescript
POST: createProtectedHandler(async ({ user, session, request }) => {
  console.log('User:', user)
  // ... handler logic
})
```

## Notes

- The old `/demo/db-chat-api` route still exists for backward compatibility
- Update client code to use new paths when migrating routes
- Session is checked on every request (no caching) - consider adding caching if needed
- API routes use `_authed-api` prefix, not `_authed`, since they don't use `beforeLoad`

