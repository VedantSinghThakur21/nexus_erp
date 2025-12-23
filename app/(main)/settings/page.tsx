import { getProfile, getTeam, getTaxTemplates } from "@/app/actions/settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { InviteUserDialog } from "@/components/settings/invite-user-dialog"
import { CreateTaxTemplateDialog } from "@/components/settings/create-tax-template-dialog"
import { Receipt } from "lucide-react"

export default async function SettingsPage() {
  const profile = await getProfile()
  const team = await getTeam()
  const taxTemplates = await getTaxTemplates()

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto" suppressHydrationWarning>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your profile and team</p>
        </div>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader><CardTitle>My Profile</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-2 border-slate-100">
                <AvatarFallback className="text-xl bg-blue-100 text-blue-700">
                    {profile?.first_name?.[0]}
                </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{profile?.full_name}</h3>
                <p className="text-slate-500">{profile?.name}</p>
                <div className="pt-2">
                    <Badge variant="outline" className="bg-slate-50 border-slate-200">
                        {profile?.role_profile_name || "System User"}
                    </Badge>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Team Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Team Members</h2>
            <InviteUserDialog />
        </div>

        <div className="grid gap-4">
            {team.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    No team members found. Invite someone!
                </div>
            ) : (
                team.map((user) => (
                    <Card key={user.name} className="flex items-center justify-between p-4 hover:shadow-sm transition-shadow border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarFallback className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    {user.first_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">{user.full_name}</p>
                                <p className="text-xs text-slate-500">{user.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="hidden sm:inline-flex bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {user.role_profile_name || "User"}
                            </Badge>
                            <span className={`h-2.5 w-2.5 rounded-full ${user.enabled ? 'bg-green-500' : 'bg-red-500'}`} title={user.enabled ? "Active" : "Disabled"} />
                        </div>
                    </Card>
                ))
            )}
        </div>
      </div>

      {/* Tax Templates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tax Templates</h2>
            <CreateTaxTemplateDialog />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
            {taxTemplates.length === 0 ? (
                <div className="col-span-2 p-8 text-center text-slate-500 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No tax templates found</p>
                    <p className="text-sm mt-1">Create your first tax template to apply taxes to quotations</p>
                </div>
            ) : (
                taxTemplates.map((template) => (
                    <Card key={template.name} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 dark:text-white">
                                        {template.title || template.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">{template.company}</p>
                                </div>
                                {template.is_default === 1 && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                        Default
                                    </Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
      </div>
    </div>
  )
}
