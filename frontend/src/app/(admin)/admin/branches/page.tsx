"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

interface Branch {
  branchId: string;
  name: string;
  address: string;
  phone: string;
  _count?: {
    employees: number;
    inventory: number;
    orders: number;
  };
}

interface BranchForm {
  name: string;
  address: string;
  phone: string;
}

const emptyForm: BranchForm = {
  name: "",
  address: "",
  phone: "",
};

async function responseMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  if (Array.isArray(body?.message)) return body.message.join(" ");
  return body?.message || fallback;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    const response = await authenticatedFetch("/admin/branches", {
      cache: "no-store",
    });
    if (!response) {
      setLoading(false);
      return;
    }
    if (!response.ok) {
      setFeedback({
        message: await responseMessage(response, "Unable to load branches."),
        type: "error",
      });
      setLoading(false);
      return;
    }
    setBranches((await response.json()) as Branch[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return branches;
    return branches.filter((branch) =>
      [branch.name, branch.address, branch.phone].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [branches, search]);

  const totals = useMemo(
    () =>
      branches.reduce(
        (result, branch) => {
          const counts = branch._count ?? {
            employees: 0,
            inventory: 0,
            orders: 0,
          };
          return {
            employees: result.employees + counts.employees,
            inventory: result.inventory + counts.inventory,
            orders: result.orders + counts.orders,
          };
        },
        { employees: 0, inventory: 0, orders: 0 },
      ),
    [branches],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const beginEdit = (branch: Branch) => {
    setEditingId(branch.branchId);
    setForm({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
    });
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const response = await authenticatedFetch(
      editingId ? `/admin/branches/${editingId}` : "/admin/branches",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    if (!response) {
      setSaving(false);
      return;
    }
    if (!response.ok) {
      setFeedback({
        message: await responseMessage(
          response,
          editingId ? "Unable to update branch." : "Unable to add branch.",
        ),
        type: "error",
      });
      setSaving(false);
      return;
    }

    setFeedback({
      message: editingId
        ? "Branch updated successfully."
        : "Branch added successfully.",
      type: "success",
    });
    resetForm();
    await loadBranches();
    setSaving(false);
  };

  const inputClass =
    "w-full rounded border border-white/10 bg-[#121212] px-3 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-[#555] focus:border-white/30";
  const labelClass =
    "block text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]";

  return (
    <div className="space-y-8 text-[#f5f5f7]">
      {feedback && (
        <div
          className={`fixed right-8 top-24 z-[100] max-w-sm rounded border px-5 py-3 text-xs font-bold shadow-2xl ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-[#0d1f14] text-emerald-300"
              : "border-red-500/40 bg-[#271010] text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#8e8e93]">
            Operations Network
          </p>
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-white">
            Branch Management
          </h1>
          <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-[#707070]">
            Branches are shared by employee assignments, inventory stock, and
            order processing.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Branches", value: branches.length },
            { label: "Employees", value: totals.employees },
            { label: "Stock Nodes", value: totals.inventory },
            { label: "Orders", value: totals.orders },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-md border border-white/10 bg-[#0d0d0d] px-5 py-3"
            >
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]">
                {stat.label}
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-white">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <form
        onSubmit={submitBranch}
        className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-6"
      >
        <div className="mb-6 flex items-center justify-between border-b border-white/[0.05] pb-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
              {editingId ? "Edit Branch" : "Add Branch"}
            </h2>
            <p className="mt-2 text-[9px] text-[#666]">
              Changes are saved directly to the branch database table.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-[10px] font-bold uppercase tracking-widest text-[#8e8e93] transition-colors hover:text-white"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1fr_1.6fr_1fr_auto]">
          <label className="space-y-2">
            <span className={labelClass}>Branch Name</span>
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="e.g. Delkanda"
              className={inputClass}
            />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Address</span>
            <input
              required
              minLength={5}
              value={form.address}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              placeholder="Branch street address"
              className={inputClass}
            />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Phone</span>
            <input
              required
              minLength={7}
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              placeholder="+94 77 123 4567"
              className={inputClass}
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded bg-white px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Add Branch"}
            </button>
          </div>
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0a0a]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] p-5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
              Branch Directory
            </h2>
            <p className="mt-2 text-[9px] text-[#666]">
              Relationship counts are calculated from live database records.
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search branches..."
              className="w-full rounded border border-white/10 bg-[#121212] py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-[#555] focus:border-white/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-[#080808]">
              <tr className="border-b border-white/[0.06]">
                {[
                  "Branch",
                  "Phone",
                  "Address",
                  "Employees",
                  "Stock Nodes",
                  "Orders",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4 text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredBranches.map((branch) => (
                <tr
                  key={branch.branchId}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-white">
                      {branch.name}
                    </div>
                    <div className="mt-1 font-mono text-[9px] text-[#555]">
                      {branch.branchId.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-white">
                    {branch.phone}
                  </td>
                  <td className="max-w-sm px-5 py-4 text-[10px] leading-relaxed text-[#b0b0b0]">
                    {branch.address}
                  </td>
                  {[
                    branch._count?.employees ?? 0,
                    branch._count?.inventory ?? 0,
                    branch._count?.orders ?? 0,
                  ].map((count, index) => (
                    <td
                      key={`${branch.branchId}-${index}`}
                      className="px-5 py-4 font-mono text-xs font-bold text-white"
                    >
                      {count}
                    </td>
                  ))}
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => beginEdit(branch)}
                      className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredBranches.length === 0 && (
          <div className="px-6 py-16 text-center text-[10px] font-bold uppercase tracking-widest text-[#555]">
            {search
              ? "No branches match this search."
              : "No branches added yet."}
          </div>
        )}
        {loading && (
          <div className="px-6 py-16 text-center text-[10px] font-bold uppercase tracking-widest text-[#8e8e93]">
            Loading branches...
          </div>
        )}
      </section>
    </div>
  );
}
