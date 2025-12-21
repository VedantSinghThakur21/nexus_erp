'use client'

import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"
import { returnAsset } from "@/app/actions/bookings"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function BookingActions({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleReturn = async () => {
    if (!confirm("Are you sure you want to return this asset? This will mark the booking as completed.")) {
      return
    }
    
    setLoading(true)
    const result = await returnAsset(bookingId)
    
    if (result.success) {
      // Redirect to bookings list and refresh
      router.push('/bookings')
      router.refresh()
    } else {
      alert("Error: " + (result.error || "Failed to return asset"))
      setLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleReturn} 
      disabled={loading}
      className="bg-green-600 hover:bg-green-700 text-white gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      Return Asset
    </Button>
  )
}

