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
        // Join with sales_reps and leads tables to get names
        const { data, error } = await supabase
          .from('calls')
          .select(`
            id,
            lead_id,
            leads!lead_id(name),
            sales_rep_id,
            sales_reps!sales_rep_id(name),
            booking_date,
            call_date,
            booking_status,
            confirmation_status,
            show_up_status,
            call_outcome,
            quality_score,
            upfront_revenue,
            call_type,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content
          `)
          .order('call_date', { ascending: false })

        if (error) throw error

        // Transform data to match the expected Call interface
        const transformedCalls: Call[] = (data || []).map((call: any) => ({
          id: call.id,
          lead_id: call.lead_id,
          lead_name: call.leads?.name || 'Unknown',
          sales_rep: call.sales_reps?.name || 'Unknown',
          booking_date: call.booking_date,
          call_date: call.call_date,
          booking_status: call.booking_status,
          confirmation_status: call.confirmation_status,
          show_up_status: call.show_up_status,
          call_outcome: call.call_outcome,
          quality_score: call.quality_score || 0,
          upfront_revenue: call.upfront_revenue || 0,
          call_type: call.call_type,
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
