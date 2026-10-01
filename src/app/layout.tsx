import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Layout } from "@/components/cookbook/layout"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth"

export const metadata: Metadata = {
  title: { default: "Forklore Feasts", template: "%s · Forklore Feasts" },
  description: "Gather around good food: RSVP to a supper, share what you’re bringing, and keep the recipes worth remembering.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <Layout>{children}</Layout>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
