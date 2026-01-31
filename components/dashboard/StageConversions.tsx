export function StageConversions() {
  return (
    <div className="bg-white rounded-xl shadow p-5 mb-6">
      <div className="text-xs font-semibold text-gray-700 mb-2">Stage Conversions</div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Lead to SQL</span>
            <span>34%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600" style={{ width: '34%' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>SQL to Proposal</span>
            <span>18%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400" style={{ width: '18%' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Proposal to Win</span>
            <span>42%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: '42%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
