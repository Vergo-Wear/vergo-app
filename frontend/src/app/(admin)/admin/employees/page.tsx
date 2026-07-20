"use client";

import React, { useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

interface EmployeeLog {
  id: string;
  time: string;
  name: string;
  action: string;
  node: string;
}

interface Branch {
  branchId: string;
  name: string;
  address: string;
}

interface EmployeeForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branchId: string;
  position: string;
  address: string;
}

const EMPTY_FORM: EmployeeForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  branchId: "",
  position: "",
  address: "",
};

const POSITION_OPTIONS = ["Employee"];

interface CreatedCredentials {
  email: string;
  password: string;
}

export default function EmployeesPage() {
  const { employees, toggleEmployeeShift, addNotification, removeEmployee, addEmployee } = useAdmin();
  const [logs, setLogs] = useState<EmployeeLog[]>([
    { id: "l1", time: "23:09:42", name: "Alex Rivera", action: "Assigned Waybill KB-90485923", node: "NODE_LA_01" },
    { id: "l2", time: "22:54:11", name: "Jordan Smith", action: "Verified Stock count (+50 SKU: VGO-PANT-O-M)", node: "NODE_NY_04" },
    { id: "l3", time: "22:15:02", name: "Marcus V.", action: "Authorized Stock Transfer (LA-01 -> NY-04)", node: "NODE_LA_01" },
    { id: "l4", time: "21:40:59", name: "Alex Rivera", action: "Dispatched 12 packages to Koombiyo", node: "NODE_LA_01" },
  ]);

  const [newLogAction, setNewLogAction] = useState("");
  const [selectedEmp, setSelectedEmp] = useState("Alex Rivera");
  const [selectedNode, setSelectedNode] = useState("NODE_LA_01");

  // Add Employee modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof EmployeeForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);

  // Remove employee confirmation state
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const activeShiftsCount = employees.filter((e) => e.status === "ON SHIFT").length;

  // Load branches from the backend when the modal opens
  useEffect(() => {
    if (!addModalOpen) return;
    setBranchesLoading(true);
    authenticatedFetch("/admin/branches")
      .then(async (response) => {
        if (!response || !response.ok) throw new Error("Unable to load branches.");
        const data: Branch[] = await response.json();
        setBranches(data);
      })
      .catch((error: Error) => addNotification(error.message, "error"))
      .finally(() => setBranchesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addModalOpen]);

  const setField = (field: keyof EmployeeForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof EmployeeForm, string>> = {};
    if (!form.firstName.trim()) errors.firstName = "First name is required.";
    if (!form.lastName.trim()) errors.lastName = "Last name is required.";
    if (!form.email.trim()) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
    if (!form.phone.trim()) errors.phone = "Phone number is required.";
    else if (!/^(?:\+94|0)?[1-9][0-9]{8}$/.test(form.phone.trim()))
      errors.phone = "Enter a valid Sri Lankan phone number (e.g. 0771234567).";
    if (!form.branchId) errors.branchId = "Please select a branch.";
    if (!form.position.trim()) errors.position = "Please select a position.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !validateForm()) return;

    setSubmitting(true);
    try {
      const response = await authenticatedFetch("/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          branchId: form.branchId,
          position: form.position.trim(),
          ...(form.address.trim() ? { address: form.address.trim() } : {}),
        }),
      });

      if (!response) throw new Error("You must be signed in as an Admin.");

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(data?.message)
          ? data.message[0]
          : data?.message || "Failed to create the employee account.";
        throw new Error(message);
      }

      addNotification("Employee account created successfully.", "success");
      if (data?.employee?.employeeId) {
        addEmployee(data.employee.employeeId, `${data.employee.firstName} ${data.employee.lastName}`);
      }
      setForm(EMPTY_FORM);
      setFormErrors({});
      setAddModalOpen(false);
      if (data?.credentials) setCreatedCredentials(data.credentials);
    } catch (error) {
      addNotification(error instanceof Error ? error.message : "Failed to create the employee account.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveEmployee = async () => {
    if (!removeTarget || removing) return;

    setRemoving(true);
    try {
      const response = await authenticatedFetch(`/admin/employees/${removeTarget.id}`, {
        method: "DELETE",
      });

      if (!response) throw new Error("You must be signed in as an Admin.");

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = Array.isArray(data?.message)
          ? data.message[0]
          : data?.message || "Failed to remove the employee.";
        throw new Error(message);
      }

      removeEmployee(removeTarget.id);
      addNotification(`${removeTarget.name} removed successfully.`, "success");
      setRemoveTarget(null);
    } catch (error) {
      addNotification(error instanceof Error ? error.message : "Failed to remove the employee.", "error");
    } finally {
      setRemoving(false);
    }
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogAction) return;

    const now = new Date();
    const timeStr = `${String(now.getUTCHours()).padStart(2, "0")}:${String(
      now.getUTCMinutes()
    ).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}`;

    const newEntry: EmployeeLog = {
      id: Math.random().toString(),
      time: timeStr,
      name: selectedEmp,
      action: newLogAction,
      node: selectedNode,
    };

    setLogs((prev) => [newEntry, ...prev]);
    setNewLogAction("");
    addNotification(`Logged action for ${selectedEmp}.`, "success");
  };

  return (
    <div className="space-y-8 select-none text-xs">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-widest text-white uppercase">EMPLOYEE MONITOR</h2>
          <p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">Monitor employee performance, toggle shifts, and audit live operations logs</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="bg-white text-black hover:bg-[#eaeaea] active:bg-[#d9d9d9] font-bold text-xs tracking-[0.15em] px-4 py-2 rounded-md transition-all shadow-md shadow-white/5 uppercase flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>ADD EMPLOYEE</span>
        </button>
      </div>

      {/* Grid of workforce metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">ACTIVE DUTY FORCE</h4>
          <div className="text-2xl font-bold text-white mt-2 font-mono-meta">
            {activeShiftsCount} <span className="text-xs text-[#8e8e93] font-medium font-sans">on visible roster</span>
          </div>
        </div>
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">TOTAL ROSTER SIZE</h4>
          <div className="text-2xl font-bold text-white mt-2 font-mono-meta">
            {employees.length} {employees.length === 1 ? "Staff Member" : "Staff"}
          </div>
        </div>
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">PROCESSING EFFICIENCY</h4>
          <div className="text-2xl font-bold text-white mt-2 font-mono-meta">96.4%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee shifts list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="admin-card p-6">
            <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">STAFF STATUS ROSTER</h3>
            </div>

            <div className="space-y-4">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-4 bg-[#121212] border border-[rgba(255,255,255,0.03)] rounded hover:border-[rgba(255,255,255,0.08)] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-sm shadow-md">
                      {emp.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{emp.name}</h4>
                      <p className="text-[10px] text-[#8e8e93] font-bold tracking-wider mt-1 uppercase">ASSIGNED: NODE_LA_01</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[9px] text-[#8e8e93] font-bold tracking-wider uppercase mb-0.5">PARCELS DISPATCHED</div>
                      <div className="font-mono-meta font-bold text-white text-sm">{emp.parcels} units</div>
                    </div>

                    <button
                      onClick={() => toggleEmployeeShift(emp.id)}
                      className={`font-bold text-xs px-4 py-2 rounded transition-all cursor-pointer ${
                        emp.status === "ON SHIFT"
                          ? "bg-[#10b981] text-black hover:bg-[#059669]"
                          : "bg-white/5 text-[#8e8e93] hover:bg-white/10"
                      }`}
                    >
                      {emp.status === "ON SHIFT" ? "ON DUTY" : "OFF DUTY"}
                    </button>

                    <button
                      onClick={() => setRemoveTarget({ id: emp.id, name: emp.name })}
                      title={`Remove ${emp.name}`}
                      className="bg-red-950/30 text-[#ef4444] hover:bg-[#ef4444] hover:text-white border border-[rgba(239,68,68,0.2)] font-bold text-xs px-3 py-2 rounded transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operational activity log */}
        <div className="lg:col-span-1 space-y-6">
          <div className="admin-card p-6">
            <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">OPERATIONS LOG AUDIT</h3>
            </div>

            {/* Quick entry logger */}
            <form onSubmit={handleAddLog} className="space-y-3 mb-6">
              <div>
                <select
                  value={selectedEmp}
                  onChange={(e) => setSelectedEmp(e.target.value)}
                  className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-1.5 text-white focus:outline-none cursor-pointer"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedNode}
                  onChange={(e) => setSelectedNode(e.target.value)}
                  className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-1.5 text-white focus:outline-none cursor-pointer font-mono-meta"
                >
                  <option value="NODE_LA_01">NODE_LA_01</option>
                  <option value="NODE_NY_04">NODE_NY_04</option>
                  <option value="NODE_TK_01">NODE_TK_01</option>
                  <option value="NODE_LDN_02">NODE_LDN_02</option>
                  <option value="NODE_PAR_01">NODE_PAR_01</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Action payload details..."
                  value={newLogAction}
                  onChange={(e) => setNewLogAction(e.target.value)}
                  className="flex-1 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-1.5 text-white placeholder-[#555] focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-white text-black hover:bg-[#eaeaea] font-bold px-3 py-1 rounded cursor-pointer"
                >
                  Log
                </button>
              </div>
            </form>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {logs.map((log) => (
                <div key={log.id} className="text-xs border-b border-[rgba(255,255,255,0.02)] pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white">{log.name}</span>
                    <span className="font-mono-meta text-[10px] text-[#8e8e93]">{log.time} UTC</span>
                  </div>
                  <p className="text-[#8e8e93] font-medium leading-relaxed">{log.action}</p>
                  <div className="text-[9px] font-mono-meta font-bold text-[#8e8e93] mt-1">NODE: {log.node}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none">
          <div
            className="w-full max-w-lg bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-md shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-sm font-bold tracking-widest uppercase text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                ADD EMPLOYEE
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-[#8e8e93] hover:text-white cursor-pointer"
                disabled={submitting}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    FIRST NAME *
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                    placeholder="John"
                    className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white placeholder-[#555] focus:outline-none focus:border-white/20"
                  />
                  {formErrors.firstName && <p className="text-[#ef4444] text-[10px] mt-1">{formErrors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    LAST NAME *
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                    placeholder="Perera"
                    className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white placeholder-[#555] focus:outline-none focus:border-white/20"
                  />
                  {formErrors.lastName && <p className="text-[#ef4444] text-[10px] mt-1">{formErrors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  LOGIN EMAIL *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white placeholder-[#555] focus:outline-none focus:border-white/20"
                />
                {formErrors.email && <p className="text-[#ef4444] text-[10px] mt-1">{formErrors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    PHONE NUMBER *
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="0771234567"
                    className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white placeholder-[#555] focus:outline-none focus:border-white/20 font-mono-meta"
                  />
                  {formErrors.phone && <p className="text-[#ef4444] text-[10px] mt-1">{formErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    POSITION *
                  </label>
                  <select
                    value={form.position}
                    onChange={(e) => setField("position", e.target.value)}
                    className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white focus:outline-none focus:border-white/20 cursor-pointer"
                  >
                    <option value="" className="bg-[#121212]">
                      Select Position
                    </option>
                    {POSITION_OPTIONS.map((position) => (
                      <option key={position} value={position} className="bg-[#121212] py-2">
                        {position}
                      </option>
                    ))}
                  </select>
                  {formErrors.position && <p className="text-[#ef4444] text-[10px] mt-1">{formErrors.position}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  BRANCH *
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => setField("branchId", e.target.value)}
                  disabled={branchesLoading}
                  className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white focus:outline-none focus:border-white/20 cursor-pointer disabled:opacity-50"
                >
                  <option value="" className="bg-[#121212]">
                    {branchesLoading ? "Loading branches..." : "Select Branch"}
                  </option>
                  {branches.map((branch) => (
                    <option key={branch.branchId} value={branch.branchId} className="bg-[#121212] py-2">
                      {branch.name}
                    </option>
                  ))}
                </select>
                {formErrors.branchId && <p className="text-[#ef4444] text-[10px] mt-1">{formErrors.branchId}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  ADDRESS <span className="text-[#555] normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="Jaffna"
                  className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white placeholder-[#555] focus:outline-none focus:border-white/20"
                />
              </div>

              <p className="text-[10px] text-[#8e8e93] leading-relaxed">
                A login account is created for this email. The login password is shown after creation — share it with the employee.
              </p>

              <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 bg-transparent hover:bg-white/5 border border-[rgba(255,255,255,0.1)] hover:border-white/20 text-[#8e8e93] hover:text-white font-bold tracking-widest px-4 py-2.5 rounded-md transition-all uppercase cursor-pointer disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-white text-black hover:bg-[#eaeaea] disabled:bg-white/20 disabled:text-[#8e8e93] disabled:cursor-not-allowed font-bold tracking-widest px-4 py-2.5 rounded-md transition-all uppercase cursor-pointer"
                >
                  {submitting ? "CREATING..." : "CREATE EMPLOYEE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE EMPLOYEE CONFIRMATION MODAL */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none">
          <div
            className="w-full max-w-md bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-md shadow-2xl overflow-hidden p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-sm font-bold tracking-widest uppercase text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                REMOVE EMPLOYEE
              </h3>
              <button
                onClick={() => setRemoveTarget(null)}
                className="text-[#8e8e93] hover:text-white cursor-pointer"
                disabled={removing}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-[#8e8e93] leading-relaxed">
                Are you sure you want to remove{" "}
                <span className="text-white font-bold">{removeTarget.name}</span>?
                This permanently deletes their login account, profile, and employee record.
                This action cannot be undone.
              </p>

              <div className="flex gap-3 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <button
                  type="button"
                  onClick={() => setRemoveTarget(null)}
                  disabled={removing}
                  className="flex-1 bg-transparent hover:bg-white/5 border border-[rgba(255,255,255,0.1)] hover:border-white/20 text-[#8e8e93] hover:text-white font-bold tracking-widest px-4 py-2.5 rounded-md transition-all uppercase cursor-pointer disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleRemoveEmployee}
                  disabled={removing}
                  className="flex-1 bg-[#ef4444] text-white hover:bg-[#dc2626] disabled:bg-[#ef4444]/30 disabled:cursor-not-allowed font-bold tracking-widest px-4 py-2.5 rounded-md transition-all uppercase cursor-pointer"
                >
                  {removing ? "REMOVING..." : "REMOVE"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE CREDENTIALS POPUP (shown once after successful creation) */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none">
          <div
            className="w-full max-w-md bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-md shadow-2xl overflow-hidden p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-sm font-bold tracking-widest uppercase text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                EMPLOYEE CREATED
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-[#8e8e93] leading-relaxed">
                Share these login credentials with the employee. The password is shown{" "}
                <span className="text-white font-bold">only once</span> here, so copy it now.
              </p>

              {[
                { label: "LOGIN EMAIL", value: createdCredentials.email },
                { label: "PASSWORD", value: createdCredentials.password },
              ].map(({ label, value }) => (
                <div key={label}>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    {label}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-white font-mono-meta break-all">
                      {value}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(value)
                          .then(() => addNotification(`${label.charAt(0) + label.slice(1).toLowerCase()} copied to clipboard.`, "success"))
                          .catch(() => addNotification("Unable to copy to clipboard.", "error"));
                      }}
                      className="bg-white/5 hover:bg-white/10 border border-[rgba(255,255,255,0.08)] text-[#8e8e93] hover:text-white px-3 rounded-md transition-all cursor-pointer"
                      title={`Copy ${label.toLowerCase()}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-[#8e8e93] leading-relaxed">
                The employee signs in with this email and password. They can keep using this password, or change it anytime via Forgot Password.
              </p>

              <div className="pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <button
                  type="button"
                  onClick={() => setCreatedCredentials(null)}
                  className="w-full bg-white text-black hover:bg-[#eaeaea] font-bold tracking-widest px-4 py-2.5 rounded-md transition-all uppercase cursor-pointer"
                >
                  DONE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
