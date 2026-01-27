"use client"

import { useState, useMemo } from "react"
import { AddLeadModal } from "@/components/dashboard/add-lead-modal"
import { useCalls, useLeads } from "@/hooks/use-dashboard-data"
import type { Lead, Call } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type SortKey = "name" | "email" | "phone" | "lead_source" | "hubspot_id" | "callCount" | "lastCallDate"
type SortDirection = "asc" | "desc"

interface LeadWithCalls extends Lead {
  callCount: number
  lastCallDate: string
  calls: Call[]
}

export default function LeadsPage() {
  // Fetch data from Supabase
  const { leads: supabaseLeads } = useLeads()
  const { calls: supabaseCalls } = useCalls()

  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set())

  // Use Supabase data directly
  const leads = supabaseLeads
  const calls = supabaseCalls

  const leadsWithCalls = useMemo(() => {
    const data: LeadWithCalls[] = leads.map((lead) => {
      const leadCalls = calls.filter((c) => c.lead_id === lead.id)
      const sortedCalls = leadCalls.sort((a, b) => b.call_date.localeCompare(a.call_date))
      return {
        ...lead,
        callCount: leadCalls.length,
        lastCallDate: sortedCalls[0]?.call_date || "N/A",
        calls: sortedCalls,
      }
    })

    return data.sort((a, b) => {
      let aVal: string | number = a[sortKey as keyof LeadWithCalls] as string | number
      let bVal: string | number = b[sortKey as keyof LeadWithCalls] as string | number
      const modifier = sortDirection === "asc" ? 1 : -1
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * modifier
      }
      return ((aVal as number) - (bVal as number)) * modifier
    })
  }, [leads, calls, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const toggleExpand = (leadId: string) => {
    const newExpanded = new Set(expandedLeads)
    if (newExpanded.has(leadId)) {
      newExpanded.delete(leadId)
    } else {
      newExpanded.add(leadId)
    }
    setExpandedLeads(newExpanded)
  }

  const handleAddLead = (newLead: Lead) => {
    // TODO: Implement Supabase insert
    console.log('Add lead:', newLead)
  }

  const SortableHeader = ({ column, label }: { column: SortKey; label: string }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(column)}
      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground hover:bg-transparent"
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "closed_won":
        return <Badge className="bg-chart-2/20 text-chart-2 hover:bg-chart-2/30">Won</Badge>
      case "closed_lost":
        return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">Lost</Badge>
      case "no_show":
        return <Badge className="bg-chart-3/20 text-chart-3 hover:bg-chart-3/30">No Show</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <AddLeadModal onAdd={handleAddLead} />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">All Leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-8"></TableHead>
                  <TableHead><SortableHeader column="name" label="Name" /></TableHead>
                  <TableHead><SortableHeader column="email" label="Email" /></TableHead>
                  <TableHead><SortableHeader column="phone" label="Phone" /></TableHead>
                  <TableHead><SortableHeader column="lead_source" label="Lead Source" /></TableHead>
                  <TableHead><SortableHeader column="hubspot_id" label="HubSpot ID" /></TableHead>
                  <TableHead className="text-right"><SortableHeader column="callCount" label="Call Count" /></TableHead>
                  <TableHead><SortableHeader column="lastCallDate" label="Last Call Date" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadsWithCalls.map((lead) => (
                  <Collapsible key={lead.id} asChild open={expandedLeads.has(lead.id)}>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow
                          className="border-border cursor-pointer hover:bg-secondary/50"
                          onClick={() => toggleExpand(lead.id)}
                        >
                          <TableCell className="w-8">
                            {lead.calls.length > 0 && (
                              expandedLeads.has(lead.id) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-card-foreground">{lead.name}</TableCell>
                          <TableCell className="text-card-foreground">{lead.email}</TableCell>
                          <TableCell className="text-card-foreground">{lead.phone}</TableCell>
                          <TableCell className="text-card-foreground">{lead.lead_source}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{lead.hubspot_id}</TableCell>
                          <TableCell className="text-right text-chart-1 font-medium">{lead.callCount}</TableCell>
                          <TableCell className="text-card-foreground">{lead.lastCallDate}</TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <>
                          {expandedLeads.has(lead.id) && lead.calls.length > 0 && (
                            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                              <TableCell colSpan={8} className="p-0">
                                <div className="p-4">
                                  <h4 className="text-sm font-medium text-card-foreground mb-3">
                                    Call History ({lead.calls.length} calls)
                                  </h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-border/50 hover:bg-transparent">
                                        <TableHead className="text-xs">Call Date</TableHead>
                                        <TableHead className="text-xs">Sales Rep</TableHead>
                                        <TableHead className="text-xs">Type</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        <TableHead className="text-xs">Outcome</TableHead>
                                        <TableHead className="text-xs text-right">Revenue</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {lead.calls.map((call) => (
                                        <TableRow key={call.id} className="border-border/30">
                                          <TableCell className="text-sm text-card-foreground">{call.call_date}</TableCell>
                                          <TableCell className="text-sm text-card-foreground">{call.sales_rep}</TableCell>
                                          <TableCell className="text-sm text-card-foreground capitalize">{call.call_type}</TableCell>
                                          <TableCell className="text-sm">
                                            <Badge variant={call.booking_status === "canceled" ? "destructive" : "secondary"}>
                                              {call.booking_status}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{getOutcomeBadge(call.call_outcome)}</TableCell>
                                          <TableCell className="text-sm text-right text-chart-2">
                                            {formatCurrency(call.upfront_revenue)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
