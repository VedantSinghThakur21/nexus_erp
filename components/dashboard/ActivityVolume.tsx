export function ActivityVolume() {
  return (
    <div className="bg-white rounded-xl shadow p-5 mb-6">
      <div className="text-xs font-semibold text-gray-700 mb-2">Activity Volume</div>
      <div className="flex items-end gap-2 h-24">
        {/* Example bar heights for each day */}
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
          <div key={day} className="flex flex-col items-center justify-end flex-1">
            <div className={`w-6 rounded-t-lg ${i === 3 ? 'bg-blue-600' : 'bg-gray-200'}`} style={{ height: [30, 40, 50, 70, 35, 20, 15][i] }} />
            <span className="text-[10px] text-gray-400 mt-1">{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
