"use client";

import React, { useState, useEffect, useMemo, FormEvent, useCallback } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

type TabType = "catalog" | "collections" | "colors";

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

interface ProductCardData {
  productId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string;
  supplierId: string | null;
  supplierName: string;
  branchId: string | null;
  branchName: string;
  basePrice: number;
  status: string;
  createdAt: string;
  mainImage: string | null;
  totalQuantity: number;
  totalAvailableQuantity: number;
  colors: { colorId: string; name: string; hexCode: string | null; images: string[] }[];
  sizes: { sizeId: string; name: string }[];
  variants: InventoryCatalogItem[];
}

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

  // ================= GROUP CATALOG ITEMS INTO PRODUCT BOX CARDS =================
  const productCards = useMemo<ProductCardData[]>(() => {
    const map = new Map<string, ProductCardData>();

    masterCatalog.forEach((item) => {
      if (!map.has(item.productId)) {
        map.set(item.productId, {
          productId: item.productId,
          name: item.name,
          description: item.description,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          branchId: item.branchId,
          branchName: item.branchName,
          basePrice: item.basePrice,
          status: item.status,
          createdAt: item.createdAt,
          mainImage: item.imageUrl || (item.images && item.images[0]) || null,
          totalQuantity: 0,
          totalAvailableQuantity: 0,
          colors: [],
          sizes: [],
          variants: [],
        });
      }

      const card = map.get(item.productId)!;
      card.totalQuantity += item.quantity;
      card.totalAvailableQuantity += item.availableQuantity;
      card.variants.push(item);

      // Track unique colors
      if (item.colorId && !card.colors.some((c) => c.colorId === item.colorId)) {
        const colorObj = colors.find((c) => c.colorId === item.colorId);
        const colorImages = item.images && item.images.length > 0 ? item.images : item.imageUrl ? [item.imageUrl] : [];
        card.colors.push({
          colorId: item.colorId,
          name: item.color,
          hexCode: colorObj?.hexCode || null,
          images: colorImages,
        });
      } else if (item.colorId && item.images && item.images.length > 0) {
        const existingColor = card.colors.find((c) => c.colorId === item.colorId);
        if (existingColor && existingColor.images.length === 0) {
          existingColor.images = item.images;
        }
      }

      // Track unique sizes
      if (item.sizeId && !card.sizes.some((s) => s.sizeId === item.sizeId)) {
        card.sizes.push({
          sizeId: item.sizeId,
          name: item.size,
        });
      }

      // Set main image if not set
      if (!card.mainImage && (item.imageUrl || (item.images && item.images[0]))) {
        card.mainImage = item.imageUrl || item.images[0];
      }
    });

    return Array.from(map.values());
  }, [masterCatalog, colors]);

  const filteredProductCards = useMemo(() => {
    return productCards.filter((prod) => {
      const matchSearch =
        prod.name.toLowerCase().includes(search.toLowerCase()) ||
        prod.variants.some((v) => v.sku.toLowerCase().includes(search.toLowerCase()));
      const matchCol = colFilter === "all" || prod.categoryId === colFilter;
      const matchColor =
        colorFilter === "all" ||
        prod.colors.some((c) => c.colorId === colorFilter || c.name === colorFilter);
      const matchVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "Live" && (prod.status === "live" || prod.status === "show")) ||
        (visibilityFilter === "Hidden" && (prod.status === "hidden" || prod.status === "hold"));

      return matchSearch && matchCol && matchColor && matchVisibility;
    });
  }, [productCards, search, colFilter, colorFilter, visibilityFilter]);

  const handleDeleteProduct = async (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this product and all its variants from inventory?")) return;
    setLoading(true);

    try {
      const res = await authenticatedFetch(`/admin/products/${productId}`, {
        method: "DELETE",
      });
      if (res && res.ok) {
        showToast("Product deleted successfully", "success");
        setIsProductModalOpen(false);
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

  const handleToggleProductVisibility = async (productId: string, currentStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus = currentStatus === "show" || currentStatus === "live" ? "hidden" : "live";
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/admin/products/${productId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res && res.ok) {
        showToast(`Product set to ${nextStatus.toUpperCase()}`, "success");
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

  // ================= TAB 2: COLLECTIONS =================
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
  const [hexInput, setHexInput] = useState("#10B981");
  const [colorImageInput, setColorImageInput] = useState("");
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
          hexCode: hexInput || undefined,
          imageUrl: colorImageInput.trim() || undefined,
          status: "Active",
        }),
      });

      if (res && res.ok) {
        showToast(`Color ${isEditing ? "updated" : "added"} successfully`, "success");
        setColorInput("");
        setHexInput("#10B981");
        setColorImageInput("");
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

  // ================= IMAGE UPLOAD HELPER =================
  const [uploadingColorId, setUploadingColorId] = useState<string | null>(null);

  const uploadFileToCloudinary = async (file: File, targetColorId?: string): Promise<string | null> => {
    if (targetColorId) setUploadingColorId(targetColorId);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await authenticatedFetch("/admin/products/image", {
        method: "POST",
        body: formData,
      });
      if (res && res.ok) {
        const data = await res.json();
        return data.secure_url || null;
      } else {
        const msg = res ? await responseMessage(res, "Image upload failed") : "Image upload error";
        showToast(msg, "error");
        return null;
      }
    } catch (err: any) {
      showToast(err.message || "Image upload failed", "error");
      return null;
    } finally {
      if (targetColorId) setUploadingColorId(null);
    }
  };

  // ================= UNIFIED MULTI-VARIANT PRODUCT MODAL (ADD / EDIT) =================
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    supplierId: "",
    branchId: "",
    basePrice: "2500",
    status: "live" as "live" | "hidden",
  });

  // Selected Colors & Sizes
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);

  // Per-color images map: { [colorId]: string[] }
  const [colorImages, setColorImages] = useState<Record<string, string[]>>({});
  // Per-color URL text input: { [colorId]: string }
  const [colorUrlInputs, setColorUrlInputs] = useState<Record<string, string>>({});

  // Matrix quantities & price adjustments: key is `${colorId}_${sizeId}`
  const [variantMatrix, setVariantMatrix] = useState<
    Record<string, { quantity: number; priceAdjustment: number; customSku?: string }>
  >({});

  const [bulkQtyValue, setBulkQtyValue] = useState("10");

  // Open for Adding a New Product
  const openAddProductModal = () => {
    setModalMode("add");
    setEditingProductId(null);
    setProductForm({
      name: "",
      description: "",
      categoryId: categories[0]?.categoryId || "",
      supplierId: suppliers[0]?.supplierId || "",
      branchId: branches[0]?.branchId || "",
      basePrice: "2500",
      status: "live",
    });

    const initialColors = colors.slice(0, 2).map((c) => c.colorId);
    const initialSizes = sizes.length > 0
      ? sizes.filter((s) => ["S", "M", "L", "XL"].includes(s.name.toUpperCase())).map((s) => s.sizeId)
      : [];

    setSelectedColorIds(initialColors);
    setSelectedSizeIds(initialSizes.length > 0 ? initialSizes : sizes.slice(0, 4).map((s) => s.sizeId));
    setColorImages({});
    setColorUrlInputs({});
    setVariantMatrix({});
    setBulkQtyValue("10");
    setIsProductModalOpen(true);
  };

  // Open for Editing an Existing Product Box Card
  const openEditProductModal = (card: ProductCardData) => {
    setModalMode("edit");
    setEditingProductId(card.productId);
    setProductForm({
      name: card.name,
      description: card.description || "",
      categoryId: card.categoryId || "",
      supplierId: card.supplierId || "",
      branchId: card.branchId || "",
      basePrice: card.basePrice.toString(),
      status: (card.status === "show" || card.status === "live" ? "live" : "hidden") as "live" | "hidden",
    });

    // Populate selected colors
    const activeColorIds = card.colors.map((c) => c.colorId);
    setSelectedColorIds(activeColorIds.length > 0 ? activeColorIds : colors.slice(0, 2).map((c) => c.colorId));

    // Populate per-color images map
    const imgsMap: Record<string, string[]> = {};
    card.colors.forEach((c) => {
      imgsMap[c.colorId] = c.images || [];
    });
    setColorImages(imgsMap);
    setColorUrlInputs({});

    // Populate selected sizes
    const activeSizeIds = card.sizes.map((s) => s.sizeId);
    setSelectedSizeIds(activeSizeIds.length > 0 ? activeSizeIds : sizes.slice(0, 4).map((s) => s.sizeId));

    // Populate variant stock matrix
    const matrix: Record<string, { quantity: number; priceAdjustment: number; customSku?: string }> = {};
    card.variants.forEach((v) => {
      const key = `${v.colorId}_${v.sizeId}`;
      matrix[key] = {
        quantity: v.quantity,
        priceAdjustment: v.priceAdjustment,
        customSku: v.sku,
      };
    });
    setVariantMatrix(matrix);
    setBulkQtyValue("10");
    setIsProductModalOpen(true);
  };

  const toggleColorSelection = (colorId: string) => {
    setSelectedColorIds((prev) =>
      prev.includes(colorId) ? prev.filter((id) => id !== colorId) : [...prev, colorId]
    );
  };

  const toggleSizeSelection = (sizeId: string) => {
    setSelectedSizeIds((prev) =>
      prev.includes(sizeId) ? prev.filter((id) => id !== sizeId) : [...prev, sizeId]
    );
  };

  const applySizePreset = (preset: "standard" | "full" | "all" | "clear") => {
    if (preset === "standard") {
      const standard = sizes
        .filter((s) => ["S", "M", "L", "XL"].includes(s.name.toUpperCase()))
        .map((s) => s.sizeId);
      setSelectedSizeIds(standard.length > 0 ? standard : sizes.slice(0, 4).map((s) => s.sizeId));
    } else if (preset === "full") {
      const full = sizes
        .filter((s) => ["XS", "S", "M", "L", "XL", "2XL", "3XL"].includes(s.name.toUpperCase()))
        .map((s) => s.sizeId);
      setSelectedSizeIds(full.length > 0 ? full : sizes.map((s) => s.sizeId));
    } else if (preset === "all") {
      setSelectedSizeIds(sizes.map((s) => s.sizeId));
    } else {
      setSelectedSizeIds([]);
    }
  };

  const handleAddImageUrlToColor = (colorId: string) => {
    const url = (colorUrlInputs[colorId] || "").trim();
    if (!url) return;
    setColorImages((prev) => ({
      ...prev,
      [colorId]: [...(prev[colorId] || []), url],
    }));
    setColorUrlInputs((prev) => ({ ...prev, [colorId]: "" }));
  };

  const handleFileUploadForColor = async (colorId: string, file: File) => {
    const uploadedUrl = await uploadFileToCloudinary(file, colorId);
    if (uploadedUrl) {
      setColorImages((prev) => ({
        ...prev,
        [colorId]: [...(prev[colorId] || []), uploadedUrl],
      }));
      showToast("Image uploaded successfully", "success");
    }
  };

  const handleRemoveImageFromColor = (colorId: string, imageIndex: number) => {
    setColorImages((prev) => ({
      ...prev,
      [colorId]: (prev[colorId] || []).filter((_, idx) => idx !== imageIndex),
    }));
  };

  const handleMatrixChange = (
    colorId: string,
    sizeId: string,
    field: "quantity" | "priceAdjustment",
    value: number
  ) => {
    const key = `${colorId}_${sizeId}`;
    setVariantMatrix((prev) => ({
      ...prev,
      [key]: {
        quantity: field === "quantity" ? Math.max(0, value) : (prev[key]?.quantity ?? 0),
        priceAdjustment: field === "priceAdjustment" ? value : (prev[key]?.priceAdjustment ?? 0),
        customSku: prev[key]?.customSku,
      },
    }));
  };

  const bulkApplyAllQuantities = (qty: number) => {
    setVariantMatrix((prev) => {
      const next = { ...prev };
      selectedColorIds.forEach((colorId) => {
        selectedSizeIds.forEach((sizeId) => {
          const key = `${colorId}_${sizeId}`;
          next[key] = {
            quantity: Math.max(0, qty),
            priceAdjustment: prev[key]?.priceAdjustment ?? 0,
            customSku: prev[key]?.customSku,
          };
        });
      });
      return next;
    });
    showToast(`Set all variant quantities to ${qty} units`, "success");
  };

  const copyQuantitiesToAllColors = (sourceColorId: string) => {
    setVariantMatrix((prev) => {
      const next = { ...prev };
      selectedColorIds.forEach((cId) => {
        if (cId === sourceColorId) return;
        selectedSizeIds.forEach((sId) => {
          const sourceKey = `${sourceColorId}_${sId}`;
          const targetKey = `${cId}_${sId}`;
          next[targetKey] = {
            quantity: prev[sourceKey]?.quantity ?? 0,
            priceAdjustment: prev[sourceKey]?.priceAdjustment ?? 0,
            customSku: prev[targetKey]?.customSku,
          };
        });
      });
      return next;
    });
    showToast("Copied stock quantities to all colors", "success");
  };

  const matrixStats = useMemo(() => {
    let totalVariants = 0;
    let totalStock = 0;

    selectedColorIds.forEach((colorId) => {
      selectedSizeIds.forEach((sizeId) => {
        totalVariants += 1;
        const key = `${colorId}_${sizeId}`;
        totalStock += variantMatrix[key]?.quantity ?? 0;
      });
    });

    return { totalVariants, totalStock };
  }, [selectedColorIds, selectedSizeIds, variantMatrix]);

  // Save the Product (Create New or Update Existing)
  const handleSaveMultiVariantProduct = async (statusOverride?: "live" | "hidden") => {
    if (!productForm.name.trim()) {
      showToast("Product name is required", "error");
      return;
    }
    if (selectedColorIds.length === 0) {
      showToast("Please select at least one color", "error");
      return;
    }
    if (selectedSizeIds.length === 0) {
      showToast("Please select at least one size", "error");
      return;
    }

    setLoading(true);

    const basePriceNum = parseFloat(productForm.basePrice) || 0;
    const finalStatus = statusOverride || productForm.status;
    const prefix = productForm.name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "VG";

    const variantsPayload = selectedColorIds.flatMap((colorId) => {
      const colorObj = colors.find((c) => c.colorId === colorId);
      const colorName = colorObj?.name || "CLR";
      const colorImagesList = colorImages[colorId] || [];

      return selectedSizeIds.map((sizeId) => {
        const sizeObj = sizes.find((s) => s.sizeId === sizeId);
        const sizeName = sizeObj?.name || "SZ";
        const key = `${colorId}_${sizeId}`;
        const itemData = variantMatrix[key] || { quantity: 0, priceAdjustment: 0 };

        const sku =
          itemData.customSku?.trim() ||
          `VG-${prefix}-${colorName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase()}-${sizeName.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

        return {
          sku,
          status: "show",
          colorId,
          sizeId,
          priceAdjustment: itemData.priceAdjustment,
          quantity: itemData.quantity,
          branchId: productForm.branchId || undefined,
          reorderLevel: 10,
          imageUrl: colorImagesList[0] || colorObj?.imageUrl || undefined,
          images: colorImagesList,
        };
      });
    });

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim() || undefined,
      categoryId: productForm.categoryId || undefined,
      supplierId: productForm.supplierId || undefined,
      basePrice: basePriceNum,
      status: finalStatus,
      variants: variantsPayload,
    };

    try {
      const isEditing = modalMode === "edit" && editingProductId;
      const path = isEditing ? `/admin/products/${editingProductId}` : "/admin/products";
      const method = isEditing ? "PUT" : "POST";

      const res = await authenticatedFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res && res.ok) {
        showToast(
          isEditing
            ? "Product and variants updated successfully!"
            : `Product created successfully with ${variantsPayload.length} variants!`,
          "success"
        );
        setIsProductModalOpen(false);
        await fetchAllData();
      } else {
        const msg = res ? await responseMessage(res, "Failed to save product") : "Request failed";
        showToast(msg, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save product", "error");
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
      ].map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setActiveTab(t.id as TabType)}
          className={`text-xs font-bold tracking-widest uppercase px-4 py-2.5 rounded-lg transition-all cursor-pointer ${
            activeTab === t.id
              ? "bg-white text-black shadow-md shadow-white/5"
              : "text-[#8e8e93] hover:text-white bg-[#121212] border border-[rgba(255,255,255,0.05)] hover:border-white/20"
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

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-lg sm:text-xl font-bold tracking-[0.2em] text-white uppercase">INVENTORY COMMAND</h1>
        <p className="text-[10px] sm:text-xs text-[#71717a] uppercase tracking-wider mt-1">
          Manage apparel catalog, box cards, live customizations & color palette
        </p>
      </div>

      {renderNav()}

      {loading && (
        <div className="py-20 text-center text-white font-mono text-xs uppercase tracking-widest animate-pulse flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
          SYNCING INVENTORY RECORDS...
        </div>
      )}

      {/* ========================================================================= */}
      {/* ======================= TAB: MASTER CATALOG BOX CARDS ==================== */}
      {/* ========================================================================= */}
      {!loading && activeTab === "catalog" && (
        <section className="space-y-6">
          {/* Top Filter & Add Toolbar */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] p-4 sm:p-5 rounded-xl gap-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3 w-full lg:w-auto">
              <input
                type="text"
                placeholder="Search Garment Name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#161616] border border-[rgba(255,255,255,0.08)] focus:border-white/20 rounded-md px-3.5 py-2 text-xs text-white placeholder-[#555] uppercase focus:outline-none transition-all"
              />
              <select
                value={colFilter}
                onChange={(e) => setColFilter(e.target.value)}
                className="bg-[#161616] border border-[rgba(255,255,255,0.08)] focus:border-white/20 rounded-md px-3 py-2 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
              >
                <option value="all" className="bg-[#121212]">ALL COLLECTIONS</option>
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId} className="bg-[#121212]">
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                className="bg-[#161616] border border-[rgba(255,255,255,0.08)] focus:border-white/20 rounded-md px-3 py-2 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
              >
                <option value="all" className="bg-[#121212]">ALL COLORS</option>
                {colors.map((c) => (
                  <option key={c.colorId} value={c.colorId} className="bg-[#121212]">
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="bg-[#161616] border border-[rgba(255,255,255,0.08)] focus:border-white/20 rounded-md px-3 py-2 text-xs font-bold tracking-wider uppercase text-white cursor-pointer focus:outline-none transition-all"
              >
                <option value="all" className="bg-[#121212]">ALL VISIBILITY</option>
                <option value="Live" className="bg-[#121212]">LIVE ONLY</option>
                <option value="Hidden" className="bg-[#121212]">HIDDEN ONLY</option>
              </select>
            </div>

            <button
              type="button"
              onClick={openAddProductModal}
              className="bg-white text-black hover:bg-[#eaeaea] font-bold text-xs tracking-[0.15em] px-5 py-2.5 rounded-md transition-all shadow-md shadow-white/5 uppercase cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>ADD PRODUCT</span>
            </button>
          </div>

          {/* PRODUCT BOX CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProductCards.map((card) => {
              const isLive = card.status === "show" || card.status === "live";

              return (
                <div
                  key={card.productId}
                  onClick={() => openEditProductModal(card)}
                  className="admin-card group relative flex flex-col justify-between overflow-hidden cursor-pointer hover:border-white/20 transition-all rounded-xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] shadow-lg hover:shadow-2xl"
                >
                  {/* Card Header Media */}
                  <div className="relative aspect-[4/3] w-full bg-[#161616] overflow-hidden border-b border-[rgba(255,255,255,0.06)]">
                    {card.mainImage ? (
                      <img
                        src={card.mainImage}
                        alt={card.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#555] font-bold text-xs">
                        <svg className="w-8 h-8 mb-1 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>NO IMAGE</span>
                      </div>
                    )}

                    {/* Top Floating Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center pointer-events-none">
                      <span className="bg-black/80 backdrop-blur-md text-[#8e8e93] font-bold text-[9px] px-2.5 py-1 rounded border border-white/10 uppercase tracking-wider">
                        {card.categoryName}
                      </span>
                      <span
                        className={`text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border shadow-md flex items-center gap-1.5 ${
                          isLive
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : "bg-red-500/20 text-red-400 border-red-500/40"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}></span>
                        <span>{isLive ? "LIVE" : "HIDDEN"}</span>
                      </span>
                    </div>

                    {/* Bottom Floating Variant Counter */}
                    <div className="absolute bottom-2 left-2.5">
                      <span className="bg-black/80 backdrop-blur-md text-white font-mono-meta font-bold text-[9px] px-2 py-0.5 rounded border border-white/10 uppercase">
                        {card.variants.length} VARIANTS
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Product Name */}
                      <h3 className="text-white font-bold text-sm uppercase tracking-wide group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {card.name}
                      </h3>

                      {card.description && (
                        <p className="text-[10px] text-[#71717a] mt-0.5 line-clamp-1">
                          {card.description}
                        </p>
                      )}

                      {/* Colors Swatches & Sizes Row */}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[rgba(255,255,255,0.04)] pt-2.5">
                        {/* Colors */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {card.colors.map((c) => (
                            <span
                              key={c.colorId}
                              title={c.name}
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: c.hexCode || "#555" }}
                            ></span>
                          ))}
                          <span className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">
                            {card.colors.length} {card.colors.length === 1 ? "color" : "colors"}
                          </span>
                        </div>

                        {/* Sizes */}
                        <div className="text-[10px] font-mono-meta text-[#8e8e93] font-bold uppercase">
                          {card.sizes.map((s) => s.name).join(" • ")}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Base Price & Total Stock */}
                    <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex justify-between items-end">
                      <div>
                        <span className="text-[9px] text-[#8e8e93] uppercase font-bold block">BASE PRICE</span>
                        <span className="text-white font-mono-meta font-extrabold text-sm">
                          ${card.basePrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-[#8e8e93] uppercase font-bold block">TOTAL STOCK</span>
                        <span
                          className={`font-mono-meta font-extrabold text-xs px-2 py-0.5 rounded border inline-block ${
                            card.totalQuantity === 0
                              ? "text-red-400 bg-red-950/40 border-red-900/40"
                              : card.totalQuantity <= 10
                              ? "text-amber-400 bg-amber-950/40 border-amber-900/40"
                              : "text-white bg-[#161616] border-[rgba(255,255,255,0.08)]"
                          }`}
                        >
                          {card.totalQuantity} units
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="p-3 bg-[#121212] border-t border-[rgba(255,255,255,0.04)] flex justify-between items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleToggleProductVisibility(card.productId, card.status, e)}
                      className={`flex-1 font-bold text-[9px] tracking-wider uppercase py-2 px-3 rounded transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                        isLive
                          ? "bg-red-950/30 hover:bg-red-900/60 text-red-400 border border-red-800/40"
                          : "bg-emerald-950/30 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-red-400" : "bg-emerald-400"}`}></span>
                      <span>{isLive ? "MAKE HIDDEN" : "MAKE LIVE"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProduct(card.productId, e)}
                      title="Delete Product"
                      className="bg-red-950/30 text-[#ef4444] hover:bg-[#ef4444] hover:text-white border border-[rgba(239,68,68,0.2)] p-2 rounded transition-all cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredProductCards.length === 0 && (
              <div className="col-span-full py-20 text-center text-[#555] font-bold text-xs tracking-wider uppercase bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-xl">
                No garments found in catalog. Click "+ ADD PRODUCT" to create one.
              </div>
            )}
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
                  placeholder="E.g. Oversized Heavyweight Tees, Summer 2026..."
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-4 py-2.5 text-xs text-white uppercase focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Description</label>
                <textarea
                  rows={3}
                  value={collectionForm.desc}
                  onChange={(e) => setCollectionForm({ ...collectionForm, desc: e.target.value })}
                  placeholder="Collection aesthetic, seasonal details, or fabric description..."
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                />
              </div>
              <div className="pt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={saveCollection}
                  className="bg-white text-black hover:bg-[#eaeaea] font-bold text-xs tracking-widest px-8 py-3 rounded-lg uppercase transition-all shadow-md cursor-pointer active:scale-95"
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
              Existing Collections ({categories.length})
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {categories.map((c) => (
                <div key={c.categoryId} className="flex justify-between items-center p-4 bg-[#141416] border border-[#27272a] rounded-lg hover:border-white/20 transition-all">
                  <div>
                    <span className="text-white font-bold text-xs uppercase tracking-wider block">{c.name}</span>
                    <span className="text-[#666] text-[10px] mt-0.5 block">{c.description || "No description"}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCollectionForm({ id: c.categoryId, name: c.name, desc: c.description || "" })}
                      className="text-[9px] font-bold tracking-wider uppercase text-[#a1a1aa] hover:text-white bg-[#18181b] hover:bg-white/10 border border-[#27272a] px-3 py-1.5 rounded-lg cursor-pointer transition-all"
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
              {categories.length === 0 && <div className="text-xs text-[#555] uppercase py-6 text-center font-bold">No collections created yet.</div>}
            </div>
          </div>
        </section>
      )}

      {/* --- TAB: COLORS --- */}
      {!loading && activeTab === "colors" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 sm:p-7 shadow-sm">
            <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-6 border-b border-[#18181b] pb-4">
              {editingColorId ? "Edit Color Entity" : "Add Color to Palette"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Color Name</label>
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  placeholder="E.g. Radioactive Moss, Crimson Red, Jet Black..."
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-white/20 rounded-lg px-4 py-2.5 text-xs text-white uppercase focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Hex Color Code</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={hexInput}
                      onChange={(e) => setHexInput(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-[#27272a] bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={hexInput}
                      onChange={(e) => setHexInput(e.target.value)}
                      placeholder="#10B981"
                      className="flex-1 bg-[#18181b] border border-[#27272a] focus:border-white/20 rounded-lg px-4 py-2.5 text-xs text-white font-mono uppercase focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Color Swatch Image URL (Optional)</label>
                  <input
                    type="text"
                    value={colorImageInput}
                    onChange={(e) => setColorImageInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#18181b] border border-[#27272a] focus:border-white/20 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={saveColor}
                  className="bg-white text-black hover:bg-[#eaeaea] font-bold text-xs tracking-widest px-8 py-3 rounded-lg uppercase transition-all shadow-md cursor-pointer active:scale-95"
                >
                  {editingColorId ? "UPDATE COLOR" : "SAVE COLOR"}
                </button>
                {editingColorId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingColorId(null);
                      setColorInput("");
                      setHexInput("#10B981");
                      setColorImageInput("");
                    }}
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
              Palette Colors ({colors.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {colors.map((c) => (
                <div key={c.colorId} className="flex items-center justify-between bg-[#141416] border border-[#27272a] p-3 rounded-lg hover:border-white/20 transition-all">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full border border-white/20 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: c.hexCode || "#555" }}
                    ></span>
                    <div>
                      <span className="text-white font-bold text-xs uppercase tracking-wider block">{c.name}</span>
                      <span className="text-[#666] font-mono text-[10px] block">{c.hexCode || "No Hex"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingColorId(c.colorId);
                        setColorInput(c.name);
                        setHexInput(c.hexCode || "#10B981");
                        setColorImageInput(c.imageUrl || "");
                      }}
                      className="text-[9px] font-bold tracking-wider uppercase text-[#a1a1aa] hover:text-white bg-[#18181b] hover:bg-white/10 border border-[#27272a] px-2.5 py-1 rounded cursor-pointer transition-all"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteColor(c.colorId)}
                      className="text-[9px] font-bold tracking-wider uppercase text-red-400 bg-[#18181b] hover:bg-red-950/60 border border-[#27272a] px-2.5 py-1 rounded cursor-pointer transition-all"
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
              {colors.length === 0 && <span className="text-xs text-[#555] uppercase py-6 text-center font-bold col-span-2">No colors in palette.</span>}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ======= UNIFIED MULTI-VARIANT PRODUCT MODAL (ADD & CARD EDIT) =========== */}
      {/* ========================================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 select-none animate-slide-in">
          <div
            className="w-full max-w-4xl bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[#0d0d0d] flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold tracking-widest uppercase text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                  {modalMode === "edit" ? `EDIT PRODUCT: ${productForm.name || "GARMENT"}` : "ADD CLOTH & MULTI-VARIANTS"}
                </h3>
                <p className="text-[10px] text-[#8e8e93] uppercase font-semibold mt-0.5">
                  Configure garment, per-color photo gallery, sizes & stock matrix
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-[#8e8e93] hover:text-white transition-colors cursor-pointer p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* --- SECTION 1: CORE PRODUCT DETAILS --- */}
              <div className="admin-card p-5 space-y-4">
                <h4 className="text-[10px] font-bold text-white tracking-widest uppercase pb-2 border-b border-[rgba(255,255,255,0.04)]">
                  1. GENERAL PRODUCT DETAILS
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Product Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                      PRODUCT NAME *
                    </label>
                    <input
                      required
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="E.g. Oversized Heavyweight T-Shirt"
                      className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-xs text-white uppercase placeholder-[#555] focus:outline-none focus:border-white/20"
                    />
                  </div>

                  {/* Collection Dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                      COLLECTION (CATEGORY) *
                    </label>
                    <select
                      value={productForm.categoryId}
                      onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                      className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 cursor-pointer uppercase font-bold"
                    >
                      <option value="" className="bg-[#121212]">-- UNASSIGNED COLLECTION --</option>
                      {categories.map((c) => (
                        <option key={c.categoryId} value={c.categoryId} className="bg-[#121212]">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Base Price */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                      BASE PRICE ($ / LKR) *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.basePrice}
                      onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                      className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-xs font-mono-meta font-bold text-white focus:outline-none focus:border-white/20"
                    />
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                      SUPPLIER
                    </label>
                    <select
                      value={productForm.supplierId}
                      onChange={(e) => setProductForm({ ...productForm, supplierId: e.target.value })}
                      className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 cursor-pointer"
                    >
                      <option value="" className="bg-[#121212]">-- NO SUPPLIER --</option>
                      {suppliers.map((s) => (
                        <option key={s.supplierId} value={s.supplierId} className="bg-[#121212]">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Primary Branch */}
                  <div>
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                      PRIMARY WAREHOUSE / BRANCH
                    </label>
                    <select
                      value={productForm.branchId}
                      onChange={(e) => setProductForm({ ...productForm, branchId: e.target.value })}
                      className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 cursor-pointer"
                    >
                      <option value="" className="bg-[#121212]">-- UNASSIGNED BRANCH --</option>
                      {branches.map((b) => (
                        <option key={b.branchId} value={b.branchId} className="bg-[#121212]">
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                      DESCRIPTION & FIT DETAILS
                    </label>
                    <textarea
                      rows={2}
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Fabric GSM, fit details, model sizing, streetwear aesthetics..."
                      className="w-full bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 placeholder-[#555]"
                    />
                  </div>
                </div>
              </div>

              {/* --- SECTION 2: COLORS & PER-COLOR GALLERIES --- */}
              <div className="admin-card p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-[rgba(255,255,255,0.04)]">
                  <h4 className="text-[10px] font-bold text-white tracking-widest uppercase">
                    2. COLORS & COLOR GALLERIES ({selectedColorIds.length} SELECTED)
                  </h4>
                </div>

                {/* Color Selector Chips */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-2">
                    SELECT AVAILABLE COLORS:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => {
                      const isSelected = selectedColorIds.includes(c.colorId);
                      return (
                        <button
                          key={c.colorId}
                          type="button"
                          onClick={() => toggleColorSelection(c.colorId)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white text-black border border-white shadow-sm"
                              : "bg-[#161616] text-[#8e8e93] hover:text-white border border-[rgba(255,255,255,0.08)]"
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-black/20"
                            style={{ backgroundColor: c.hexCode || "#555" }}
                          ></span>
                          <span>{c.name}</span>
                          {isSelected && <span className="font-extrabold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Per-Color Imagery Cards */}
                {selectedColorIds.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase">
                      COLOR GALLERIES (PHOTOS PER COLOR):
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedColorIds.map((colorId) => {
                        const colorObj = colors.find((c) => c.colorId === colorId);
                        const imgs = colorImages[colorId] || [];
                        const isUploading = uploadingColorId === colorId;

                        return (
                          <div
                            key={colorId}
                            className="bg-[#121212] border border-[rgba(255,255,255,0.06)] rounded-lg p-3.5 space-y-3"
                          >
                            {/* Color Header */}
                            <div className="flex justify-between items-center pb-2 border-b border-[rgba(255,255,255,0.04)]">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-white/20"
                                  style={{ backgroundColor: colorObj?.hexCode || "#555" }}
                                ></span>
                                <span className="text-white font-bold text-xs uppercase tracking-wide">
                                  {colorObj?.name}
                                </span>
                              </div>
                              <span className="text-[9px] text-[#8e8e93] font-mono-meta">
                                {imgs.length} photo{imgs.length !== 1 ? "s" : ""}
                              </span>
                            </div>

                            {/* Images Thumbnail List */}
                            <div className="flex flex-wrap gap-2 min-h-[52px] items-center p-2 bg-[#0a0a0a] border border-[rgba(255,255,255,0.04)] rounded-md">
                              {imgs.map((url, imgIdx) => (
                                <div
                                  key={imgIdx}
                                  className="relative group w-12 h-12 rounded border border-[rgba(255,255,255,0.1)] bg-[#161616] overflow-hidden flex-shrink-0"
                                >
                                  <img
                                    src={url}
                                    alt={`${colorObj?.name} photo ${imgIdx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImageFromColor(colorId, imgIdx)}
                                    title="Delete Image"
                                    className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 hover:text-red-300 transition-opacity cursor-pointer"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                  {imgIdx === 0 && (
                                    <span className="absolute bottom-0 inset-x-0 bg-white text-black text-[7px] text-center font-extrabold uppercase py-0.2 pointer-events-none">
                                      MAIN
                                    </span>
                                  )}
                                </div>
                              ))}

                              {imgs.length === 0 && (
                                <span className="text-[10px] text-[#555] uppercase font-bold text-center w-full">
                                  No images attached for {colorObj?.name}
                                </span>
                              )}
                            </div>

                            {/* Upload & URL Inputs */}
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <label className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-[rgba(255,255,255,0.1)] text-white text-[10px] font-bold tracking-wider uppercase py-1.5 px-3 rounded-md cursor-pointer transition-all">
                                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                  <span>{isUploading ? "UPLOADING..." : "UPLOAD PHOTO"}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isUploading}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) void handleFileUploadForColor(colorId, f);
                                    }}
                                  />
                                </label>
                              </div>

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Or paste photo URL..."
                                  value={colorUrlInputs[colorId] || ""}
                                  onChange={(e) =>
                                    setColorUrlInputs({ ...colorUrlInputs, [colorId]: e.target.value })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddImageUrlToColor(colorId);
                                    }
                                  }}
                                  className="flex-1 bg-[#161616] border border-[rgba(255,255,255,0.08)] rounded-md px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-white/20 placeholder-[#555]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddImageUrlToColor(colorId)}
                                  className="bg-white/10 hover:bg-white text-white hover:text-black font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-md transition-all cursor-pointer"
                                >
                                  ADD
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* --- SECTION 3: SIZES & STOCK MATRIX TABLE --- */}
              <div className="admin-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-[rgba(255,255,255,0.04)]">
                  <h4 className="text-[10px] font-bold text-white tracking-widest uppercase">
                    3. SIZES & STOCK MATRIX ({matrixStats.totalVariants} VARIANTS)
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applySizePreset("standard")}
                      className="text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded border border-[rgba(255,255,255,0.08)] cursor-pointer"
                    >
                      STANDARD (S, M, L, XL)
                    </button>
                    <button
                      type="button"
                      onClick={() => applySizePreset("full")}
                      className="text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded border border-[rgba(255,255,255,0.08)] cursor-pointer"
                    >
                      FULL RANGE (XS - 3XL)
                    </button>
                    <button
                      type="button"
                      onClick={() => applySizePreset("all")}
                      className="text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded border border-[rgba(255,255,255,0.08)] cursor-pointer"
                    >
                      ALL SIZES
                    </button>
                    <button
                      type="button"
                      onClick={() => applySizePreset("clear")}
                      className="text-[9px] font-bold tracking-wider uppercase px-2 py-1 text-[#8e8e93] hover:text-white rounded hover:bg-white/5 cursor-pointer"
                    >
                      CLEAR
                    </button>
                  </div>
                </div>

                {/* Size Selector Chips */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-2">
                    SELECT SIZES:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => {
                      const isSelected = selectedSizeIds.includes(s.sizeId);
                      return (
                        <button
                          key={s.sizeId}
                          type="button"
                          onClick={() => toggleSizeSelection(s.sizeId)}
                          className={`px-3.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white text-black border border-white shadow-sm"
                              : "bg-[#161616] text-[#8e8e93] hover:text-white border border-[rgba(255,255,255,0.08)]"
                          }`}
                        >
                          {s.name} {isSelected && "✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Matrix Table & Bulk Toolbar */}
                {selectedColorIds.length > 0 && selectedSizeIds.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-[#121212] border border-[rgba(255,255,255,0.06)] rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#8e8e93] uppercase">SET ALL QUANTITIES TO:</span>
                        <input
                          type="number"
                          min="0"
                          value={bulkQtyValue}
                          onChange={(e) => setBulkQtyValue(e.target.value)}
                          className="w-16 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded px-2 py-1 text-xs font-mono-meta text-white text-center focus:outline-none focus:border-white/30"
                        />
                        <button
                          type="button"
                          onClick={() => bulkApplyAllQuantities(parseInt(bulkQtyValue) || 0)}
                          className="text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 bg-white text-black hover:bg-[#eaeaea] rounded cursor-pointer transition-all"
                        >
                          APPLY TO ALL
                        </button>
                      </div>

                      {selectedColorIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => copyQuantitiesToAllColors(selectedColorIds[0])}
                          className="text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded border border-[rgba(255,255,255,0.1)] cursor-pointer"
                        >
                          COPY 1ST COLOR QUANTITIES ACROSS ALL
                        </button>
                      )}
                    </div>

                    {/* Matrix Grid Table */}
                    <div className="overflow-x-auto border border-[rgba(255,255,255,0.06)] rounded-lg custom-scrollbar max-h-[320px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#080808] text-[#8e8e93] sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">
                              Color
                            </th>
                            <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">
                              Size
                            </th>
                            <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">
                              Generated SKU
                            </th>
                            <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)] w-36">
                              Stock Qty
                            </th>
                            <th className="py-2.5 px-4 font-bold tracking-wider uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)] w-32">
                              Price Adjust ($)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(255,255,255,0.03)] bg-[#0f0f0f]">
                          {selectedColorIds.map((colorId) => {
                            const colorObj = colors.find((c) => c.colorId === colorId);
                            const colorName = colorObj?.name || "Color";
                            const prefix = productForm.name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase() || "VG";

                            return selectedSizeIds.map((sizeId) => {
                              const sizeObj = sizes.find((s) => s.sizeId === sizeId);
                              const sizeName = sizeObj?.name || "Size";
                              const key = `${colorId}_${sizeId}`;
                              const currentData = variantMatrix[key] || { quantity: 0, priceAdjustment: 0 };
                              const generatedSku = `VG-${prefix}-${colorName.substring(0, 3).toUpperCase()}-${sizeName.toUpperCase()}`;

                              return (
                                <tr key={key} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="py-2.5 px-4">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                                        style={{ backgroundColor: colorObj?.hexCode || "#555" }}
                                      ></span>
                                      <span className="font-bold text-white uppercase text-[11px]">
                                        {colorName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <span className="bg-[#161616] text-white font-bold px-2 py-0.5 rounded border border-[rgba(255,255,255,0.08)] uppercase text-[10px]">
                                      {sizeName}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-[#8e8e93] font-mono-meta text-[11px]">
                                    {generatedSku}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <input
                                      type="number"
                                      min="0"
                                      value={currentData.quantity}
                                      onChange={(e) =>
                                        handleMatrixChange(colorId, sizeId, "quantity", parseInt(e.target.value) || 0)
                                      }
                                      className="w-24 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded px-2 py-1 text-xs font-mono-meta font-bold text-white focus:outline-none focus:border-white/30 text-center"
                                    />
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={currentData.priceAdjustment}
                                      onChange={(e) =>
                                        handleMatrixChange(colorId, sizeId, "priceAdjustment", parseFloat(e.target.value) || 0)
                                      }
                                      placeholder="0.00"
                                      className="w-24 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded px-2 py-1 text-xs font-mono-meta text-[#a1a1aa] focus:outline-none focus:border-white/30 text-center"
                                    />
                                  </td>
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.06)] bg-[#0d0d0d] flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-3 text-xs text-[#8e8e93] font-mono-meta">
                <span className="bg-white/5 text-white px-3 py-1.5 rounded border border-[rgba(255,255,255,0.08)] font-bold">
                  {matrixStats.totalVariants} VARIANTS
                </span>
                <span>•</span>
                <span className="bg-emerald-950/40 text-emerald-400 px-3 py-1.5 rounded border border-emerald-800/40 font-bold">
                  {matrixStats.totalStock} TOTAL STOCK UNITS
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {modalMode === "edit" && editingProductId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(editingProductId)}
                    className="bg-red-950/30 text-[#ef4444] hover:bg-[#ef4444] hover:text-white border border-[rgba(239,68,68,0.2)] font-bold text-xs tracking-widest px-4 py-2 rounded-md uppercase cursor-pointer transition-all mr-auto sm:mr-2"
                  >
                    DELETE
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="bg-transparent hover:bg-white/5 border border-[rgba(255,255,255,0.1)] text-[#8e8e93] hover:text-white font-bold tracking-widest px-4 py-2 rounded-md transition-all uppercase cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveMultiVariantProduct("hidden")}
                  disabled={loading || matrixStats.totalVariants === 0}
                  className="bg-[#161616] hover:bg-[#202020] border border-[rgba(255,255,255,0.15)] text-white font-bold text-xs tracking-widest px-5 py-2 rounded-md uppercase cursor-pointer transition-all disabled:opacity-50"
                >
                  SAVE AS HIDDEN
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveMultiVariantProduct("live")}
                  disabled={loading || matrixStats.totalVariants === 0}
                  className="bg-white text-black hover:bg-[#eaeaea] font-bold text-xs tracking-widest px-6 py-2 rounded-md shadow-md shadow-white/5 uppercase cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{modalMode === "edit" ? "SAVE CHANGES & SET LIVE" : "SET PRODUCT LIVE"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
