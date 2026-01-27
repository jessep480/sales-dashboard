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

        // Debug logging
        console.log('SUPABASE DEBUG - Calls count:', callsResult.data?.length)
        console.log('SUPABASE DEBUG - Sales reps count:', salesRepsResult.data?.length)
        console.log('SUPABASE DEBUG - Leads count:', leadsResult.data?.length)
        console.log('SUPABASE DEBUG - First call raw:', callsResult.data?.[0])

        // Create lookup maps for sales reps and leads
        const salesRepsMap = new Map<number, string>()
        salesRepsResult.data?.forEach((rep: any) => {
          salesRepsMap.set(rep.id, rep.name)
        })

        const leadsMap = new Map<string, string>()
        leadsResult.data?.forEach((lead: any) => {
          leadsMap.set(lead.id, lead.name)
        })

        console.log('SUPABASE DEBUG - Sales reps map:', Object.fromEntries(salesRepsMap))

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

        console.log('SUPABASE DEBUG - First transformed call:', transformedCalls[0])
        console.log('SUPABASE DEBUG - Total transformed calls:', transformedCalls.length)

        setCalls(transformedCalls)
      } catch (err) {
        console.error('SUPABASE DEBUG - Error:', err)
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
  const [salesReps, setSalesReps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSalesReps() {
      try {
        const { data, error } = await supabase
          .from('sales_reps')
          .select('name')
          .order('name')

        if (error) throw error

        setSalesReps(data?.map(rep => rep.name) || [])
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
