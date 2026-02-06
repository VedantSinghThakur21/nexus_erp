"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOperator } from "@/app/actions/operators";
import Link from "next/link";

export default function NewOperatorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    designation: "Operator",
    phone: "",
    email: "",
    license_number: "",
    license_expiry: "",
    date_of_joining: new Date().toISOString().split("T")[0],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.first_name.trim()) {
        throw new Error("First name is required");
      }
      if (!formData.designation) {
        throw new Error("Designation is required");
      }

      // Create FormData object for server action
      const fd = new FormData();
      fd.append("first_name", formData.first_name);
      fd.append("last_name", formData.last_name);
      fd.append("designation", formData.designation);
      fd.append("phone", formData.phone);
      fd.append("email", formData.email);
      fd.append("license_number", formData.license_number);
      fd.append("license_expiry", formData.license_expiry);
      fd.append("date_of_joining", formData.date_of_joining);

      const result = await createOperator(fd);

      if (result.error) {
        throw new Error(result.error);
      }

      // Success - redirect to operators page
      router.push("/operators");
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create operator";
      setError(errorMessage);
      console.error("Error creating operator:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-navy-deep border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/operators">
            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add Operator</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Create a new crew member</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              Alex Thompson
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Sales Admin</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            AT
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          {/* Form Card */}
          <div className="bg-white dark:bg-navy-deep border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                    error
                  </span>
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-300">Error</p>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Personal Information Section */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">person</span>
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="John"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white dark:placeholder:text-slate-500 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white dark:placeholder:text-slate-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white dark:placeholder:text-slate-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white dark:placeholder:text-slate-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Date of Joining
                    </label>
                    <input
                      type="date"
                      name="date_of_joining"
                      value={formData.date_of_joining}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Designation <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="designation"
                      value={formData.designation}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white transition-all"
                      required
                    >
                      <option value="Operator">Operator</option>
                      <option value="Driver">Driver</option>
                      <option value="Rigger">Rigger</option>
                      <option value="Foreman">Foreman</option>
                      <option value="Technician">Technician</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* License Information Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">badge</span>
                  License Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      name="license_number"
                      value={formData.license_number}
                      onChange={handleInputChange}
                      placeholder="DL-2024-001234"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white dark:placeholder:text-slate-500 transition-all"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Operator or equipment license number
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      License Expiry Date
                    </label>
                    <input
                      type="date"
                      name="license_expiry"
                      value={formData.license_expiry}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white transition-all"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      License validity date
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4 justify-end">
                <Link href="/operators">
                  <button
                    type="button"
                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-primary hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {loading ? "hourglass_empty" : "person_add"}
                  </span>
                  {loading ? "Creating..." : "Add Operator"}
                </button>
              </div>
            </form>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
              info
            </span>
            <div className="text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-300">Tip</p>
              <p className="text-blue-700 dark:text-blue-400 mt-1">
                Once created, operators can be assigned to projects and their efficiency will be tracked
                by our AI-driven workforce intelligence system.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white dark:bg-navy-deep border-t border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center mt-auto">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-[12px] text-emerald-500 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              AI Engine Online
            </span>
            <span className="text-[12px] text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-6">
              Global Sync Interval: 120s
            </span>
            <span className="text-[12px] text-slate-400">Last sync: 2 minutes ago</span>
          </div>
          <div className="text-[12px] text-slate-400 font-medium">AVARIQ v2.4.0-intelligence</div>
        </footer>
      </main>
    </div>
  );
}
