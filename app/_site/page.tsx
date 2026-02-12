import Navbar from "@/components/website/Navbar";
import Hero from "@/components/website/Hero";
import RadarAI from "@/components/website/RadarAI";
import Features from "@/components/website/Features";
import Architecture from "@/components/website/Architecture";
import Pricing from "@/components/website/Pricing";
import CTASection from "@/components/website/CTASection";
import Footer from "@/components/website/Footer";

/**
 * Marketing site landing page (avariq.in)
 * Rendered when middleware rewrites root domain requests to /_site
 */
export default function LandingPage() {
  return (
    <div
      suppressHydrationWarning
      className="landing-page min-h-screen bg-[#050505] text-neutral-200 overflow-x-hidden antialiased"
    >
      <div className="noise-overlay" />
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
  );
}
