export interface Call {
  id: string
  lead_name: string
  lead_email: string | null
  lead_phone: string | null
  hubspot_contact_url: string | null
  sales_rep: string
  booking_date: string
  call_date: string
  booking_status: "scheduled" | "canceled"
  confirmation_status: "pending" | "yes" | "no" | "canceled"
  show_up_status: "pending" | "yes" | "no"
  call_outcome: "pending" | "disqualified" | "follow_up" | "closed_won" | "closed_lost"
  quality_score: number
  upfront_revenue: number
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
  name: string
  totalCalls: number
  callsExclCanceled: number
  canceledCalls: number
  confirmedCalls: number
  showUps: number
  totalRevenue: number
  cancellationRate: number
  confirmationRate: number
  showUpRate: number
}

export interface Filters {
  dateType: "booking_date" | "call_date"
  startDate: string
  endDate: string
  salesRep: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
}
