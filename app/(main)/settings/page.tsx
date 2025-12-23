import { getProfile, getTeam, getTaxTemplates, getCompany, getBankAccounts } from "@/app/actions/settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { InviteUserDialog } from "@/components/settings/invite-user-dialog"
import { CreateTaxTemplateDialog } from "@/components/settings/create-tax-template-dialog"
import { EditCompanyDialog } from "@/components/settings/edit-company-dialog"
import { CreateBankAccountDialog } from "@/components/settings/create-bank-account-dialog"
import { Receipt, Building2, Landmark } from "lucide-react"

export default async function SettingsPage() {
  const profile = await getProfile()
  const team = await getTeam()
  const taxTemplates = await getTaxTemplates()
  const company = await getCompany()
  const bankAccounts = await getBankAccounts()

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

      {/* Company Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Settings
          </h2>
          {company && <EditCompanyDialog company={company} />}
        </div>

        {company ? (
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Company Name</p>
                  <p className="font-medium text-slate-900 dark:text-white">{company.company_name || company.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Abbreviation</p>
                  <p className="font-medium text-slate-900 dark:text-white">{company.abbr}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">GSTIN</p>
                  <p className="font-medium text-slate-900 dark:text-white">{company.tax_id || "Not Set"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Country</p>
                  <p className="font-medium text-slate-900 dark:text-white">{company.country || "Not Set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-8 text-center text-slate-500 border-dashed">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>No company found</p>
            <p className="text-sm mt-1">Company needs to be set up in ERPNext first</p>
          </Card>
        )}
      </div>

      {/* Bank Accounts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Bank Accounts
          </h2>
          <CreateBankAccountDialog />
        </div>

        <div className="grid gap-4">
          {bankAccounts.length === 0 ? (
            <Card className="p-8 text-center text-slate-500 border-dashed">
              <Landmark className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No bank accounts found</p>
              <p className="text-sm mt-1">Add your first bank account for invoices and quotations</p>
            </Card>
          ) : (
            bankAccounts.map((account) => (
              <Card key={account.name} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Bank Name</p>
                        <p className="font-medium text-slate-900 dark:text-white">{account.bank}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Account Number</p>
                        <p className="font-medium text-slate-900 dark:text-white">{account.bank_account_no}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">IFSC Code</p>
                        <p className="font-medium text-slate-900 dark:text-white">{account.branch_code || "—"}</p>
                      </div>
                    </div>
                    {account.is_default === 1 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
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
