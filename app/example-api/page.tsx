'use client'

import { useEffect, useState } from 'react'
import { 
  getBackendURL, 
  api, 
  APIError,
  getCurrentUser,
  getProjects,
  type User,
  type PaginatedResponse 
} from '@/lib/api-client'

/**
 * Example Component: API Client Usage
 * 
 * Demonstrates:
 * - Dynamic backend URL resolution
 * - OAuth Bearer token authentication
 * - Error handling for missing tokens
 * - CRUD operations with type safety
 * 
 * Test with:
 * - http://tenant1.localhost:3000/example-api
 * - http://tenant2.localhost:3000/example-api
 */
export default function ExampleAPIPage() {
  const [backendURL, setBackendURL] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    // Get backend URL for display
    try {
      const url = getBackendURL()
      setBackendURL(url)
    } catch (err) {
      console.error('Failed to resolve backend URL:', err)
    }
  }, [])
  
  /**
   * Example: Fetch current user
   */
  const handleFetchUser = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const userData = await getCurrentUser()
      setUser(userData)
    } catch (err) {
      if (err instanceof APIError) {
        setError(`API Error (${err.status}): ${err.message}`)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * Example: Fetch projects with pagination
   */
  const handleFetchProjects = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await getProjects(1, 10)
      setProjects(response.data)
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 401) {
          setError('Authentication required. Please log in.')
        } else {
          setError(`API Error (${err.status}): ${err.message}`)
        }
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * Example: Create new project
   */
  const handleCreateProject = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const newProject = await api.post('/projects', {
        name: `Project ${Date.now()}`,
        description: 'Created from example page'
      })
      
      alert(`Project created: ${newProject.name}`)
      handleFetchProjects() // Refresh list
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Failed to create project: ${err.message}`)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * Example: Manual API call with custom logic
   */
  const handleCustomAPICall = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // You can use api.get, api.post, api.put, api.patch, api.delete
      const data = await api.get('/dashboard/stats', {
        // Optional: add custom headers
        headers: {
          'X-Custom-Header': 'value'
        }
      })
      
      alert(`Dashboard stats fetched: ${JSON.stringify(data)}`)
    } catch (err) {
      if (err instanceof APIError) {
        setError(`API call failed: ${err.message}`)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">API Client Example</h1>
      
      {/* Backend URL Display */}
      <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Backend Configuration</h2>
        <div className="space-y-2">
          <p><strong>Frontend URL:</strong></p>
          <code className="block bg-blue-100 dark:bg-blue-900 px-3 py-2 rounded">
            {typeof window !== 'undefined' ? window.location.origin : 'Loading...'}
          </code>
          
          <p className="mt-4"><strong>Backend API URL:</strong></p>
          <code className="block bg-blue-100 dark:bg-blue-900 px-3 py-2 rounded">
            {backendURL || 'Loading...'}
          </code>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            ✓ Dynamically resolved from hostname<br />
            ✓ No hardcoded tenant names<br />
            ✓ Works in local dev and production
          </p>
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Error</h3>
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      
      {/* Interactive Examples */}
      <div className="bg-green-50 dark:bg-green-950 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Interactive Examples</h2>
        
        <div className="space-y-4">
          {/* Fetch User */}
          <div>
            <button
              onClick={handleFetchUser}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition"
            >
              {loading ? 'Loading...' : 'Fetch Current User'}
            </button>
            
            {user && (
              <div className="mt-3 bg-green-100 dark:bg-green-900 p-3 rounded">
                <pre className="text-sm">{JSON.stringify(user, null, 2)}</pre>
              </div>
            )}
          </div>
          
          {/* Fetch Projects */}
          <div>
            <button
              onClick={handleFetchProjects}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition"
            >
              {loading ? 'Loading...' : 'Fetch Projects'}
            </button>
            
            {projects.length > 0 && (
              <div className="mt-3 bg-blue-100 dark:bg-blue-900 p-3 rounded">
                <p className="font-medium mb-2">{projects.length} projects found:</p>
                <ul className="list-disc list-inside space-y-1">
                  {projects.map((project, idx) => (
                    <li key={idx}>{project.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Create Project */}
          <div>
            <button
              onClick={handleCreateProject}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition"
            >
              {loading ? 'Loading...' : 'Create Project'}
            </button>
          </div>
          
          {/* Custom API Call */}
          <div>
            <button
              onClick={handleCustomAPICall}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition"
            >
              {loading ? 'Loading...' : 'Custom API Call'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Code Examples */}
      <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
        
        <div className="space-y-6">
          {/* Example 1: Get Backend URL */}
          <div>
            <h3 className="font-medium mb-2">1. Get Backend URL</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
{`import { getBackendURL } from '@/lib/api-client'

// Default configuration (auto-detects local/prod)
const url = getBackendURL()
// tenant1.localhost:3000 → http://api.tenant1.localhost:8080
// tenant1.example.com → https://api.tenant1.example.com

// Custom configuration
const customURL = getBackendURL({
  protocol: 'https',
  port: 3000,
  apiPrefix: 'backend'
})
// → https://backend.tenant1.example.com:3000`}
            </pre>
          </div>
          
          {/* Example 2: GET Request */}
          <div>
            <h3 className="font-medium mb-2">2. GET Request</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
{`import { api } from '@/lib/api-client'

try {
  const user = await api.get('/users/me')
  console.log(user)
} catch (err) {
  if (err instanceof APIError) {
    if (err.status === 401) {
      // Redirect to login
    }
    console.error(err.message)
  }
}`}
            </pre>
          </div>
          
          {/* Example 3: POST Request */}
          <div>
            <h3 className="font-medium mb-2">3. POST Request</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
{`import { api } from '@/lib/api-client'

const newProject = await api.post('/projects', {
  name: 'New Project',
  description: 'Project description'
})

console.log('Created:', newProject)`}
            </pre>
          </div>
          
          {/* Example 4: Error Handling */}
          <div>
            <h3 className="font-medium mb-2">4. Error Handling</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
{`import { api, APIError } from '@/lib/api-client'

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
        // Forbidden - show permission error
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
}`}
            </pre>
          </div>
          
          {/* Example 5: Custom Headers */}
          <div>
            <h3 className="font-medium mb-2">5. Custom Headers</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
{`import { api } from '@/lib/api-client'

const data = await api.get('/reports', {
  headers: {
    'X-Report-Type': 'monthly',
    'X-Custom-Header': 'value'
  }
})`}
            </pre>
          </div>
        </div>
      </div>
      
      {/* Setup Instructions */}
      <div className="bg-yellow-50 dark:bg-yellow-950 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">⚠️ Setup Requirements</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>
            <strong>Update hosts file</strong> (for local development):
            <pre className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded mt-2 text-sm">
{`127.0.0.1 api.tenant1.localhost
127.0.0.1 api.tenant2.localhost
127.0.0.1 api.localhost`}
            </pre>
          </li>
          <li>
            <strong>Start your backend API</strong> on port 8080 (or configure custom port)
          </li>
          <li>
            <strong>Set OAuth token</strong> in localStorage:
            <pre className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded mt-2 text-sm">
{`localStorage.setItem('access_token', 'your-oauth-token-here')`}
            </pre>
          </li>
          <li>
            <strong>Test different tenants</strong>:
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
              <li><code>http://tenant1.localhost:3000/example-api</code></li>
              <li><code>http://tenant2.localhost:3000/example-api</code></li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  )
}
