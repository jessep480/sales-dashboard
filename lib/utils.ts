import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse Supabase/PostgreSQL errors into user-friendly messages.
 * This handles constraint violations, foreign key errors, and other common database errors.
 */
export function parseDbError(error: unknown): string {
  if (!error) return 'An unknown error occurred'
  
  const message = error instanceof Error ? error.message : String(error)
  
  // NOT NULL constraint violations
  if (message.includes('null value in column')) {
    const match = message.match(/null value in column "(\w+)"/)
    const field = match?.[1]
    const fieldNames: Record<string, string> = {
      lead_id: 'Lead',
      sales_rep_id: 'Sales Rep',
      booking_date: 'Booking Date',
      call_date: 'Call Date',
    }
    const friendlyName = field ? (fieldNames[field] || field.replace(/_/g, ' ')) : 'a required field'
    return `${friendlyName} is required and cannot be empty.`
  }
  
  // Foreign key violations
  if (message.includes('violates foreign key constraint')) {
    if (message.includes('calls_lead_id_fkey')) {
      return 'The selected lead does not exist. Please select a valid lead.'
    }
    if (message.includes('calls_sales_rep_id_fkey')) {
      return 'The selected sales rep does not exist. Please select a valid sales rep.'
    }
    return 'Invalid reference. The selected item does not exist.'
  }
  
  // Check constraint violations
  if (message.includes('violates check constraint')) {
    if (message.includes('calls_quality_score_range')) {
      return 'Quality score must be between 1 and 5.'
    }
    if (message.includes('calls_upfront_revenue_non_negative')) {
      return 'Revenue cannot be negative.'
    }
    return 'The value provided is outside the allowed range.'
  }
  
  // Unique constraint violations
  if (message.includes('duplicate key value') || message.includes('unique constraint')) {
    if (message.includes('leads_email_key')) {
      return 'A lead with this email already exists.'
    }
    return 'This record already exists. Duplicate values are not allowed.'
  }
  
  // RLS policy violations
  if (message.includes('new row violates row-level security')) {
    return 'You do not have permission to perform this action.'
  }
  
  // Generic database errors - return a cleaner message
  if (message.includes('PGRST') || message.includes('PostgrestError')) {
    return 'Database error. Please check your data and try again.'
  }
  
  // Return the original message if we can't parse it
  return message
}
