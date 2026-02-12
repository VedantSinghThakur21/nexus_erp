/**
 * Marketing site layout — no sidebar, no tenant guard.
 * Clean layout for landing, login, signup pages.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
