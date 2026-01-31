interface Opportunity {
  initials: string;
  account: string;
  stage: string;
  value: number;
  confidence: number;
}

export function OpportunitiesTable({ data }: { data: Opportunity[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-gray-500">
          <th className="text-left py-2">Account Name</th>
          <th className="text-left py-2">Stage</th>
          <th className="text-right py-2">Contract Value</th>
          <th className="text-right py-2">Confidence Score</th>
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.account} className="border-t">
            <td className="py-2 flex items-center gap-2">
              <span className="bg-gray-100 rounded-full w-7 h-7 flex items-center justify-center font-bold text-gray-600">{row.initials}</span>
              {row.account}
            </td>
            <td className="py-2">{row.stage}</td>
            <td className="py-2 text-right font-medium">${row.value.toLocaleString()}</td>
            <td className="py-2 text-right">
              <span className={`font-semibold ${row.confidence > 80 ? "text-green-600" : row.confidence > 60 ? "text-blue-600" : "text-yellow-600"}`}>
                {row.confidence}%
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
