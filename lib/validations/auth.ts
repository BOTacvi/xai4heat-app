/**
 * Authentication Form Validation Schemas
 *
 * LEARNING: Why Zod for Form Validation?
 *
 * PROBLEM with manual validation:
 * - Verbose code (if/else chains)
 * - No type inference (TypeScript doesn't know validated shape)
 * - Error messages scattered throughout code
 * - Hard to test and reuse
 * - Easy to miss edge cases
 *
 * SOLUTION with Zod:
 * - Declarative schema definition
 * - Automatic TypeScript type inference
 * - Built-in error messages (customizable)
 * - Composable and reusable schemas
 * - Runtime validation + compile-time types
 *
 * EXAMPLE:
 * ```typescript
 * const schema = z.object({ email: z.string().email() })
 * type FormData = z.infer<typeof schema> // { email: string }
 * ```
 *
 * INTEGRATION with React Hook Form:
 * - zodResolver connects Zod schemas to React Hook Form
 * - Validation happens automatically on submit/blur/change
 * - Errors mapped to form fields automatically
 * - No manual error state management needed
 */

import { z } from 'zod'

/**
 * Login Form Schema
 *
 * FIELDS:
 * - email: Required, must be valid email format
 * - password: Required, any length (we validate on signup, not login)
 *
 * WHY no password validation on login?
 * - User already has an account with whatever password they set
 * - We only validate password strength on signup
 * - Login just checks credentials against database
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
})

/**
 * TypeScript type inferred from schema
 *
 * LEARNING: z.infer<typeof schema>
 * - Automatically creates TypeScript type from Zod schema
 * - No need to manually define type AND schema
 * - Single source of truth for validation and types
 *
 * RESULT: LoginFormData = { email: string, password: string }
 */
export type LoginFormData = z.infer<typeof loginSchema>

/**
 * Signup Form Schema
 *
 * FIELDS:
 * - email: Required, valid format
 * - password: Required, minimum 8 characters
 * - confirmPassword: Required, must match password
 *
 * VALIDATION:
 * - First validates each field individually
 * - Then runs .refine() to check password match
 *
 * WHY .refine() instead of separate validation?
 * - Allows cross-field validation
 * - Can set error path to specific field (confirmPassword)
 * - Error shows under the confirm password field, not form-level
 */
export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'], // Error shows under confirmPassword field
  })

export type SignupFormData = z.infer<typeof signupSchema>

/**
 * Forgot Password Form Schema
 *
 * FIELDS:
 * - email: Required, valid format
 *
 * SIMPLEST schema - just email validation
 * No password needed for password reset request
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

/**
 * Reset Password Form Schema (for future use)
 *
 * FIELDS:
 * - password: Required, minimum 8 characters
 * - confirmPassword: Required, must match password
 *
 * COMMENT: This is for the /auth/reset-password page
 * User clicks link in email and sets new password
 * Same validation as signup (strong password required)
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
