import Navbar from "@/components/website/Navbar";
import Hero from "@/components/website/Hero";
import RadarAI from "@/components/website/RadarAI";
import Features from "@/components/website/Features";
import Architecture from "@/components/website/Architecture";
import Pricing from "@/components/website/Pricing";
import CTASection from "@/components/website/CTASection";
import Footer from "@/components/website/Footer";
import { UnicornBackground } from "@/components/unicorn-background";

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
      {/* Unicorn Studio WebGL Animated Background (z-index: -10) */}
      <UnicornBackground projectId="bmaMERjX2VZDtPrh4Zwx" />

      {/* Translucent Overlay for "Frosted Glass" effect (z-index: -5) */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] -z-[5] pointer-events-none" />

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
