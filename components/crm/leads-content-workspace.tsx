"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { updateLeadStatus, convertLeadToOpportunity, getOpportunityMetadata } from "@/app/actions/crm"
import { PageHeader } from "@/components/page-header"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToastHelpers } from "@/components/ui/toast"

interface Lead {
    name: string
    lead_name: string
    email_id: string
    mobile_no: string
    status: string
    company_name: string
    job_title?: string
    territory?: string
    source?: string
    industry?: string
}

interface LeadsContentWorkspaceProps {
    leads: Lead[]
}

// ERPNext lead statuses
const LEAD_STAGES = [
    "Lead",
    "Open",
    "Replied",
    "Opportunity",
    "Quotation",
    "Lost Quotation",
    "Interested",
    "Converted",
    "Do Not Contact"
]

// Mock AI score calculation (to be replaced with real AI service)
function calculateAIScore(lead: Lead): number {
    // Simple heuristic based on available data
    let score = 50
    if (lead.email_id) score += 10
    if (lead.mobile_no) score += 10
    if (lead.company_name) score += 15
    if (lead.job_title) score += 10
    if (lead.status === "Interested") score += 20
    if (lead.status === "Replied") score += 15
    if (lead.status === "Opportunity") score += 25
    return Math.min(100, score + Math.floor(Math.random() * 10))
}

// Helper function to get stage badge color
function getStageColor(stage: string): string {
    const colors: Record<string, string> = {
        'Lead': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
        'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        'Replied': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
        'Interested': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        'Opportunity': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        'Quotation': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        'Lost Quotation': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        'Converted': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        'Do Not Contact': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
    }
    return colors[stage] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

export function LeadsContentWorkspace({ leads }: LeadsContentWorkspaceProps) {
    const router = useRouter()
    const [viewMode, setViewMode] = useState<"list" | "grid">("list")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedStages, setSelectedStages] = useState<string[]>(["Lead", "Opportunity"])
    const [selectedSource, setSelectedSource] = useState("All Sources")
    const [selectedPriority, setSelectedPriority] = useState<"hot" | "warm" | "cold" | null>("hot")
    const [draggedLead, setDraggedLead] = useState<string | null>(null)
    // Removed local toast state in favor of useToast
    const toast = useToastHelpers()

    // Conversion Dialog State
    const [isConversionDialogOpen, setIsConversionDialogOpen] = useState(false)
    const [pendingConversion, setPendingConversion] = useState<{ leadName: string, newStatus: string } | null>(null)
    const [isConverting, setIsConverting] = useState(false)
    const [opportunityAmount, setOpportunityAmount] = useState<number>(0)
    const [opportunityType, setOpportunityType] = useState<string>('Sales')
    const [salesStage, setSalesStage] = useState<string>('Qualification')
    const [metadata, setMetadata] = useState<{ types: string[], stages: string[] }>({ types: [], stages: [] })

    // Fetch metadata when dialog opens
    const handleConversionDialogOpen = async (open: boolean) => {
        setIsConversionDialogOpen(open)
        if (open && metadata.types.length === 0) {
            const data = await getOpportunityMetadata()
            setMetadata(data)
            if (data.types.length > 0) setOpportunityType(data.types[0])
            if (data.stages.length > 0) setSalesStage(data.stages[0])
        }
    }



    // Enrich leads with AI scores
    const leadsWithScores = useMemo(() => {
        return leads.map(lead => ({
            ...lead,
            aiScore: calculateAIScore(lead)
        }))
    }, [leads])

    // Filter leads based on search, stages, and priority (only in table view)
    const filteredLeads = useMemo(() => {
        // In Kanban view, show all leads without filters
        if (viewMode === "grid") {
            return leadsWithScores
        }

        // In table view, apply all filters
        return leadsWithScores.filter(lead => {
            // Search filter
            const matchesSearch = searchQuery === "" ||
                lead.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lead.email_id?.toLowerCase().includes(searchQuery.toLowerCase())

            // Stage filter
            const matchesStage = selectedStages.length === 0 || selectedStages.includes(lead.status)

            // Priority filter (based on AI score)
            let matchesPriority = true
            if (selectedPriority === "hot") {
                matchesPriority = lead.aiScore >= 75
            } else if (selectedPriority === "warm") {
                matchesPriority = lead.aiScore >= 50 && lead.aiScore < 75
            } else if (selectedPriority === "cold") {
                matchesPriority = lead.aiScore < 50
            }

            return matchesSearch && matchesStage && matchesPriority
        })
    }, [leadsWithScores, searchQuery, selectedStages, selectedPriority, viewMode])

    // Calculate KPIs
    const kpis = useMemo(() => {
        const totalLeads = leads.length
        const convertedLeads = leads.filter(l => l.status === "Converted").length
        const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0.0"
        const avgScore = leadsWithScores.length > 0
            ? Math.round(leadsWithScores.reduce((sum, l) => sum + l.aiScore, 0) / leadsWithScores.length)
            : 0

        return {
            totalLeads,
            conversionRate: `${conversionRate}%`,
            avgScore,
            responseTime: "1.4 hrs" // Mock data
        }
    }, [leads, leadsWithScores])

    // Toggle stage selection
    const toggleStage = (stage: string) => {
        setSelectedStages(prev =>
            prev.includes(stage)
                ? prev.filter(s => s !== stage)
                : [...prev, stage]
        )
    }

    // Handle status change
    const handleStatusChange = async (leadName: string, newStatus: string) => {
        // Special handling for Opportunity conversion
        if (newStatus === "Opportunity") {
            setPendingConversion({ leadName, newStatus })
            handleConversionDialogOpen(true)
            return
        }

        try {
            const result = await updateLeadStatus(leadName, newStatus)
            if (result.success) {
                router.refresh()
                toast.success("Success", "Lead status updated")
            } else {
                toast.error("Error", "Failed to update lead status")
            }
        } catch (error) {
            console.error("Error updating lead status:", error)
            toast.error("Error", "Failed to update lead status")
        }
    }

    async function confirmConversion() {
        if (!pendingConversion) return

        setIsConverting(true)
        try {
            const res = await convertLeadToOpportunity(
                pendingConversion.leadName,
                false, // createCustomer
                opportunityAmount,
                opportunityType,
                salesStage
            )

            if (res.success) {
                toast.success("Success", "Lead converted to Opportunity successfully!")
                router.refresh()
            } else {
                toast.error("Error", res.error || "Failed to convert lead")
            }
        } catch (e) {
            console.error(e)
            toast.error("Error", "An error occurred during conversion")
        } finally {
            setIsConverting(false)
            setIsConversionDialogOpen(false)
            setPendingConversion(null)
            setOpportunityAmount(0)
            setOpportunityType('Sales')
            setSalesStage('Qualification')
        }
    }

    // Drag and drop handlers for Kanban

    const handleDragStart = (e: React.DragEvent, leadName: string, leadStatus: string) => {
        // Prevent dragging converted leads
        if (leadStatus === "Converted") {
            e.preventDefault()
            toast.error("Action Not Allowed", "Converted leads cannot be moved to other stages")
            return
        }
        setDraggedLead(leadName)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDrop = async (targetStage: string) => {
        if (!draggedLead) return

        // Prevent dropping into Converted stage
        if (targetStage === "Converted") {
            setDraggedLead(null)
            toast.error("Action Not Allowed", "Leads cannot be manually moved to Converted stage")
            return
        }

        const lead = leads.find(l => l.name === draggedLead)
        if (lead && lead.status !== targetStage) {
            await handleStatusChange(draggedLead, targetStage)
        }
        setDraggedLead(null)
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-200 min-h-screen">
            <div className="flex min-h-screen">
                <main className="flex-1 flex flex-col h-screen overflow-hidden">
                    {/* Header */}
                    <PageHeader searchQuery={searchQuery} onSearchChange={setSearchQuery}>
                        <Link href="/crm/new">
                            <button className="bg-[#3b82f6] hover:bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition shadow-sm shadow-blue-500/20">
                                <span className="material-symbols-outlined text-lg">add</span> New Lead
                            </button>
                        </Link>
                    </PageHeader>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-4 gap-6">
                            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Total Leads</span>
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                        <span className="material-symbols-outlined text-xl">trending_up</span>
                                    </div>
                                </div>
                                <div className="flex items-end gap-3">
                                    <span className="text-[28px] font-bold text-white leading-none">{kpis.totalLeads}</span>
                                    <span className="text-sm font-semibold text-blue-400 mb-1">+12%</span>
                                </div>
                                <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[72%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                </div>
                            </div>

                            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Conversion Rate %</span>
                                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                                        <span className="material-symbols-outlined text-xl">pie_chart</span>
                                    </div>
                                </div>
                                <div className="flex items-end gap-3">
                                    <span className="text-[28px] font-bold text-white leading-none">{kpis.conversionRate}</span>
                                    <span className="text-sm font-semibold text-emerald-400 mb-1 flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-xs">arrow_upward</span>4.2%
                                    </span>
                                </div>
                                <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 w-[45%] rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                                </div>
                            </div>

                            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Avg. Lead Score</span>
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                        <span className="material-symbols-outlined text-xl">show_chart</span>
                                    </div>
                                </div>
                                <div className="flex items-end gap-3">
                                    <span className="text-[28px] font-bold text-white leading-none">{kpis.avgScore}</span>
                                    <span className="text-sm font-semibold text-slate-400 mb-1">100 AI Rating</span>
                                </div>
                                <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${kpis.avgScore}%` }}></div>
                                </div>
                            </div>

                            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Lead Response Time</span>
                                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                        <span className="material-symbols-outlined text-xl">bolt</span>
                                    </div>
                                </div>
                                <div className="flex items-end gap-3">
                                    <span className="text-[28px] font-bold text-white leading-none">{kpis.responseTime}</span>
                                    <span className="text-sm font-semibold text-emerald-400 mb-1">-15m</span>
                                </div>
                                <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 w-[85%] rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Grid */}
                        <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1" : "grid-cols-12"}`}>
                            {/* Filters Sidebar - Hidden in Kanban view */}
                            {viewMode === "list" && (
                                <div className="col-span-2 space-y-6">
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-full">
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="text-[12px] font-bold uppercase tracking-widest text-slate-900 dark:text-white">Filters</h3>
                                            <button
                                                className="text-[10px] font-bold text-primary uppercase hover:underline"
                                                onClick={() => {
                                                    setSelectedStages([])
                                                    setSelectedPriority(null)
                                                }}
                                            >
                                                Reset
                                            </button>
                                        </div>
                                        <div className="space-y-8">
                                            {/* Lead Status */}
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Lead Status</p>
                                                <div className="space-y-3">
                                                    {LEAD_STAGES.map(stage => (
                                                        <label key={stage} className="flex items-center gap-3 cursor-pointer group">
                                                            <input
                                                                checked={selectedStages.includes(stage)}
                                                                className="rounded text-primary focus:ring-primary w-4 h-4"
                                                                type="checkbox"
                                                                onChange={() => toggleStage(stage)}
                                                            />
                                                            <span className="text-[13px] font-medium group-hover:text-primary transition">
                                                                {stage}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Lead Source */}
                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Lead Source</p>
                                                <select
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs py-2.5 px-3 focus:ring-primary outline-none"
                                                    value={selectedSource}
                                                    onChange={(e) => setSelectedSource(e.target.value)}
                                                >
                                                    <option>All Sources</option>
                                                    <option>LinkedIn</option>
                                                    <option>Organic Search</option>
                                                    <option>Referral</option>
                                                    <option>Website</option>
                                                    <option>Cold Call</option>
                                                </select>
                                            </div>

                                            {/* AI Priority */}
                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">AI Priority</p>
                                                <div className="space-y-2.5">
                                                    <button
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[11px] font-bold transition ${selectedPriority === "hot"
                                                            ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 border border-orange-200 dark:border-orange-500/20"
                                                            : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            }`}
                                                        onClick={() => setSelectedPriority(selectedPriority === "hot" ? null : "hot")}
                                                    >
                                                        <span className="material-symbols-outlined text-sm">local_fire_department</span> HOT LEADS
                                                    </button>
                                                    <button
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[11px] font-bold transition ${selectedPriority === "warm"
                                                            ? "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 border border-yellow-200 dark:border-yellow-500/20"
                                                            : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            }`}
                                                        onClick={() => setSelectedPriority(selectedPriority === "warm" ? null : "warm")}
                                                    >
                                                        <span className="material-symbols-outlined text-sm">wb_sunny</span> WARM
                                                    </button>
                                                    <button
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[11px] font-bold transition ${selectedPriority === "cold"
                                                            ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 border border-blue-200 dark:border-blue-500/20"
                                                            : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            }`}
                                                        onClick={() => setSelectedPriority(selectedPriority === "cold" ? null : "cold")}
                                                    >
                                                        <span className="material-symbols-outlined text-sm">ac_unit</span> COLD
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Leads Table/Kanban */}
                            <div className={viewMode === "grid" ? "col-span-1" : "col-span-7"}>
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full">
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Active Leads</h3>
                                            <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-500/10 text-blue-500 rounded-full">
                                                {filteredLeads.length} Total
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">
                                                Showing 1-{Math.min(10, filteredLeads.length)} of {filteredLeads.length}
                                            </span>
                                        </div>
                                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                            <button
                                                className={`p-1.5 rounded ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
                                                onClick={() => setViewMode("list")}
                                            >
                                                <span className={`material-symbols-outlined text-lg leading-none ${viewMode === "list" ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                                                    list
                                                </span>
                                            </button>
                                            <button
                                                className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
                                                onClick={() => setViewMode("grid")}
                                            >
                                                <span className={`material-symbols-outlined text-lg leading-none ${viewMode === "grid" ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                                                    grid_view
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Table View */}
                                    {viewMode === "list" && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                                        <th className="px-6 py-4">Lead Name</th>
                                                        <th className="px-6 py-4 text-center">Company</th>
                                                        <th className="px-6 py-4 text-center">Lead Stage</th>
                                                        <th className="px-6 py-4 text-right">AI Score</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {filteredLeads.slice(0, 10).map((lead) => (
                                                        <tr
                                                            key={lead.name}
                                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
                                                        >
                                                            <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/crm/${encodeURIComponent(lead.name)}`)}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                                        {lead.lead_name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[16px] font-semibold text-slate-900 dark:text-white">{lead.lead_name}</p>
                                                                        <p className="text-xs text-slate-400 font-medium">{lead.email_id}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center cursor-pointer" onClick={() => router.push(`/crm/${encodeURIComponent(lead.name)}`)}>
                                                                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                                                                    {lead.company_name || "Individual"}
                                                                </p>
                                                            </td>
                                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex justify-center">
                                                                    <select
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-0 transition-colors ${lead.status === "Converted"
                                                                            ? "cursor-not-allowed opacity-60"
                                                                            : "cursor-pointer"
                                                                            } ${getStageColor(lead.status)}`}
                                                                        value={lead.status}
                                                                        onChange={(e) => handleStatusChange(lead.name, e.target.value)}
                                                                        disabled={lead.status === "Converted"}
                                                                    >
                                                                        {LEAD_STAGES.map(stage => (
                                                                            <option key={stage} value={stage}>{stage}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/crm/${encodeURIComponent(lead.name)}`)}>
                                                                <div className="flex justify-end items-center gap-3">
                                                                    <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full ${lead.aiScore >= 75 ? "bg-emerald-500" : lead.aiScore >= 50 ? "bg-orange-500" : "bg-red-500"
                                                                                }`}
                                                                            style={{ width: `${lead.aiScore}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className={`text-xs font-bold ${lead.aiScore >= 75 ? "text-emerald-500" : lead.aiScore >= 50 ? "text-orange-500" : "text-red-500"
                                                                        }`}>
                                                                        {lead.aiScore}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Kanban View */}
                                    {viewMode === "grid" && (
                                        <div className="p-6 overflow-x-auto h-full">
                                            <div className="flex gap-6 min-w-max h-full">
                                                {LEAD_STAGES.map(stage => {
                                                    const stageLeads = filteredLeads.filter(l => l.status === stage)
                                                    return (
                                                        <div
                                                            key={stage}
                                                            className="flex flex-col gap-4 flex-shrink-0 w-80"
                                                            onDragOver={handleDragOver}
                                                            onDrop={() => handleDrop(stage)}
                                                        >
                                                            {/* Column Header */}
                                                            <div className="flex items-center justify-between px-2">
                                                                <h3 className="text-[12px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                                                    {stage} <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-[10px]">{stageLeads.length}</span>
                                                                </h3>
                                                                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                                                                    <span className="material-symbols-outlined text-lg">more_horiz</span>
                                                                </button>
                                                            </div>

                                                            {/* Lead Cards */}
                                                            <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-1">
                                                                {stageLeads.map(lead => {
                                                                    // Determine priority icon based on AI score
                                                                    const priorityIcon = lead.aiScore >= 75
                                                                        ? { icon: 'local_fire_department', color: 'text-orange-500' }
                                                                        : lead.aiScore >= 50
                                                                            ? { icon: 'wb_sunny', color: 'text-blue-400' }
                                                                            : { icon: 'ac_unit', color: 'text-slate-400' }

                                                                    const isConverted = lead.status === "Converted"

                                                                    return (
                                                                        <div
                                                                            key={lead.name}
                                                                            className={`bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition group ${isConverted ? 'opacity-60 cursor-not-allowed' : 'cursor-move'
                                                                                }`}
                                                                            draggable={!isConverted}
                                                                            onDragStart={(e) => handleDragStart(e, lead.name, lead.status)}
                                                                            onClick={(e) => {
                                                                                // Prevent navigation if dragging
                                                                                if (!draggedLead) {
                                                                                    router.push(`/crm/${encodeURIComponent(lead.name)}`)
                                                                                }
                                                                            }}
                                                                        >
                                                                            {/* Lead Header */}
                                                                            <div className="flex justify-between items-start mb-3">
                                                                                <div>
                                                                                    <h4 className="text-[16px] font-bold text-[#3b82f6] mb-0.5">{lead.lead_name}</h4>
                                                                                    <p className="text-[12px] text-slate-500 font-medium">{lead.company_name || 'Individual'}</p>
                                                                                </div>
                                                                                <span className={`material-symbols-outlined ${priorityIcon.color} text-lg`}>
                                                                                    {priorityIcon.icon}
                                                                                </span>
                                                                            </div>

                                                                            {/* AI Score Section */}
                                                                            <div className="flex items-center gap-3 mt-4">
                                                                                {/* Avatar or Initials */}
                                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                                                                                    {lead.lead_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                                                </div>

                                                                                {/* AI Score Bar */}
                                                                                <div className="flex-1">
                                                                                    <div className="flex justify-between items-center mb-1">
                                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">AI Score</span>
                                                                                        <span className={`text-[10px] font-bold ${lead.aiScore >= 75 ? 'text-emerald-500' :
                                                                                            lead.aiScore >= 50 ? 'text-orange-500' :
                                                                                                'text-red-500'
                                                                                            }`}>
                                                                                            {lead.aiScore}%
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                                        <div
                                                                                            className={`h-full rounded-full ${lead.aiScore >= 75 ? 'bg-emerald-500' :
                                                                                                lead.aiScore >= 50 ? 'bg-orange-500' :
                                                                                                    'bg-red-500'
                                                                                                }`}
                                                                                            style={{ width: `${lead.aiScore}%` }}
                                                                                        ></div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                                {stageLeads.length === 0 && (
                                                                    <div className="text-center py-8 text-sm text-slate-400">No leads</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* AI Insights Panel - Hidden in Kanban view */}
                            {viewMode === "list" && (
                                <div className="col-span-3">
                                    <div className="bg-[#111827] text-white rounded-xl shadow-xl overflow-hidden h-full flex flex-col border border-slate-800">
                                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-yellow-400">bolt</span>
                                                <h3 className="text-[11px] font-bold uppercase tracking-widest">AI Insights</h3>
                                            </div>
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                        </div>
                                        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                                            {/* Deal at Risk */}
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden group">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="material-symbols-outlined text-yellow-400 text-sm">warning</span>
                                                    <span className="text-[10px] font-bold uppercase text-yellow-400 tracking-tighter">Deal at Risk</span>
                                                </div>
                                                <h4 className="text-sm font-bold mb-2">Acme Corp HQ - Phase II</h4>
                                                <p className="text-[12px] text-slate-400 mb-5 leading-relaxed">
                                                    Decision maker hasn't opened proposal for 5 days. Competitive threat detected.
                                                </p>
                                                <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold py-3 rounded-lg text-xs transition uppercase tracking-wider">
                                                    Priority Outreach
                                                </button>
                                            </div>

                                            {/* Recommended Actions */}
                                            <div>
                                                <div className="flex justify-between items-center mb-5">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recommended Actions</p>
                                                    <button className="text-[10px] text-blue-400 font-bold hover:underline">VIEW ALL</button>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="bg-white/5 p-4 rounded-xl flex items-center gap-4 group cursor-pointer hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">
                                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                            <span className="material-symbols-outlined">alternate_email</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-bold">Follow up - Globtel</p>
                                                            <p className="text-[11px] text-slate-500 font-medium">High velocity activity.</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/5 p-4 rounded-xl flex items-center gap-4 group cursor-pointer hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">
                                                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                            <span className="material-symbols-outlined text-lg">check_circle_outline</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-bold">Contract - Urban</p>
                                                            <p className="text-[11px] text-slate-500 font-medium">Review is complete.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-white/[0.02] border-t border-white/10">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sales Velocity</span>
                                                <span className="text-xs font-bold text-emerald-500">+14.2%</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 italic font-medium">
                                                "Cycle time is accelerating by 2 days this month."
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>


                    </div>
                </main>
            </div>

            {/* Dark Mode Toggle */}
            <button
                className="fixed bottom-6 right-6 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary transition-all z-50 hover:scale-110 active:scale-95"
                onClick={() => {
                    document.documentElement.classList.toggle("dark")
                }}
            >
                <span className="material-symbols-outlined dark:hidden">dark_mode</span>
                <span className="material-symbols-outlined hidden dark:block text-yellow-400">light_mode</span>
            </button>

            <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>


            {/* Conversion Confirmation Dialog */}
            <Dialog open={isConversionDialogOpen} onOpenChange={setIsConversionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Convert to Opportunity?</DialogTitle>
                        <DialogDescription>
                            This will create a new <strong>Opportunity</strong> record from this Lead and mark the Lead as <strong>Converted</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-slate-500">
                            Do you want to proceed with creating an Opportunity?
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConversionDialogOpen(false)} disabled={isConverting}>
                            Cancel
                        </Button>
                        <Button onClick={confirmConversion} disabled={isConverting}>
                            {isConverting ? "Converting..." : "Yes, Convert"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
