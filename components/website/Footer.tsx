import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity"
        >
          <div className="w-4 h-4 bg-white/20" />
          <span className="font-bold text-white tracking-tighter">NEXUS</span>
        </Link>
        <div className="text-neutral-600 text-sm font-mono">
          © 2026 Avariq Systems
        </div>
      </div>
    </footer>
  );
}
