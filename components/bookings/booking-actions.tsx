'use client'

import { Button } from "@/components/ui/button"
import { Truck, CheckCircle2, Loader2 } from "lucide-react"
import { mobilizeAsset, returnAsset } from "@/app/actions/bookings"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function BookingActions({ booking }: { booking: any }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAction = async (action: 'mobilize' | 'return') => {
    setLoading(true)
    const res = action === 'mobilize' 
      ? await mobilizeAsset(booking.name)
      : await returnAsset(booking.name)
    
    setLoading(false)
    if (res.success) {
      router.refresh()
    } else {
      alert("Error: " + res.error)
    }
  }

  // Logic: 
  // If not delivered (0%), show "Mobilize"
  // If delivered (100%) but not completed, show "Return"
  
  const isMobilized = booking.per_delivered >= 100;
  const isCompleted = booking.status === 'Completed' || booking.status === 'Cancelled';

  if (isCompleted) return null;

  return (
    <div className="flex gap-2">
        {!isMobilized ? (
            <Button 
                onClick={() => handleAction('mobilize')} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                Mobilize (Send to Site)
            </Button>
        ) : (
            <Button 
                onClick={() => handleAction('return')} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Return Asset
            </Button>
        )}
    </div>
  )
}
