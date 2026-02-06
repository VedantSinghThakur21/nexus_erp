"use client";

import { useEffect, useState } from "react";
import { getProfile, getTeam, getTaxTemplates, getCompany, getBankAccounts } from "@/app/actions/settings";
import { InviteUserDialog } from "@/components/settings/invite-user-dialog";
import { CreateTaxTemplateDialog } from "@/components/settings/create-tax-template-dialog";
import { EditCompanyDialog } from "@/components/settings/edit-company-dialog";
import { CreateBankAccountDialog } from "@/components/settings/create-bank-account-dialog";

interface User {
  name: string;
  full_name: string;
  role_profile_name?: string;
  enabled: number;
  email?: string;
  first_name?: string;
}

interface TaxTemplate {
  name: string;
  title: string;
  company: string;
  is_default?: number;
}

interface Company {
  name: string;
  company_name?: string;
  abbr: string;
  tax_id?: string;
  country?: string;
}

interface BankAccount {
  name: string;
  bank: string;
  bank_account_no: string;
  branch_code?: string;
  is_default?: number;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<User | null>(null);
  const [team, setTeam] = useState<User[]>([]);
  const [taxTemplates, setTaxTemplates] = useState<TaxTemplate[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial theme
    setIsDark(document.documentElement.classList.contains("dark"));

    // Load all data
    Promise.all([
      getProfile().catch(() => null),
      getTeam().catch(() => []),
      getTaxTemplates().catch(() => []),
      getCompany().catch(() => null),
      getBankAccounts().catch(() => []),
    ]).then(([profileData, teamData, taxData, companyData, bankData]) => {
      setProfile(profileData);
      setTeam(teamData);
      setTaxTemplates(taxData);
      setCompany(companyData);
      setBankAccounts(bankData);
      setLoading(false);
    });
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500 dark:text-slate-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <main className="w-full min-h-screen overflow-y-auto bg-slate-50 dark:bg-midnight-blue">
      {/* Header */}
      <header className="p-8 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage your organization, profile, and team settings
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              View Logs
            </button>
            <button className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </header>

      <div className="p-8 pt-4 w-full space-y-6">
        {/* Smart Configuration Assistant Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Smart Configuration Assistant</h3>
                <p className="text-blue-100 text-sm opacity-90">
                  AI-driven insights help you optimize your organizational workflow.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right mr-2">
                <span className="text-xs text-blue-200 block uppercase font-semibold">Activity Trend</span>
                <div className="flex gap-1 items-end h-6 mt-1">
                  <div className="w-1 bg-white/30 h-2 rounded-full"></div>
                  <div className="w-1 bg-white/50 h-4 rounded-full"></div>
                  <div className="w-1 bg-white h-5 rounded-full"></div>
                  <div className="w-1 bg-white/40 h-3 rounded-full"></div>
                  <div className="w-1 bg-white h-6 rounded-full"></div>
                </div>
              </div>
              <button className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-50 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">security</span>
                Audit Security
              </button>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
            <svg className="h-full w-full" viewBox="0 0 100 100">
              <path d="M0,50 Q25,0 50,50 T100,50" fill="none" stroke="white" strokeWidth="2"></path>
              <path d="M0,60 Q25,10 50,60 T100,60" fill="none" stroke="white" strokeWidth="2"></path>
            </svg>
          </div>
        </div>

        {/* KPI Cards - Matching Leads Page Styling */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl">
            <span className="text-slate-400 text-[12px] font-bold tracking-widest uppercase">
              Team Size
            </span>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-bold text-white leading-none">{team.length}</span>
              <span className="text-emerald-400 text-[12px] flex items-center gap-1 font-medium bg-emerald-400/10 px-2 py-1 rounded-full">
                <span className="material-symbols-outlined text-[12px]">trending_up</span>
                +{team.filter((u) => u.enabled).length}
              </span>
            </div>
          </div>
          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[12px] font-bold tracking-widest uppercase">
                System Health
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-bold text-white leading-none">99.8%</span>
              <span className="text-slate-500 text-[12px]">Uptime</span>
            </div>
          </div>
          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl">
            <span className="text-slate-400 text-[12px] font-bold tracking-widest uppercase">
              Security Score
            </span>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-bold text-white leading-none">A+</span>
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full border-2 border-[#111827] bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white">
                  MFA
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-[#111827] bg-indigo-500 flex items-center justify-center text-[8px] font-bold text-white">
                  SSL
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <section className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white mb-6">
              <span className="material-symbols-outlined text-slate-400">palette</span>
              <h2 className="font-semibold text-base">Appearance</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">Theme</h3>
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Under Development
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Switch between light and dark mode
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                  isDark ? "bg-primary" : "bg-slate-200"
                }`}
              >
                <span className="sr-only">Toggle theme</span>
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform flex items-center justify-center ${
                    isDark ? "translate-x-7" : "translate-x-1"
                  }`}
                >
                  {isDark ? (
                    <span className="material-symbols-outlined text-[16px] text-blue-600">
                      dark_mode
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px] text-amber-500">
                      light_mode
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* My Profile Section */}
        <section className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
              My Profile
            </h2>
            {profile ? (
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-100 dark:bg-navy-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold text-xl">
                  {getInitials(profile.first_name || profile.full_name)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {profile.full_name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{profile.name}</p>
                  <div className="mt-2">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                      {profile.role_profile_name || "System User"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Please log in to view your profile.
              </p>
            )}
          </div>
        </section>

        {/* Company Settings */}
        <section className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-slate-400">business</span>
              <h2 className="font-semibold text-base">Company Settings</h2>
            </div>
            {company && <EditCompanyDialog company={company} />}
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {company ? (
              <>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Company Name
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {company.company_name || company.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      GSTIN
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {company.tax_id || "Not Set"}
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Abbreviation
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{company.abbr}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Country
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {company.country || "Not Set"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="col-span-2 p-8 text-center text-slate-500 border-dashed border-2 rounded-xl">
                <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-3">
                  business
                </span>
                <p className="font-semibold">No company found</p>
                <p className="text-sm mt-1">Company needs to be set up in ERPNext first</p>
              </div>
            )}
          </div>
        </section>

        {/* Bank Accounts */}
        <section className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-slate-400">account_balance</span>
              <h2 className="font-semibold text-base">Bank Accounts</h2>
            </div>
            <CreateBankAccountDialog />
          </div>
          <div className="px-6 pb-6">
            {bankAccounts.length === 0 ? (
              <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl py-12 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-slate-200 dark:text-slate-700 text-6xl mb-4">
                  account_balance
                </span>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  No bank accounts found
                </h4>
                <p className="text-[12px] text-slate-500 mt-1">
                  Add your first bank account for invoices and quotations
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bankAccounts.map((account) => (
                  <div
                    key={account.name}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            Bank Name
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {account.bank}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            Account Number
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {account.bank_account_no}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            IFSC Code
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {account.branch_code || "—"}
                          </p>
                        </div>
                      </div>
                      {account.is_default === 1 && (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Team Members */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">groups</span>
              Team Members
            </h2>
            <InviteUserDialog />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {team.length === 0 ? (
              <div className="p-8 text-center text-slate-500 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                No team members found. Invite someone!
              </div>
            ) : (
              team.map((user) => (
                <div
                  key={user.name}
                  className={`bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow ${
                    user.role_profile_name?.includes("Admin") ? "border-l-4 border-l-red-500" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-navy-800 rounded-full flex items-center justify-center text-slate-400 font-bold">
                      {getInitials(user.first_name || user.full_name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-primary">{user.full_name}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                            user.role_profile_name?.includes("Admin")
                              ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                              : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              user.role_profile_name?.includes("Admin")
                                ? "bg-red-500"
                                : "bg-emerald-500"
                            }`}
                          ></span>
                          {user.role_profile_name || "User"}
                        </span>
                        {user.role_profile_name?.includes("Admin") && (
                          <span className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded flex items-center gap-1 border border-blue-100 dark:border-blue-800">
                            <span className="material-symbols-outlined text-[12px]">info</span>
                            MFA Recommended for Admins
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400">{user.name}</p>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Tax Templates */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">description</span>
              Tax Templates
            </h2>
            <CreateTaxTemplateDialog />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {taxTemplates.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-500 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-3">
                  description
                </span>
                <p className="font-semibold">No tax templates found</p>
                <p className="text-sm mt-1">Create your first tax template to apply taxes to quotations</p>
              </div>
            ) : (
              taxTemplates.map((template) => (
                <div
                  key={template.name}
                  className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {template.title || template.name}
                  </h4>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                    {template.company}
                  </p>
                  {template.is_default === 1 && (
                    <span className="inline-block mt-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Default
                    </span>
                  )}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="h-12"></div>
      </div>
    </main>
  );
}

