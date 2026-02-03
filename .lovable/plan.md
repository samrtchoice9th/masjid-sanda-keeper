

## Fix: Dashboard Not Loading - Authentication Timing Issue

### Problem Identified

The `useDashboardStats` hook runs its data fetch immediately on component mount. However, the RLS (Row Level Security) policies on the tables require admin authentication:
- `families` - requires admin role to read
- `family_members` - requires admin role to read  
- `zakat_transactions` - requires admin role to read

When the Dashboard component mounts, the authentication session may not be fully synchronized with Supabase yet, causing the queries to return empty results (0 counts).

### Solution

Modify the `useDashboardStats` hook to:
1. Accept the authentication state as a dependency
2. Only fetch data when the user is authenticated
3. Re-fetch when authentication status changes

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useDashboardStats.ts` | Accept `isAuthenticated` parameter and add dependency |
| `src/components/Dashboard.tsx` | Pass authentication status to the hook |

### Code Changes

**1. Update `src/hooks/useDashboardStats.ts`**

Add a parameter to accept the authenticated user and only run the fetch when authenticated:

```typescript
export function useDashboardStats(isAuthenticated: boolean) {
  // ... existing state ...

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]); // Re-fetch when auth changes

  return { stats, loading, refetch: fetchStats };
}
```

**2. Update `src/components/Dashboard.tsx`**

Import auth context and pass authentication status:

```typescript
import { useAuth } from "@/contexts/AuthContext";

export function Dashboard() {
  const { user, isAdmin } = useAuth();
  const isAuthenticated = !!user && isAdmin;
  const { stats, loading } = useDashboardStats(isAuthenticated);
  // ... rest of component
}
```

### Why This Fixes It

- The hook will wait until authentication is confirmed before fetching data
- When auth state changes (login/logout), data will be re-fetched
- RLS policies will work correctly because the session is established before queries run
- Dashboard will show correct stats after login instead of zeros

### Expected Result

After login as admin:
- Dashboard summary cards will load correctly
- Stats will show actual database counts
- Data Collection and Baithul Zakat modules will work properly

