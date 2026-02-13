import Navbar from "@/components/website/Navbar";
import Hero from "@/components/website/Hero";
import RadarAI from "@/components/website/RadarAI";
import Features from "@/components/website/Features";
import Architecture from "@/components/website/Architecture";
import Pricing from "@/components/website/Pricing";
import CTASection from "@/components/website/CTASection";
import Footer from "@/components/website/Footer";
import { AuroraBackground } from "@/components/aurora-background";

/**
 * Marketing site landing page (avariq.in)
 * Rendered when middleware rewrites root domain requests to /_site
 */
export default function LandingPage() {
  return (
    <div
      suppressHydrationWarning
      className="landing-page min-h-screen text-neutral-200 overflow-x-hidden antialiased relative"
    >
      <AuroraBackground className="fixed inset-0 -z-10 !h-screen !w-screen" />

      <div className="noise-overlay" />

      {/* Page Content */}
      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <RadarAI />
          <Features />
          <Architecture />
          <Pricing />
          <CTASection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
