"use client"

import { useState } from "react"
import { setupCrmMasterData } from "@/app/actions/setup-crm"

export function CrmSetupSection() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    results?: any
  } | null>(null)

  const handleSetup = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const setupResult = await setupCrmMasterData()
      
      if (setupResult.success && setupResult.results) {
        const { opportunityTypes, salesStages } = setupResult.results
        const totalCreated = opportunityTypes.created + salesStages.created
        const totalExisting = opportunityTypes.existing + salesStages.existing
        
        setResult({
          success: true,
          message: `Created ${totalCreated} records, ${totalExisting} already existed`,
          results: setupResult.results
        })
      } else {
        setResult({
          success: false,
          message: setupResult.error || 'Setup failed'
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white mb-6">
          <span className="material-symbols-outlined text-slate-400">settings_suggest</span>
          <h2 className="font-semibold text-base">CRM Setup</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
              Initialize CRM Master Data
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Set up default Opportunity Types and Sales Stages for your CRM module. 
              This creates standard values like &quot;Sales&quot;, &quot;Rental&quot;, &quot;Prospecting&quot;, &quot;Qualification&quot;, etc.
            </p>
          </div>

          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                <span className={`material-symbols-outlined text-lg ${
                  result.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {result.success ? 'check_circle' : 'error'}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    result.success ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'
                  }`}>
                    {result.message}
                  </p>
                  {result.success && result.results && (
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <div>
                        Opportunity Types: {result.results.opportunityTypes.created} created, 
                        {' '}{result.results.opportunityTypes.existing} already existed
                        {result.results.opportunityTypes.failed > 0 && 
                          `, ${result.results.opportunityTypes.failed} failed`}
                      </div>
                      <div>
                        Sales Stages: {result.results.salesStages.created} created, 
                        {' '}{result.results.salesStages.existing} already existed
                        {result.results.salesStages.failed > 0 && 
                          `, ${result.results.salesStages.failed} failed`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSetup}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Setting up...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                Run CRM Setup
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
