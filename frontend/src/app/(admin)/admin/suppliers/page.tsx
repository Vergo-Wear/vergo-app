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

const EMPTY_FORM: SupplierForm = {
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
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof SupplierForm, string>>
  >({});
  const [modalAlert, setModalAlert] = useState<{
    message: string;
    type: "error" | "warning";
  } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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

  const activeCount = useMemo(
    () => suppliers.filter((s) => s.status === "Active").length,
    [suppliers],
  );

  const validateField = (field: keyof SupplierForm, value: string): string => {
    const val = value.trim();
    let error = "";

    switch (field) {
      case "name":
        if (!val) error = "Supplier name is required.";
        else if (val.length < 2)
          error = "Supplier name must be at least 2 characters.";
        break;
      case "email":
        if (!val) error = "Email address is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
          error = "Enter a valid email address (e.g. supplier@domain.com).";
        break;
      case "phone":
        if (!val) error = "Phone number is required.";
        else if (!/^(?:\+94|0)?[1-9]\d{8}$/.test(val.replace(/\s+/g, "")))
          error = "Enter a valid Sri Lankan phone number (e.g. 0771234567).";
        break;
      case "address":
        if (!val) error = "Address is required.";
        else if (val.length < 5)
          error = "Address must be at least 5 characters.";
        break;
    }

    setFormErrors((prev) => ({ ...prev, [field]: error }));
    return error;
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof SupplierForm, string>> = {};
    (Object.keys(EMPTY_FORM) as (keyof SupplierForm)[]).forEach((key) => {
      const err = validateField(key, form[key]);
      if (err) errors[key] = err;
    });

    setFormErrors(errors);
    const firstError = Object.values(errors).find(Boolean);
    if (firstError) {
      setModalAlert({ message: firstError, type: "warning" });
      return false;
    }
    setModalAlert(null);
    return true;
  };

  const setField = (field: keyof SupplierForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      validateField(field, String(value));
    }
  };

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalAlert(null);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setForm({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      status: supplier.status,
    });
    setFormErrors({});
    setModalAlert(null);
    setEditingId(supplier.supplierId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalAlert(null);
  };

  const submitSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

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

    if (!response || !response.ok) {
      const errMsg = await responseMessage(
        response || new Response(),
        editingId ? "Unable to update supplier." : "Unable to add supplier.",
      );
      setModalAlert({ message: errMsg, type: "error" });
      setSaving(false);
      return;
    }

    setFeedback({
      message: editingId
        ? "Supplier updated successfully."
        : "Supplier added successfully.",
      type: "success",
    });
    closeModal();
    await loadSuppliers();
    setSaving(false);
  };

  const toggleSupplierStatus = async (supplier: Supplier) => {
    const nextStatus: SupplierStatus =
      supplier.status === "Active" ? "Inactive" : "Active";
    setFeedback(null);
    const response = await authenticatedFetch(
      `/admin/suppliers/${supplier.supplierId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      },
    );
    if (!response || !response.ok) {
      setFeedback({
        message: await responseMessage(
          response || new Response(),
          "Unable to toggle status.",
        ),
        type: "error",
      });
      return;
    }

    setFeedback({
      message: `Supplier status changed to ${nextStatus}.`,
      type: "success",
    });
    await loadSuppliers();
  };

  return (
    <div className="space-y-8 select-none text-xs text-[#f5f5f7]">
      {feedback && (
        <div
          className={`fixed right-8 top-24 z-[100] max-w-sm rounded-lg border px-5 py-3 text-xs font-bold shadow-2xl transition-all ${
            feedback.type === "success"
              ? "border-[#10b981]/40 bg-[#0d1f14] text-[#10b981]"
              : "border-[#ef4444]/40 bg-[#271010] text-[#ef4444]"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-[0.2em] text-white uppercase mb-1 sm:mb-2 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            SUPPLIER NETWORK MANAGEMENT
          </h2>
          <p className="text-xs text-[#8e8e93] font-medium tracking-wide">
            Manage garment manufacturers, raw material vendors, and contact details.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-white text-black hover:bg-[#eaeaea] active:bg-[#d9d9d9] font-bold text-xs tracking-[0.15em] px-4 py-2.5 rounded-md transition-all shadow-md shadow-white/5 uppercase flex items-center gap-2 cursor-pointer w-fit"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>ADD SUPPLIER</span>
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">
            TOTAL REGISTERED SUPPLIERS
          </h4>
          <div className="text-2xl font-bold text-white mt-2 font-mono-meta">
            {suppliers.length}{" "}
            <span className="text-xs text-[#8e8e93] font-medium font-sans">
              Vendors
            </span>
          </div>
        </div>
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">
            ACTIVE PARTNERS
          </h4>
          <div className="text-2xl font-bold text-[#10b981] mt-2 font-mono-meta flex items-center gap-2">
            <span>{activeCount}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
          </div>
        </div>
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">
            INACTIVE VENDORS
          </h4>
          <div className="text-2xl font-bold text-[#f59e0b] mt-2 font-mono-meta">
            {suppliers.length - activeCount}
          </div>
        </div>
      </div>

      {/* Supplier Directory Section */}
      <div className="admin-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-white flex items-center gap-2">
            SUPPLIER DIRECTORY ({filteredSuppliers.length})
          </h3>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by name, email, phone, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-1.5 pl-8 text-white placeholder-[#555] focus:outline-none focus:border-white/20 text-xs"
            />
            <svg
              className="w-4 h-4 text-[#8e8e93] absolute left-2.5 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#8e8e93] uppercase tracking-wider font-semibold">
            Loading Supplier Directory...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12 text-[#8e8e93]">
            {search
              ? "No suppliers match your search query."
              : "No suppliers registered yet. Click ADD SUPPLIER above to create one."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredSuppliers.map((supplier) => {
              const initials = supplier.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              const isActive = supplier.status === "Active";

              return (
                <div
                  key={supplier.supplierId}
                  className="bg-[#121212] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] rounded-lg p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  {/* Left Column: Avatar + Profile Details */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-sm shadow-md flex-shrink-0">
                      {initials}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-white text-base">
                          {supplier.name}
                        </h4>
                        <span
                          className={`font-bold text-[9px] px-2 py-0.5 rounded tracking-wider uppercase flex items-center gap-1 ${
                            isActive
                              ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30"
                              : "bg-white/5 text-[#8e8e93] border border-white/10"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-[#10b981] animate-pulse" : "bg-[#8e8e93]"
                            }`}
                          ></span>
                          {supplier.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#8e8e93] text-xs pt-1">
                        <span className="flex items-center gap-1 font-mono-meta">
                          <svg
                            className="w-3.5 h-3.5 text-[#8e8e93]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          {supplier.email}
                        </span>

                        <span className="flex items-center gap-1 font-mono-meta">
                          <svg
                            className="w-3.5 h-3.5 text-[#8e8e93]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          {supplier.phone}
                        </span>

                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5 text-[#8e8e93]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {supplier.address}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSupplierStatus(supplier)}
                      className={`font-bold text-xs px-3 py-2 rounded transition-all cursor-pointer flex items-center gap-1.5 uppercase ${
                        isActive
                          ? "bg-amber-950/30 text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black border border-[#f59e0b]/30"
                          : "bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981] hover:text-black border border-[#10b981]/30"
                      }`}
                    >
                      {isActive ? "DEACTIVATE" : "ACTIVATE"}
                    </button>

                    <button
                      onClick={() => openEditModal(supplier)}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-[#8e8e93] hover:text-white font-bold text-xs px-3 py-2 rounded transition-all cursor-pointer flex items-center gap-1.5 uppercase"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span>EDIT</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD / EDIT SUPPLIER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none p-4 overflow-y-auto">
          <div
            className="w-full max-w-lg bg-[#0c0c0e]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-[#10b981]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {editingId ? "EDIT SUPPLIER DETAILS" : "ADD NEW SUPPLIER"}
                </h3>
                <p className="text-[10px] text-[#8e8e93] tracking-wide uppercase font-semibold mt-0.5">
                  Configure supplier company name, contact email, phone, and address
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e93] hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Alert Banner */}
            {modalAlert && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-fadeIn ${
                  modalAlert.type === "error"
                    ? "bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]"
                    : "bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]"
                }`}
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="font-medium">{modalAlert.message}</span>
              </div>
            )}

            <form onSubmit={submitSupplier} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  SUPPLIER / VENDOR NAME <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  onBlur={(e) => validateField("name", e.target.value)}
                  placeholder="e.g. Apex Textiles Ltd"
                  className={`w-full bg-[#141417] border rounded-lg px-3.5 py-2.5 text-white placeholder-[#555] focus:outline-none transition-all ${
                    formErrors.name
                      ? "border-[#ef4444] bg-[#ef4444]/5 focus:border-[#ef4444]"
                      : "border-white/10 hover:border-white/20 focus:border-[#10b981]"
                  }`}
                />
                {formErrors.name && (
                  <span className="text-[#ef4444] text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {formErrors.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    EMAIL ADDRESS <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    onBlur={(e) => validateField("email", e.target.value)}
                    placeholder="sales@apextextiles.lk"
                    className={`w-full bg-[#141417] border rounded-lg px-3.5 py-2.5 text-white placeholder-[#555] focus:outline-none transition-all font-mono-meta ${
                      formErrors.email
                        ? "border-[#ef4444] bg-[#ef4444]/5 focus:border-[#ef4444]"
                        : "border-white/10 hover:border-white/20 focus:border-[#10b981]"
                    }`}
                  />
                  {formErrors.email && (
                    <span className="text-[#ef4444] text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {formErrors.email}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    CONTACT PHONE <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    onBlur={(e) => validateField("phone", e.target.value)}
                    placeholder="0771234567"
                    className={`w-full bg-[#141417] border rounded-lg px-3.5 py-2.5 text-white placeholder-[#555] focus:outline-none transition-all font-mono-meta ${
                      formErrors.phone
                        ? "border-[#ef4444] bg-[#ef4444]/5 focus:border-[#ef4444]"
                        : "border-white/10 hover:border-white/20 focus:border-[#10b981]"
                    }`}
                  />
                  {formErrors.phone && (
                    <span className="text-[#ef4444] text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {formErrors.phone}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  BUSINESS ADDRESS <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  onBlur={(e) => validateField("address", e.target.value)}
                  placeholder="e.g. Industrial Zone, Katunayake"
                  className={`w-full bg-[#141417] border rounded-lg px-3.5 py-2.5 text-white placeholder-[#555] focus:outline-none transition-all ${
                    formErrors.address
                      ? "border-[#ef4444] bg-[#ef4444]/5 focus:border-[#ef4444]"
                      : "border-white/10 hover:border-white/20 focus:border-[#10b981]"
                  }`}
                />
                {formErrors.address && (
                  <span className="text-[#ef4444] text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {formErrors.address}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  SUPPLIER STATUS <span className="text-[#ef4444]">*</span>
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value as SupplierStatus)}
                  className="w-full bg-[#141417] border border-white/10 rounded-lg px-3.5 py-2.5 text-white focus:outline-none transition-all cursor-pointer"
                >
                  <option value="Active" className="bg-[#121212]">Active</option>
                  <option value="Inactive" className="bg-[#121212]">Inactive</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 bg-transparent hover:bg-white/5 border border-white/10 text-[#8e8e93] hover:text-white font-bold tracking-widest px-4 py-2.5 rounded-xl transition-all uppercase cursor-pointer disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#10b981] text-black hover:bg-[#059669] font-bold tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-[#10b981]/20 uppercase cursor-pointer disabled:opacity-50"
                >
                  {saving ? "SAVING..." : editingId ? "UPDATE SUPPLIER" : "CREATE SUPPLIER"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
