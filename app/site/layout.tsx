/**
 * Marketing site layout — no sidebar, no tenant guard.
 * Clean layout for landing, login, signup pages.
 * Inherits from root layout (fonts, theme, providers).
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
