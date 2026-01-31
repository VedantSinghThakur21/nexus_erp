// Widgets for right column: Intelligence Hub, Deal at Risk, Priority Actions, Market Velocity

export function IntelligenceHub() {
  return (
    <div className="bg-white rounded-xl shadow p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-sm">Intelligence Hub</span>
        <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5 ml-auto">AI COPILOT ACTIVE</span>
      </div>
    </div>
  );
}

export function DealAtRisk() {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-xl shadow p-5 mb-6">
      <div className="text-xs font-semibold text-yellow-700 mb-1">DEAL AT RISK</div>
      <div className="font-medium text-sm mb-1">Acme Corp HQ</div>
      <div className="text-xs text-gray-500 mb-2">Executive engagement has stalled. Pipeline health score dropped to <span className="text-red-600 font-bold">42/100</span>.</div>
      <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded shadow hover:bg-blue-700">Generate Outreach Strategy</button>
    </div>
  );
}

export function PriorityActions() {
  return (
    <div className="bg-white rounded-xl shadow p-5 mb-6">
      <div className="text-xs font-semibold text-gray-700 mb-2">PRIORITY ACTIONS</div>
      <ul className="space-y-2">
        <li className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 rounded px-2 py-0.5 text-xs">Follow up: Velocity Tech</span>
          <span className="text-xs text-gray-400 ml-auto">Proposal viewed 3x in last hour.</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 rounded px-2 py-0.5 text-xs">Executive Demo</span>
          <span className="text-xs text-gray-400 ml-auto">Confirm Stark Ent. scheduling.</span>
        </li>
      </ul>
    </div>
  );
}

export function MarketVelocity() {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="text-xs font-semibold text-gray-700 mb-2">MARKET VELOCITY <span className="text-green-600 ml-2">+14%</span></div>
      <div className="text-xs text-gray-500 italic">"Sales cycles are shortening by 2.4 days this quarter. High conversion probability for early Q4 close."</div>
    </div>
  );
}
