import { getBookings } from "@/app/actions/bookings"
import { BookingsClient } from "@/components/bookings/bookings-client"

export const dynamic = 'force-dynamic'

export default async function BookingsPage() {
  const bookings = await getBookings()

  return <BookingsClient bookings={bookings} />
}

