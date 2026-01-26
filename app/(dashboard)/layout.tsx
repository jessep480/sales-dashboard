import React from "react"
import { Sidebar } from "@/components/dashboard/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background px-6">
          <h2 className="text-lg font-semibold text-foreground">Sales Tracking</h2>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
