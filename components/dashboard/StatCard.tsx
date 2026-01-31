interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  color?: string;
}

export function StatCard({ title, value, subtext, trend, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-2 min-w-[180px]">
      <div className="text-xs text-gray-500 font-medium">{title}</div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend && <span className={`text-xs font-semibold ${color}`}>{trend}</span>}
      </div>
      {subtext && <div className="text-xs text-gray-400">{subtext}</div>}
    </div>
  );
}
