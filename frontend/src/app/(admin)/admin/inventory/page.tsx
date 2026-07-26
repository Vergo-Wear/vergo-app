"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { StorefrontTab } from "./StorefrontTab";

type InventoryTab = "stock" | "categories" | "options" | "storefront";
type InventoryView = "variants" | "products";
type ProductStatus = "active" | "draft";
type VariantOptionType = "Color" | "Size";

interface Category {
  categoryId: string;
  name: string;
  description: string | null;
}

interface Supplier {
  supplierId: string;
  name: string;
  status: "Active" | "Inactive";
}

interface Branch {
  branchId: string;
  name: string;
  address: string;
  phone: string;
}

interface ColorOption {
  colorId: string;
  name: string;
  hexCode: string | null;
  imageUrl: string | null;
  displayOrder: number;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

interface SizeOption {
  sizeId: string;
  name: string;
  displayOrder: number;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

interface ManagedOption {
  optionId: string;
  optionType: VariantOptionType;
  value: string;
  hexCode: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

interface InventoryItem {
  productId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string;
  supplierId: string | null;
  supplierName: string;
  basePrice: number;
  status: string;
  variantId: string;
  sku: string;
  sizeId: string;
  size: string;
  colorId: string;
  color: string;
  priceAdjustment: number;
  sellingPrice: number;
  imageUrl: string | null;
  inventoryId: string | null;
  branchId: string | null;
  branchName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  lastUpdated: string | null;
}

interface ProductGroup {
  productId: string;
  name: string;
  description: string | null;
  categoryName: string;
  supplierName: string;
  status: string;
  imageUrl: string | null;
  variantIds: Set<string>;
  branchIds: Set<string>;
  colors: { id: string; name: string }[];
  sizes: Set<string>;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumPrice: number;
  maximumPrice: number;
  hasLowStock: boolean;
  lastUpdated: string | null;
}

interface InventoryCatalog {
  categories: Category[];
  suppliers: Supplier[];
  branches: Branch[];
  colors: ColorOption[];
  sizes: SizeOption[];
  items: InventoryItem[];
}

interface ProductForm {
  inventoryId: string | null;
  name: string;
  description: string;
  categoryId: string;
  supplierId: string;
  basePrice: string;
  status: ProductStatus;
  sku: string;
  sizeId: string;
  colorId: string;
  priceAdjustment: string;
  branchId: string;
  quantity: string;
  reorderLevel: string;
  imageUrl: string;
  reservedQuantity: number;
}

interface CategoryForm {
  categoryId: string | null;
  name: string;
  description: string;
}

interface VariantOptionForm {
  optionId: string | null;
  optionType: VariantOptionType;
  value: string;
  hexCode: string;
  imageUrl: string;
  displayOrder: string;
  status: "Active" | "Inactive";
}

const emptyProductForm: ProductForm = {
  inventoryId: null,
  name: "",
  description: "",
  categoryId: "",
  supplierId: "",
  basePrice: "0",
  status: "draft",
  sku: "",
  sizeId: "",
  colorId: "",
  priceAdjustment: "0",
  branchId: "",
  quantity: "0",
  reorderLevel: "10",
  imageUrl: "",
  reservedQuantity: 0,
};

const emptyCategoryForm: CategoryForm = {
  categoryId: null,
  name: "",
  description: "",
};

const emptyVariantOptionForm: VariantOptionForm = {
  optionId: null,
  optionType: "Color",
  value: "",
  hexCode: "",
  imageUrl: "",
  displayOrder: "0",
  status: "Active",
};

async function getResponseMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  if (Array.isArray(body?.message)) return body.message.join(" ");
  return body?.message || fallback;
}

export default function InventoryPage() {
  const [catalog, setCatalog] = useState<InventoryCatalog>({
    categories: [],
    suppliers: [],
    branches: [],
    colors: [],
    sizes: [],
    items: [],
  });
  const [activeTab, setActiveTab] = useState<InventoryTab>("stock");
  const [inventoryView, setInventoryView] = useState<InventoryView>("variants");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [categoryForm, setCategoryForm] =
    useState<CategoryForm>(emptyCategoryForm);
  const [variantOptionForm, setVariantOptionForm] = useState<VariantOptionForm>(
    emptyVariantOptionForm,
  );
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    const response = await authenticatedFetch("/admin/inventory/catalog", {
      cache: "no-store",
    });
    if (!response) {
      setLoading(false);
      return;
    }
    if (!response.ok) {
      setFeedback({
        message: await getResponseMessage(
          response,
          "Unable to load inventory data.",
        ),
        type: "error",
      });
      setLoading(false);
      return;
    }
    setCatalog((await response.json()) as InventoryCatalog);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalog.items.filter((item) => {
      const matchesSearch =
        !query ||
        [
          item.name,
          item.sku,
          item.color,
          item.size,
          item.categoryName,
          item.supplierName,
          item.branchName,
        ].some((value) => value.toLowerCase().includes(query));
      const matchesCategory =
        categoryFilter === "all" || item.categoryId === categoryFilter;
      const matchesProduct =
        productFilter === "all" || item.productId === productFilter;
      const matchesSupplier =
        supplierFilter === "all" || item.supplierId === supplierFilter;
      const matchesBranch =
        branchFilter === "all" || item.branchId === branchFilter;
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" &&
          item.availableQuantity > 0 &&
          item.availableQuantity <= item.reorderLevel) ||
        (stockFilter === "out" && item.availableQuantity === 0);
      return (
        matchesSearch &&
        matchesProduct &&
        matchesCategory &&
        matchesSupplier &&
        matchesBranch &&
        matchesStatus &&
        matchesStock
      );
    });
  }, [
    branchFilter,
    catalog.items,
    categoryFilter,
    productFilter,
    search,
    statusFilter,
    stockFilter,
    supplierFilter,
  ]);

  const products = useMemo(() => {
    const unique = new Map<string, string>();
    for (const item of catalog.items) {
      unique.set(item.productId, item.name);
    }
    return [...unique.entries()]
      .map(([productId, name]) => ({ productId, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [catalog.items]);

  const productGroups = useMemo(() => {
    const groups = new Map<string, ProductGroup>();
    for (const item of filteredItems) {
      const existing = groups.get(item.productId);
      if (existing) {
        existing.variantIds.add(item.variantId);
        if (item.branchId) existing.branchIds.add(item.branchId);
        if (item.color) {
          if (!existing.colors.find(c => c.id === item.colorId)) {
            existing.colors.push({ id: item.colorId, name: item.color });
          }
        }
        if (item.size) existing.sizes.add(item.size);
        existing.quantity += item.quantity;
        existing.reservedQuantity += item.reservedQuantity;
        existing.availableQuantity += item.availableQuantity;
        existing.minimumPrice = Math.min(
          existing.minimumPrice,
          item.sellingPrice,
        );
        existing.maximumPrice = Math.max(
          existing.maximumPrice,
          item.sellingPrice,
        );
        existing.hasLowStock ||= item.availableQuantity <= item.reorderLevel;
        existing.imageUrl ||= item.imageUrl;
        if (!existing.lastUpdated || (item.lastUpdated && new Date(item.lastUpdated) > new Date(existing.lastUpdated))) {
          existing.lastUpdated = item.lastUpdated;
        }
        continue;
      }
      groups.set(item.productId, {
        productId: item.productId,
        name: item.name,
        description: item.description,
        categoryName: item.categoryName,
        supplierName: item.supplierName,
        status: item.status,
        imageUrl: item.imageUrl,
        variantIds: new Set([item.variantId]),
        branchIds: new Set(item.branchId ? [item.branchId] : []),
        colors: item.color ? [{ id: item.colorId, name: item.color }] : [],
        sizes: new Set(item.size ? [item.size] : []),
        quantity: item.quantity,
        reservedQuantity: item.reservedQuantity,
        availableQuantity: item.availableQuantity,
        minimumPrice: item.sellingPrice,
        maximumPrice: item.sellingPrice,
        hasLowStock: item.availableQuantity <= item.reorderLevel,
        lastUpdated: item.lastUpdated,
      });
    }
    return [...groups.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [filteredItems]);

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, any>();
    for (const item of filteredItems) {
      if (!item.categoryName || item.categoryName === "Unassigned") continue;
      const key = item.categoryName;
      let existing = groups.get(key);
      if (!existing) {
        existing = {
          categoryName: item.categoryName,
          description: item.description,
          status: item.status,
          productIds: new Set(),
          basePrice: item.basePrice,
          totalStock: 0,
          colors: new Map(),
        };
        groups.set(key, existing);
      }

      existing.productIds.add(item.productId);
      existing.totalStock += item.availableQuantity;

      if (item.color) {
        let colorInfo = existing.colors.get(item.color);
        if (!colorInfo) {
          colorInfo = {
            id: item.colorId,
            name: item.color,
            imageUrl: item.imageUrl,
            sizes: new Map()
          };
          existing.colors.set(item.color, colorInfo);
        }
        if (item.imageUrl && !colorInfo.imageUrl) colorInfo.imageUrl = item.imageUrl;

        if (item.size) {
          const sizeQty = colorInfo.sizes.get(item.size) || 0;
          colorInfo.sizes.set(item.size, sizeQty + item.availableQuantity);
        }
      }
    }

    return Array.from(groups.values()).map(g => ({
      categoryName: g.categoryName,
      description: g.description,
      status: g.status,
      basePrice: g.basePrice,
      productIds: Array.from(g.productIds),
      totalStock: g.totalStock,
      colors: Array.from(g.colors.values()).map((c: any) => ({
        id: c.id,
        name: c.name,
        imageUrl: c.imageUrl,
        sizes: Array.from(c.sizes.entries() as any).map(([sizeName, qty]: any) => ({ name: sizeName, quantity: qty }))
      }))
    })).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [filteredItems]);

  const colorOptions = useMemo(
    () =>
      catalog.colors.map<ManagedOption>((option) => ({
        optionId: option.colorId,
        optionType: "Color",
        value: option.name,
        hexCode: option.hexCode,
        imageUrl: option.imageUrl,
        displayOrder: option.displayOrder,
        status: option.status,
        createdAt: option.createdAt,
        updatedAt: option.updatedAt,
      })),
    [catalog.colors],
  );

  const sizeOptions = useMemo(
    () =>
      catalog.sizes.map<ManagedOption>((option) => ({
        optionId: option.sizeId,
        optionType: "Size",
        value: option.name,
        hexCode: null,
        displayOrder: option.displayOrder,
        status: option.status,
        createdAt: option.createdAt,
        updatedAt: option.updatedAt,
      })),
    [catalog.sizes],
  );
  const hasActiveColorOptions = colorOptions.some(
    (option) => option.status === "Active",
  );
  const hasActiveSizeOptions = sizeOptions.some(
    (option) => option.status === "Active",
  );

  const stats = useMemo(() => {
    const products = new Set(catalog.items.map((item) => item.productId)).size;
    const onHand = catalog.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    const reserved = catalog.items.reduce(
      (total, item) => total + item.reservedQuantity,
      0,
    );
    const lowStock = catalog.items.filter(
      (item) => item.availableQuantity <= item.reorderLevel && item.inventoryId,
    ).length;
    return { products, onHand, reserved, lowStock };
  }, [catalog.items]);

  const openCreateProduct = () => {
    setActiveTab("stock");
    setProductForm({
      ...emptyProductForm,
      supplierId:
        catalog.suppliers.find((supplier) => supplier.status === "Active")
          ?.supplierId || "",
      branchId: catalog.branches[0]?.branchId || "",
      colorId:
        colorOptions.find((option) => option.status === "Active")?.optionId ||
        "",
      sizeId:
        sizeOptions.find((option) => option.status === "Active")?.optionId ||
        "",
    });
    setFeedback(null);
    setProductModalOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ message: "Image exceeds the maximum file size of 5MB.", type: "error" });
      return;
    }
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFeedback({ message: "Unsupported file format. Please use JPG, PNG, or WEBP.", type: "error" });
      return;
    }

    setIsUploadingImg(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await authenticatedFetch("/admin/products/image", {
        method: "POST",
        body: formData,
      });

      if (!response || !response.ok) {
        setFeedback({
          message: await getResponseMessage(response as Response, "Image upload failed."),
          type: "error",
        });
        return;
      }

      const data = (await response.json()) as { secure_url: string };
      setVariantOptionForm((current) => ({
        ...current,
        imageUrl: data.secure_url,
      }));
      setFeedback({ message: "Image uploaded successfully.", type: "success" });
    } catch {
      setFeedback({ message: "Image upload failed.", type: "error" });
    } finally {
      setIsUploadingImg(false);
      setIsDraggingImg(false);
    }
  };

  const deleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the category "${name}"?`)) return;
    try {
      const res = await authenticatedFetch(`/admin/categories/${id}`, { method: 'DELETE' });
      if (!res?.ok) throw new Error(await getResponseMessage(res as Response, 'Failed to delete category'));
      setFeedback({ type: 'success', message: `Deleted category "${name}"` });
      loadCatalog();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const deleteVariantOption = async (type: string, id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete this ${type} "${name}"?`)) return;
    try {
      const res = await authenticatedFetch(`/admin/inventory/${type.toLowerCase()}s/${id}`, { method: 'DELETE' });
      if (!res?.ok) throw new Error(await getResponseMessage(res as Response, `Failed to delete ${type}`));
      setFeedback({ type: 'success', message: `Deleted ${type} "${name}"` });
      loadCatalog();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`WARNING: You are about to permanently delete "${name}". This will DESTROY all its associated Inventory stock, Colors variants, and Grid images!\n\nAre you sure you want to continue?`)) return;
    try {
      const res = await authenticatedFetch(`/admin/products/${id}`, { method: 'DELETE' });
      if (!res?.ok) throw new Error(await getResponseMessage(res as Response, 'Failed to delete product'));
      setFeedback({ type: 'success', message: `Permanently deleted "${name}" and all its inventory nodes.` });
      // Close modal if open
      if (productForm.inventoryId && (catalog.items.find(i => i.productId === id)?.inventoryId === productForm.inventoryId)) {
        setProductModalOpen(false);
      }
      loadCatalog();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const openEditProduct = (item: InventoryItem) => {
    if (!item.inventoryId) {
      setFeedback({
        message:
          "This variant has no inventory row. Add stock through a branch before editing it.",
        type: "error",
      });
      return;
    }
    setProductForm({
      inventoryId: item.inventoryId,
      name: item.name,
      description: item.description || "",
      categoryId: item.categoryId || "",
      supplierId: item.supplierId || "",
      basePrice: String(item.basePrice),
      status: item.status === "active" ? "active" : "draft",
      sku: item.sku,
      sizeId: item.sizeId,
      colorId: item.colorId,
      priceAdjustment: String(item.priceAdjustment),
      branchId: item.branchId || "",
      quantity: String(item.quantity),
      reorderLevel: String(item.reorderLevel),
      imageUrl: item.imageUrl || "",
      reservedQuantity: item.reservedQuantity,
    });
    setFeedback(null);
    setProductModalOpen(true);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const isEditing = Boolean(productForm.inventoryId);

    const formatShortName = (str: string) => str.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const color = colorOptions.find(o => o.optionId === productForm.colorId)?.value || "CLR";
    const size = sizeOptions.find(o => o.optionId === productForm.sizeId)?.value || "SZ";
    const autoSku = isEditing && productForm.sku ? productForm.sku : `VG-${formatShortName(productForm.name)}-${formatShortName(color)}-${formatShortName(size)}`;

    const common = {
      name: productForm.name.trim(),
      description: productForm.description.trim() || undefined,
      categoryId: productForm.categoryId || undefined,
      supplierId: productForm.supplierId || undefined,
      basePrice: Number(productForm.basePrice),
      status: productForm.status,
    };
    const variant = {
      sku: autoSku,
      colorId: productForm.colorId,
      sizeId: productForm.sizeId,
      priceAdjustment: Number(productForm.priceAdjustment),
      quantity: Number(productForm.quantity),
      branchId: productForm.branchId || undefined,
      reorderLevel: Number(productForm.reorderLevel),
      imageUrl: productForm.imageUrl.trim() || undefined,
    };

    const response = await authenticatedFetch(
      isEditing
        ? `/admin/inventory/records/${productForm.inventoryId}`
        : "/admin/products",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? { ...common, ...variant }
            : { ...common, variants: [variant] },
        ),
      },
    );

    if (!response) {
      setSaving(false);
      return;
    }
    if (!response.ok) {
      setFeedback({
        message: await getResponseMessage(
          response,
          isEditing
            ? "Unable to update this inventory record."
            : "Unable to create this product.",
        ),
        type: "error",
      });
      setSaving(false);
      return;
    }

    setProductModalOpen(false);
    setFeedback({
      message: isEditing
        ? "Inventory record updated successfully."
        : "Product and opening stock created successfully.",
      type: "success",
    });
    await loadCatalog();
    setSaving(false);
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const isEditing = Boolean(categoryForm.categoryId);
    const response = await authenticatedFetch(
      isEditing
        ? `/admin/categories/${categoryForm.categoryId}`
        : "/admin/categories",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
        }),
      },
    );
    if (!response) {
      setSaving(false);
      return;
    }
    if (!response.ok) {
      setFeedback({
        message: await getResponseMessage(
          response,
          isEditing ? "Unable to update category." : "Unable to add category.",
        ),
        type: "error",
      });
      setSaving(false);
      return;
    }
    setCategoryForm(emptyCategoryForm);
    setFeedback({
      message: isEditing
        ? "Category updated successfully."
        : "Category added successfully.",
      type: "success",
    });
    await loadCatalog();
    setSaving(false);
  };

  const saveVariantOption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const isEditing = Boolean(variantOptionForm.optionId);
    const resource =
      variantOptionForm.optionType === "Color" ? "colors" : "sizes";
    const response = await authenticatedFetch(
      isEditing
        ? `/admin/${resource}/${variantOptionForm.optionId}`
        : `/admin/${resource}`,
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: variantOptionForm.value.trim(),
          ...(variantOptionForm.optionType === "Color"
            ? {
              ...(variantOptionForm.hexCode ? { hexCode: variantOptionForm.hexCode } : {}),
              ...(variantOptionForm.imageUrl ? { imageUrl: variantOptionForm.imageUrl } : {}),
            }
            : {}),
          displayOrder: Number(variantOptionForm.displayOrder),
          status: variantOptionForm.status,
        }),
      },
    );
    if (!response) {
      setSaving(false);
      return;
    }
    if (!response.ok) {
      setFeedback({
        message: await getResponseMessage(
          response,
          isEditing
            ? `Unable to update this ${variantOptionForm.optionType.toLowerCase()}.`
            : `Unable to add this ${variantOptionForm.optionType.toLowerCase()}.`,
        ),
        type: "error",
      });
      setSaving(false);
      return;
    }
    setVariantOptionForm(emptyVariantOptionForm);
    setFeedback({
      message: isEditing
        ? `${variantOptionForm.optionType} updated successfully.`
        : `${variantOptionForm.optionType} added successfully.`,
      type: "success",
    });
    await loadCatalog();
    setSaving(false);
  };

  const fieldClass =
    "w-full rounded border border-white/10 bg-[#121212] px-3 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-[#555] focus:border-white/30";
  const labelClass =
    "mb-2 block text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]";

  return (
    <div className="space-y-7 text-[#f5f5f7]">
      {feedback && (
        <div
          className={`fixed right-8 top-24 z-[100] max-w-sm rounded border px-5 py-3 text-xs font-bold shadow-2xl ${feedback.type === "success"
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
            Database Inventory
          </p>
          <h1 className="text-xl font-bold uppercase tracking-[0.2em] text-white">
            Inventory Control
          </h1>
          <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-[#707070]">
            Stock is tracked per product variant and branch. Reserved units are
            protected from manual quantity reductions.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/suppliers"
            className="rounded border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
          >
            Manage Suppliers
          </Link>
          <button
            type="button"
            onClick={openCreateProduct}
            className="rounded bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#e5e5e5]"
          >
            + Product & Stock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Products", value: stats.products, tone: "text-white" },
          { label: "On Hand", value: stats.onHand, tone: "text-white" },
          {
            label: "Reserved",
            value: stats.reserved,
            tone: "text-amber-400",
          },
          {
            label: "Low / Out",
            value: stats.lowStock,
            tone: "text-red-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-5 py-4"
          >
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#666]">
              {stat.label}
            </div>
            <div className={`mt-2 font-mono text-xl font-bold ${stat.tone}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-white/[0.06] pb-3">
        {[
          { id: "stock" as const, label: "Products & Branch Stock" },
          { id: "categories" as const, label: "Categories" },
          { id: "options" as const, label: "Colors & Sizes" },
          { id: "storefront" as const, label: "Storefront" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === tab.id
              ? "bg-white text-black"
              : "text-[#8e8e93] hover:bg-white/5 hover:text-white"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "storefront" && (
        <StorefrontTab
          categoryGroups={categoryGroups}
          onRefresh={loadCatalog}
          setFeedback={setFeedback}
        />
      )}

      {activeTab === "stock" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-4 py-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#8e8e93]">
                Inventory View
              </div>
              <div className="mt-1 text-[9px] text-[#555]">
                Product Groups combines all matching variants and branches.
              </div>
            </div>
            <div className="flex rounded border border-white/10 bg-[#070707] p-1">
              {[
                { id: "products" as const, label: "Product Groups" },
                { id: "variants" as const, label: "Variant Stock" },
              ].map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setInventoryView(view.id)}
                  className={`rounded px-4 py-2 text-[9px] font-bold uppercase tracking-widest transition-colors ${inventoryView === view.id
                    ? "bg-white text-black"
                    : "text-[#777] hover:text-white"
                    }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-4 md:grid-cols-3 xl:grid-cols-7">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product, SKU, supplier..."
              className={`${fieldClass} md:col-span-2 xl:col-span-1`}
            />
            <select
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
              className={fieldClass}
            >
              <option value="all">All products</option>
              {products.map((product) => (
                <option key={product.productId} value={product.productId}>
                  {product.name}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={fieldClass}
            >
              <option value="all">All categories</option>
              {catalog.categories.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.target.value)}
              className={fieldClass}
            >
              <option value="all">All suppliers</option>
              {catalog.suppliers.map((supplier) => (
                <option key={supplier.supplierId} value={supplier.supplierId}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
              className={fieldClass}
            >
              <option value="all">All branches</option>
              {catalog.branches.map((branch) => (
                <option key={branch.branchId} value={branch.branchId}>
                  {branch.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={fieldClass}
            >
              <option value="all">All product statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
              className={fieldClass}
            >
              <option value="all">All stock levels</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>

          {inventoryView === "variants" && (
            <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0a0a]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1280px] text-left">
                  <thead className="bg-[#070707]">
                    <tr className="border-b border-white/[0.06]">
                      {[
                        "Product",
                        "Category / Supplier",
                        "Variant",
                        "Branch",
                        "On Hand",
                        "Reserved",
                        "Available",
                        "Reorder At",
                        "Price",
                        "Status",
                        "Updated",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-4 text-[9px] font-bold uppercase tracking-widest text-[#777]"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredItems.map((item) => {
                      const isOut = item.availableQuantity === 0;
                      const isLow =
                        !isOut && item.availableQuantity <= item.reorderLevel;
                      return (
                        <tr
                          key={`${item.variantId}:${item.inventoryId || "none"}`}
                          className="transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-10 w-10 flex-shrink-0 rounded border border-white/10 bg-[#151515] bg-cover bg-center"
                                style={
                                  item.imageUrl
                                    ? {
                                      backgroundImage: `url("${item.imageUrl}")`,
                                    }
                                    : undefined
                                }
                              />
                              <div>
                                <div className="text-[11px] font-bold uppercase tracking-wide text-white">
                                  {item.name}
                                </div>
                                <div className="mt-1 max-w-[180px] truncate text-[9px] text-[#666]">
                                  {item.description || "No description"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-[10px] font-bold uppercase text-white">
                              {item.categoryName}
                            </div>
                            <div className="mt-1 text-[9px] uppercase tracking-wide text-[#777]">
                              {item.supplierName}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-mono text-[10px] text-white">
                              {item.sku}
                            </div>
                            <div className="mt-1 text-[9px] uppercase text-[#777]">
                              {item.color} / {item.size}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-[10px] font-bold uppercase text-[#b0b0b0]">
                            {item.branchName}
                          </td>
                          <td className="px-4 py-4 font-mono text-[11px] text-white">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-4 font-mono text-[11px] text-amber-400">
                            {item.reservedQuantity}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`font-mono text-[11px] font-bold ${isOut
                                ? "text-red-400"
                                : isLow
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                                }`}
                            >
                              {item.availableQuantity}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-mono text-[11px] text-[#a0a0a0]">
                            {item.reorderLevel}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-mono text-[10px] text-white">
                              LKR {item.sellingPrice.toFixed(2)}
                            </div>
                            {item.priceAdjustment !== 0 && (
                              <div className="mt-1 font-mono text-[8px] text-[#666]">
                                {item.priceAdjustment > 0 ? "+" : ""}
                                {item.priceAdjustment.toFixed(2)} adjustment
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${item.status === "active"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                : "border-white/10 bg-white/5 text-[#8e8e93]"
                                }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-mono text-[9px] text-[#666]">
                            {item.lastUpdated
                              ? new Date(item.lastUpdated).toLocaleDateString(
                                "en-GB",
                              )
                              : "—"}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEditProduct(item)}
                                disabled={!item.inventoryId}
                                className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteProduct(item.productId, item.name)}
                                className="rounded border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[10px] text-red-500 hover:bg-red-500/20 hover:text-red-400"
                                title="Delete Product"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!loading && filteredItems.length === 0 && (
                <div className="px-6 py-16 text-center text-[10px] font-bold uppercase tracking-widest text-[#555]">
                  No inventory records match these filters.
                </div>
              )}
              {loading && (
                <div className="px-6 py-16 text-center text-[10px] font-bold uppercase tracking-widest text-[#8e8e93]">
                  Loading database inventory...
                </div>
              )}
            </div>
          )}

          {inventoryView === "products" && (
            <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0a0a]">
              <div className="border-b border-white/[0.05] px-5 py-3 text-[9px] uppercase tracking-widest text-[#666]">
                Group totals reflect the current search and filters.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-[#070707]">
                    <tr className="border-b border-white/[0.06]">
                      {[
                        "Product",
                        "Category / Supplier",
                        "Variants",
                        "Branches",
                        "On Hand",
                        "Reserved",
                        "Available",
                        "Price Range",
                        "Status",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-4 text-[9px] font-bold uppercase tracking-widest text-[#777]"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {productGroups.map((group) => {
                      const isOut = group.availableQuantity === 0;
                      return (
                        <tr
                          key={group.productId}
                          className="transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-10 w-10 flex-shrink-0 rounded border border-white/10 bg-[#151515] bg-cover bg-center"
                                style={
                                  group.imageUrl
                                    ? {
                                      backgroundImage: `url("${group.imageUrl}")`,
                                    }
                                    : undefined
                                }
                              />
                              <div>
                                <div className="text-[11px] font-bold uppercase tracking-wide text-white">
                                  {group.name}
                                </div>
                                <div className="mt-1 max-w-[220px] truncate text-[9px] text-[#666]">
                                  {group.description || "No description"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-[10px] font-bold uppercase text-white">
                              {group.categoryName}
                            </div>
                            <div className="mt-1 text-[9px] uppercase tracking-wide text-[#777]">
                              {group.supplierName}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-mono text-[11px] font-bold text-white">
                            {group.variantIds.size}
                          </td>
                          <td className="px-4 py-4 font-mono text-[11px] text-[#b0b0b0]">
                            {group.branchIds.size}
                          </td>
                          <td className="px-4 py-4 font-mono text-[11px] text-white">
                            {group.quantity}
                          </td>
                          <td className="px-4 py-4 font-mono text-[11px] text-amber-400">
                            {group.reservedQuantity}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`font-mono text-[11px] font-bold ${isOut
                                ? "text-red-400"
                                : group.hasLowStock
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                                }`}
                            >
                              {group.availableQuantity}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-mono text-[10px] text-white">
                            {group.minimumPrice === group.maximumPrice
                              ? `LKR ${group.minimumPrice.toFixed(2)}`
                              : `LKR ${group.minimumPrice.toFixed(2)} – ${group.maximumPrice.toFixed(2)}`}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${group.status === "active"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                : "border-white/10 bg-white/5 text-[#8e8e93]"
                                }`}
                            >
                              {group.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                setProductFilter(group.productId);
                                setInventoryView("variants");
                              }}
                              className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
                            >
                              View stock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!loading && productGroups.length === 0 && (
                <div className="px-6 py-16 text-center text-[10px] font-bold uppercase tracking-widest text-[#555]">
                  No product groups match these filters.
                </div>
              )}
              {loading && (
                <div className="px-6 py-16 text-center text-[10px] font-bold uppercase tracking-widest text-[#8e8e93]">
                  Loading grouped inventory...
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === "categories" && (
        <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.7fr)_1.3fr]">
          <form
            onSubmit={saveCategory}
            className="h-fit rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-6"
          >
            <div className="mb-6 flex items-center justify-between border-b border-white/[0.05] pb-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                {categoryForm.categoryId ? "Edit Category" : "Add Category"}
              </h2>
              {categoryForm.categoryId && (
                <button
                  type="button"
                  onClick={() => setCategoryForm(emptyCategoryForm)}
                  className="text-[9px] font-bold uppercase tracking-widest text-[#777] hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
            <label className={labelClass}>Category Name</label>
            <input
              required
              minLength={2}
              value={categoryForm.name}
              onChange={(event) =>
                setCategoryForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className={fieldClass}
              placeholder="e.g. Outerwear"
            />
            <label className={`${labelClass} mt-5`}>Description</label>
            <textarea
              value={categoryForm.description}
              onChange={(event) =>
                setCategoryForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className={`${fieldClass} min-h-28 resize-y`}
              placeholder="Customer-facing category description"
            />
            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#e5e5e5] disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : categoryForm.categoryId
                  ? "Update Category"
                  : "Add Category"}
            </button>
          </form>

          <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0a0a]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                Database Categories
              </h2>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {catalog.categories.map((category) => {
                const productCount = new Set(
                  catalog.items
                    .filter((item) => item.categoryId === category.categoryId)
                    .map((item) => item.productId),
                ).size;
                return (
                  <div
                    key={category.categoryId}
                    className="flex items-center justify-between gap-5 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  >
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-white">
                        {category.name}
                      </div>
                      <div className="mt-1 text-[10px] text-[#777]">
                        {category.description || "No description"}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#666]">
                        {productCount} products
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCategoryForm({
                              categoryId: category.categoryId,
                              name: category.name,
                              description: category.description || "",
                            })
                          }
                          className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-white/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCategory(category.categoryId, category.name)}
                          className="rounded border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] text-red-500 hover:bg-red-500/20 hover:text-red-400"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loading && catalog.categories.length === 0 && (
                <div className="px-6 py-16 text-center text-[10px] font-bold uppercase tracking-widest text-[#555]">
                  No categories found.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "options" && (
        <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.7fr)_1.3fr]">
          <form
            onSubmit={saveVariantOption}
            className="h-fit rounded-lg border border-white/[0.06] bg-[#0a0a0a] p-6"
          >
            <div className="mb-6 flex items-center justify-between border-b border-white/[0.05] pb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                  {variantOptionForm.optionId
                    ? `Edit ${variantOptionForm.optionType}`
                    : "Add Color or Size"}
                </h2>
                <p className="mt-2 text-[9px] leading-relaxed text-[#666]">
                  Active colors and sizes appear in the product form dropdowns.
                </p>
              </div>
              {variantOptionForm.optionId && (
                <button
                  type="button"
                  onClick={() => setVariantOptionForm(emptyVariantOptionForm)}
                  className="text-[9px] font-bold uppercase tracking-widest text-[#777] hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>

            <label className={labelClass}>Option Type</label>
            <select
              disabled={Boolean(variantOptionForm.optionId)}
              value={variantOptionForm.optionType}
              onChange={(event) =>
                setVariantOptionForm((current) => ({
                  ...current,
                  optionType: event.target.value as VariantOptionType,
                  hexCode:
                    event.target.value === "Color" ? current.hexCode : "",
                }))
              }
              className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <option value="Color">Color</option>
              <option value="Size">Size</option>
            </select>

            <label className={`${labelClass} mt-5`}>Display Value</label>
            <input
              required
              value={variantOptionForm.value}
              onChange={(event) =>
                setVariantOptionForm((current) => ({
                  ...current,
                  value: event.target.value,
                }))
              }
              className={fieldClass}
              placeholder={
                variantOptionForm.optionType === "Color"
                  ? "e.g. Midnight Black"
                  : "e.g. XL"
              }
            />

            {variantOptionForm.optionType === "Color" && (
              <>
                <label className={`${labelClass} mt-5`}>
                  Hex Color (optional)
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    aria-label="Color preview"
                    value={variantOptionForm.hexCode || "#000000"}
                    onChange={(event) =>
                      setVariantOptionForm((current) => ({
                        ...current,
                        hexCode: event.target.value.toUpperCase(),
                      }))
                    }
                    className="h-10 w-14 cursor-pointer rounded border border-white/10 bg-[#121212] p-1"
                  />
                  <input
                    value={variantOptionForm.hexCode}
                    onChange={(event) =>
                      setVariantOptionForm((current) => ({
                        ...current,
                        hexCode: event.target.value.toUpperCase(),
                      }))
                    }
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className={fieldClass}
                    placeholder="#000000"
                  />
                </div>
              </>
            )}

            {variantOptionForm.optionType === "Color" && (
              <div className="mt-5">
                <span className={labelClass}>Color Image (Global Variant Cover)</span>
                {variantOptionForm.imageUrl ? (
                  <div className="relative mt-2 overflow-hidden rounded-lg border border-white/10 bg-[#0a0a0a]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={variantOptionForm.imageUrl}
                      alt="Color Preview"
                      className="h-64 w-full object-contain"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 opacity-0 backdrop-blur-sm transition-opacity hover:opacity-100">
                      <span className="text-sm font-bold text-emerald-400">✓ Upload Successful</span>
                      <div className="flex gap-3">
                        <label className="cursor-pointer rounded border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-white/20">
                          Replace Image
                          <input
                            type="file"
                            className="hidden"
                            accept="image/jpeg, image/jpg, image/png, image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleImageUpload(file);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/20"
                          onClick={() => setVariantOptionForm(curr => ({ ...curr, imageUrl: "" }))}
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    className={`mt-2 flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${isDraggingImg ? "border-white bg-white/5" : "border-white/20 hover:border-white/40 hover:bg-white/5"
                      }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingImg(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDraggingImg(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingImg(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) void handleImageUpload(file);
                    }}
                  >
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg, image/jpg, image/png, image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImageUpload(file);
                      }}
                      disabled={isUploadingImg}
                    />
                    {isUploadingImg ? (
                      <div className="flex flex-col items-center">
                        <div className="mb-3 h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white">Uploading image...</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-white">Drag & Drop Image Here</p>
                        <p className="my-2 text-[10px] text-[#8e8e93]">OR</p>
                        <div className="rounded border border-white/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10">
                          Choose Image
                        </div>
                        <p className="mt-4 text-center text-[9px] uppercase tracking-widest text-[#555]">
                          Supported formats: JPG, JPEG, PNG, WEBP<br />
                          Maximum size: 5 MB
                        </p>
                      </>
                    )}
                  </label>
                )}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-4">
              <label>
                <span className={labelClass}>Display Order</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={variantOptionForm.displayOrder}
                  onChange={(event) =>
                    setVariantOptionForm((current) => ({
                      ...current,
                      displayOrder: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Status</span>
                <select
                  value={variantOptionForm.status}
                  onChange={(event) =>
                    setVariantOptionForm((current) => ({
                      ...current,
                      status: event.target.value as "Active" | "Inactive",
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#e5e5e5] disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : variantOptionForm.optionId
                  ? "Update Option"
                  : "Add Option"}
            </button>
          </form>

          <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0a0a]">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                Database Colors & Sizes
              </h2>
            </div>
            <div className="grid md:grid-cols-2">
              {[
                { type: "Color" as const, options: colorOptions },
                { type: "Size" as const, options: sizeOptions },
              ].map((group, groupIndex) => (
                <div
                  key={group.type}
                  className={
                    groupIndex === 0
                      ? "border-b border-white/[0.06] md:border-b-0 md:border-r"
                      : ""
                  }
                >
                  <div className="border-b border-white/[0.05] bg-[#080808] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
                    {group.type}s
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {group.options.map((option) => (
                      <div
                        key={option.optionId}
                        className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-3">
                          {option.optionType === "Color" && (
                            <div
                              className="h-5 w-5 rounded-full border border-white/20"
                              style={{
                                backgroundColor: option.hexCode || option.value,
                              }}
                            />
                          )}
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wide text-white">
                              {option.value}
                            </div>
                            <div className="mt-1 text-[8px] uppercase tracking-widest text-[#666]">
                              Order {option.displayOrder} · {option.status}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setVariantOptionForm({
                                optionId: option.optionId,
                                optionType: option.optionType,
                                value: option.value,
                                hexCode: option.hexCode || "",
                                imageUrl: option.imageUrl || "",
                                displayOrder: String(option.displayOrder),
                                status: option.status,
                              })
                            }
                            className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-white/10"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteVariantOption(option.optionType, option.optionId, option.value)}
                            className="rounded border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] text-red-500 hover:bg-red-500/20 hover:text-red-400"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                    {group.options.length === 0 && (
                      <div className="px-5 py-10 text-center text-[9px] font-bold uppercase tracking-widest text-[#555]">
                        No {group.type.toLowerCase()} options
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {productModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/85 p-6 backdrop-blur-sm">
          <div className="my-6 w-full max-w-5xl rounded-lg border border-white/10 bg-[#0a0a0a] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/[0.06] px-7 py-5">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                  {productForm.inventoryId
                    ? "Edit Product Variant & Stock"
                    : "Add Product Variant & Opening Stock"}
                </h2>
                <p className="mt-2 text-[10px] text-[#666]">
                  Product metadata, variant pricing, and branch inventory follow
                  the database relationships.
                </p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setProductModalOpen(false)}
                className="text-xl text-[#777] transition-colors hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProduct} className="space-y-7 p-7">
              <section>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
                  Product
                </h3>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                  <label className="lg:col-span-2">
                    <span className={labelClass}>Product Name</span>
                    <input
                      required
                      minLength={2}
                      value={productForm.name}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </label>

                  <label>
                    <span className={labelClass}>Category</span>
                    <select
                      value={productForm.categoryId}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          categoryId: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Unassigned</option>
                      {catalog.categories.map((category) => (
                        <option
                          key={category.categoryId}
                          value={category.categoryId}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={labelClass}>Supplier</span>
                    <select
                      required
                      value={productForm.supplierId}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          supplierId: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="" disabled>
                        Select supplier
                      </option>
                      {catalog.suppliers.map((supplier) => (
                        <option
                          key={supplier.supplierId}
                          value={supplier.supplierId}
                          disabled={
                            supplier.status === "Inactive" &&
                            supplier.supplierId !== productForm.supplierId
                          }
                        >
                          {supplier.name}
                          {supplier.status === "Inactive" ? " (Inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="md:col-span-2">
                    <span className={labelClass}>Description</span>
                    <textarea
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className={`${fieldClass} min-h-20 resize-y`}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Base Price (LKR)</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={productForm.basePrice}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          basePrice: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Product Status</span>
                    <select
                      value={productForm.status}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          status: event.target.value as ProductStatus,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="border-t border-white/[0.06] pt-6">
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
                  Variant
                </h3>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

                  <label>
                    <span className={labelClass}>Color</span>
                    <select
                      required
                      value={productForm.colorId}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          colorId: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="" disabled>
                        Select color
                      </option>
                      {colorOptions.map((option) => (
                        <option
                          key={option.optionId}
                          value={option.optionId}
                          disabled={
                            option.status === "Inactive" &&
                            option.optionId !== productForm.colorId
                          }
                        >
                          {option.value}
                          {option.status === "Inactive" ? " (Inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={labelClass}>Size</span>
                    <select
                      required
                      value={productForm.sizeId}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          sizeId: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="" disabled>
                        Select size
                      </option>
                      {sizeOptions.map((option) => (
                        <option
                          key={option.optionId}
                          value={option.optionId}
                          disabled={
                            option.status === "Inactive" &&
                            option.optionId !== productForm.sizeId
                          }
                        >
                          {option.value}
                          {option.status === "Inactive" ? " (Inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={labelClass}>Price Adjustment (LKR)</span>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={productForm.priceAdjustment}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          priceAdjustment: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </label>

                </div>
              </section>

              {(!hasActiveColorOptions || !hasActiveSizeOptions) && (
                <div className="rounded border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[10px] text-amber-300">
                  Add active Color and Size options before creating variants.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setProductModalOpen(false);
                      setActiveTab("options");
                    }}
                    className="font-bold underline underline-offset-2"
                  >
                    Manage Colors & Sizes
                  </button>
                </div>
              )}

              <section className="border-t border-white/[0.06] pt-6">
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
                  Branch Stock
                </h3>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                  <label>
                    <span className={labelClass}>Branch</span>
                    <select
                      value={productForm.branchId}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          branchId: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="">Unassigned branch</option>
                      {catalog.branches.map((branch) => (
                        <option key={branch.branchId} value={branch.branchId}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={labelClass}>On-hand Quantity</span>
                    <input
                      required
                      type="number"
                      min={productForm.reservedQuantity}
                      step="1"
                      value={productForm.quantity}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          quantity: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                    {productForm.reservedQuantity > 0 && (
                      <span className="mt-2 block text-[9px] text-amber-400">
                        Minimum {productForm.reservedQuantity}: units are
                        reserved by active checkouts.
                      </span>
                    )}
                  </label>

                  <div className="rounded border border-white/[0.06] bg-[#111] px-4 py-3">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#666]">
                      Selling Price
                    </div>
                    <div className="mt-2 font-mono text-sm font-bold text-white">
                      LKR{" "}
                      {(
                        Number(productForm.basePrice || 0) +
                        Number(productForm.priceAdjustment || 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </section>

              {catalog.suppliers.length === 0 && (
                <div className="rounded border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[10px] text-amber-300">
                  Add a supplier before saving this product.{" "}
                  <Link
                    href="/admin/suppliers"
                    className="font-bold underline underline-offset-2"
                  >
                    Open Supplier Management
                  </Link>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-5">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="rounded border border-white/10 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#8e8e93] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    isUploadingImg ||
                    catalog.suppliers.length === 0 ||
                    (!productForm.inventoryId &&
                      (!hasActiveColorOptions || !hasActiveSizeOptions))
                  }
                  className="rounded bg-white px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving
                    ? "Saving..."
                    : productForm.inventoryId
                      ? "Save Changes"
                      : "Create Product & Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
