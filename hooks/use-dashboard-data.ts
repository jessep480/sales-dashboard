"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Filters } from '@/lib/types'

export interface DashboardStats {
  total_calls: number
  total_calls_excl_canceled: number
  canceled_calls: number
  confirmed_calls: number
  show_up_calls: number
  total_closes: number
  total_revenue: number
  cancellation_rate: number
  confirmation_rate: number
  show_up_rate: number
  close_rate: number
  show_rate: number
  close_rate_by_calls: number
  revenue_per_show_up: number
}

export interface Call {
  id: string
  lead_name: string
  lead_email: string | null
  lead_phone: string | null
  hubspot_contact_url: string | null
  sales_rep: string
  sales_rep_id?: number
  booking_date: string
  call_date: string
  booking_status: "scheduled" | "canceled"
  confirmation_status: "pending" | "yes" | "no" | "canceled"
  show_up_status: "pending" | "yes" | "no"
  call_outcome: "pending" | "disqualified" | "follow_up" | "closed_won" | "closed_lost"
  quality_score: number | null
  upfront_revenue: number | null
  call_type: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  close_date: string | null
  demo_type: "marketing_system_demo" | "inbound_leads_demo" | null
  zoom_recording_url: string | null
}

export interface SalesRep {
  id: number
  name: string
}

export interface DropdownOptions {
  salesReps: SalesRep[]
  utmSources: string[]
  utmMediums: string[]
  utmCampaigns: string[]
  utmContents: string[]
  callTypes: string[]
}

// Query params for server-side filtering/sorting/pagination
export interface CallsQueryParams {
  filters: Filters
  sortKey: keyof Call
  sortDirection: 'asc' | 'desc'
  page: number
  pageSize: number
}

export interface CallsQueryResult {
  rows: Call[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

// Query keys for cache management
export const queryKeys = {
  calls: ['calls'] as const,
  callsQuery: (params: CallsQueryParams) => ['calls', 'query', params] as const,
  salesReps: ['salesReps'] as const,
  dropdownOptions: ['dropdownOptions'] as const,
  dashboardStats: ['dashboardStats'] as const,
}

// Fetch calls with server-side filtering, sorting, and pagination
async function fetchCallsWithQuery(params: CallsQueryParams): Promise<CallsQueryResult> {
  const { filters, sortKey, sortDirection, page, pageSize } = params
  
  // Fetch sales reps for the name lookup
  const salesRepsResult = await supabase.from('sales_reps').select('id, name')

  if (salesRepsResult.error) throw salesRepsResult.error

  // Create lookup maps
  const salesRepsMap = new Map<number, string>()
  const salesRepsByName = new Map<string, number>()
  salesRepsResult.data?.forEach((rep: { id: number; name: string }) => {
    salesRepsMap.set(rep.id, rep.name)
    salesRepsByName.set(rep.name, rep.id)
  })

  // Build the query with server-side filters
  let query = supabase.from('calls').select('*', { count: 'exact' })

  // Apply date filters
  const dateField = filters.dateType
  if (filters.startDate) {
    query = query.gte(dateField, filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte(dateField, filters.endDate)
  }

  // Apply sales rep filter (need to convert name to ID)
  if (filters.salesRep && filters.salesRep !== 'all') {
    const repId = salesRepsByName.get(filters.salesRep)
    if (repId) {
      query = query.eq('sales_rep_id', repId)
    }
  }

  // Apply UTM filters
  if (filters.utmSource && filters.utmSource !== 'all') {
    query = query.eq('utm_source', filters.utmSource)
  }
  if (filters.utmMedium && filters.utmMedium !== 'all') {
    query = query.eq('utm_medium', filters.utmMedium)
  }
  if (filters.utmCampaign && filters.utmCampaign !== 'all') {
    query = query.eq('utm_campaign', filters.utmCampaign)
  }
  if (filters.utmContent && filters.utmContent !== 'all') {
    query = query.eq('utm_content', filters.utmContent)
  }

  // Apply sorting - map client sort keys to database columns
  let dbSortKey = sortKey as string
  if (sortKey === 'sales_rep') {
    dbSortKey = 'sales_rep_id'
  }
  // lead_name now maps directly to the column (no longer need lead_id mapping)
  query = query.order(dbSortKey, { ascending: sortDirection === 'asc' })

  // Apply pagination
  const from = page * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw error

  // Transform data to match the Call interface
  const rows: Call[] = (data || []).map((call: Record<string, unknown>) => ({
    id: call.id as string,
    lead_name: (call.lead_name as string) || 'Unknown',
    lead_email: (call.lead_email as string) || null,
    lead_phone: (call.lead_phone as string) || null,
    hubspot_contact_url: (call.hubspot_contact_url as string) || null,
    sales_rep: salesRepsMap.get(call.sales_rep_id as number) || 'Unknown',
    sales_rep_id: call.sales_rep_id as number,
    booking_date: call.booking_date as string,
    call_date: call.call_date as string,
    booking_status: (call.booking_status as Call['booking_status']) || 'scheduled',
    confirmation_status: (call.confirmation_status as Call['confirmation_status']) || 'pending',
    show_up_status: (call.show_up_status as Call['show_up_status']) || 'pending',
    call_outcome: (call.call_outcome as Call['call_outcome']) || 'pending',
    quality_score: call.quality_score as number | null,
    upfront_revenue: call.upfront_revenue as number | null,
    call_type: (call.call_type as string) || '',
    utm_source: (call.utm_source as string) || '',
    utm_medium: (call.utm_medium as string) || '',
    utm_campaign: (call.utm_campaign as string) || '',
    utm_content: (call.utm_content as string) || '',
    close_date: (call.close_date as string) || null,
    demo_type: (call.demo_type as Call['demo_type']) || null,
    zoom_recording_url: (call.zoom_recording_url as string) || null,
  }))

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    rows,
    totalCount,
    page,
    pageSize,
    totalPages,
  }
}

// Fetch functions (legacy - fetches all calls)
async function fetchCalls(): Promise<Call[]> {
  const [callsResult, salesRepsResult] = await Promise.all([
    supabase.from('calls').select('*').order('call_date', { ascending: false }),
    supabase.from('sales_reps').select('id, name'),
  ])

  if (callsResult.error) throw callsResult.error
  if (salesRepsResult.error) throw salesRepsResult.error

  // Create lookup map for sales reps
  const salesRepsMap = new Map<number, string>()
  salesRepsResult.data?.forEach((rep: { id: number; name: string }) => {
    salesRepsMap.set(rep.id, rep.name)
  })

  // Transform data to match the expected Call interface
  return (callsResult.data || []).map((call: Record<string, unknown>) => ({
    id: call.id as string,
    lead_name: (call.lead_name as string) || 'Unknown',
    lead_email: (call.lead_email as string) || null,
    lead_phone: (call.lead_phone as string) || null,
    hubspot_contact_url: (call.hubspot_contact_url as string) || null,
    sales_rep: salesRepsMap.get(call.sales_rep_id as number) || 'Unknown',
    sales_rep_id: call.sales_rep_id as number,
    booking_date: call.booking_date as string,
    call_date: call.call_date as string,
    booking_status: (call.booking_status as Call['booking_status']) || 'scheduled',
    confirmation_status: (call.confirmation_status as Call['confirmation_status']) || 'pending',
    show_up_status: (call.show_up_status as Call['show_up_status']) || 'pending',
    call_outcome: (call.call_outcome as Call['call_outcome']) || 'pending',
    quality_score: call.quality_score as number | null,
    upfront_revenue: call.upfront_revenue as number | null,
    call_type: (call.call_type as string) || '',
    utm_source: (call.utm_source as string) || '',
    utm_medium: (call.utm_medium as string) || '',
    utm_campaign: (call.utm_campaign as string) || '',
    utm_content: (call.utm_content as string) || '',
    close_date: (call.close_date as string) || null,
    demo_type: (call.demo_type as Call['demo_type']) || null,
    zoom_recording_url: (call.zoom_recording_url as string) || null,
  }))
}

async function fetchSalesReps(): Promise<SalesRep[]> {
  const { data, error } = await supabase
    .from('sales_reps')
    .select('id, name')
    .order('name')

  if (error) throw error
  return data || []
}

async function fetchDropdownOptions(): Promise<DropdownOptions> {
  const { data, error } = await supabase.rpc('get_dropdown_options')

  if (error) throw error

  return {
    salesReps: data?.salesReps || [],
    utmSources: data?.utmSources || [],
    utmMediums: data?.utmMediums || [],
    utmCampaigns: data?.utmCampaigns || [],
    utmContents: data?.utmContents || [],
    callTypes: data?.callTypes || [],
  }
}

async function fetchDashboardStats(): Promise<DashboardStats | null> {
  const { data, error } = await supabase.rpc('get_dashboard_stats')

  if (error) throw error
  return data?.[0] || null
}

// Query hooks
export function useDashboardStats() {
  const { data: stats, isLoading: loading, error } = useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: fetchDashboardStats,
  })

  return {
    stats: stats ?? null,
    loading,
    error: error?.message ?? null,
  }
}

export function useCalls() {
  const queryClient = useQueryClient()
  const { data: calls, isLoading: loading, error } = useQuery({
    queryKey: queryKeys.calls,
    queryFn: fetchCalls,
  })

  const refetch = () => queryClient.invalidateQueries({ queryKey: queryKeys.calls })

  return {
    calls: calls ?? [],
    loading,
    error: error?.message ?? null,
    refetch,
  }
}

// Server-side filtered, sorted, and paginated calls query
export function useCallsQuery(params: CallsQueryParams) {
  const queryClient = useQueryClient()
  const { data, isLoading: loading, error, isFetching } = useQuery({
    queryKey: queryKeys.callsQuery(params),
    queryFn: () => fetchCallsWithQuery(params),
    placeholderData: keepPreviousData, // Keep showing old data while fetching new page
  })

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['calls'] })

  return {
    data: data ?? {
      rows: [],
      totalCount: 0,
      page: 0,
      pageSize: params.pageSize,
      totalPages: 0,
    },
    loading,
    isFetching, // True when fetching new data (including background refetch)
    error: error?.message ?? null,
    refetch,
  }
}

export function useSalesReps() {
  const { data: salesReps, isLoading: loading, error } = useQuery({
    queryKey: queryKeys.salesReps,
    queryFn: fetchSalesReps,
  })

  return {
    salesReps: salesReps ?? [],
    loading,
    error: error?.message ?? null,
  }
}

export function useDropdownOptions() {
  const { data: options, isLoading: loading, error } = useQuery({
    queryKey: queryKeys.dropdownOptions,
    queryFn: fetchDropdownOptions,
  })

  return {
    options: options ?? {
      salesReps: [],
      utmSources: [],
      utmMediums: [],
      utmCampaigns: [],
      utmContents: [],
      callTypes: [],
    },
    loading,
    error: error?.message ?? null,
  }
}

// Mutation types
export type AddCallData = {
  lead_name: string
  lead_email?: string | null
  lead_phone?: string | null
  hubspot_contact_url?: string | null
  sales_rep_id: number
  booking_date: string
  call_date: string
  booking_status: Call['booking_status']
  confirmation_status: Call['confirmation_status']
  show_up_status: Call['show_up_status']
  call_outcome: Call['call_outcome']
  quality_score: number | null
  upfront_revenue: number | null
  call_type: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  close_date?: string | null
  demo_type?: Call['demo_type']
  zoom_recording_url?: string | null
}

export type UpdateCallData = Partial<AddCallData>

// Mutation functions
export async function addCall(callData: AddCallData) {
  const { data, error } = await supabase
    .from('calls')
    .insert(callData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCall(id: string, updates: UpdateCallData) {
  const { data, error } = await supabase
    .from('calls')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Mutation hooks
export function useAddCall() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addCall,
    onSuccess: () => {
      // Invalidate and refetch calls
      queryClient.invalidateQueries({ queryKey: ['calls'] })
    },
  })
}

// Type for the mutation context (used for rollback)
type UpdateCallContext = {
  previousData: Map<string, CallsQueryResult | Call[] | undefined>
}

export function useUpdateCall() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateCallData }) =>
      updateCall(id, updates),

    // Optimistic update
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['calls'] })

      // Snapshot the previous values for all calls queries
      const previousData = new Map<string, CallsQueryResult | Call[] | undefined>()

      // Get all cached queries that start with ['calls']
      const callsQueries = queryClient.getQueriesData<CallsQueryResult | Call[]>({ 
        queryKey: ['calls'] 
      })

      // Update each cached query optimistically
      callsQueries.forEach(([queryKey, data]) => {
        if (!data) return

        // Save previous data for rollback
        previousData.set(JSON.stringify(queryKey), data)

        // Handle paginated query result
        if ('rows' in data) {
          const updatedRows = data.rows.map((call) => {
            if (call.id !== id) return call
            
            // Apply updates to the call
            const updatedCall = { ...call }
            
            // Handle each possible update field
            if (updates.lead_name !== undefined) {
              updatedCall.lead_name = updates.lead_name
            }
            if (updates.lead_email !== undefined) {
              updatedCall.lead_email = updates.lead_email ?? null
            }
            if (updates.lead_phone !== undefined) {
              updatedCall.lead_phone = updates.lead_phone ?? null
            }
            if (updates.hubspot_contact_url !== undefined) {
              updatedCall.hubspot_contact_url = updates.hubspot_contact_url ?? null
            }
            if (updates.booking_status !== undefined) {
              updatedCall.booking_status = updates.booking_status
            }
            if (updates.confirmation_status !== undefined) {
              updatedCall.confirmation_status = updates.confirmation_status
            }
            if (updates.show_up_status !== undefined) {
              updatedCall.show_up_status = updates.show_up_status
            }
            if (updates.call_outcome !== undefined) {
              updatedCall.call_outcome = updates.call_outcome
            }
            if (updates.quality_score !== undefined) {
              updatedCall.quality_score = updates.quality_score
            }
            if (updates.upfront_revenue !== undefined) {
              updatedCall.upfront_revenue = updates.upfront_revenue
            }
            if (updates.sales_rep_id !== undefined) {
              updatedCall.sales_rep_id = updates.sales_rep_id
              // Note: We can't update the sales_rep name optimistically without the lookup
              // The refetch in onSettled will fix this
            }
            if (updates.close_date !== undefined) {
              updatedCall.close_date = updates.close_date
            }
            if (updates.demo_type !== undefined) {
              updatedCall.demo_type = updates.demo_type
            }
            if (updates.zoom_recording_url !== undefined) {
              updatedCall.zoom_recording_url = updates.zoom_recording_url
            }
            if (updates.booking_date !== undefined) {
              updatedCall.booking_date = updates.booking_date
            }
            if (updates.call_date !== undefined) {
              updatedCall.call_date = updates.call_date
            }
            if (updates.call_type !== undefined) {
              updatedCall.call_type = updates.call_type
            }
            if (updates.utm_source !== undefined) {
              updatedCall.utm_source = updates.utm_source
            }
            if (updates.utm_medium !== undefined) {
              updatedCall.utm_medium = updates.utm_medium
            }
            if (updates.utm_campaign !== undefined) {
              updatedCall.utm_campaign = updates.utm_campaign
            }
            if (updates.utm_content !== undefined) {
              updatedCall.utm_content = updates.utm_content
            }
            
            return updatedCall
          })

          queryClient.setQueryData(queryKey, {
            ...data,
            rows: updatedRows,
          })
        } 
        // Handle legacy array result
        else if (Array.isArray(data)) {
          const updatedCalls = data.map((call) => {
            if (call.id !== id) return call
            return { ...call, ...updates }
          })
          queryClient.setQueryData(queryKey, updatedCalls)
        }
      })

      // Return context with previous data for rollback
      return { previousData } as UpdateCallContext
    },

    // Rollback on error
    onError: (_err, _variables, context) => {
      if (!context?.previousData) return

      // Restore all previous data
      context.previousData.forEach((data, queryKeyStr) => {
        const queryKey = JSON.parse(queryKeyStr)
        queryClient.setQueryData(queryKey, data)
      })
    },

    // Always refetch after error or success to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] })
    },
  })
}
