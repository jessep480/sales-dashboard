"use client"

import React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import type { Lead, SalesRep, AddCallData } from "@/hooks/use-dashboard-data"

export type { AddCallData }

interface AddCallModalProps {
  onAdd: (callData: AddCallData) => void
  leads: Lead[]
  salesReps: SalesRep[]
  callTypes?: string[]
  utmSources?: string[]
  utmMediums?: string[]
  utmCampaigns?: string[]
  utmContents?: string[]
  loading?: boolean
}

export function AddCallModal({ 
  onAdd, 
  leads = [],
  salesReps = [],
  callTypes = [],
  utmSources = [],
  utmMediums = [],
  utmCampaigns = [],
  utmContents = [],
  loading = false,
}: AddCallModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    lead_id: "",
    sales_rep_id: "",
    booking_date: "",
    call_date: "",
    booking_status: "scheduled",
    confirmation_status: "pending",
    show_up_status: "pending",
    call_outcome: "pending",
    quality_score: "3",
    upfront_revenue: "0",
    call_type: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const callData: AddCallData = {
      lead_id: formData.lead_id,
      sales_rep_id: parseInt(formData.sales_rep_id),
      booking_date: formData.booking_date,
      call_date: formData.call_date,
      booking_status: formData.booking_status as AddCallData['booking_status'],
      confirmation_status: formData.confirmation_status as AddCallData['confirmation_status'],
      show_up_status: formData.show_up_status as AddCallData['show_up_status'],
      call_outcome: formData.call_outcome as AddCallData['call_outcome'],
      quality_score: parseInt(formData.quality_score),
      upfront_revenue: parseFloat(formData.upfront_revenue),
      call_type: formData.call_type,
      utm_source: formData.utm_source,
      utm_medium: formData.utm_medium,
      utm_campaign: formData.utm_campaign,
      utm_content: formData.utm_content,
    }
    
    onAdd(callData)
    setOpen(false)
    setFormData({
      lead_id: "",
      sales_rep_id: "",
      booking_date: "",
      call_date: "",
      booking_status: "scheduled",
      confirmation_status: "pending",
      show_up_status: "pending",
      call_outcome: "pending",
      quality_score: "3",
      upfront_revenue: "0",
      call_type: "",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_content: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={loading}>
          <Plus className="mr-2 h-4 w-4" />
          Add Call
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Call</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lead</Label>
              <Select value={formData.lead_id} onValueChange={(v) => setFormData({ ...formData, lead_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sales Rep</Label>
              <Select value={formData.sales_rep_id} onValueChange={(v) => setFormData({ ...formData, sales_rep_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rep" />
                </SelectTrigger>
                <SelectContent>
                  {salesReps.map((rep) => (
                    <SelectItem key={rep.id} value={rep.id.toString()}>
                      {rep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Booking Date</Label>
              <Input
                type="date"
                value={formData.booking_date}
                onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Call Date</Label>
              <Input
                type="date"
                value={formData.call_date}
                onChange={(e) => setFormData({ ...formData, call_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Booking Status</Label>
              <Select
                value={formData.booking_status}
                onValueChange={(v) => setFormData({ ...formData, booking_status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Call Type</Label>
              <Select value={formData.call_type} onValueChange={(v) => setFormData({ ...formData, call_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {callTypes.length > 0 ? (
                    callTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="first_call">First Call</SelectItem>
                      <SelectItem value="second_call">Second Call</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quality Score (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.quality_score}
                onChange={(e) => setFormData({ ...formData, quality_score: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Upfront Revenue</Label>
              <Input
                type="number"
                min="0"
                value={formData.upfront_revenue}
                onChange={(e) => setFormData({ ...formData, upfront_revenue: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>UTM Source</Label>
              <Select value={formData.utm_source} onValueChange={(v) => setFormData({ ...formData, utm_source: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {utmSources.length > 0 ? (
                    utmSources.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="direct">Direct</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>UTM Medium</Label>
              <Select value={formData.utm_medium} onValueChange={(v) => setFormData({ ...formData, utm_medium: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select medium" />
                </SelectTrigger>
                <SelectContent>
                  {utmMediums.length > 0 ? (
                    utmMediums.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none">None</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>UTM Campaign</Label>
              <Select value={formData.utm_campaign} onValueChange={(v) => setFormData({ ...formData, utm_campaign: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {utmCampaigns.length > 0 ? (
                    utmCampaigns.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none">None</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>UTM Content</Label>
              <Select value={formData.utm_content} onValueChange={(v) => setFormData({ ...formData, utm_content: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content" />
                </SelectTrigger>
                <SelectContent>
                  {utmContents.length > 0 ? (
                    utmContents.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none">None</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? "Adding..." : "Add Call"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
