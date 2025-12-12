import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import SocialProof from "@/components/landing/SocialProof";
import HeadlessAdvantage from "@/components/landing/HeadlessAdvantage";
import AgenticAI from "@/components/landing/AgenticAI";
import BentoFeatures from "@/components/landing/BentoFeatures";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <SocialProof />
        <HeadlessAdvantage />
        <AgenticAI />
        <BentoFeatures />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
