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
import { leadSources } from "@/lib/mock-data"
import type { Lead } from "@/lib/types"

interface AddLeadModalProps {
  onAdd: (lead: Lead) => void
}

export function AddLeadModal({ onAdd }: AddLeadModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    lead_source: "",
    hubspot_id: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newLead: Lead = {
      id: `lead_${Date.now()}`,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      lead_source: formData.lead_source,
      hubspot_id: formData.hubspot_id || `hs_${Date.now()}`,
      created_at: new Date().toISOString().split("T")[0],
    }
    onAdd(newLead)
    setOpen(false)
    setFormData({
      name: "",
      email: "",
      phone: "",
      lead_source: "",
      hubspot_id: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Smith"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Lead Source</Label>
            <Select
              value={formData.lead_source}
              onValueChange={(v) => setFormData({ ...formData, lead_source: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {leadSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>HubSpot ID (optional)</Label>
            <Input
              value={formData.hubspot_id}
              onChange={(e) => setFormData({ ...formData, hubspot_id: e.target.value })}
              placeholder="hs_12345"
            />
          </div>

          <Button type="submit" className="w-full mt-4">
            Add Lead
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
