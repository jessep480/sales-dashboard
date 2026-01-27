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
        const { data, error } = await supabase
          .from('calls')
          .select('*')
          .order('call_date', { ascending: false })

        if (error) throw error

        setCalls(data || [])
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
