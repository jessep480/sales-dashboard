import type { Lead, Call } from "./types"

export const salesReps = [
  "Alex Thompson",
  "Sarah Johnson",
  "Mike Chen",
  "Emily Davis",
  "Chris Wilson",
]

export const utmSources = ["google", "facebook", "linkedin", "referral", "direct"]
export const utmMediums = ["cpc", "organic", "email", "social", "none"]
export const utmCampaigns = ["summer_sale", "new_product", "brand_awareness", "retargeting", "webinar"]
export const utmContents = ["ad_v1", "ad_v2", "banner_a", "banner_b", "email_cta"]
export const callTypes = ["discovery", "demo", "follow_up", "closing", "onboarding"]
export const leadSources = ["Website", "Trade Show", "Referral", "Cold Call", "Social Media"]

export const mockLeads: Lead[] = [
  { id: "lead_1", name: "John Smith", email: "john.smith@email.com", phone: "(555) 123-4567", lead_source: "Website", hubspot_id: "hs_12345", created_at: "2025-01-01" },
  { id: "lead_2", name: "Jane Doe", email: "jane.doe@email.com", phone: "(555) 234-5678", lead_source: "Referral", hubspot_id: "hs_12346", created_at: "2025-01-02" },
  { id: "lead_3", name: "Bob Wilson", email: "bob.wilson@email.com", phone: "(555) 345-6789", lead_source: "Trade Show", hubspot_id: "hs_12347", created_at: "2025-01-03" },
  { id: "lead_4", name: "Alice Brown", email: "alice.brown@email.com", phone: "(555) 456-7890", lead_source: "Cold Call", hubspot_id: "hs_12348", created_at: "2025-01-04" },
  { id: "lead_5", name: "Charlie Davis", email: "charlie.d@email.com", phone: "(555) 567-8901", lead_source: "Social Media", hubspot_id: "hs_12349", created_at: "2025-01-05" },
  { id: "lead_6", name: "Diana Miller", email: "diana.m@email.com", phone: "(555) 678-9012", lead_source: "Website", hubspot_id: "hs_12350", created_at: "2025-01-06" },
  { id: "lead_7", name: "Edward Lee", email: "edward.lee@email.com", phone: "(555) 789-0123", lead_source: "Referral", hubspot_id: "hs_12351", created_at: "2025-01-07" },
  { id: "lead_8", name: "Fiona Clark", email: "fiona.c@email.com", phone: "(555) 890-1234", lead_source: "Trade Show", hubspot_id: "hs_12352", created_at: "2025-01-08" },
]

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString().split("T")[0]
}

function generateCalls(): Call[] {
  const calls: Call[] = []
  const startDate = new Date("2025-01-01")
  const endDate = new Date("2025-01-26")

  for (let i = 1; i <= 50; i++) {
    const lead = mockLeads[Math.floor(Math.random() * mockLeads.length)]
    const bookingStatus = Math.random() > 0.15 ? "scheduled" : "canceled"
    const confirmationStatus = bookingStatus === "canceled" ? "no" : (Math.random() > 0.2 ? "yes" : (Math.random() > 0.5 ? "no" : "pending"))
    const showUpStatus = confirmationStatus !== "yes" ? "no" : (Math.random() > 0.25 ? "yes" : "no")
    
    let callOutcome: Call["call_outcome"] = "pending"
    if (showUpStatus === "yes") {
      callOutcome = Math.random() > 0.4 ? "closed_won" : "closed_lost"
    } else if (showUpStatus === "no" && confirmationStatus === "yes") {
      callOutcome = "no_show"
    }

    calls.push({
      id: `call_${i}`,
      lead_id: lead.id,
      lead_name: lead.name,
      sales_rep: salesReps[Math.floor(Math.random() * salesReps.length)],
      booking_date: randomDate(startDate, endDate),
      call_date: randomDate(startDate, endDate),
      booking_status: bookingStatus,
      confirmation_status: confirmationStatus,
      show_up_status: showUpStatus,
      call_outcome: callOutcome,
      quality_score: Math.floor(Math.random() * 5) + 1,
      upfront_revenue: callOutcome === "closed_won" ? Math.floor(Math.random() * 5000) + 1000 : 0,
      call_type: callTypes[Math.floor(Math.random() * callTypes.length)],
      utm_source: utmSources[Math.floor(Math.random() * utmSources.length)],
      utm_medium: utmMediums[Math.floor(Math.random() * utmMediums.length)],
      utm_campaign: utmCampaigns[Math.floor(Math.random() * utmCampaigns.length)],
      utm_content: utmContents[Math.floor(Math.random() * utmContents.length)],
    })
  }

  return calls
}

export const mockCalls: Call[] = generateCalls()
