"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAdmin } from "../AdminContext";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

interface Branch {
  branchId: string;
  name: string;
  address: string;
}

interface DetailedEmployee {
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  branchId: string;
  branchName: string;
  accountStatus: string;
  availabilityStatus?: string;
  commissionPerParcel?: number;
  hireDate?: string;
  address?: string;
  assignedStock?: AssignedStockItem[];
  totalStockUnits?: number;
  metrics?: {
    claimedCount: number;
    preparedCount: number;
    dispatchedCount: number;
    deliveredCount: number;
    successRate: number;
  };
}

interface AssignedStockItem {
  inventoryId: string;
  variantId: string;
  productId: string;
  productName: string;
  categoryName: string;
  basePrice?: number;
  sku: string;
  colorId?: string;
  colorName: string;
  colorHex: string;
  sizeId?: string;
  sizeName: string;
  quantity: number;
  imageUrl?: string | null;
}

interface VariantDistributionInfo {
  variantId: string;
  sku: string;
  colorId: string;
  colorName: string;
  colorHex: string;
  sizeId: string;
  sizeName: string;
  priceAdjustment: number;
  totalWarehouseStock: number;
  branchAllocations: Array<{
    inventoryId: string;
    branchId: string | null;
    branchName: string;
    quantity: number;
  }>;
  imageUrl: string | null;
}

interface ProductDistributionInfo {
  productId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string;
  basePrice: number;
  status: string;
  mainImage: string | null;
  totalStock: number;
  variants: VariantDistributionInfo[];
}

interface StockDistributionData {
  products: ProductDistributionInfo[];
  employees: DetailedEmployee[];
  branches: Branch[];
}

interface EmployeeForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branchId: string;
  position: string;
  address: string;
  commissionPerParcel: string;
}

const EMPTY_FORM: EmployeeForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  branchId: "",
  position: "Employee",
  address: "",
  commissionPerParcel: "",
};

const POSITION_OPTIONS = ["Employee"];

interface CreatedCredentials {
  email: string;
  password: string;
}

export default function EmployeesPage() {
  const { addNotification, removeEmployee, addEmployee } = useAdmin();

  const [employeeList, setEmployeeList] = useState<DetailedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dutyFilter, setDutyFilter] = useState<"all" | "duty" | "break">("all");

  // Add Employee modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof EmployeeForm, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null);

  // Remove employee confirmation state
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [removing, setRemoving] = useState(false);

  // Multi-Variant Stock Distributor State
  const [isDistributorOpen, setIsDistributorOpen] = useState(false);
  const [distributionOverview, setDistributionOverview] =
    useState<StockDistributionData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductDistributionInfo | null>(null);
  const [distributorTargetMode, setDistributorTargetMode] = useState<
    "single" | "all"
  >("all");
  const [distributorTargetEmployeeId, setDistributorTargetEmployeeId] =
    useState<string>("");
  const [allocationQuantities, setAllocationQuantities] = useState<
    Record<string, number>
  >({});
  const [bulkSetAllValue, setBulkSetAllValue] = useState<string>("5");
  const [submittingDistribution, setSubmittingDistribution] = useState(false);

  // View Assigned Stock Details Modal State
  const [viewStockEmployee, setViewStockEmployee] =
    useState<DetailedEmployee | null>(null);

  // Stock suggestion state for newly created employee
  const [stockSuggestion, setStockSuggestion] = useState<{
    employeeId: string;
    name: string;
    branchName: string;
  } | null>(null);

  // Edit employee modal state
  const [editEmployeeTarget, setEditEmployeeTarget] =
    useState<DetailedEmployee | null>(null);
  const [editForm, setEditForm] = useState({
    branchId: "",
    commissionPerParcel: "",
    address: "",
  });
  const [updatingEmployee, setUpdatingEmployee] = useState(false);

  const loadBranches = useCallback(() => {
    setBranchesLoading(true);
    authenticatedFetch("/admin/branches")
      .then(async (response) => {
        if (!response || !response.ok)
          throw new Error("Unable to load branches.");
        const data: Branch[] = await response.json();
        setBranches(data);
      })
      .catch((error: Error) => addNotification(error.message, "error"))
      .finally(() => setBranchesLoading(false));
  }, [addNotification]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const openEditModal = (emp: DetailedEmployee) => {
    setEditEmployeeTarget(emp);
    setEditForm({
      branchId: emp.branchId || "",
      commissionPerParcel:
        emp.commissionPerParcel !== undefined
          ? String(emp.commissionPerParcel)
          : "",
      address: emp.address || "",
    });
    if (branches.length === 0) {
      loadBranches();
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployeeTarget || updatingEmployee) return;

    setUpdatingEmployee(true);
    try {
      const response = await authenticatedFetch(
        `/admin/employees/${editEmployeeTarget.employeeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branchId: editForm.branchId || undefined,
            commissionPerParcel:
              editForm.commissionPerParcel !== ""
                ? Number(editForm.commissionPerParcel)
                : undefined,
            address: editForm.address.trim() || undefined,
          }),
        },
      );

      if (!response || !response.ok) {
        throw new Error("Unable to update employee details.");
      }

      addNotification(
        `Successfully updated details for ${editEmployeeTarget.name}.`,
        "success",
      );
      setEditEmployeeTarget(null);
      loadEmployeeList();
    } catch (err) {
      addNotification(
        err instanceof Error ? err.message : "Failed to update employee.",
        "error",
      );
    } finally {
      setUpdatingEmployee(false);
    }
  };

  // Fetch real employee list from backend
  const loadEmployeeList = () => {
    authenticatedFetch("/admin/employee-logistics")
      .then(async (res) => {
        if (res && res.ok) {
          const data: DetailedEmployee[] = await res.json();
          setEmployeeList(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load employee list:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEmployeeList();
    const interval = setInterval(loadEmployeeList, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load Stock Distribution Overview (Products, Variants, Stock counts)
  const loadDistributionOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await authenticatedFetch("/admin/employees/stock-distribution");
      if (!res || !res.ok) throw new Error("Failed to load stock distribution overview.");
      const data: StockDistributionData = await res.json();
      setDistributionOverview(data);
      if (data.products.length > 0) {
        setSelectedProduct((prev) =>
          prev
            ? data.products.find((p) => p.productId === prev.productId) || data.products[0]
            : data.products[0]
        );
      }
    } catch (err) {
      console.error("Error loading stock distribution:", err);
      addNotification("Failed to load real-time stock catalog.", "error");
    } finally {
      setLoadingOverview(false);
    }
  }, [addNotification]);

  const openStockDistributorModal = (employeeId?: string | null) => {
    if (employeeId) {
      setDistributorTargetMode("single");
      setDistributorTargetEmployeeId(employeeId);
    } else {
      setDistributorTargetMode("all");
      setDistributorTargetEmployeeId(employeeList[0]?.employeeId || "");
    }
    setAllocationQuantities({});
    setBulkSetAllValue("5");
    setIsDistributorOpen(true);
    loadDistributionOverview();
  };

  const handleSetVariantQuantity = (variantId: string, val: number) => {
    setAllocationQuantities((prev) => ({
      ...prev,
      [variantId]: Math.max(0, val),
    }));
  };

  const handleSetAllSizes = (qty: number) => {
    if (!selectedProduct) return;
    const targetCount =
      distributorTargetMode === "all"
        ? distributionOverview?.employees.length || employeeList.length || 1
        : 1;

    const newMap: Record<string, number> = {};
    selectedProduct.variants.forEach((v) => {
      const maxAllowed = Math.floor(v.totalWarehouseStock / targetCount);
      newMap[v.variantId] = Math.min(qty, maxAllowed);
    });
    setAllocationQuantities(newMap);
  };

  const handleFillMaxRemaining = () => {
    if (!selectedProduct) return;
    const targetCount =
      distributorTargetMode === "all"
        ? distributionOverview?.employees.length || employeeList.length || 1
        : 1;

    const newMap: Record<string, number> = {};
    selectedProduct.variants.forEach((v) => {
      newMap[v.variantId] = Math.floor(v.totalWarehouseStock / targetCount);
    });
    setAllocationQuantities(newMap);
  };

  const handleCopyFirstColorToAll = () => {
    if (!selectedProduct) return;
    const colors = Array.from(new Set(selectedProduct.variants.map((v) => v.colorId)));
    if (colors.length < 2) return;

    const firstColorId = colors[0];
    const firstColorVariants = selectedProduct.variants.filter(
      (v) => v.colorId === firstColorId
    );

    const targetCount =
      distributorTargetMode === "all"
        ? distributionOverview?.employees.length || employeeList.length || 1
        : 1;

    const newMap = { ...allocationQuantities };
    selectedProduct.variants.forEach((v) => {
      if (v.colorId !== firstColorId) {
        const match = firstColorVariants.find((fv) => fv.sizeName === v.sizeName);
        if (match && allocationQuantities[match.variantId] !== undefined) {
          const qty = allocationQuantities[match.variantId];
          const maxAllowed = Math.floor(v.totalWarehouseStock / targetCount);
          newMap[v.variantId] = Math.min(qty, maxAllowed);
        }
      }
    });
    setAllocationQuantities(newMap);
  };

  const handleClearAllocation = () => {
    setAllocationQuantities({});
  };

  const handleConfirmDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingDistribution || !selectedProduct) return;

    const allocations = Object.entries(allocationQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity }));

    if (allocations.length === 0) {
      addNotification("Please enter quantities for at least one garment variant.", "error");
      return;
    }

    const activeCount =
      distributorTargetMode === "all"
        ? distributionOverview?.employees.length || employeeList.length || 1
        : 1;

    for (const alloc of allocations) {
      const variant = selectedProduct.variants.find((v) => v.variantId === alloc.variantId);
      if (variant && alloc.quantity * activeCount > variant.totalWarehouseStock) {
        addNotification(
          `Cannot allocate ${alloc.quantity * activeCount} units of ${variant.sku}. Exceeds warehouse stock of ${variant.totalWarehouseStock}.`,
          "error"
        );
        return;
      }
    }

    setSubmittingDistribution(true);
    try {
      const payload = {
        targetMode: distributorTargetMode,
        employeeId:
          distributorTargetMode === "single"
            ? distributorTargetEmployeeId
            : undefined,
        allocations,
      };

      const res = await authenticatedFetch("/admin/employees/distribute-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res || !res.ok) {
        const errJson = res ? await res.json().catch(() => ({})) : {};
        throw new Error(errJson?.message || "Failed to distribute stock.");
      }

      const result = await res.json();
      addNotification(
        result.message || "Stock successfully distributed.",
        "success"
      );
      setIsDistributorOpen(false);
      loadEmployeeList();
    } catch (err) {
      addNotification(
        err instanceof Error ? err.message : "Failed to distribute stock.",
        "error"
      );
    } finally {
      setSubmittingDistribution(false);
    }
  };



  const [modalAlert, setModalAlert] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!modalAlert) return;
    const t = setTimeout(() => setModalAlert(null), 4000);
    return () => clearTimeout(t);
  }, [modalAlert]);

  const validateField = (
    field: keyof EmployeeForm,
    value: string,
  ): string | undefined => {
    let errorMsg: string | undefined = undefined;

    switch (field) {
      case "firstName":
        if (!value.trim()) {
          errorMsg = "First name is required.";
        } else if (!/^[A-Za-z\s]{2,}$/.test(value.trim())) {
          errorMsg =
            "First name should contain only letters (at least 2 characters).";
        }
        break;

      case "lastName":
        if (!value.trim()) {
          errorMsg = "Last name is required.";
        } else if (!/^[A-Za-z\s]{2,}$/.test(value.trim())) {
          errorMsg =
            "Last name should contain only letters (at least 2 characters).";
        }
        break;

      case "email":
        if (!value.trim()) {
          errorMsg = "Email address is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          errorMsg =
            "Please enter a valid email address (e.g. name@domain.com).";
        }
        break;

      case "phone":
        if (!value.trim()) {
          errorMsg = "Phone number is required.";
        } else if (!/^(?:\+94|0)?[1-9][0-9]{8}$/.test(value.trim())) {
          errorMsg =
            "Enter a valid 10-digit phone number (e.g. 0771234567 or +94771234567).";
        }
        break;

      case "branchId":
        if (!value) {
          errorMsg = "Please select an assigned branch.";
        }
        break;

      case "position":
        if (!value.trim()) {
          errorMsg = "Please select a position.";
        }
        break;

      case "commissionPerParcel":
        if (value.trim() !== "") {
          const num = Number(value);
          if (Number.isNaN(num) || num < 0 || num > 100) {
            errorMsg = "Commission must be a percentage between 0% and 100%.";
          }
        }
        break;

      case "address":
        if (value.trim() !== "" && value.trim().length < 3) {
          errorMsg = "Address must be at least 3 characters long.";
        }
        break;
    }

    setFormErrors((prev) => ({ ...prev, [field]: errorMsg }));
    return errorMsg;
  };

  const setField = (field: keyof EmployeeForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
    if (modalAlert) setModalAlert(null);
  };

  const validateForm = (): boolean => {
    const errs: Partial<Record<keyof EmployeeForm, string>> = {
      firstName: validateField("firstName", form.firstName),
      lastName: validateField("lastName", form.lastName),
      email: validateField("email", form.email),
      phone: validateField("phone", form.phone),
      branchId: validateField("branchId", form.branchId),
      position: validateField("position", form.position),
      commissionPerParcel: validateField("commissionPerParcel", form.commissionPerParcel),
      address: validateField("address", form.address),
    };

    const hasErrors = Object.values(errs).some((e) => e !== undefined);
    if (hasErrors) {
      setModalAlert({
        type: "error",
        text: "Please correct the highlighted errors in the form before submitting.",
      });
    }
    return !hasErrors;
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
          ...(form.commissionPerParcel.trim()
            ? { commissionPerParcel: Number(form.commissionPerParcel) }
            : {}),
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
        const empName = `${data.employee.firstName} ${data.employee.lastName}`;
        addEmployee(data.employee.employeeId, empName);
        setStockSuggestion({
          employeeId: data.employee.employeeId,
          name: empName,
          branchName: data.employee.branchName || "Assigned Branch",
        });
      }
      setForm(EMPTY_FORM);
      setFormErrors({});
      setAddModalOpen(false);
      if (data?.credentials) setCreatedCredentials(data.credentials);
      loadEmployeeList();
    } catch (error) {
      addNotification(
        error instanceof Error
          ? error.message
          : "Failed to create the employee account.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveEmployee = async () => {
    if (!removeTarget || removing) return;

    setRemoving(true);
    try {
      const response = await authenticatedFetch(
        `/admin/employees/${removeTarget.id}`,
        {
          method: "DELETE",
        },
      );

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
      loadEmployeeList();
    } catch (error) {
      addNotification(
        error instanceof Error
          ? error.message
          : "Failed to remove the employee.",
        "error",
      );
    } finally {
      setRemoving(false);
    }
  };

  const onDutyCount = employeeList.filter(
    (e) => e.availabilityStatus === "AVAILABLE",
  ).length;

  const onBreakCount = employeeList.filter(
    (e) => e.availabilityStatus !== "AVAILABLE",
  ).length;

  // Filter employees by search query & duty filter
  const filteredEmployees = employeeList.filter((emp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      emp.name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.phone.toLowerCase().includes(q) ||
      emp.position.toLowerCase().includes(q) ||
      emp.branchName.toLowerCase().includes(q);

    const isAvailable = emp.availabilityStatus === "AVAILABLE";
    const matchesDuty =
      dutyFilter === "all" ||
      (dutyFilter === "duty" && isAvailable) ||
      (dutyFilter === "break" && !isAvailable);

    return matchesSearch && matchesDuty;
  });

  const totalBranchesCount = new Set(employeeList.map((e) => e.branchId)).size;
  const activeCount = employeeList.filter(
    (e) => e.accountStatus?.toLowerCase() === "active",
  ).length;

  return (
    <div className="space-y-8 select-none text-xs">
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
            EMPLOYEE DIRECTORY & ROSTER
          </h2>
          <p className="text-xs text-[#8e8e93] font-medium tracking-wide">
            Manage staff accounts, branch assignments, contact details,
            commission rates, and live availability.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => openStockDistributorModal(null)}
            className="bg-[#10b981] text-black hover:bg-[#059669] active:bg-[#047857] font-bold text-xs tracking-[0.12em] px-4 py-2.5 rounded-md transition-all shadow-md shadow-emerald-500/10 uppercase flex items-center gap-2 cursor-pointer w-fit"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <span>DISTRIBUTE STOCK (ALL STAFF)</span>
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
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
            <span>ADD EMPLOYEE</span>
          </button>
        </div>
      </div>

      {/* Workforce Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">
            TOTAL REGISTERED STAFF
          </h4>
          <div className="text-2xl font-bold text-white mt-2 font-mono-meta">
            {employeeList.length}{" "}
            <span className="text-xs text-[#8e8e93] font-medium font-sans">
              {employeeList.length === 1 ? "Employee" : "Employees"}
            </span>
          </div>
        </div>
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">
            ON DUTY STAFF
          </h4>
          <div className="text-2xl font-bold text-[#10b981] mt-2 font-mono-meta flex items-center gap-2">
            <span>{onDutyCount}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
          </div>
        </div>
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">
            ON BREAK / OFF DUTY
          </h4>
          <div className="text-2xl font-bold text-[#f59e0b] mt-2 font-mono-meta flex items-center gap-2">
            <span>{onBreakCount}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
          </div>
        </div>
        <div className="admin-card p-6">
          <h4 className="text-[9px] font-bold text-[#8e8e93] tracking-widest uppercase">
            ASSIGNED BRANCHES
          </h4>
          <div className="text-2xl font-bold text-white mt-2 font-mono-meta">
            {totalBranchesCount}{" "}
            <span className="text-xs text-[#8e8e93] font-medium font-sans">
              Active Locations
            </span>
          </div>
        </div>
      </div>

      {/* Employee List Section */}
      <div className="admin-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-4 flex-wrap">
            <h3 className="text-[10px] font-bold tracking-widest uppercase text-white flex items-center gap-2">
              STAFF ROSTER ({filteredEmployees.length})
            </h3>
            <div className="flex items-center gap-1 bg-[#141417] p-1 rounded-lg border border-white/10 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setDutyFilter("all")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  dutyFilter === "all"
                    ? "bg-white text-black shadow"
                    : "text-[#8e8e93] hover:text-white"
                }`}
              >
                ALL ({employeeList.length})
              </button>
              <button
                type="button"
                onClick={() => setDutyFilter("duty")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  dutyFilter === "duty"
                    ? "bg-[#10b981] text-black shadow"
                    : "text-[#10b981] hover:text-white"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                ON DUTY ({onDutyCount})
              </button>
              <button
                type="button"
                onClick={() => setDutyFilter("break")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  dutyFilter === "break"
                    ? "bg-[#f59e0b] text-black shadow"
                    : "text-[#f59e0b] hover:text-white"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                ON BREAK ({onBreakCount})
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by name, email, phone, position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            Loading Employee Roster...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12 text-[#8e8e93]">
            {searchQuery
              ? "No employees match your search query."
              : "No employees registered yet. Click ADD EMPLOYEE above to create one."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredEmployees.map((emp) => {
              const avatarInitials = emp.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              const isDuty = emp.availabilityStatus === "AVAILABLE";
              const isBusy = emp.availabilityStatus === "BUSY";

              return (
                <div
                  key={emp.employeeId}
                  className="bg-[#121214] border border-white/5 hover:border-white/15 rounded-2xl p-5 lg:p-6 transition-all shadow-lg hover:shadow-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-6"
                >
                  {/* Left Column: Avatar + Profile Identity */}
                  <div className="flex items-start gap-4 min-w-0 xl:w-[32%]">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 text-white font-extrabold flex items-center justify-center text-base shadow-inner flex-shrink-0">
                      {avatarInitials}
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-white text-base tracking-wide truncate" title={emp.name}>
                          {emp.name}
                        </h4>
                        <span className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 font-bold text-[9px] px-2 py-0.5 rounded tracking-wider uppercase">
                          {emp.position || "Employee"}
                        </span>
                        {/* Live Duty Availability Badge */}
                        <span
                          className={`font-bold text-[9px] px-2 py-0.5 rounded tracking-wider uppercase flex items-center gap-1 ${
                            isDuty
                              ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30"
                              : isBusy
                              ? "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30"
                              : "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDuty
                                ? "bg-[#10b981] animate-pulse"
                                : isBusy
                                ? "bg-[#ef4444]"
                                : "bg-[#f59e0b]"
                            }`}
                          ></span>
                          {isDuty ? "ON DUTY" : isBusy ? "BUSY" : "ON BREAK"}
                        </span>
                        <span
                          className={`font-bold text-[9px] px-2 py-0.5 rounded tracking-wider uppercase ${
                            emp.accountStatus?.toLowerCase() === "active"
                              ? "bg-[#10b981]/20 text-[#10b981]"
                              : "bg-white/10 text-[#8e8e93]"
                          }`}
                        >
                          {emp.accountStatus || "Active"}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-[#8e8e93]">
                        <div className="flex items-center gap-3 flex-wrap font-mono-meta">
                          <span className="flex items-center gap-1.5 text-white/80">
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
                            {emp.email}
                          </span>

                          <span className="flex items-center gap-1.5 text-white/80">
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
                            {emp.phone}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#71717a]">
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
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                            <strong className="text-white font-medium">
                              {emp.branchName}
                            </strong>
                          </span>

                          {emp.address && (
                            <span
                              className="flex items-center gap-1 truncate max-w-[240px]"
                              title={emp.address}
                            >
                              <svg
                                className="w-3 h-3 text-[#71717a]"
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
                              {emp.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Expanded Metrics Grid (Assigned Stock, Commission, Logistics) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 xl:max-w-2xl">
                    {/* Tile 1: Assigned Stock Tile */}
                    <div
                      onClick={() => setViewStockEmployee(emp)}
                      className="bg-[#18181c] hover:bg-[#1e1e24] p-3.5 rounded-xl border border-white/5 hover:border-[#10b981]/30 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
                      title="Click to view assigned garment breakdown"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#8e8e93] group-hover:text-[#10b981] font-bold tracking-wider uppercase transition-colors">
                          ASSIGNED STOCK
                        </span>
                        <span className="text-[9px] bg-white/5 group-hover:bg-[#10b981]/15 text-[#8e8e93] group-hover:text-[#10b981] px-1.5 py-0.5 rounded font-mono-meta transition-colors">
                          VIEW ↗
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`font-mono-meta font-extrabold text-xl ${
                              (emp.totalStockUnits || 0) > 0
                                ? "text-[#10b981]"
                                : "text-[#71717a]"
                            }`}
                          >
                            {emp.totalStockUnits || 0}
                          </span>
                          <span className="text-xs text-[#8e8e93]">units</span>
                        </div>
                        <span className="text-[10px] text-[#71717a] block mt-0.5">
                          {(emp.assignedStock || []).length} active SKUs
                        </span>
                      </div>
                    </div>

                    {/* Tile 2: Commission Rate */}
                    <div className="bg-[#18181c] p-3.5 rounded-xl border border-white/5 flex flex-col justify-between shadow-sm">
                      <span className="text-[9px] text-[#8e8e93] font-bold tracking-wider uppercase block">
                        COMMISSION RATE
                      </span>
                      <div className="mt-2">
                        <span className="font-mono-meta font-bold text-white text-lg block">
                          {emp.commissionPerParcel &&
                          emp.commissionPerParcel > 0
                            ? `${emp.commissionPerParcel}%`
                            : "0%"}
                        </span>
                        <span className="text-[10px] text-[#71717a] block mt-0.5">
                          {emp.commissionPerParcel &&
                          emp.commissionPerParcel > 0
                            ? "Per parcel commission"
                            : "No commission"}
                        </span>
                      </div>
                    </div>

                    {/* Tile 3: Fulfillment Performance */}
                    <div className="bg-[#18181c] p-3.5 rounded-xl border border-white/5 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#8e8e93] font-bold tracking-wider uppercase">
                          FULFILLMENT
                        </span>
                        <span className="text-[9px] font-mono-meta font-bold text-[#10b981]">
                          {emp.metrics?.successRate || 0}% rate
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 mt-2 text-center font-mono-meta">
                        <div>
                          <span className="text-[8px] text-[#71717a] block uppercase">
                            PREP
                          </span>
                          <span className="text-xs font-bold text-white">
                            {emp.metrics?.preparedCount || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-[#71717a] block uppercase">
                            SENT
                          </span>
                          <span className="text-xs font-bold text-white">
                            {emp.metrics?.dispatchedCount || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-[#71717a] block uppercase">
                            DONE
                          </span>
                          <span className="text-xs font-bold text-[#10b981]">
                            {emp.metrics?.deliveredCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions Group */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 xl:pt-0 border-t xl:border-t-0 border-white/5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewStockEmployee(emp)}
                      title={`View garment stock held by ${emp.name}`}
                      className="bg-white/5 hover:bg-white/10 hover:border-white/20 border border-white/10 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 uppercase active:scale-95 whitespace-nowrap"
                    >
                      <svg
                        className="w-4 h-4 text-[#10b981]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      <span>VIEW STOCK</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openStockDistributorModal(emp.employeeId)}
                      title={`Distribute & allocate garment stock to ${emp.name}`}
                      className="bg-[#10b981] hover:bg-[#059669] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#10b981]/20 cursor-pointer flex items-center gap-1.5 uppercase active:scale-95 whitespace-nowrap"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      <span>DISTRIBUTE STOCK</span>
                    </button>

                    <button
                      onClick={() => openEditModal(emp)}
                      title={`Edit ${emp.name}`}
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 hover:border-white/20 border border-white/10 text-[#8e8e93] hover:text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
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
                    </button>

                    <button
                      onClick={() =>
                        setRemoveTarget({
                          id: emp.employeeId,
                          name: emp.name,
                        })
                      }
                      title={`Remove ${emp.name}`}
                      className="w-9 h-9 rounded-xl bg-red-950/20 hover:bg-[#ef4444] text-[#ef4444] hover:text-white border border-[rgba(239,68,68,0.2)] flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATED CREDENTIALS NOTIFICATION */}
      {createdCredentials && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-[#121212] border border-[#10b981] rounded-lg shadow-2xl p-5 select-none">
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-xs font-bold text-[#10b981] tracking-widest uppercase flex items-center gap-2">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              NEW EMPLOYEE CREATED
            </h4>
            <button
              onClick={() => setCreatedCredentials(null)}
              className="text-[#8e8e93] hover:text-white cursor-pointer"
            >
              &times;
            </button>
          </div>
          <p className="text-[#8e8e93] text-[11px] mb-3">
            Provide the following login credentials to the employee. They will
            be forced to set a permanent password upon initial login:
          </p>
          <div className="bg-black/60 p-3 rounded border border-white/10 font-mono-meta space-y-1 text-xs">
            <div>
              <span className="text-[#8e8e93]">EMAIL:</span>{" "}
              <strong className="text-white">
                {createdCredentials.email}
              </strong>
            </div>
            <div>
              <span className="text-[#8e8e93]">TEMP PASSWORD:</span>{" "}
              <strong className="text-[#10b981]">
                {createdCredentials.password}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-fadeIn">
          <div
            className="w-full max-w-xl bg-[#0c0c0e]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#141417]/80 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center text-[#10b981]">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-widest uppercase text-white">
                    ADD NEW EMPLOYEE
                  </h3>
                  <p className="text-[10px] text-[#8e8e93] tracking-wide uppercase font-semibold">
                    Create employee account, assign branch & set commission
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e93] hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/5"
                disabled={submitting}
              >
                &times;
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={handleCreateEmployee}
              className="p-6 space-y-6 text-xs overflow-y-auto custom-scrollbar flex-1"
              noValidate
            >
              {/* Modal Banner Alert (Customer Style) */}
              {modalAlert && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 shadow-lg transition-all ${
                    modalAlert.type === "error"
                      ? "bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]"
                      : "bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      {modalAlert.type === "error" ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      )}
                    </svg>
                    <span>{modalAlert.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalAlert(null)}
                    className="opacity-70 hover:opacity-100 text-current cursor-pointer text-sm font-bold"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Section 1: Personal Details */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[#10b981] tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                  PERSONAL DETAILS
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                      FIRST NAME <span className="text-[#ef4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setField("firstName", e.target.value)}
                      onBlur={(e) => validateField("firstName", e.target.value)}
                      placeholder="e.g. John"
                      className={`w-full bg-[#141417] border rounded-lg px-3.5 py-2.5 text-white placeholder-[#555] focus:outline-none transition-all ${
                        formErrors.firstName
                          ? "border-[#ef4444] bg-[#ef4444]/5 focus:border-[#ef4444]"
                          : "border-white/10 hover:border-white/20 focus:border-[#10b981]"
                      }`}
                    />
                    {formErrors.firstName && (
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
                        {formErrors.firstName}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                      LAST NAME <span className="text-[#ef4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => setField("lastName", e.target.value)}
                      onBlur={(e) => validateField("lastName", e.target.value)}
                      placeholder="e.g. Perera"
                      className={`w-full bg-[#141417] border rounded-lg px-3.5 py-2.5 text-white placeholder-[#555] focus:outline-none transition-all ${
                        formErrors.lastName
                          ? "border-[#ef4444] bg-[#ef4444]/5 focus:border-[#ef4444]"
                          : "border-white/10 hover:border-white/20 focus:border-[#10b981]"
                      }`}
                    />
                    {formErrors.lastName && (
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
                        {formErrors.lastName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Contact & Account Credentials */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[#10b981] tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                  CONTACT & WORKFORCE ASSIGNMENT
                </h4>

                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    LOGIN EMAIL ADDRESS <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    onBlur={(e) => validateField("email", e.target.value)}
                    placeholder="john.perera@vergowear.com"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                      PHONE NUMBER <span className="text-[#ef4444]">*</span>
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

                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                      POSITION / ROLE <span className="text-[#ef4444]">*</span>
                    </label>
                    <select
                      value={form.position}
                      onChange={(e) => setField("position", e.target.value)}
                      onBlur={(e) => validateField("position", e.target.value)}
                      className={`w-full bg-[#141417] border rounded-lg px-3.5 py-2.5 text-white focus:outline-none transition-all cursor-pointer ${
                        formErrors.position
                          ? "border-[#ef4444] bg-[#ef4444]/5 focus:border-[#ef4444]"
                          : "border-white/10 hover:border-white/20 focus:border-[#10b981]"
                      }`}
                    >
                      <option value="" className="bg-[#121212]">
                        Select Position
                      </option>
                      {POSITION_OPTIONS.map((pos) => (
                        <option
                          key={pos}
                          value={pos}
                          className="bg-[#121212] py-2"
                        >
                          {pos}
                        </option>
                      ))}
                    </select>
                    {formErrors.position && (
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
                        {formErrors.position}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    ASSIGNED BRANCH <span className="text-[#ef4444]">*</span>
                  </label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setField("branchId", e.target.value)}
                    onBlur={(e) => validateField("branchId", e.target.value)}
                    disabled={branchesLoading}
                    className={`w-full bg-[#141417] border rounded-lg px-3.5 py-2.5 text-white focus:outline-none transition-all cursor-pointer disabled:opacity-50 ${
                      formErrors.branchId
                        ? "border-[#ef4444] bg-[#ef4444]/5 focus:border-[#ef4444]"
                        : "border-white/10 hover:border-white/20 focus:border-[#10b981]"
                    }`}
                  >
                    <option value="" className="bg-[#121212]">
                      {branchesLoading
                        ? "Loading branches..."
                        : "Select Assigned Branch"}
                    </option>
                    {branches.map((b) => (
                      <option
                        key={b.branchId}
                        value={b.branchId}
                        className="bg-[#121212] py-2"
                      >
                        {b.name} ({b.address || "Main Hub"})
                      </option>
                    ))}
                  </select>
                  {formErrors.branchId && (
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
                      {formErrors.branchId}
                    </span>
                  )}
                </div>
              </div>

              {/* Section 3: Compensation & Address */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[#10b981] tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                  LOGISTICS & COMPENSATION
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase">
                        COMMISSION PER PARCEL (%)
                      </label>
                      <span className="text-[9px] text-[#8e8e93] font-normal uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        Optional
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={form.commissionPerParcel}
                        onChange={(e) =>
                          setField("commissionPerParcel", e.target.value)
                        }
                        onBlur={(e) =>
                          validateField("commissionPerParcel", e.target.value)
                        }
                        placeholder="e.g. 5"
                        className={`w-full bg-[#141417] border rounded-lg pl-3.5 pr-8 py-2.5 text-white placeholder-[#555] focus:outline-none transition-all font-mono-meta ${
                          formErrors.commissionPerParcel
                            ? "border-[#ef4444] bg-[#ef4444]/5 focus:border-[#ef4444]"
                            : "border-white/10 hover:border-white/20 focus:border-[#10b981]"
                        }`}
                      />
                      <span className="absolute right-3.5 top-2.5 text-[#8e8e93] text-xs font-mono-meta font-bold">
                        %
                      </span>
                    </div>
                    {formErrors.commissionPerParcel && (
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
                        {formErrors.commissionPerParcel}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase">
                        RESIDENTIAL ADDRESS
                      </label>
                      <span className="text-[9px] text-[#8e8e93] font-normal uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        Optional
                      </span>
                    </div>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setField("address", e.target.value)}
                      onBlur={(e) => validateField("address", e.target.value)}
                      placeholder="e.g. No. 45, Main Street, Colombo 03"
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
                </div>
              </div>

              {/* Note banner */}
              <div className="bg-[#10b981]/5 border border-[#10b981]/20 rounded-xl p-3.5 text-[11px] text-[#10b981] flex items-start gap-2.5">
                <svg
                  className="w-4 h-4 text-[#10b981] flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="leading-relaxed">
                  A temporary password will be generated for initial sign-in.
                  The employee will be prompted to reset their password upon
                  first login.
                </p>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 bg-transparent hover:bg-white/5 border border-white/10 text-[#8e8e93] hover:text-white font-bold tracking-widest px-4 py-3 rounded-xl transition-all uppercase cursor-pointer disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#10b981] text-black hover:bg-[#059669] active:bg-[#047857] disabled:bg-[#10b981]/40 disabled:text-black/50 font-bold tracking-widest px-4 py-3 rounded-xl transition-all shadow-lg shadow-[#10b981]/20 uppercase cursor-pointer"
                >
                  {submitting ? "CREATING ACCOUNT..." : "CREATE EMPLOYEE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE EMPLOYEE CONFIRMATION MODAL */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none">
          <div className="w-full max-w-md bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-md p-6">
            <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#ef4444]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              REMOVE EMPLOYEE
            </h3>
            <p className="text-[#8e8e93] text-xs mb-6 leading-relaxed">
              Are you sure you want to remove{" "}
              <span className="text-white font-bold">{removeTarget.name}</span>?
              This action permanently removes their account.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={removing}
                className="flex-1 bg-transparent border border-white/10 hover:bg-white/5 text-[#8e8e93] hover:text-white py-2.5 rounded-md text-xs font-bold uppercase transition-all cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleRemoveEmployee}
                disabled={removing}
                className="flex-1 bg-[#ef4444] text-white hover:bg-[#dc2626] disabled:bg-[#ef4444]/40 py-2.5 rounded-md text-xs font-bold uppercase transition-all cursor-pointer"
              >
                {removing ? "REMOVING..." : "REMOVE"}
              </button>
            </div>
          </div>
        </div>
      )}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none">
          <div
            className="w-full max-w-md bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-md shadow-2xl overflow-hidden p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-sm font-bold tracking-widest uppercase text-white flex items-center gap-2">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                EMPLOYEE CREATED
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-[#8e8e93] leading-relaxed">
                Share these login credentials with the employee. The password is
                shown <span className="text-white font-bold">only once</span>{" "}
                here, so copy it now.
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
                          .then(() =>
                            addNotification(
                              `${label.charAt(0) + label.slice(1).toLowerCase()} copied to clipboard.`,
                              "success",
                            ),
                          )
                          .catch(() =>
                            addNotification(
                              "Unable to copy to clipboard.",
                              "error",
                            ),
                          );
                      }}
                      className="bg-white/5 hover:bg-white/10 border border-[rgba(255,255,255,0.08)] text-[#8e8e93] hover:text-white px-3 rounded-md transition-all cursor-pointer"
                      title={`Copy ${label.toLowerCase()}`}
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-[#8e8e93] leading-relaxed">
                The employee signs in with this email and password. They can
                keep using this password, or change it anytime via Forgot
                Password.
              </p>

              {/* Suggestion Notification to Assign Stock to Newly Created Employee */}
              {stockSuggestion && (
                <div className="bg-[#10b981]/10 border border-[#10b981]/30 p-3.5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#10b981] font-bold">
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
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>SUGGESTION: ASSIGN INITIAL STOCK</span>
                  </div>
                  <p className="text-[#8e8e93] text-[11px] leading-relaxed">
                    Newly created employees do not contain stock by default.
                    Would you like to allocate initial stock inventory to{" "}
                    <strong className="text-white">
                      {stockSuggestion.name}
                    </strong>{" "}
                    now?
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        openStockDistributorModal(stockSuggestion.employeeId);
                        setCreatedCredentials(null);
                        setStockSuggestion(null);
                      }}
                      className="flex-1 bg-[#10b981] text-black font-bold text-[11px] tracking-wider px-3 py-2 rounded-lg hover:bg-[#059669] transition-all cursor-pointer uppercase"
                    >
                      ASSIGN STOCK NOW
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockSuggestion(null)}
                      className="bg-white/5 text-[#8e8e93] hover:text-white font-bold text-[11px] px-3 py-2 rounded-lg transition-all cursor-pointer uppercase border border-white/10"
                    >
                      SKIP
                    </button>
                  </div>
                </div>
              )}

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

      {/* MULTI-VARIANT STOCK DISTRIBUTOR MODAL */}
      {isDistributorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none p-4 overflow-y-auto">
          <div
            className="w-full max-w-4xl bg-[#0c0c0e]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6 my-8 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold tracking-wider uppercase text-white flex items-center gap-2.5">
                  <span className="p-2 bg-[#10b981]/10 rounded-lg text-[#10b981]">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </span>
                  <span>MULTI-VARIANT STOCK DISTRIBUTOR</span>
                </h3>
                <p className="text-[11px] text-[#8e8e93] tracking-wide mt-1">
                  Allocate and distribute garment stocks (Color × Size) with real-time warehouse remainder calculation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDistributorOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e93] hover:text-white flex items-center justify-center transition-all cursor-pointer text-lg"
              >
                &times;
              </button>
            </div>

            {loadingOverview ? (
              <div className="py-20 text-center text-[#8e8e93] uppercase tracking-widest font-semibold flex flex-col items-center justify-center gap-3">
                <svg
                  className="animate-spin w-6 h-6 text-[#10b981]"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                <span>SYNCING MASTER INVENTORY STOCK...</span>
              </div>
            ) : !distributionOverview ||
              distributionOverview.products.length === 0 ? (
              <div className="py-16 text-center text-[#8e8e93] space-y-2">
                <p className="font-bold text-white text-sm">
                  NO PRODUCTS FOUND IN CATALOG
                </p>
                <p className="text-xs">
                  Create garments in Master Catalog first before distributing stocks.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleConfirmDistribution}
                className="space-y-6 flex-1 overflow-y-auto pr-1"
              >
                {/* STEP 1: GARMENT SELECTOR & DISTRIBUTION TARGET */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#141417] p-4 rounded-xl border border-white/5">
                  {/* Select Garment */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-1.5">
                      1. SELECT GARMENT PRODUCT <span className="text-[#ef4444]">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedProduct?.productId || ""}
                        onChange={(e) => {
                          const p = distributionOverview.products.find(
                            (prod) => prod.productId === e.target.value
                          );
                          setSelectedProduct(p || null);
                          setAllocationQuantities({});
                        }}
                        className="w-full bg-[#1c1c20] border border-white/10 rounded-lg px-3.5 py-2.5 text-white font-bold text-xs focus:outline-none transition-all cursor-pointer"
                      >
                        {distributionOverview.products.map((prod) => (
                          <option
                            key={prod.productId}
                            value={prod.productId}
                            className="bg-[#141417]"
                          >
                            {prod.name} ({prod.categoryName}) — {prod.totalStock} units in whs
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Distribution Target Mode */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-1.5">
                      2. DISTRIBUTION TARGET <span className="text-[#ef4444]">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDistributorTargetMode("all")}
                        className={`px-3 py-2 rounded-lg text-[11px] font-bold tracking-wider uppercase border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          distributorTargetMode === "all"
                            ? "bg-[#10b981]/15 border-[#10b981] text-[#10b981] shadow"
                            : "bg-[#1c1c20] border-white/5 text-[#8e8e93] hover:text-white"
                        }`}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <span>ALL STAFF ({distributionOverview.employees.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDistributorTargetMode("single")}
                        className={`px-3 py-2 rounded-lg text-[11px] font-bold tracking-wider uppercase border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          distributorTargetMode === "single"
                            ? "bg-white text-black border-white shadow"
                            : "bg-[#1c1c20] border-white/5 text-[#8e8e93] hover:text-white"
                        }`}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span>INDIVIDUAL</span>
                      </button>
                    </div>

                    {distributorTargetMode === "single" && (
                      <div className="mt-2">
                        <select
                          value={distributorTargetEmployeeId}
                          onChange={(e) =>
                            setDistributorTargetEmployeeId(e.target.value)
                          }
                          className="w-full bg-[#1c1c20] border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono-meta text-xs focus:outline-none cursor-pointer"
                        >
                          {distributionOverview.employees.map((emp) => (
                            <option
                              key={emp.employeeId}
                              value={emp.employeeId}
                              className="bg-[#141417]"
                            >
                              {emp.name} ({emp.branchName || "Main Branch"})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* STEP 2: SELECTED GARMENT HIGHLIGHT CARD */}
                {selectedProduct && (
                  <div className="bg-[#161619] border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      {selectedProduct.mainImage ? (
                        <img
                          src={selectedProduct.mainImage}
                          alt={selectedProduct.name}
                          className="w-14 h-14 object-cover rounded-lg border border-white/10"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-black/40 rounded-lg border border-white/10 flex items-center justify-center text-[#555] font-bold text-[9px]">
                          NO IMG
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-black/60 text-[#8e8e93] font-bold text-[9px] px-2 py-0.5 rounded border border-white/10 uppercase tracking-wider">
                            {selectedProduct.categoryName}
                          </span>
                          <span className="text-[9px] font-bold text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/20 uppercase">
                            BASE: ${selectedProduct.basePrice.toFixed(2)}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wide mt-1">
                          {selectedProduct.name}
                        </h4>
                        <p className="text-[10px] text-[#8e8e93]">
                          {selectedProduct.variants.length} active variants •{" "}
                          {selectedProduct.totalStock} total units in inventory
                        </p>
                      </div>
                    </div>

                    {/* Quick Bulk Presets Bar */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <div className="flex items-center bg-[#1c1c20] border border-white/10 rounded-lg overflow-hidden p-0.5">
                        <span className="text-[9px] text-[#8e8e93] font-bold uppercase px-2">
                          SET ALL:
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={bulkSetAllValue}
                          onChange={(e) => setBulkSetAllValue(e.target.value)}
                          className="w-12 bg-black/40 border-x border-white/10 px-1.5 py-1 text-center text-white font-mono-meta text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleSetAllSizes(parseInt(bulkSetAllValue) || 5)
                          }
                          className="bg-white/10 hover:bg-white text-[#8e8e93] hover:text-black font-bold text-[9px] uppercase px-2.5 py-1.5 transition-all cursor-pointer"
                        >
                          APPLY
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleFillMaxRemaining}
                        className="bg-white/5 hover:bg-white/15 border border-white/10 text-white font-bold text-[9px] tracking-wider uppercase px-2.5 py-2 rounded-lg transition-all cursor-pointer"
                      >
                        MAX AVAILABLE
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyFirstColorToAll}
                        className="bg-white/5 hover:bg-white/15 border border-white/10 text-[#8e8e93] hover:text-white font-bold text-[9px] tracking-wider uppercase px-2.5 py-2 rounded-lg transition-all cursor-pointer"
                      >
                        COPY 1ST COLOR
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAllocation}
                        className="bg-red-950/20 hover:bg-red-900/40 border border-red-800/30 text-red-400 font-bold text-[9px] uppercase px-2.5 py-2 rounded-lg transition-all cursor-pointer"
                      >
                        CLEAR
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: HIGH-DENSITY MULTI-VARIANT STOCK MATRIX */}
                {selectedProduct && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase">
                        3. GARMENT VARIANT ALLOCATION MATRIX (COLOR × SIZE)
                      </label>
                      <span className="text-[10px] text-[#8e8e93] font-mono-meta">
                        {distributorTargetMode === "all"
                          ? `Allocation multiplier: ×${distributionOverview.employees.length} employees`
                          : "Single employee allocation"}
                      </span>
                    </div>

                    <div className="bg-[#121214] border border-white/10 rounded-xl overflow-hidden shadow-inner">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#18181c] border-b border-white/10 text-[10px] font-bold tracking-wider text-[#8e8e93] uppercase">
                              <th className="py-3 px-4">COLOR / GARMENT</th>
                              <th className="py-3 px-4">SIZE</th>
                              <th className="py-3 px-4 font-mono-meta">SKU</th>
                              <th className="py-3 px-4 text-center">WHS STOCK</th>
                              <th className="py-3 px-4 text-center">CURRENTLY HELD</th>
                              <th className="py-3 px-4 text-center">
                                ALLOCATION QTY
                              </th>
                              <th className="py-3 px-4 text-center">AFTER ALLOCATION</th>
                              <th className="py-3 px-4 text-center">
                                REMAINING IN WHS
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {selectedProduct.variants.map((v) => {
                              const targetMultiplier =
                                distributorTargetMode === "all"
                                  ? distributionOverview.employees.length || 1
                                  : 1;

                              const enteredQty =
                                allocationQuantities[v.variantId] || 0;
                              const totalDeduction =
                                enteredQty * targetMultiplier;
                              const remainder =
                                v.totalWarehouseStock - totalDeduction;
                              const isOver = remainder < 0;

                              // Calculate currently held units for this variant
                              const currentlyHeld =
                                distributorTargetMode === "single"
                                  ? distributionOverview.employees
                                      .find(
                                        (e) =>
                                          e.employeeId ===
                                          distributorTargetEmployeeId
                                      )
                                      ?.assignedStock?.find(
                                        (s) => s.variantId === v.variantId
                                      )?.quantity || 0
                                  : distributionOverview.employees.reduce(
                                      (sum, e) =>
                                        sum +
                                        (e.assignedStock?.find(
                                          (s) => s.variantId === v.variantId
                                        )?.quantity || 0),
                                      0
                                    );

                              const postAllocation =
                                currentlyHeld +
                                (distributorTargetMode === "all"
                                  ? totalDeduction
                                  : enteredQty);

                              return (
                                <tr
                                  key={v.variantId}
                                  className={`hover:bg-white/[0.02] transition-colors ${
                                    isOver ? "bg-red-950/20" : ""
                                  }`}
                                >
                                  {/* Color Info */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0 shadow-sm"
                                        style={{ backgroundColor: v.colorHex }}
                                      ></span>
                                      <span className="font-bold text-white uppercase text-xs">
                                        {v.colorName}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Size Pill */}
                                  <td className="py-3 px-4">
                                    <span className="font-mono-meta font-bold text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white uppercase">
                                      {v.sizeName}
                                    </span>
                                  </td>

                                  {/* SKU */}
                                  <td className="py-3 px-4 font-mono-meta text-[11px] text-[#8e8e93]">
                                    {v.sku}
                                  </td>

                                  {/* Master Warehouse Total */}
                                  <td className="py-3 px-4 text-center">
                                    <span className="font-mono-meta font-bold text-xs text-white">
                                      {v.totalWarehouseStock} units
                                    </span>
                                  </td>

                                  {/* Currently Held */}
                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className={`font-mono-meta font-bold text-xs px-2 py-0.5 rounded ${
                                        currentlyHeld > 0
                                          ? "text-emerald-400 bg-emerald-950/30 border border-emerald-500/20"
                                          : "text-[#71717a]"
                                      }`}
                                    >
                                      {currentlyHeld} held
                                    </span>
                                  </td>

                                  {/* Allocation Input */}
                                  <td className="py-3 px-4 text-center">
                                    <div className="inline-flex items-center gap-1.5">
                                      <input
                                        type="number"
                                        min="0"
                                        max={Math.floor(
                                          v.totalWarehouseStock /
                                            targetMultiplier
                                        )}
                                        value={
                                          enteredQty === 0 ? "" : enteredQty
                                        }
                                        placeholder="0"
                                        onChange={(e) =>
                                          handleSetVariantQuantity(
                                            v.variantId,
                                            parseInt(e.target.value) || 0
                                          )
                                        }
                                        className={`w-20 bg-[#1a1a1e] border rounded-lg px-2.5 py-1.5 text-center font-mono-meta font-bold text-xs focus:outline-none transition-all ${
                                          isOver
                                            ? "border-red-500 text-red-400 bg-red-950/30"
                                            : enteredQty > 0
                                            ? "border-[#10b981] text-[#10b981] bg-[#10b981]/5"
                                            : "border-white/10 text-white"
                                        }`}
                                      />
                                      {distributorTargetMode === "all" &&
                                        enteredQty > 0 && (
                                          <span className="text-[9px] text-[#8e8e93] font-mono-meta">
                                            (={totalDeduction})
                                          </span>
                                        )}
                                    </div>
                                  </td>

                                  {/* After Allocation Projected Stock */}
                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className={`font-mono-meta font-extrabold text-xs px-2.5 py-1 rounded-md border inline-flex items-center gap-1 ${
                                        enteredQty > 0
                                          ? "text-[#10b981] bg-[#10b981]/15 border-[#10b981]/40 shadow-sm"
                                          : "text-[#71717a] border-white/5"
                                      }`}
                                    >
                                      <span>{postAllocation}</span>
                                      {enteredQty > 0 && (
                                        <span className="text-[9px] font-bold opacity-80">
                                          (+
                                          {distributorTargetMode === "all"
                                            ? totalDeduction
                                            : enteredQty}
                                          )
                                        </span>
                                      )}
                                    </span>
                                  </td>

                                  {/* Remaining Stock Badge */}
                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className={`font-mono-meta font-bold text-[11px] px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${
                                        isOver
                                          ? "bg-red-950/50 border-red-500/50 text-red-400 font-extrabold animate-pulse"
                                          : remainder === 0
                                          ? "bg-amber-950/30 border-amber-500/30 text-amber-300"
                                          : "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
                                      }`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          isOver
                                            ? "bg-red-400"
                                            : remainder === 0
                                            ? "bg-amber-400"
                                            : "bg-emerald-400"
                                        }`}
                                      ></span>
                                      <span>
                                        {isOver
                                          ? `DEFICIT: ${Math.abs(remainder)} units`
                                          : `${remainder} left`}
                                      </span>
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* DISTRIBUTION SUMMARY & ACTION FOOTER */}
                {selectedProduct &&
                  (() => {
                    const targetCount =
                      distributorTargetMode === "all"
                        ? distributionOverview.employees.length || 1
                        : 1;

                    const totalPerEmployee = Object.values(
                      allocationQuantities
                    ).reduce((sum, q) => sum + (q || 0), 0);
                    const totalDeducted = totalPerEmployee * targetCount;

                    const anyOverAllocated = selectedProduct.variants.some(
                      (v) => {
                        const entered = allocationQuantities[v.variantId] || 0;
                        return entered * targetCount > v.totalWarehouseStock;
                      }
                    );

                    return (
                      <div className="bg-[#141417] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-[10px] text-[#8e8e93] font-bold tracking-wider uppercase block">
                            DISTRIBUTION SUMMARY:
                          </span>
                          <div className="flex items-center gap-3 mt-1 flex-wrap font-mono-meta text-xs">
                            <span className="text-white">
                              <strong className="text-[#10b981] font-bold text-sm">
                                {totalPerEmployee}
                              </strong>{" "}
                              units / employee
                            </span>
                            <span className="text-[#555]">•</span>
                            <span className="text-white">
                              <strong className="text-white font-bold text-sm">
                                {totalDeducted}
                              </strong>{" "}
                              total warehouse units
                            </span>
                            <span className="text-[#555]">•</span>
                            <span className="text-[#8e8e93]">
                              Target:{" "}
                              {distributorTargetMode === "all"
                                ? `${targetCount} Active Staff`
                                : distributionOverview.employees.find(
                                    (e) =>
                                      e.employeeId ===
                                      distributorTargetEmployeeId
                                  )?.name || "Single Employee"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setIsDistributorOpen(false)}
                            className="bg-transparent hover:bg-white/5 border border-white/10 text-[#8e8e93] hover:text-white font-bold tracking-widest px-4 py-2.5 rounded-xl transition-all uppercase cursor-pointer"
                          >
                            CANCEL
                          </button>

                          <button
                            type="submit"
                            disabled={
                              submittingDistribution ||
                              totalPerEmployee === 0 ||
                              anyOverAllocated
                            }
                            className={`font-bold tracking-widest px-5 py-2.5 rounded-xl transition-all uppercase cursor-pointer flex items-center gap-2 shadow-lg ${
                              anyOverAllocated || totalPerEmployee === 0
                                ? "bg-white/5 text-[#555] border border-white/5 cursor-not-allowed"
                                : "bg-[#10b981] hover:bg-[#059669] text-black shadow-[#10b981]/20 active:scale-95"
                            }`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>
                              {submittingDistribution
                                ? "DISTRIBUTING..."
                                : "CONFIRM & DISTRIBUTE STOCK"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
              </form>
            )}
          </div>
        </div>
      )}

      {/* VIEW ASSIGNED STOCK MODAL */}
      {viewStockEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none p-4 overflow-y-auto">
          <div
            className="w-full max-w-3xl bg-[#0c0c0e]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 my-8 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981] font-bold text-base">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
                    <span>{viewStockEmployee.name}&apos;s ASSIGNED STOCK</span>
                    <span className="text-[10px] bg-[#10b981]/10 text-[#10b981] font-bold px-2 py-0.5 rounded border border-[#10b981]/20">
                      {viewStockEmployee.branchName}
                    </span>
                  </h3>
                  <p className="text-[10px] text-[#8e8e93] font-mono-meta mt-0.5">
                    {viewStockEmployee.email} • {viewStockEmployee.position}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewStockEmployee(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e93] hover:text-white flex items-center justify-center transition-all cursor-pointer text-lg"
              >
                &times;
              </button>
            </div>

            {/* Inventory Overview Summary */}
            <div className="grid grid-cols-3 gap-3 flex-shrink-0">
              <div className="bg-[#141417] p-3.5 rounded-xl border border-white/5">
                <span className="text-[9px] text-[#8e8e93] font-bold uppercase tracking-wider block">
                  TOTAL ASSIGNED UNITS
                </span>
                <span className="text-xl font-bold font-mono-meta text-[#10b981] mt-1 block">
                  {viewStockEmployee.totalStockUnits || 0} units
                </span>
              </div>
              <div className="bg-[#141417] p-3.5 rounded-xl border border-white/5">
                <span className="text-[9px] text-[#8e8e93] font-bold uppercase tracking-wider block">
                  UNIQUE GARMENTS
                </span>
                <span className="text-xl font-bold font-mono-meta text-white mt-1 block">
                  {
                    new Set(
                      (viewStockEmployee.assignedStock || []).map(
                        (s) => s.productId
                      )
                    ).size
                  }{" "}
                  styles
                </span>
              </div>
              <div className="bg-[#141417] p-3.5 rounded-xl border border-white/5">
                <span className="text-[9px] text-[#8e8e93] font-bold uppercase tracking-wider block">
                  ACTIVE VARIANTS
                </span>
                <span className="text-xl font-bold font-mono-meta text-white mt-1 block">
                  {viewStockEmployee.assignedStock?.length || 0} SKUs
                </span>
              </div>
            </div>

            {/* Garment Stock List */}
            <div className="flex-1 overflow-y-auto pr-1">
              {!viewStockEmployee.assignedStock ||
              viewStockEmployee.assignedStock.length === 0 ? (
                <div className="py-16 text-center text-[#8e8e93] space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#555]">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <p className="font-bold text-white text-sm uppercase tracking-wide">
                    NO GARMENTS ASSIGNED YET
                  </p>
                  <p className="text-xs text-[#777] max-w-sm mx-auto">
                    This staff member currently holds 0 units in their branch
                    inventory pool. Click below to distribute initial garments.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const empId = viewStockEmployee.employeeId;
                      setViewStockEmployee(null);
                      openStockDistributorModal(empId);
                    }}
                    className="mt-2 bg-[#10b981] hover:bg-[#059669] text-black font-bold text-xs tracking-wider uppercase px-4 py-2 rounded-lg transition-all shadow cursor-pointer"
                  >
                    + DISTRIBUTE STOCK NOW
                  </button>
                </div>
              ) : (
                <div className="bg-[#121214] border border-white/10 rounded-xl overflow-hidden shadow-inner">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#18181c] border-b border-white/10 text-[10px] font-bold tracking-wider text-[#8e8e93] uppercase">
                          <th className="py-3 px-4">GARMENT & STYLE</th>
                          <th className="py-3 px-4">COLOR</th>
                          <th className="py-3 px-4">SIZE</th>
                          <th className="py-3 px-4 font-mono-meta">SKU</th>
                          <th className="py-3 px-4 text-center">
                            HELD QUANTITY
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {viewStockEmployee.assignedStock.map((item) => (
                          <tr
                            key={item.inventoryId}
                            className="hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.productName}
                                    className="w-9 h-9 object-cover rounded-md border border-white/10 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 bg-black/40 rounded-md border border-white/10 flex items-center justify-center text-[#555] font-bold text-[8px] flex-shrink-0">
                                    IMG
                                  </div>
                                )}
                                <div>
                                  <span className="font-bold text-white uppercase text-xs block">
                                    {item.productName}
                                  </span>
                                  <span className="text-[9px] text-[#8e8e93] font-semibold uppercase">
                                    {item.categoryName}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                                  style={{ backgroundColor: item.colorHex }}
                                ></span>
                                <span className="text-white font-medium uppercase text-xs">
                                  {item.colorName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono-meta font-bold text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white uppercase">
                                {item.sizeName}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono-meta text-[11px] text-[#8e8e93]">
                              {item.sku}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-mono-meta font-extrabold text-xs text-[#10b981] bg-[#10b981]/10 px-2.5 py-1 rounded-full border border-[#10b981]/20 inline-block">
                                {item.quantity} units
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => setViewStockEmployee(null)}
                className="bg-transparent hover:bg-white/5 border border-white/10 text-[#8e8e93] hover:text-white font-bold tracking-widest px-4 py-2.5 rounded-xl transition-all uppercase cursor-pointer"
              >
                CLOSE
              </button>

              <button
                type="button"
                onClick={() => {
                  const empId = viewStockEmployee.employeeId;
                  setViewStockEmployee(null);
                  openStockDistributorModal(empId);
                }}
                className="bg-[#10b981] text-black hover:bg-[#059669] font-bold tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#10b981]/20 uppercase cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>DISTRIBUTE MORE STOCK</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE DETAILS MODAL */}
      {editEmployeeTarget && (
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
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  EDIT EMPLOYEE DETAILS
                </h3>
                <p className="text-[10px] text-[#8e8e93] tracking-wide uppercase font-semibold mt-0.5">
                  Update branch and compensation for{" "}
                  <span className="text-white">{editEmployeeTarget.name}</span>
                </p>
              </div>
              <button
                onClick={() => setEditEmployeeTarget(null)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e93] hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  ASSIGNED BRANCH <span className="text-[#ef4444]">*</span>
                </label>
                <select
                  value={editForm.branchId}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, branchId: e.target.value }))
                  }
                  className="w-full bg-[#141417] border border-white/10 rounded-lg px-3.5 py-2.5 text-white focus:outline-none transition-all cursor-pointer"
                >
                  <option value="" disabled className="bg-[#121212]">
                    Select Branch...
                  </option>
                  {branches.map((branch) => (
                    <option
                      key={branch.branchId}
                      value={branch.branchId}
                      className="bg-[#121212]"
                    >
                      {branch.name} ({branch.address})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase">
                    COMMISSION PER PARCEL (%)
                  </label>
                  <span className="text-[9px] text-[#8e8e93] uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    Optional
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editForm.commissionPerParcel}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        commissionPerParcel: e.target.value,
                      }))
                    }
                    placeholder="e.g. 5"
                    className="w-full bg-[#141417] border border-white/10 rounded-lg pl-3.5 pr-8 py-2.5 text-white placeholder-[#555] focus:outline-none transition-all font-mono-meta"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[#8e8e93] text-xs font-mono-meta font-bold">
                    %
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase">
                    RESIDENTIAL ADDRESS
                  </label>
                  <span className="text-[9px] text-[#8e8e93] uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    Optional
                  </span>
                </div>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="e.g. No. 45, Main Street, Colombo 03"
                  className="w-full bg-[#141417] border border-white/10 rounded-lg px-3.5 py-2.5 text-white placeholder-[#555] focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditEmployeeTarget(null)}
                  disabled={updatingEmployee}
                  className="flex-1 bg-transparent hover:bg-white/5 border border-white/10 text-[#8e8e93] hover:text-white font-bold tracking-widest px-4 py-2.5 rounded-xl transition-all uppercase cursor-pointer disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={updatingEmployee}
                  className="flex-1 bg-[#10b981] text-black hover:bg-[#059669] font-bold tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-[#10b981]/20 uppercase cursor-pointer disabled:opacity-50"
                >
                  {updatingEmployee ? "SAVING..." : "SAVE CHANGES"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
