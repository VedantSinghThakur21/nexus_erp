# Multi-Tenant API Client

Complete client-side API utility for DNS-based multi-tenant SaaS applications with OAuth authentication.

## Features

✅ **Dynamic Backend URL Resolution** - Automatically resolves API URL from hostname  
✅ **Multi-Tenant Support** - Works with `tenant1.localhost`, `tenant2.example.com`, etc.  
✅ **OAuth Bearer Token** - Automatic Authorization header injection  
✅ **Type-Safe** - Full TypeScript support with generic types  
✅ **Error Handling** - Custom `APIError` class with status codes  
✅ **React Hooks** - `useAPI` and `useAuth` hooks for easy integration  
✅ **Local & Production** - Works seamlessly in both environments  

---

## Architecture

```
Frontend:  tenant1.localhost:3000
Backend:   api.tenant1.localhost:8080

Frontend:  tenant2.example.com
Backend:   api.tenant2.example.com
```

---

## Setup

### 1. Update Hosts File (Local Development)

**Windows**: `C:\Windows\System32\drivers\etc\hosts`  
**Mac/Linux**: `/etc/hosts`

```
127.0.0.1 tenant1.localhost
127.0.0.1 tenant2.localhost
127.0.0.1 api.tenant1.localhost
127.0.0.1 api.tenant2.localhost
127.0.0.1 api.localhost
```

### 2. Store OAuth Token

The client expects the token in `localStorage`:

```javascript
localStorage.setItem('access_token', 'your-oauth-token-here')
```

**Alternative storage locations** (checked in order):
1. `localStorage.getItem('access_token')`
2. `localStorage.getItem('auth_token')`
3. `sessionStorage.getItem('access_token')`

### 3. Start Backend API

Ensure your backend is running on the expected port:
- **Local**: `http://api.tenant1.localhost:8080`
- **Production**: `https://api.tenant1.example.com`

---

## Usage

### Basic GET Request

```typescript
import { api } from '@/lib/api-client'

const user = await api.get('/users/me')
console.log(user)
```

### POST Request

```typescript
import { api } from '@/lib/api-client'

const project = await api.post('/projects', {
  name: 'New Project',
  description: 'Project description'
})
```

### PUT/PATCH Request

```typescript
import { api } from '@/lib/api-client'

const updated = await api.patch('/projects/123', {
  name: 'Updated Name'
})
```

### DELETE Request

```typescript
import { api } from '@/lib/api-client'

await api.delete('/projects/123')
```

---

## Error Handling

### Using try/catch

```typescript
import { api, APIError } from '@/lib/api-client'

try {
  const data = await api.get('/protected-resource')
} catch (err) {
  if (err instanceof APIError) {
    switch (err.status) {
      case 401:
        // Not authenticated - redirect to login
        router.push('/login')
        break
      case 403:
        // Forbidden
        toast.error('Access denied')
        break
      case 404:
        // Not found
        toast.error('Resource not found')
        break
      default:
        toast.error(err.message)
    }
  }
}
```

---

## React Hooks

### useAPI Hook

```typescript
'use client'
import { useAPI } from '@/lib/hooks/use-api'
import { api } from '@/lib/api-client'

export function ProjectsList() {
  const { data: projects, loading, error, execute } = useAPI<Project[]>()
  
  const loadProjects = () => {
    execute(() => api.get('/projects'))
  }
  
  return (
    <div>
      <button onClick={loadProjects} disabled={loading}>
        {loading ? 'Loading...' : 'Load Projects'}
      </button>
      
      {error && <div className="error">{error}</div>}
      
      {projects && (
        <ul>
          {projects.map(project => (
            <li key={project.id}>{project.name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

### useAuth Hook

```typescript
'use client'
import { useAuth } from '@/lib/hooks/use-api'

export function AuthStatus() {
  const { user, loading, error, fetchUser, logout } = useAuth()
  
  if (loading) return <p>Loading...</p>
  if (error) return <p className="error">{error}</p>
  
  return user ? (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  ) : (
    <button onClick={fetchUser}>Login</button>
  )
}
```

---

## Advanced Usage

### Custom Backend Configuration

```typescript
import { getBackendURL } from '@/lib/api-client'

// Custom protocol, port, and API prefix
const url = getBackendURL({
  protocol: 'https',
  port: 3000,
  apiPrefix: 'backend'
})
// tenant1.example.com → https://backend.tenant1.example.com:3000
```

### Custom Headers

```typescript
import { api } from '@/lib/api-client'

const data = await api.get('/reports', {
  headers: {
    'X-Report-Type': 'monthly',
    'X-Custom-Header': 'value'
  }
})
```

### Type-Safe Responses

```typescript
import { api } from '@/lib/api-client'

interface Project {
  id: string
  name: string
  description: string
  createdAt: string
}

const project = await api.get<Project>('/projects/123')
// project is typed as Project
```

### Pagination

```typescript
import { api, type PaginatedResponse } from '@/lib/api-client'

interface Project {
  id: string
  name: string
}

const response = await api.get<PaginatedResponse<Project>>(
  '/projects?page=1&pageSize=20'
)

console.log(response.data)      // Project[]
console.log(response.total)     // number
console.log(response.page)      // number
console.log(response.pageSize)  // number
```

---

## API Reference

### `getBackendURL(config?)`

Resolves backend API URL based on current hostname.

**Parameters:**
- `config.protocol` - `'http' | 'https'` (auto-detected)
- `config.port` - `number` (default: 8080 for localhost)
- `config.apiPrefix` - `string` (default: `'api'`)

**Returns:** `string` - Full backend URL

**Examples:**
```typescript
// tenant1.localhost:3000 → http://api.tenant1.localhost:8080
getBackendURL()

// Custom configuration
getBackendURL({ protocol: 'https', port: 3000, apiPrefix: 'backend' })
// → https://backend.tenant1.example.com:3000
```

---

### `api.get<T>(endpoint, options?)`
### `api.post<T>(endpoint, body?, options?)`
### `api.put<T>(endpoint, body?, options?)`
### `api.patch<T>(endpoint, body?, options?)`
### `api.delete<T>(endpoint, options?)`

Makes authenticated HTTP requests with automatic Bearer token injection.

**Parameters:**
- `endpoint` - API endpoint path (e.g., `'/users/me'`)
- `body` - Request body (for POST/PUT/PATCH)
- `options` - Standard `RequestInit` options

**Returns:** `Promise<T>` - Parsed JSON response

**Throws:** `APIError` - When request fails or token is missing

---

### `APIError`

Custom error class for API-related errors.

**Properties:**
- `message: string` - Error message
- `status?: number` - HTTP status code
- `response?: any` - Raw response data

**Example:**
```typescript
try {
  await api.get('/users/me')
} catch (err) {
  if (err instanceof APIError) {
    console.log(err.status)   // 401
    console.log(err.message)  // "Unauthorized"
    console.log(err.response) // Raw response data
  }
}
```

---

## Testing

### Test Different Tenants

1. Visit `http://tenant1.localhost:3000/example-api`
2. Open browser console
3. Set OAuth token:
   ```javascript
   localStorage.setItem('access_token', 'your-token')
   ```
4. Click "Fetch Current User" button
5. Observe API calls to `http://api.tenant1.localhost:8080/users/me`

### Test Multiple Tenants

```bash
# Terminal 1: tenant1
open http://tenant1.localhost:3000/example-api

# Terminal 2: tenant2
open http://tenant2.localhost:3000/example-api
```

Each tenant will automatically resolve to its own backend API URL.

---

## Security Considerations

### 🔒 Token Storage

**Current Implementation**: `localStorage`

**Recommendation for Production**:
- Use `httpOnly` cookies for token storage (more secure)
- Implement token refresh mechanism
- Add CSRF protection
- Use secure cookie flags: `Secure`, `SameSite=Strict`

### 🔒 CORS Configuration

Ensure your backend allows requests from tenant subdomains:

```javascript
// Backend CORS configuration
app.use(cors({
  origin: [
    /^https?:\/\/([a-z0-9-]+\.)?example\.com$/,  // Production
    /^https?:\/\/([a-z0-9-]+\.)?localhost(:\d+)?$/  // Local
  ],
  credentials: true
}))
```

### 🔒 Token Refresh

Implement automatic token refresh:

```typescript
// Add to api-client.ts
let refreshPromise: Promise<string> | null = null

async function refreshToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${getBackendURL()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('access_token', data.token)
        return data.token
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// In apiRequest(), catch 401 and retry with refreshed token
```

---

## Troubleshooting

### "Authentication token not found"

**Solution**: Set the token in localStorage:
```javascript
localStorage.setItem('access_token', 'your-token-here')
```

### "Network error" / CORS issues

**Solution**:
1. Ensure backend is running on the expected URL
2. Check backend CORS configuration
3. Verify hosts file entries are correct

### Backend URL not resolving correctly

**Solution**:
1. Check hostname in browser: `window.location.hostname`
2. Test `getBackendURL()` in console
3. Verify subdomain extraction logic

### Token not being sent in requests

**Solution**:
1. Check browser DevTools → Network → Request Headers
2. Verify `Authorization: Bearer <token>` header is present
3. Ensure `getAuthToken()` returns a valid token

---

## Production Deployment

### Environment Variables

```bash
# .env.production
NEXT_PUBLIC_API_PROTOCOL=https
NEXT_PUBLIC_API_PORT=443
NEXT_PUBLIC_API_PREFIX=api
```

### Update `getBackendURL()`

```typescript
export function getBackendURL(config?: BackendConfig): string {
  const protocol = config?.protocol || process.env.NEXT_PUBLIC_API_PROTOCOL || 'https'
  const port = config?.port || process.env.NEXT_PUBLIC_API_PORT
  // ... rest of implementation
}
```

---

## License

MIT
