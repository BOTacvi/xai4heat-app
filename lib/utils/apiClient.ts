/**
 * API Client Utilities
 *
 * LEARNING: Why create API client utilities?
 *
 * PROBLEM: When API calls fail with 401 Unauthorized:
 * - Each component handles errors differently
 * - No consistent redirect to login
 * - Users see cryptic error messages
 * - Hard to add global error handling
 *
 * SOLUTION: Centralized API client with:
 * - Automatic 401 → redirect to login
 * - Consistent error formatting
 * - Easy to add headers, auth tokens, etc.
 * - One place to add logging, retry logic
 *
 * USAGE:
 * ```typescript
 * // Instead of:
 * const res = await fetch('/api/devices')
 *
 * // Use:
 * const devices = await apiClient.get('/api/devices')
 * ```
 */

/**
 * ApiError - Custom error class for API failures
 *
 * LEARNING: Why custom error class?
 * - Standard Error doesn't include HTTP status code
 * - We need to know if error was 401, 404, 500, etc.
 * - Allows specific error handling based on status
 */
export class ApiError extends Error {
  status: number
  data: any

  constructor(message: string, status: number, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/**
 * handleApiResponse - Process fetch response
 *
 * LEARNING: HTTP Response Handling
 *
 * HOW IT WORKS:
 * 1. Check if response is ok (status 200-299)
 * 2. If not ok, throw ApiError with status code
 * 3. If 401 Unauthorized, redirect to login
 * 4. Parse JSON and return data
 *
 * WHY ASYNC:
 * - response.json() is async (reads body stream)
 * - Must await to get parsed data
 *
 * ERROR STATUS CODES:
 * - 401: Unauthorized (not logged in) → Redirect to login
 * - 403: Forbidden (logged in but not allowed)
 * - 404: Not Found
 * - 500: Internal Server Error
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  // STEP 1: Try to parse JSON body
  // COMMENT: Even error responses often include JSON with error details
  let data: any
  try {
    data = await response.json()
  } catch {
    // COMMENT: If JSON parsing fails, use status text
    data = { error: response.statusText }
  }

  // STEP 2: Check if response is successful
  if (!response.ok) {
    // SPECIAL CASE: 401 Unauthorized
    // LEARNING: This means user's session expired or they're not logged in
    // We should redirect them to login page
    if (response.status === 401) {
      console.error('[ApiClient] 401 Unauthorized - redirecting to login')

      // COMMENT: Redirect to login with current page as redirectTo
      // This allows user to return after logging in
      const currentPath = window.location.pathname
      const loginUrl = `/auth/login?redirectTo=${encodeURIComponent(currentPath)}`

      // LEARNING: window.location.href triggers full page navigation
      // This is intentional - we want to reset everything and go to login
      window.location.href = loginUrl

      // COMMENT: Throw error anyway (code won't continue after redirect)
      throw new ApiError('Unauthorized - please login', 401, data)
    }

    // COMMENT: For other errors, throw ApiError with details
    const errorMessage = data?.error || data?.message || `HTTP ${response.status} error`
    throw new ApiError(errorMessage, response.status, data)
  }

  // STEP 3: Return parsed data
  return data as T
}

/**
 * apiClient - Centralized API request handler
 *
 * LEARNING: API Client Pattern
 *
 * WHY THIS PATTERN:
 * - Single place to handle all API calls
 * - Consistent error handling across app
 * - Easy to add authentication headers
 * - Easy to add request logging, retries, etc.
 *
 * METHODS:
 * - get(url, options) - GET request
 * - post(url, body, options) - POST request
 * - put(url, body, options) - PUT request
 * - del(url, options) - DELETE request
 */
export const apiClient = {
  /**
   * GET request
   *
   * @param url - API endpoint (e.g., '/api/devices')
   * @param options - Optional fetch options
   * @returns Parsed response data
   *
   * EXAMPLE:
   * ```typescript
   * const devices = await apiClient.get<Device[]>('/api/devices')
   * ```
   */
  async get<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    return handleApiResponse<T>(response)
  },

  /**
   * POST request
   *
   * @param url - API endpoint
   * @param body - Request body (will be JSON.stringify'd)
   * @param options - Optional fetch options
   * @returns Parsed response data
   *
   * EXAMPLE:
   * ```typescript
   * const newDevice = await apiClient.post('/api/devices', {
   *   device_id: 'SENSOR_001',
   *   name: 'L8_33_67'
   * })
   * ```
   */
  async post<T>(url: string, body?: any, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    })

    return handleApiResponse<T>(response)
  },

  /**
   * PUT request
   *
   * @param url - API endpoint
   * @param body - Request body
   * @param options - Optional fetch options
   * @returns Parsed response data
   */
  async put<T>(url: string, body?: any, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    })

    return handleApiResponse<T>(response)
  },

  /**
   * DELETE request
   *
   * @param url - API endpoint
   * @param options - Optional fetch options
   * @returns Parsed response data
   */
  async del<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    return handleApiResponse<T>(response)
  },
}
