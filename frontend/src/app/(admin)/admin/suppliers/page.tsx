"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

type SupplierStatus = "Active" | "Inactive";

interface Supplier {
  supplierId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
}

interface SupplierForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  status: SupplierStatus;
}

const emptyForm: SupplierForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  status: "Active",
};

async function responseMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;
  if (Array.isArray(body?.message)) return body.message.join(" ");
  return body?.message || fallback;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    const response = await authenticatedFetch("/admin/suppliers");
    if (!response) {
      setLoading(false);
      return;
    }
    if (!response.ok) {
      setFeedback({
        message: await responseMessage(response, "Unable to load suppliers."),
        type: "error",
      });
      setLoading(false);
      return;
    }
    setSuppliers((await response.json()) as Supplier[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.email, supplier.phone, supplier.address].some(
        (value) => value.toLowerCase().includes(query),
      ),
    );
  }, [search, suppliers]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const beginEdit = (supplier: Supplier) => {
    setEditingId(supplier.supplierId);
    setForm({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      status: supplier.status,
    });
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const response = await authenticatedFetch(
      editingId ? `/admin/suppliers/${editingId}` : "/admin/suppliers",
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
          editingId ? "Unable to update supplier." : "Unable to add supplier.",
        ),
        type: "error",
      });
      setSaving(false);
      return;
    }

    setFeedback({
      message: editingId
        ? "Supplier updated successfully."
        : "Supplier added successfully.",
      type: "success",
    });
    resetForm();
    await loadSuppliers();
    setSaving(false);
  };

  const toggleStatus = async (supplier: Supplier) => {
    const status: SupplierStatus =
      supplier.status === "Active" ? "Inactive" : "Active";
    setFeedback(null);
    const response = await authenticatedFetch(
      `/admin/suppliers/${supplier.supplierId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );
    if (!response) return;
    if (!response.ok) {
      setFeedback({
        message: await responseMessage(
          response,
          "Unable to change supplier status.",
        ),
        type: "error",
      });
      return;
    }
    setSuppliers((current) =>
      current.map((item) =>
        item.supplierId === supplier.supplierId ? { ...item, status } : item,
      ),
    );
    setFeedback({
      message: `${supplier.name} is now ${status.toLowerCase()}.`,
      type: "success",
    });
  };

  const activeCount = suppliers.filter(
    (supplier) => supplier.status === "Active",
  ).length;

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
            Supply Network
          </p>
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-white">
            Supplier Management
          </h1>
        </div>
        <div className="flex gap-3">
          <div className="rounded-md border border-white/10 bg-[#0d0d0d] px-5 py-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]">
              Total
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-white">
              {suppliers.length}
            </div>
          </div>
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-5 py-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
              Active
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-white">
              {activeCount}
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={submitSupplier}
        className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-6"
      >
        <div className="mb-6 flex items-center justify-between border-b border-white/[0.05] pb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
            {editingId ? "Edit Supplier" : "Add Supplier"}
          </h2>
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

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]">
              Supplier Name
            </span>
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
              placeholder="Supplier company"
              className="w-full rounded border border-white/10 bg-[#121212] px-3 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-[#555] focus:border-white/30"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]">
              Phone
            </span>
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
              className="w-full rounded border border-white/10 bg-[#121212] px-3 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-[#555] focus:border-white/30"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]">
              Email
            </span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="contact@supplier.com"
              className="w-full rounded border border-white/10 bg-[#121212] px-3 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-[#555] focus:border-white/30"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]">
              Address
            </span>
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
              placeholder="Supplier address"
              className="w-full rounded border border-white/10 bg-[#121212] px-3 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-[#555] focus:border-white/30"
            />
          </label>

          <div className="flex items-end gap-3">
            <label className="flex-1 space-y-2">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]">
                Status
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as SupplierStatus,
                  }))
                }
                className="w-full rounded border border-white/10 bg-[#121212] px-3 py-2.5 text-xs text-white outline-none focus:border-white/30"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Add"}
            </button>
          </div>
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0a0a]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
            Supplier Directory
          </h2>
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
              placeholder="Search suppliers..."
              className="w-full rounded border border-white/10 bg-[#121212] py-2 pl-9 pr-3 text-xs text-white outline-none placeholder:text-[#555] focus:border-white/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-[#080808]">
              <tr className="border-b border-white/[0.06]">
                {["Supplier", "Contact", "Address", "Status", "Updated", "Actions"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredSuppliers.map((supplier) => (
                <tr
                  key={supplier.supplierId}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-white">
                      {supplier.name}
                    </div>
                    <div className="mt-1 font-mono text-[9px] text-[#555]">
                      {supplier.supplierId.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-xs text-white">{supplier.email}</div>
                    <div className="mt-1 text-[10px] text-[#8e8e93]">
                      {supplier.phone}
                    </div>
                  </td>
                  <td className="max-w-xs px-5 py-4 text-[10px] leading-relaxed text-[#b0b0b0]">
                    {supplier.address}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${
                        supplier.status === "Active"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-white/10 bg-white/5 text-[#8e8e93]"
                      }`}
                    >
                      {supplier.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-[10px] text-[#8e8e93]">
                    {new Date(supplier.updatedAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => beginEdit(supplier)}
                        className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleStatus(supplier)}
                        className="rounded border border-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[#8e8e93] transition-colors hover:border-white/20 hover:text-white"
                      >
                        {supplier.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredSuppliers.length === 0 && (
          <div className="px-6 py-16 text-center text-[10px] font-bold uppercase tracking-widest text-[#555]">
            {search ? "No suppliers match this search." : "No suppliers added yet."}
          </div>
        )}
        {loading && (
          <div className="px-6 py-16 text-center text-[10px] font-bold uppercase tracking-widest text-[#8e8e93]">
            Loading suppliers...
          </div>
        )}
      </section>
    </div>
  );
}
