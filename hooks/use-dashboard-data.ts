"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
  lead_id: string
  lead_name: string
  sales_rep: string
  booking_date: string
  call_date: string
  booking_status: string
  confirmation_status: string
  show_up_status: string
  call_outcome: string
  quality_score: number
  upfront_revenue: number
  call_type: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  lead_source: string
  hubspot_id: string
  created_at: string
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
  leadSources: string[]
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase.rpc('get_dashboard_stats')

        if (error) throw error

        setStats(data?.[0] || null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, loading, error }
}

export function useCalls() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCalls() {
      try {
        // Fetch all three tables separately and join in JavaScript
        const [callsResult, salesRepsResult, leadsResult] = await Promise.all([
          supabase.from('calls').select('*').order('call_date', { ascending: false }),
          supabase.from('sales_reps').select('id, name'),
          supabase.from('leads').select('id, name')
        ])

        if (callsResult.error) throw callsResult.error
        if (salesRepsResult.error) throw salesRepsResult.error
        if (leadsResult.error) throw leadsResult.error

        // Create lookup maps for sales reps and leads
        const salesRepsMap = new Map<number, string>()
        salesRepsResult.data?.forEach((rep: any) => {
          salesRepsMap.set(rep.id, rep.name)
        })

        const leadsMap = new Map<string, string>()
        leadsResult.data?.forEach((lead: any) => {
          leadsMap.set(lead.id, lead.name)
        })

        // Transform data to match the expected Call interface
        const transformedCalls: Call[] = (callsResult.data || []).map((call: any) => ({
          id: call.id,
          lead_id: call.lead_id,
          lead_name: leadsMap.get(call.lead_id) || 'Unknown',
          sales_rep: salesRepsMap.get(call.sales_rep_id) || 'Unknown',
          booking_date: call.booking_date,
          call_date: call.call_date,
          booking_status: call.booking_status || '',
          confirmation_status: call.confirmation_status || '',
          show_up_status: call.show_up_status || '',
          call_outcome: call.call_outcome || '',
          quality_score: call.quality_score || 0,
          upfront_revenue: call.upfront_revenue || 0,
          call_type: call.call_type || '',
          utm_source: call.utm_source || '',
          utm_medium: call.utm_medium || '',
          utm_campaign: call.utm_campaign || '',
          utm_content: call.utm_content || '',
        }))

        setCalls(transformedCalls)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch calls')
      } finally {
        setLoading(false)
      }
    }

    fetchCalls()
  }, [])

  return { calls, loading, error }
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeads() {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        setLeads(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch leads')
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [])

  return { leads, loading, error }
}

export function useSalesReps() {
  const [salesReps, setSalesReps] = useState<SalesRep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSalesReps() {
      try {
        const { data, error } = await supabase
          .from('sales_reps')
          .select('id, name')
          .order('name')

        if (error) throw error

        setSalesReps(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sales reps')
      } finally {
        setLoading(false)
      }
    }

    fetchSalesReps()
  }, [])

  return { salesReps, loading, error }
}

// Hook to fetch all dropdown options from the database
export function useDropdownOptions() {
  const [options, setOptions] = useState<DropdownOptions>({
    salesReps: [],
    utmSources: [],
    utmMediums: [],
    utmCampaigns: [],
    utmContents: [],
    callTypes: [],
    leadSources: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOptions() {
      try {
        // Fetch sales reps
        const salesRepsResult = await supabase
          .from('sales_reps')
          .select('id, name')
          .order('name')

        if (salesRepsResult.error) throw salesRepsResult.error

        // Fetch distinct UTM and call type values from calls table
        const callsResult = await supabase
          .from('calls')
          .select('utm_source, utm_medium, utm_campaign, utm_content, call_type')

        if (callsResult.error) throw callsResult.error

        // Fetch distinct lead sources from leads table
        const leadsResult = await supabase
          .from('leads')
          .select('lead_source')

        if (leadsResult.error) throw leadsResult.error

        // Extract unique values
        const utmSources = [...new Set(callsResult.data?.map(c => c.utm_source).filter(Boolean) || [])]
        const utmMediums = [...new Set(callsResult.data?.map(c => c.utm_medium).filter(Boolean) || [])]
        const utmCampaigns = [...new Set(callsResult.data?.map(c => c.utm_campaign).filter(Boolean) || [])]
        const utmContents = [...new Set(callsResult.data?.map(c => c.utm_content).filter(Boolean) || [])]
        const callTypes = [...new Set(callsResult.data?.map(c => c.call_type).filter(Boolean) || [])]
        const leadSources = [...new Set(leadsResult.data?.map(l => l.lead_source).filter(Boolean) || [])]

        setOptions({
          salesReps: salesRepsResult.data || [],
          utmSources: utmSources.sort(),
          utmMediums: utmMediums.sort(),
          utmCampaigns: utmCampaigns.sort(),
          utmContents: utmContents.sort(),
          callTypes: callTypes.sort(),
          leadSources: leadSources.sort(),
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dropdown options')
      } finally {
        setLoading(false)
      }
    }

    fetchOptions()
  }, [])

  return { options, loading, error }
}

// Mutation functions for adding/updating records

export async function addCall(callData: {
  lead_id: string
  sales_rep_id: number
  booking_date: string
  call_date: string
  booking_status: string
  confirmation_status: string
  show_up_status: string
  call_outcome: string
  quality_score: number
  upfront_revenue: number
  call_type: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
}) {
  const { data, error } = await supabase
    .from('calls')
    .insert(callData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCall(id: string, updates: Partial<{
  lead_id: string
  sales_rep_id: number
  booking_date: string
  call_date: string
  booking_status: string
  confirmation_status: string
  show_up_status: string
  call_outcome: string
  quality_score: number
  upfront_revenue: number
  call_type: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
}>) {
  const { data, error } = await supabase
    .from('calls')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addLead(leadData: {
  name: string
  email: string
  phone: string
  lead_source: string
  hubspot_id?: string
}) {
  const { data, error } = await supabase
    .from('leads')
    .insert(leadData)
    .select()
    .single()

  if (error) throw error
  return data
}
