"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

interface DeliveryFeeRule {
  ruleId: string;
  district: string;
  baseDeliveryFee: number | string;
  baseItemLimit: number;
  additionalItemBlockSize: number;
  additionalBlockFee: number | string;
  fuelSurchargePercentage: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RuleForm {
  baseDeliveryFee: string;
  baseItemLimit: string;
  additionalItemBlockSize: string;
  additionalBlockFee: string;
  fuelSurchargePercentage: string;
  isActive: boolean;
}

async function responseMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;
  if (Array.isArray(body?.message)) return body.message.join(" ");
  return body?.message || fallback;
}

export default function AdminDeliveryPage() {
  const [rules, setRules] = useState<DeliveryFeeRule[]>([]);
  const [editingRule, setEditingRule] = useState<DeliveryFeeRule | null>(null);
  const [form, setForm] = useState<RuleForm>({
    baseDeliveryFee: "400",
    baseItemLimit: "5",
    additionalItemBlockSize: "5",
    additionalBlockFee: "140",
    fuelSurchargePercentage: "15",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof RuleForm, string>>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [shipperProfile, setShipperProfile] = useState<{
    shipperName: string;
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    addressLine4City: string;
    contactNumber1: string;
    contactNumber2: string;
  }>({
    shipperName: "Vergo",
    addressLine1: "No 20, Delkanda",
    addressLine2: "",
    addressLine3: "",
    addressLine4City: "Delkanda",
    contactNumber1: "0714685499",
    contactNumber2: "",
  });

  const [shipperModalOpen, setShipperModalOpen] = useState(false);
  const [shipperSaving, setShipperSaving] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    const response = await authenticatedFetch("/admin/delivery-fees");
    if (!response) {
      setLoading(false);
      return;
    }
    if (!response.ok) {
      setFeedback({
        message: await responseMessage(response, "Unable to load delivery rules."),
        type: "error",
      });
      setLoading(false);
      return;
    }
    const data: DeliveryFeeRule[] = await response.json();
    setRules(data);
    setLoading(false);
  }, []);

  const loadShipperProfile = useCallback(async () => {
    const response = await authenticatedFetch("/integrations/citypak/shipper-profile");
    if (response && response.ok) {
      const data = await response.json();
      if (data) {
        setShipperProfile({
          shipperName: data.shipperName || "Vergo",
          addressLine1: data.addressLine1 || "No 20, Delkanda",
          addressLine2: data.addressLine2 || "",
          addressLine3: data.addressLine3 || "",
          addressLine4City: data.addressLine4City || "Delkanda",
          contactNumber1: data.contactNumber1 || "0714685499",
          contactNumber2: data.contactNumber2 || "",
        });
      }
    }
  }, []);

  const handleSaveShipperProfile = async (e: FormEvent) => {
    e.preventDefault();
    setShipperSaving(true);
    const response = await authenticatedFetch("/integrations/citypak/shipper-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shipperProfile),
    });

    if (response && response.ok) {
      setFeedback({
        message: "Shipper / Return Address updated successfully!",
        type: "success",
      });
      setShipperModalOpen(false);
    } else {
      setFeedback({
        message: "Failed to update Shipper Return Address.",
        type: "error",
      });
    }
    setShipperSaving(false);
  };

  useEffect(() => {
    void loadRules();
    void loadShipperProfile();
  }, [loadRules, loadShipperProfile]);

  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rules;
    return rules.filter((rule) => rule.district.toLowerCase().includes(query));
  }, [search, rules]);

  // Check if all active rules are identical to determine summary mode
  const summaryConfig = useMemo(() => {
    const activeRules = rules.filter((r) => r.isActive);
    if (activeRules.length === 0) {
      return { isUniform: false, first: null, activeCount: 0, customizedCount: rules.length };
    }
    const first = activeRules[0];
    const isUniform = activeRules.every(
      (r) =>
        Number(r.baseDeliveryFee) === Number(first.baseDeliveryFee) &&
        r.baseItemLimit === first.baseItemLimit &&
        r.additionalItemBlockSize === first.additionalItemBlockSize &&
        Number(r.additionalBlockFee) === Number(first.additionalBlockFee) &&
        Number(r.fuelSurchargePercentage) === Number(first.fuelSurchargePercentage),
    );

    const customizedCount = rules.filter(
      (r) =>
        Number(r.baseDeliveryFee) !== Number(first.baseDeliveryFee) ||
        r.baseItemLimit !== first.baseItemLimit ||
        r.additionalItemBlockSize !== first.additionalItemBlockSize ||
        Number(r.additionalBlockFee) !== Number(first.additionalBlockFee) ||
        Number(r.fuelSurchargePercentage) !== Number(first.fuelSurchargePercentage),
    ).length;

    return { isUniform, first, activeCount: activeRules.length, customizedCount };
  }, [rules]);

  const openEditModal = (rule: DeliveryFeeRule) => {
    setEditingRule(rule);
    setForm({
      baseDeliveryFee: String(rule.baseDeliveryFee),
      baseItemLimit: String(rule.baseItemLimit),
      additionalItemBlockSize: String(rule.additionalItemBlockSize),
      additionalBlockFee: String(rule.additionalBlockFee),
      fuelSurchargePercentage: String(rule.fuelSurchargePercentage),
      isActive: rule.isActive,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof RuleForm, string>> = {};
    const baseFee = parseFloat(form.baseDeliveryFee);
    const baseLimit = parseInt(form.baseItemLimit, 10);
    const blockSize = parseInt(form.additionalItemBlockSize, 10);
    const addFee = parseFloat(form.additionalBlockFee);
    const fuel = parseFloat(form.fuelSurchargePercentage);

    if (isNaN(baseFee) || baseFee < 0) {
      errors.baseDeliveryFee = "Base fee must be greater than or equal to 0.";
    }
    if (isNaN(baseLimit) || baseLimit < 1) {
      errors.baseItemLimit = "Base item limit must be at least 1.";
    }
    if (isNaN(blockSize) || blockSize < 1) {
      errors.additionalItemBlockSize = "Additional block size must be at least 1.";
    }
    if (isNaN(addFee) || addFee < 0) {
      errors.additionalBlockFee = "Additional block fee must be greater than or equal to 0.";
    }
    if (isNaN(fuel) || fuel < 0 || fuel > 100) {
      errors.fuelSurchargePercentage = "Fuel surcharge must be between 0 and 100.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    if (!validateForm()) return;

    setSaving(true);
    setFeedback(null);

    const payload = {
      baseDeliveryFee: parseFloat(form.baseDeliveryFee),
      baseItemLimit: parseInt(form.baseItemLimit, 10),
      additionalItemBlockSize: parseInt(form.additionalItemBlockSize, 10),
      additionalBlockFee: parseFloat(form.additionalBlockFee),
      fuelSurchargePercentage: parseFloat(form.fuelSurchargePercentage),
      isActive: form.isActive,
    };

    const response = await authenticatedFetch(
      `/admin/delivery-fees/${editingRule.ruleId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response || !response.ok) {
      const errMsg = response
        ? await responseMessage(response, "Failed to update delivery rule.")
        : "Network error updating delivery rule.";
      setFeedback({ message: errMsg, type: "error" });
      setSaving(false);
      return;
    }

    const updated: DeliveryFeeRule = await response.json();
    setRules((prev) =>
      prev.map((r) => (r.ruleId === updated.ruleId ? updated : r)),
    );
    setFeedback({
      message: `Successfully updated delivery rule for ${updated.district}.`,
      type: "success",
    });
    setSaving(false);
    setModalOpen(false);
  };

  // Bulk update state
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [targetMode, setTargetMode] = useState<"all" | "selected">("all");
  const [bulkForm, setBulkForm] = useState<RuleForm>({
    baseDeliveryFee: "400",
    baseItemLimit: "5",
    additionalItemBlockSize: "5",
    additionalBlockFee: "140",
    fuelSurchargePercentage: "15",
    isActive: true,
  });
  const [bulkError, setBulkError] = useState<string | null>(null);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRuleIds(rules.map((r) => r.ruleId));
    } else {
      setSelectedRuleIds([]);
    }
  };

  const handleSelectRow = (ruleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRuleIds((prev) => [...prev, ruleId]);
    } else {
      setSelectedRuleIds((prev) => prev.filter((id) => id !== ruleId));
    }
  };

  const openBulkModal = (initialMode: "all" | "selected" = "all") => {
    setTargetMode(initialMode);
    if (initialMode === "selected" && selectedRuleIds.length === 0 && rules.length > 0) {
      setSelectedRuleIds([rules[0].ruleId]);
    }
    setBulkError(null);
    setBulkModalOpen(true);
  };

  const handleBulkSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBulkError(null);

    const baseFee = parseFloat(bulkForm.baseDeliveryFee);
    const baseLimit = parseInt(bulkForm.baseItemLimit, 10);
    const blockSize = parseInt(bulkForm.additionalItemBlockSize, 10);
    const addFee = parseFloat(bulkForm.additionalBlockFee);
    const fuel = parseFloat(bulkForm.fuelSurchargePercentage);

    if (isNaN(baseFee) || baseFee < 0) {
      setBulkError("Base delivery fee must be a valid number (>= 0).");
      return;
    }
    if (isNaN(baseLimit) || baseLimit < 1) {
      setBulkError("Base product quantity must be an integer (>= 1).");
      return;
    }
    if (isNaN(blockSize) || blockSize < 1) {
      setBulkError("Additional product block size must be an integer (>= 1).");
      return;
    }
    if (isNaN(addFee) || addFee < 0) {
      setBulkError("Additional block fee must be a valid number (>= 0).");
      return;
    }
    if (isNaN(fuel) || fuel < 0 || fuel > 100) {
      setBulkError("Fuel surcharge percentage must be between 0 and 100.");
      return;
    }

    if (targetMode === "selected" && selectedRuleIds.length === 0) {
      setBulkError("Please select at least one district to apply updates.");
      return;
    }

    setSaving(true);

    const payload = {
      applyToAll: targetMode === "all",
      ruleIds: targetMode === "selected" ? selectedRuleIds : undefined,
      updates: {
        baseDeliveryFee: baseFee,
        baseItemLimit: baseLimit,
        additionalItemBlockSize: blockSize,
        additionalBlockFee: addFee,
        fuelSurchargePercentage: fuel,
        isActive: bulkForm.isActive,
      },
    };

    const response = await authenticatedFetch("/admin/delivery-fees/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!response) return;

    if (!response.ok) {
      setBulkError(await responseMessage(response, "Bulk update failed."));
      return;
    }

    const resData = await response.json();
    setFeedback({
      message: resData.message || `Successfully updated ${resData.count || 0} delivery fee rules.`,
      type: "success",
    });

    setBulkModalOpen(false);
    setSelectedRuleIds([]);
    await loadRules();
  };

  return (
    <div style={{ padding: "24px", color: "#ffffff", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "4px" }}>
          Admin Delivery Fee Management
        </h1>
        <p style={{ color: "rgba(255, 255, 255, 0.6)", margin: 0 }}>
          Manage courier delivery charges for each district.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "6px",
            backgroundColor: feedback.type === "success" ? "rgba(0, 255, 157, 0.1)" : "rgba(255, 77, 77, 0.1)",
            border: `1px solid ${feedback.type === "success" ? "#00FF9D" : "#FF4D4D"}`,
            color: feedback.type === "success" ? "#00FF9D" : "#FF4D4D",
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Fixed Shipper / Return Address Configuration Card */}
      <div
        style={{
          backgroundColor: "#0d0d0e",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#00FF9D", margin: 0 }}>
              Fixed Shipper & Return Address
            </h2>
            <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", marginTop: "4px", margin: 0 }}>
              Default return details auto-populated on Citypak courier dispatch forms. Admin can modify this fixed return address at any time.
            </p>
          </div>
          <button
            onClick={() => setShipperModalOpen(true)}
            style={{
              backgroundColor: "#00FF9D",
              color: "#000000",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Edit Return Address
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <div style={{ backgroundColor: "#141416", padding: "12px 16px", borderRadius: "6px" }}>
            <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", display: "block" }}>Shipper Name</span>
            <span style={{ fontSize: "15px", fontWeight: "bold" }}>{shipperProfile.shipperName}</span>
          </div>
          <div style={{ backgroundColor: "#141416", padding: "12px 16px", borderRadius: "6px" }}>
            <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", display: "block" }}>Address Line 1</span>
            <span style={{ fontSize: "14px", fontWeight: "600" }}>{shipperProfile.addressLine1}</span>
          </div>
          <div style={{ backgroundColor: "#141416", padding: "12px 16px", borderRadius: "6px" }}>
            <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", display: "block" }}>City</span>
            <span style={{ fontSize: "14px", fontWeight: "600" }}>{shipperProfile.addressLine4City}</span>
          </div>
          <div style={{ backgroundColor: "#141416", padding: "12px 16px", borderRadius: "6px" }}>
            <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", display: "block" }}>Contact No 1</span>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#00FF9D" }}>{shipperProfile.contactNumber1}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#0d0d0e",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px", color: "#00FF9D" }}>
          Delivery Rate Configuration
        </h2>

        {summaryConfig.isUniform && summaryConfig.first ? (
          <div>
            <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "12px" }}>
              Current Islandwide Standard Rates:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div style={{ backgroundColor: "#141416", padding: "12px 16px", borderRadius: "6px" }}>
                <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", display: "block" }}>
                  First {summaryConfig.first.baseItemLimit} items
                </span>
                <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                  LKR {Number(summaryConfig.first.baseDeliveryFee).toFixed(2)}
                </span>
              </div>
              <div style={{ backgroundColor: "#141416", padding: "12px 16px", borderRadius: "6px" }}>
                <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", display: "block" }}>
                  Every additional {summaryConfig.first.additionalItemBlockSize} items
                </span>
                <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                  LKR {Number(summaryConfig.first.additionalBlockFee).toFixed(2)}
                </span>
              </div>
              <div style={{ backgroundColor: "#141416", padding: "12px 16px", borderRadius: "6px" }}>
                <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", display: "block" }}>
                  Fuel Surcharge
                </span>
                <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                  {Number(summaryConfig.first.fuelSurchargePercentage)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "12px" }}>
              District-specific delivery rates are currently configured. View the table below for current rates per district.
            </p>
            <div style={{ display: "flex", gap: "24px", fontSize: "13px", color: "#00FF9D" }}>
              <span>Active Districts: <strong>{summaryConfig.activeCount}</strong></span>
              <span>Customised Districts: <strong>{summaryConfig.customizedCount}</strong></span>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: "16px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="text"
            placeholder="Search district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              backgroundColor: "#0d0d0e",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "6px",
              padding: "8px 16px",
              color: "#ffffff",
              width: "260px",
            }}
          />
          <span style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)" }}>
            Showing {filteredRules.length} of {rules.length} districts
          </span>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            disabled={selectedRuleIds.length === 0}
            onClick={() => openBulkModal("selected")}
            style={{
              backgroundColor: selectedRuleIds.length > 0 ? "rgba(0, 255, 157, 0.15)" : "#1f1f23",
              color: selectedRuleIds.length > 0 ? "#00FF9D" : "rgba(255, 255, 255, 0.3)",
              border: `1px solid ${selectedRuleIds.length > 0 ? "#00FF9D" : "rgba(255, 255, 255, 0.1)"}`,
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: selectedRuleIds.length > 0 ? "pointer" : "not-allowed",
            }}
          >
            Update Selected ({selectedRuleIds.length})
          </button>

          <button
            type="button"
            onClick={() => openBulkModal("all")}
            style={{
              backgroundColor: "#00FF9D",
              color: "#000000",
              border: "none",
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Apply to All Districts ({rules.length})
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#0d0d0e",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", backgroundColor: "#141416" }}>
              <th style={{ padding: "12px 16px", width: "40px" }}>
                <input
                  type="checkbox"
                  checked={filteredRules.length > 0 && filteredRules.every((r) => selectedRuleIds.includes(r.ruleId))}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
              </th>
              <th style={{ padding: "12px 16px" }}>District</th>
              <th style={{ padding: "12px 16px" }}>Base Fee</th>
              <th style={{ padding: "12px 16px" }}>Base Product Qty</th>
              <th style={{ padding: "12px 16px" }}>Additional Block</th>
              <th style={{ padding: "12px 16px" }}>Additional Fee</th>
              <th style={{ padding: "12px 16px" }}>Fuel %</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "rgba(255, 255, 255, 0.5)" }}>
                  Loading delivery rules...
                </td>
              </tr>
            ) : filteredRules.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "rgba(255, 255, 255, 0.5)" }}>
                  No districts match your search.
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => {
                const isSelected = selectedRuleIds.includes(rule.ruleId);
                return (
                  <tr
                    key={rule.ruleId}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      backgroundColor: isSelected ? "rgba(0, 255, 157, 0.03)" : undefined,
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(rule.ruleId, e.target.checked)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: "600" }}>{rule.district}</td>
                    <td style={{ padding: "12px 16px" }}>LKR {Number(rule.baseDeliveryFee).toFixed(2)}</td>
                    <td style={{ padding: "12px 16px" }}>{rule.baseItemLimit} items</td>
                    <td style={{ padding: "12px 16px" }}>Every {rule.additionalItemBlockSize} items</td>
                    <td style={{ padding: "12px 16px" }}>LKR {Number(rule.additionalBlockFee).toFixed(2)}</td>
                    <td style={{ padding: "12px 16px" }}>{Number(rule.fuelSurchargePercentage)}%</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                          backgroundColor: rule.isActive ? "rgba(0, 255, 157, 0.1)" : "rgba(255, 77, 77, 0.1)",
                          color: rule.isActive ? "#00FF9D" : "#FF4D4D",
                        }}
                      >
                        {rule.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => openEditModal(rule)}
                        style={{
                          backgroundColor: "#1f1f23",
                          color: "#00FF9D",
                          border: "1px solid #00FF9D",
                          borderRadius: "4px",
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && editingRule && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              backgroundColor: "#0d0d0e",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              padding: "24px",
              width: "100%",
              maxWidth: "480px",
              color: "#ffffff",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>
              Edit Delivery Rule — {editingRule.district}
            </h2>

            <form onSubmit={handleFormSubmit}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                  District
                </label>
                <input
                  type="text"
                  value={editingRule.district}
                  disabled
                  style={{
                    width: "100%",
                    backgroundColor: "#141416",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    padding: "8px 12px",
                    color: "rgba(255, 255, 255, 0.5)",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    Base Delivery Fee (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.baseDeliveryFee}
                    onChange={(e) => setForm({ ...form, baseDeliveryFee: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  />
                  {formErrors.baseDeliveryFee && (
                    <span style={{ fontSize: "11px", color: "#FF4D4D" }}>{formErrors.baseDeliveryFee}</span>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    Base Product Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.baseItemLimit}
                    onChange={(e) => setForm({ ...form, baseItemLimit: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  />
                  {formErrors.baseItemLimit && (
                    <span style={{ fontSize: "11px", color: "#FF4D4D" }}>{formErrors.baseItemLimit}</span>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    Additional Product Block Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.additionalItemBlockSize}
                    onChange={(e) => setForm({ ...form, additionalItemBlockSize: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  />
                  {formErrors.additionalItemBlockSize && (
                    <span style={{ fontSize: "11px", color: "#FF4D4D" }}>{formErrors.additionalItemBlockSize}</span>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    Additional Block Fee (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.additionalBlockFee}
                    onChange={(e) => setForm({ ...form, additionalBlockFee: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  />
                  {formErrors.additionalBlockFee && (
                    <span style={{ fontSize: "11px", color: "#FF4D4D" }}>{formErrors.additionalBlockFee}</span>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    Fuel Surcharge (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.fuelSurchargePercentage}
                    onChange={(e) => setForm({ ...form, fuelSurchargePercentage: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  />
                  {formErrors.fuelSurchargePercentage && (
                    <span style={{ fontSize: "11px", color: "#FF4D4D" }}>{formErrors.fuelSurchargePercentage}</span>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    District Status
                  </label>
                  <select
                    value={form.isActive ? "true" : "false"}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    backgroundColor: "transparent",
                    color: "rgba(255, 255, 255, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "4px",
                    padding: "8px 16px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    backgroundColor: "#00FF9D",
                    color: "#000000",
                    fontWeight: "bold",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 20px",
                    cursor: "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redesigned Clean Bulk Update Modal */}
      {bulkModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              backgroundColor: "#0d0d0e",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              padding: "24px",
              width: "100%",
              maxWidth: "540px",
              maxHeight: "90vh",
              overflowY: "auto",
              color: "#ffffff",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "4px" }}>
              Bulk Update Delivery Rates
            </h2>
            <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "20px" }}>
              Configure delivery rates below and choose target districts to update.
            </p>

            {bulkError && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "10px 14px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255, 77, 77, 0.1)",
                  border: "1px solid #FF4D4D",
                  color: "#FF4D4D",
                  fontSize: "13px",
                }}
              >
                {bulkError}
              </div>
            )}

            <form onSubmit={handleBulkSubmit}>
              {/* Form Input Fields Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    Base Delivery Fee (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bulkForm.baseDeliveryFee}
                    onChange={(e) => setBulkForm({ ...bulkForm, baseDeliveryFee: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    Base Product Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bulkForm.baseItemLimit}
                    onChange={(e) => setBulkForm({ ...bulkForm, baseItemLimit: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    Additional Product Block Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bulkForm.additionalItemBlockSize}
                    onChange={(e) => setBulkForm({ ...bulkForm, additionalItemBlockSize: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    Additional Block Fee (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bulkForm.additionalBlockFee}
                    onChange={(e) => setBulkForm({ ...bulkForm, additionalBlockFee: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    Fuel Surcharge (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={bulkForm.fuelSurchargePercentage}
                    onChange={(e) => setBulkForm({ ...bulkForm, fuelSurchargePercentage: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "4px" }}>
                    District Status
                  </label>
                  <select
                    value={bulkForm.isActive ? "true" : "false"}
                    onChange={(e) => setBulkForm({ ...bulkForm, isActive: e.target.value === "true" })}
                    style={{
                      width: "100%",
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      color: "#ffffff",
                    }}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Target Districts Section */}
              <div
                style={{
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  paddingTop: "16px",
                  marginBottom: "20px",
                }}
              >
                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", color: "#00FF9D", marginBottom: "10px" }}>
                  Target Districts
                </label>

                <div style={{ display: "flex", gap: "20px", marginBottom: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="targetMode"
                      checked={targetMode === "all"}
                      onChange={() => setTargetMode("all")}
                    />
                    Apply to All Districts ({rules.length})
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="targetMode"
                      checked={targetMode === "selected"}
                      onChange={() => setTargetMode("selected")}
                    />
                    Select Specific Districts ({selectedRuleIds.length})
                  </label>
                </div>

                {targetMode === "selected" && (
                  <div
                    style={{
                      backgroundColor: "#141416",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      padding: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                        Select districts to receive these rates:
                      </span>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <button
                          type="button"
                          onClick={() => handleSelectAll(true)}
                          style={{ background: "none", border: "none", color: "#00FF9D", fontSize: "12px", cursor: "pointer" }}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectAll(false)}
                          style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.5)", fontSize: "12px", cursor: "pointer" }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "8px",
                        maxHeight: "180px",
                        overflowY: "auto",
                        paddingRight: "4px",
                      }}
                    >
                      {rules.map((rule) => (
                        <label
                          key={rule.ruleId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12px",
                            cursor: "pointer",
                            color: selectedRuleIds.includes(rule.ruleId) ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRuleIds.includes(rule.ruleId)}
                            onChange={(e) => handleSelectRow(rule.ruleId, e.target.checked)}
                          />
                          {rule.district}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  style={{
                    backgroundColor: "transparent",
                    color: "rgba(255, 255, 255, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "4px",
                    padding: "8px 16px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    backgroundColor: "#00FF9D",
                    color: "#000000",
                    fontWeight: "bold",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 20px",
                    cursor: "pointer",
                  }}
                >
                  {saving ? "Applying..." : "Apply Bulk Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipper Profile Edit Modal */}
      {shipperModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
          <div style={{ backgroundColor: "#141416", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", width: "100%", maxWidth: "500px", padding: "24px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", color: "#00FF9D" }}>
              Edit Shipper Return Address
            </h3>

            <form onSubmit={handleSaveShipperProfile} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>Shipper Name *</label>
                <input
                  type="text"
                  required
                  value={shipperProfile.shipperName}
                  onChange={(e) => setShipperProfile({ ...shipperProfile, shipperName: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>Address Line 1 *</label>
                <input
                  type="text"
                  required
                  value={shipperProfile.addressLine1}
                  onChange={(e) => setShipperProfile({ ...shipperProfile, addressLine1: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>Address Line 2</label>
                  <input
                    type="text"
                    value={shipperProfile.addressLine2}
                    onChange={(e) => setShipperProfile({ ...shipperProfile, addressLine2: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>Address Line 3</label>
                  <input
                    type="text"
                    value={shipperProfile.addressLine3}
                    onChange={(e) => setShipperProfile({ ...shipperProfile, addressLine3: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>Address City *</label>
                <input
                  type="text"
                  required
                  value={shipperProfile.addressLine4City}
                  onChange={(e) => setShipperProfile({ ...shipperProfile, addressLine4City: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>Contact No 1 *</label>
                <input
                  type="text"
                  required
                  value={shipperProfile.contactNumber1}
                  onChange={(e) => setShipperProfile({ ...shipperProfile, contactNumber1: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setShipperModalOpen(false)}
                  style={{ padding: "8px 16px", backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shipperSaving}
                  style={{ padding: "8px 16px", backgroundColor: "#00FF9D", color: "#000", border: "none", fontWeight: "bold", borderRadius: "6px", cursor: "pointer" }}
                >
                  {shipperSaving ? "Saving..." : "Save Return Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
