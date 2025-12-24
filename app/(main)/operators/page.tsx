import { getOperators } from "@/app/actions/operators"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CreateOperatorDialog } from "@/components/operators/create-operator-dialog"
import { HardHat, Phone } from "lucide-react"

export default async function OperatorsPage() {
  const operators = await getOperators()

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Operators</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage drivers, riggers, and field staff</p>
        </div>
        <CreateOperatorDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {operators.length === 0 ? (
           <div className="col-span-full p-12 text-center border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
             <div className="flex justify-center mb-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <HardHat className="h-6 w-6 text-slate-400" />
                </div>
             </div>
             <p className="text-slate-500">No operators found. Add your first crew member.</p>
           </div>
        ) : (
           operators.map((op) => (
            <Card key={op.name} className="group hover:shadow-md transition-all border-slate-200 dark:border-slate-800">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-slate-100">
                                <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
                                    {op.employee_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{op.employee_name}</h3>
                                <p className="text-sm text-slate-500">{op.designation}</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {op.status}
                        </Badge>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {op.cell_number || "—"}
                        </div>
                        <span className="font-mono text-xs text-slate-400">{op.name}</span>
                    </div>
                </CardContent>
            </Card>
           ))
        )}
      </div>
    </div>
  )
}

