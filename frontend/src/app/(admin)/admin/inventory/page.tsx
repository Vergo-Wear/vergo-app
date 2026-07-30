"use client";

import React, { useState, useEffect, useMemo, FormEvent, useCallback } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

type TabType = "catalog" | "collections" | "colors" | "storefront";

interface Category {
  categoryId: string;
  name: string;
  description: string | null;
}

interface ColorEntity {
  colorId: string;
  name: string;
  hexCode: string | null;
  imageUrl: string | null;
  displayOrder: number;
  status: string;
}

interface SizeEntity {
  sizeId: string;
  name: string;
  displayOrder: number;
  status: string;
}

interface Supplier {
  supplierId: string;
  name: string;
}

interface Branch {
  branchId: string;
  name: string;
}

interface InventoryCatalogItem {
  productId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string;
  supplierId: string | null;
  supplierName: string;
  basePrice: number;
  status: string;
  createdAt: string;
  variantId: string;
  variantStatus: string;
  sku: string;
  sizeId: string;
  size: string;
  colorId: string;
  color: string;
  priceAdjustment: number;
  sellingPrice: number;
  imageUrl: string | null;
  images: string[];
  inventoryId: string | null;
  branchId: string | null;
  branchName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  lastUpdated: string | null;
}

type StorefrontConfig = {
  visibility: "Live" | "Hidden";
  badge: "None" | "New" | "Limited Stock" | "Out of Stock";
  discount: number;
};

async function responseMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;
  if (Array.isArray(body?.message)) return body.message.join(" ");
  return body?.message || fallback;
}

export default function InventoryDashboard() {
  // -- State: Tabs --
  const [activeTab, setActiveTab] = useState<TabType>("catalog");

  // -- State: Universal Data --
  const [loading, setLoading] = useState(true);

  // DB Lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<ColorEntity[]>([]);
  const [sizes, setSizes] = useState<SizeEntity[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [masterCatalog, setMasterCatalog] = useState<InventoryCatalogItem[]>([]);

  // Local Storefront Configs
  const [storefront, setStorefront] = useState<Record<string, StorefrontConfig>>({});

  // -- State: Master Catalog Filters --
  const [search, setSearch] = useState("");
  const [colFilter, setColFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  // -- State: UI Popups & Feedback --
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ================= DATA FETCHING =================
  const fetchAllData = useCallback(async () => {
    setLoading(true);

    const localStorefront = JSON.parse(localStorage.getItem("vergo_storefront") || "{}");
    setStorefront(localStorefront);

    try {
      const response = await authenticatedFetch("/admin/inventory/catalog");
      if (!response) {
        setLoading(false);
        return;
      }
      if (!response.ok) {
        showToast(await responseMessage(response, "Failed to fetch inventory data"), "error");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setCategories(data.categories || []);
      setColors(data.colors || []);
      setSizes(data.sizes || []);
      setSuppliers(data.suppliers || []);
      setBranches(data.branches || []);
      setMasterCatalog(data.items || []);
    } catch (err: any) {
      showToast(err.message || "Connection error fetching inventory", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  // ================= TAB 1: MASTER CATALOG =================
  const filteredCatalog = useMemo(() => {
    return masterCatalog.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());
      const matchCol = colFilter === "all" || item.categoryId === colFilter;
      const matchColor = colorFilter === "all" || item.colorId === colorFilter || item.color === colorFilter;
      const sf = storefront[item.categoryId || ""] || { visibility: "Live", badge: "None", discount: 0 };
      const matchVisibility = visibilityFilter === "all" || sf.visibility === visibilityFilter;

      return matchSearch && matchCol && matchColor && matchVisibility;
    });
  }, [masterCatalog, search, colFilter, colorFilter, visibilityFilter, storefront]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product and all its variants?")) return;
    setLoading(true);

    try {
      const res = await authenticatedFetch(`/admin/products/${productId}`, {
        method: "DELETE",
      });
      if (res && res.ok) {
        showToast("Product deleted successfully", "success");
        await fetchAllData();
      } else {
        const msg = res ? await responseMessage(res, "Failed to delete product") : "Request failed";
        showToast(msg, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete product", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProductVisibility = async (productId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "show" || currentStatus === "live" ? "hidden" : "show";
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/admin/products/${productId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res && res.ok) {
        showToast("Product status updated", "success");
        await fetchAllData();
      } else {
        const msg = res ? await responseMessage(res, "Failed to update product status") : "Request failed";
        showToast(msg, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update visibility", "error");
    } finally {
      setLoading(false);
    }
  };

  // ================= TAB 2: COLLECTIONS (CATEGORIES) =================
  const [collectionForm, setCollectionForm] = useState({ id: "", name: "", desc: "" });

  const saveCollection = async () => {
    if (!collectionForm.name.trim()) {
      showToast("Collection name is required.", "error");
      return;
    }

    setLoading(true);
    const isEditing = !!collectionForm.id;
    const path = isEditing ? `/admin/categories/${collectionForm.id}` : "/admin/categories";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const res = await authenticatedFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: collectionForm.name.trim(),
          description: collectionForm.desc.trim() || undefined,
        }),
      });

      if (res && res.ok) {
        showToast(`Collection ${isEditing ? "updated" : "created"} successfully`, "success");
        setCollectionForm({ id: "", name: "", desc: "" });
        await fetchAllData();
      } else {
        const msg = res ? await responseMessage(res, "Failed to save collection") : "Request failed";
        showToast(msg, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save collection", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteCollection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this collection?")) return;
    setLoading(true);

    try {
      const res = await authenticatedFetch(`/admin/categories/${id}`, {
        method: "DELETE",
      });

      if (res && res.ok) {
        showToast("Collection deleted", "success");
        await fetchAllData();
      } else {
        const msg = res ? await responseMessage(res, "Failed to delete collection") : "Request failed";
        showToast(msg, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete collection", "error");
    } finally {
      setLoading(false);
    }
  };

  // ================= TAB 3: COLOR PALETTE =================
  const [colorInput, setColorInput] = useState("");
  const [editingColorId, setEditingColorId] = useState<string | null>(null);

  const saveColor = async () => {
    if (!colorInput.trim()) {
      showToast("Color name is required.", "error");
      return;
    }

    setLoading(true);
    const isEditing = !!editingColorId;
    const path = isEditing ? `/admin/colors/${editingColorId}` : "/admin/colors";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const res = await authenticatedFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: colorInput.trim(),
          status: "Active",
        }),
      });

      if (res && res.ok) {
        showToast(`Color ${isEditing ? "updated" : "added"} successfully`, "success");
        setColorInput("");
        setEditingColorId(null);
        await fetchAllData();
      } else {
        const msg = res ? await responseMessage(res, "Failed to save color") : "Request failed";
        showToast(msg, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save color", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteColor = async (colorId: string) => {
    if (!confirm("Delete this color from palette?")) return;
    setLoading(true);

    try {
      const res = await authenticatedFetch(`/admin/colors/${colorId}`, {
        method: "DELETE",
      });

      if (res && res.ok) {
        showToast("Color deleted", "success");
        await fetchAllData();
      } else {
        const msg = res ? await responseMessage(res, "Failed to delete color") : "Request failed";
        showToast(msg, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete color", "error");
    } finally {
      setLoading(false);
    }
  };

  // ================= TAB 4: STOREFRONT MANAGER =================
  const [sfModalOpen, setSfModalOpen] = useState(false);
  const [sfEditingCat, setSfEditingCat] = useState<Category | null>(null);
  const [sfForm, setSfForm] = useState<StorefrontConfig>({ visibility: "Live", badge: "None", discount: 0 });

  const handleOpenSfModal = (category: Category) => {
    setSfEditingCat(category);
    const existing = storefront[category.categoryId] || { visibility: "Live", badge: "None", discount: 0 };
    setSfForm({ ...existing });
    setSfModalOpen(true);
  };

  const handleSaveSf = () => {
    if (!sfEditingCat) return;
    const nextSf = { ...storefront, [sfEditingCat.categoryId]: sfForm };
    setStorefront(nextSf);
    localStorage.setItem("vergo_storefront", JSON.stringify(nextSf));
    showToast("Storefront Settings Updated", "success");
    setSfModalOpen(false);
  };

  // ================= PRODUCT & VARIANT MODAL =================
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const defaultProductState = {
    parentName: "",
    description: "",
    categoryId: "",
    supplierId: "",
    colorId: "",
    sizeId: "",
    basePrice: "0",
    priceAdjustment: "0",
    quantity: "0",
    reorderLevel: "10",
    branchId: "",
    image: "",
    sku: "",
    editInvId: "",
    editVarId: "",
    editProdId: "",
  };
  const [prodForm, setProdForm] = useState(defaultProductState);

  const openProductModal = (itemToEdit: InventoryCatalogItem | null = null) => {
    if (itemToEdit) {
      setProdForm({
        parentName: itemToEdit.name || "",
        description: itemToEdit.description || "",
        categoryId: itemToEdit.categoryId || "",
        supplierId: itemToEdit.supplierId || "",
        colorId: itemToEdit.colorId || "",
        sizeId: itemToEdit.sizeId || "",
        basePrice: itemToEdit.basePrice.toString(),
        priceAdjustment: itemToEdit.priceAdjustment.toString(),
        quantity: itemToEdit.quantity.toString(),
        reorderLevel: itemToEdit.reorderLevel.toString(),
        branchId: itemToEdit.branchId || "",
        image: itemToEdit.imageUrl || "",
        sku: itemToEdit.sku || "",
        editInvId: itemToEdit.inventoryId || "",
        editVarId: itemToEdit.variantId || "",
        editProdId: itemToEdit.productId || "",
      });
    } else {
      setProdForm({
        ...defaultProductState,
        categoryId: categories[0]?.categoryId || "",
        supplierId: suppliers[0]?.supplierId || "",
        colorId: colors[0]?.colorId || "",
        sizeId: sizes[0]?.sizeId || "",
        branchId: branches[0]?.branchId || "",
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProductVariant = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isEditing = !!prodForm.editInvId;

    try {
      const selectedColor = colors.find((c) => c.colorId === prodForm.colorId);
      const selectedSize = sizes.find((s) => s.sizeId === prodForm.sizeId);

      const generatedSku =
        prodForm.sku.trim() ||
        `VGO-${prodForm.parentName.substring(0, 3).toUpperCase()}-${(selectedColor?.name || "CLR").substring(0, 3).toUpperCase()}-${selectedSize?.name || "SZ"}`;

      if (isEditing) {
        // Edit existing inventory record
        const payload = {
          name: prodForm.parentName.trim(),
          description: prodForm.description.trim() || undefined,
          categoryId: prodForm.categoryId || undefined,
          supplierId: prodForm.supplierId || (suppliers[0]?.supplierId || undefined),
          basePrice: parseFloat(prodForm.basePrice) || 0,
          sku: generatedSku,
          variantStatus: "show",
          colorId: prodForm.colorId,
          sizeId: prodForm.sizeId,
          priceAdjustment: parseFloat(prodForm.priceAdjustment) || 0,
          branchId: prodForm.branchId || (branches[0]?.branchId || undefined),
          quantity: parseInt(prodForm.quantity) || 0,
          reorderLevel: parseInt(prodForm.reorderLevel) || 10,
          imageUrl: prodForm.image.trim() || undefined,
        };

        const res = await authenticatedFetch(`/admin/inventory/records/${prodForm.editInvId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res && res.ok) {
          showToast("Inventory variant updated", "success");
          setIsProductModalOpen(false);
          await fetchAllData();
        } else {
          const msg = res ? await responseMessage(res, "Failed to update inventory variant") : "Request failed";
          showToast(msg, "error");
        }
      } else {
        // Create new product with variant
        const payload = {
          name: prodForm.parentName.trim(),
          description: prodForm.description.trim() || undefined,
          categoryId: prodForm.categoryId || undefined,
          supplierId: prodForm.supplierId || (suppliers[0]?.supplierId || undefined),
          basePrice: parseFloat(prodForm.basePrice) || 0,
          status: "live",
          imageUrl: prodForm.image.trim() || undefined,
          variants: [
            {
              sku: generatedSku,
              status: "show",
              colorId: prodForm.colorId || undefined,
              color: !prodForm.colorId ? selectedColor?.name : undefined,
              sizeId: prodForm.sizeId || undefined,
              size: !prodForm.sizeId ? selectedSize?.name : undefined,
              priceAdjustment: parseFloat(prodForm.priceAdjustment) || 0,
              quantity: parseInt(prodForm.quantity) || 0,
              branchId: prodForm.branchId || (branches[0]?.branchId || undefined),
              reorderLevel: parseInt(prodForm.reorderLevel) || 10,
              imageUrl: prodForm.image.trim() || undefined,
            },
          ],
        };

        const res = await authenticatedFetch("/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res && res.ok) {
          showToast("Product variant added to inventory", "success");
          setIsProductModalOpen(false);
          await fetchAllData();
        } else {
          const msg = res ? await responseMessage(res, "Failed to create product variant") : "Request failed";
          showToast(msg, "error");
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save variant.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ================= UI RENDERS =================
  const renderNav = () => (
    <div className="flex gap-2 sm:gap-4 border-b border-[rgba(255,255,255,0.06)] mb-6 sm:mb-8 pb-4 overflow-x-auto whitespace-nowrap custom-scrollbar">
      {[
        { id: "catalog", label: "Master Catalog" },
        { id: "collections", label: "Collections" },
        { id: "colors", label: "Color Palette" },
        { id: "storefront", label: "Storefront Manager" },
      ].map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setActiveTab(t.id as TabType)}
          className={`text-xs font-bold tracking-widest uppercase px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
            activeTab === t.id
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40"
              : "text-[#8e8e93] hover:text-white bg-[#121212] border border-[rgba(255,255,255,0.05)] hover:border-emerald-500/30"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f7] font-sans pb-32 pt-6 sm:pt-8 px-4 sm:px-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-4 sm:right-8 z-[100] px-6 py-3.5 rounded-lg text-[10px] uppercase font-bold tracking-widest shadow-2xl transition-all animate-bounce ${
            toast.type === "success"
              ? "bg-[#101914] border border-emerald-500/50 text-emerald-400 shadow-emerald-950/50"
              : "bg-[#1a0f0f] border border-red-500/50 text-red-400 shadow-red-950/50"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header & Tabs */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-lg sm:text-xl font-bold tracking-[0.2em] text-white uppercase">INVENTORY COMMAND</h1>
        <p className="text-[10px] sm:text-xs text-[#71717a] uppercase tracking-wider mt-1">Manage Catalog, Stock Holds & Storefront Parameters</p>
      </div>

      {renderNav()}

      {loading && (
        <div className="py-20 text-center text-emerald-400 font-mono text-xs uppercase tracking-widest animate-pulse flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
          SYNCING DATABASE RECORDS...
        </div>
      )}

      {/* --- TAB: MASTER CATALOG --- */}
      {!loading && activeTab === "catalog" && (
        <section className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center bg-[#09090b] border border-[#27272a] p-4 sm:p-6 rounded-xl gap-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Search Catalog..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#18181b] border border-[#27272a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-4 py-2.5 text-xs text-white placeholder-[#555] uppercase focus:outline-none transition-all"
              />
              <select
                value={colFilter}
                onChange={(e) => setColFilter(e.target.value)}
                className="bg-[#18181b] border border-[#27272a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
              >
                <option value="all">ALL COLLECTIONS</option>
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                className="bg-[#18181b] border border-[#27272a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
              >
                <option value="all">ALL COLORS</option>
                {colors.map((c) => (
                  <option key={c.colorId} value={c.colorId}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="bg-[#18181b] border border-[#27272a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
              >
                <option value="all">ALL VISIBILITY</option>
                <option value="Live">LIVE</option>
                <option value="Hidden">HIDDEN</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => openProductModal()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-widest px-6 py-3 rounded-lg transition-all shadow-md shadow-emerald-950/50 hover:shadow-emerald-900/60 uppercase cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <span>+ ADD PRODUCT</span>
            </button>
          </div>

          <div className="overflow-x-auto bg-[#09090b] border border-[#27272a] rounded-xl custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse min-w-[900px]">
              <thead className="bg-[#050505] text-[#8e8e93]">
                <tr>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a] w-16">
                    Image
                  </th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">
                    Product
                  </th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">
                    Collection
                  </th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">
                    Color
                  </th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">
                    Size
                  </th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">
                    SKU
                  </th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">
                    Price
                  </th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">
                    Qty
                  </th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">
                    Status
                  </th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181b] bg-[#0d0d0d]">
                {filteredCatalog.map((item) => {
                  const sf = storefront[item.categoryId || ""] || { visibility: "Live", badge: "None", discount: 0 };
                  const finalPrice = sf.discount > 0 ? item.sellingPrice * (1 - sf.discount / 100) : item.sellingPrice;

                  return (
                    <tr key={item.variantId + "_" + (item.inventoryId || "noinv")} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 px-4">
                        {item.imageUrl ? (
                          <div className="w-10 h-10 rounded-lg border border-[#27272a] bg-[#18181b] overflow-hidden">
                            <img src={item.imageUrl} alt="product" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-[#27272a] bg-[#121212] flex items-center justify-center text-[10px] text-[#555] font-bold">
                            N/A
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-white font-bold text-xs uppercase tracking-wide">{item.name}</td>
                      <td className="py-3 px-4 text-[#8e8e93] font-bold text-[10px] tracking-wider uppercase">{item.categoryName}</td>
                      <td className="py-3 px-4 text-white font-bold text-[10px] uppercase tracking-wider">{item.color}</td>
                      <td className="py-3 px-4 text-white font-bold text-[10px] uppercase">
                        <span className="bg-[#18181b] px-2.5 py-1 rounded border border-[#27272a]">{item.size}</span>
                      </td>
                      <td className="py-3 px-4 text-[#8e8e93] font-mono text-xs">{item.sku}</td>
                      <td className="py-3 px-4 text-white font-mono text-xs">
                        {sf.discount > 0 ? (
                          <div className="flex flex-col">
                            <span className="line-through text-[#555]">${item.sellingPrice.toFixed(2)}</span>
                            <span className="text-emerald-400 font-bold">${finalPrice.toFixed(2)}</span>
                            <span className="text-[8px] text-[#555] uppercase mt-0.5">{sf.discount}% OFF</span>
                          </div>
                        ) : (
                          <span>${item.sellingPrice.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-white font-mono text-xs">
                        {item.quantity === 0 ? <span className="text-red-400 font-bold">0</span> : item.quantity}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {sf.badge && sf.badge !== "None" && (
                            <span className="bg-[#18181b] text-white px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border border-[#27272a]">
                              {sf.badge}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleProductVisibility(item.productId, item.status)}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase cursor-pointer transition-all active:scale-95 ${
                              item.status === "show" || item.status === "live"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                            }`}
                          >
                            {item.status === "show" || item.status === "live" ? "LIVE" : "HIDDEN"}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2 text-[10px] font-bold uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => openProductModal(item)}
                            className="bg-[#18181b] hover:bg-emerald-950/60 text-[#a1a1aa] hover:text-emerald-400 border border-[#27272a] hover:border-emerald-500/40 rounded-lg px-3 py-1.5 cursor-pointer transition-all"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(item.productId)}
                            className="bg-[#18181b] hover:bg-red-950/60 text-[#a1a1aa] hover:text-red-400 border border-[#27272a] hover:border-red-500/40 rounded-lg px-3 py-1.5 cursor-pointer transition-all"
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCatalog.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[#555] font-bold text-xs tracking-wider uppercase">
                      No inventory items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* --- TAB: COLLECTIONS --- */}
      {!loading && activeTab === "collections" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 sm:p-7 shadow-sm">
            <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-6 border-b border-[#18181b] pb-4">
              {collectionForm.id ? "Edit Collection" : "Add New Collection"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Collection Name</label>
                <input
                  type="text"
                  value={collectionForm.name}
                  onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                  placeholder="E.g. Summer Minimalist"
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-4 py-2.5 text-xs text-white uppercase focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Description</label>
                <textarea
                  rows={3}
                  value={collectionForm.desc}
                  onChange={(e) => setCollectionForm({ ...collectionForm, desc: e.target.value })}
                  placeholder="Collection description..."
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                />
              </div>
              <div className="pt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={saveCollection}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-widest px-8 py-3 rounded-lg uppercase transition-all shadow-md shadow-emerald-950/50 cursor-pointer active:scale-95"
                >
                  SAVE COLLECTION
                </button>
                {collectionForm.id && (
                  <button
                    type="button"
                    onClick={() => setCollectionForm({ id: "", name: "", desc: "" })}
                    className="text-[#8e8e93] hover:text-white font-bold text-xs tracking-widest px-6 py-3 uppercase hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 sm:p-7 shadow-sm">
            <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-6 border-b border-[#18181b] pb-4">
              Existing Collections
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {categories.map((c) => (
                <div key={c.categoryId} className="flex justify-between items-center p-4 bg-[#141416] border border-[#27272a] rounded-lg hover:border-emerald-500/30 transition-all">
                  <div>
                    <span className="text-white font-bold text-xs uppercase tracking-wider block">{c.name}</span>
                    <span className="text-[#666] text-[10px] mt-0.5 block">{c.description || "No description"}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCollectionForm({ id: c.categoryId, name: c.name, desc: c.description || "" })}
                      className="text-[9px] font-bold tracking-wider uppercase text-[#a1a1aa] hover:text-emerald-400 bg-[#18181b] hover:bg-emerald-950/60 border border-[#27272a] px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCollection(c.categoryId)}
                      className="text-[9px] font-bold tracking-wider uppercase text-red-400 bg-[#18181b] hover:bg-red-950/60 border border-[#27272a] px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <div className="text-xs text-[#555] uppercase py-6 text-center font-bold">No collections created.</div>}
            </div>
          </div>
        </section>
      )}

      {/* --- TAB: COLORS --- */}
      {!loading && activeTab === "colors" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 sm:p-7 shadow-sm">
            <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-6 border-b border-[#18181b] pb-4">
              {editingColorId ? "Edit Color Entity" : "Add Color Entity"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Color Name</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    placeholder="E.g. Emerald Green"
                    className="flex-1 bg-[#18181b] border border-[#27272a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-4 py-2.5 text-xs text-white uppercase focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={saveColor}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-widest px-6 py-2.5 rounded-lg uppercase transition-all shadow-md shadow-emerald-950/50 cursor-pointer active:scale-95"
                  >
                    SAVE
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[#666] uppercase font-semibold mt-2 leading-relaxed">
                Colors are saved directly to your database palette and linked to product variants.
              </p>
            </div>
          </div>

          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 sm:p-7 shadow-sm">
            <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-6 border-b border-[#18181b] pb-4">
              Available Colors
            </h2>
            <div className="flex flex-wrap gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {colors.map((c) => (
                <div key={c.colorId} className="flex items-center gap-2.5 bg-[#141416] border border-[#27272a] px-4 py-2.5 rounded-lg hover:border-emerald-500/30 transition-all">
                  <span className="text-white font-bold text-xs uppercase tracking-wider">{c.name}</span>
                  <div className="w-px h-4 bg-[#27272a] mx-1"></div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingColorId(c.colorId);
                      setColorInput(c.name);
                    }}
                    className="text-[#8e8e93] hover:text-emerald-400 transition-colors p-1 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteColor(c.colorId)}
                    className="text-[#8e8e93] hover:text-red-400 transition-colors p-1 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              {colors.length === 0 && <span className="text-xs text-[#555] uppercase py-6 text-center font-bold">No colors found.</span>}
            </div>
          </div>
        </section>
      )}

      {/* --- TAB: STOREFRONT MANAGER --- */}
      {!loading && activeTab === "storefront" && (
        <section className="space-y-6">
          <div className="overflow-x-auto bg-[#09090b] border border-[#27272a] rounded-xl custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead className="bg-[#050505] text-[#8e8e93]">
                <tr>
                  <th className="py-4 px-6 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">Collection</th>
                  <th className="py-4 px-6 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">Website Visibility</th>
                  <th className="py-4 px-6 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">Product Badge</th>
                  <th className="py-4 px-6 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a]">Discount (%)</th>
                  <th className="py-4 px-6 font-bold tracking-widest uppercase text-[9px] border-b border-[#27272a] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181b] bg-[#0d0d0d]">
                {categories.map((c) => {
                  const sf = storefront[c.categoryId] || { visibility: "Live", badge: "None", discount: 0 };

                  return (
                    <tr key={c.categoryId} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6 text-white font-bold text-xs uppercase tracking-wide">{c.name}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                            sf.visibility === "Live"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-500/10 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {sf.visibility}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-white font-bold text-[10px] uppercase tracking-wider">{sf.badge}</td>
                      <td className="py-4 px-6 text-white font-mono text-xs">
                        {sf.discount > 0 ? <span className="text-emerald-400 font-bold">{sf.discount}% OFF</span> : <span>0%</span>}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenSfModal(c)}
                          className="bg-[#18181b] hover:bg-emerald-950/60 text-[#a1a1aa] hover:text-emerald-400 border border-[#27272a] hover:border-emerald-500/40 px-4 py-1.5 rounded-lg text-[9px] font-bold tracking-widest uppercase cursor-pointer transition-all"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#555] font-bold text-xs tracking-wider uppercase">
                      No collections available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* --- STOREFRONT MODAL --- */}
      {sfModalOpen && sfEditingCat && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-8 animate-fade-in overflow-y-auto">
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-6 sm:p-8 w-full max-w-lg relative shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-center mb-6 border-b border-[#18181b] pb-4">
              <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase">
                Edit Collection Settings
              </h2>
              <button
                type="button"
                onClick={() => setSfModalOpen(false)}
                className="text-[#555] hover:text-white transition-colors p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">
                  Collection Name (Read Only)
                </label>
                <input
                  type="text"
                  readOnly
                  value={sfEditingCat.name}
                  className="w-full bg-[#141416] border border-[#27272a] rounded-lg px-4 py-2.5 text-xs text-[#8e8e93] uppercase focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">
                  Website Visibility
                </label>
                <select
                  value={sfForm.visibility}
                  onChange={(e) => setSfForm({ ...sfForm, visibility: e.target.value as any })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
                >
                  <option value="Live">Live</option>
                  <option value="Hidden">Hidden</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">
                  Product Badge
                </label>
                <select
                  value={sfForm.badge}
                  onChange={(e) => setSfForm({ ...sfForm, badge: e.target.value as any })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
                >
                  <option value="None">None</option>
                  <option value="New">New</option>
                  <option value="Limited Stock">Limited Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={sfForm.discount}
                  onChange={(e) => setSfForm({ ...sfForm, discount: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-mono text-white focus:outline-none transition-all"
                />
              </div>
              <div className="pt-4 flex justify-end gap-4 border-t border-[#18181b] mt-6">
                <button
                  type="button"
                  onClick={() => setSfModalOpen(false)}
                  className="text-[#8e8e93] hover:text-white font-bold text-xs tracking-widest px-6 py-2.5 uppercase hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg cursor-pointer transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSaveSf}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-widest px-6 py-2.5 rounded-lg shadow-md shadow-emerald-950/50 uppercase cursor-pointer transition-all active:scale-95"
                >
                  SAVE CHANGES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= GLOBAL PRODUCT MODAL ================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-8 animate-fade-in overflow-y-auto">
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-6 sm:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-[0_25px_60px_rgba(0,0,0,0.8)] custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b border-[#18181b] pb-4 sticky top-0 bg-[#09090b] z-10 pt-1">
              <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase">
                {prodForm.editInvId ? "EDIT INVENTORY VARIANT" : "ADD TO INVENTORY (VARIANT)"}
              </h2>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-[#555] hover:text-white transition-colors p-1 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveProductVariant} className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-4 sm:gap-y-6">
              <div className="col-span-1 sm:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Product Name</label>
                <input
                  required
                  type="text"
                  value={prodForm.parentName}
                  onChange={(e) => setProdForm({ ...prodForm, parentName: e.target.value })}
                  placeholder="E.g. Heavyweight Minimalist Tee"
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-4 py-2.5 text-xs text-white uppercase focus:outline-none transition-all"
                />
              </div>

              <div className="col-span-1 sm:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Collection</label>
                <select
                  value={prodForm.categoryId}
                  onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
                >
                  <option value="">NO COLLECTION</option>
                  {categories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 sm:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Variant Color</label>
                <select
                  required
                  value={prodForm.colorId}
                  onChange={(e) => setProdForm({ ...prodForm, colorId: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
                >
                  <option value="" disabled>SELECT COLOR</option>
                  {colors.map((c) => (
                    <option key={c.colorId} value={c.colorId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 sm:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Variant Size</label>
                <select
                  required
                  value={prodForm.sizeId}
                  onChange={(e) => setProdForm({ ...prodForm, sizeId: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
                >
                  <option value="" disabled>SELECT SIZE</option>
                  {sizes.map((s) => (
                    <option key={s.sizeId} value={s.sizeId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 sm:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Base Price ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={prodForm.basePrice}
                  onChange={(e) => setProdForm({ ...prodForm, basePrice: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-mono text-white focus:outline-none transition-all"
                />
              </div>

              <div className="col-span-1 sm:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Price Adjustment ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={prodForm.priceAdjustment}
                  onChange={(e) => setProdForm({ ...prodForm, priceAdjustment: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-mono text-white focus:outline-none transition-all"
                />
              </div>

              <div className="col-span-1 sm:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Stock Quantity</label>
                <input
                  required
                  type="number"
                  min="0"
                  value={prodForm.quantity}
                  onChange={(e) => setProdForm({ ...prodForm, quantity: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-mono text-white focus:outline-none transition-all"
                />
              </div>

              <div className="col-span-1 sm:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Reorder Level</label>
                <input
                  type="number"
                  min="0"
                  value={prodForm.reorderLevel}
                  onChange={(e) => setProdForm({ ...prodForm, reorderLevel: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-mono text-white focus:outline-none transition-all"
                />
              </div>

              <div className="col-span-1 sm:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Supplier</label>
                <select
                  value={prodForm.supplierId}
                  onChange={(e) => setProdForm({ ...prodForm, supplierId: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
                >
                  <option value="">NO SUPPLIER</option>
                  {suppliers.map((sup) => (
                    <option key={sup.supplierId} value={sup.supplierId}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 sm:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Branch / Warehouse</label>
                <select
                  value={prodForm.branchId}
                  onChange={(e) => setProdForm({ ...prodForm, branchId: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
                >
                  <option value="">UNASSIGNED BRANCH</option>
                  {branches.map((b) => (
                    <option key={b.branchId} value={b.branchId}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">SKU Code</label>
                <input
                  type="text"
                  placeholder="Auto-generated if left empty"
                  value={prodForm.sku}
                  onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs font-mono text-white uppercase focus:outline-none transition-all"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Product Image URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={prodForm.image}
                  onChange={(e) => setProdForm({ ...prodForm, image: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 mt-4 pt-6 border-t border-[#18181b] flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-[#8e8e93] hover:text-white font-bold text-xs tracking-widest px-6 py-2.5 uppercase hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg cursor-pointer transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-widest px-8 py-3 rounded-lg shadow-md shadow-emerald-950/50 uppercase cursor-pointer transition-all active:scale-95"
                >
                  {prodForm.editInvId ? "UPDATE VARIANT" : "SAVE VARIANT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
