"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

type InventoryTab = "stock" | "categories" | "options";
type InventoryView = "variants" | "products";
type ProductStatus = "live" | "hold" | "hidden";
type VariantStatus = "show" | "hidden";
type PreviewMode = "product" | "variant";
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
  variantStatus: VariantStatus;
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
  createdAt: string;
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
  hasLowStock: boolean;
  createdAt: string;
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
  variantStatus: VariantStatus;
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
  status: "hidden",
  variantStatus: "show",
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

function normalizeProductStatus(status: string): ProductStatus {
  if (status === "live" || status === "active") return "live";
  if (status === "hold") return "hold";
  return "hidden";
}

function productStatusTone(status: string) {
  if (status === "live") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }
  if (status === "hold") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }
  return "border-white/10 bg-white/5 text-[#8e8e93]";
}

function variantStatusTone(status: VariantStatus) {
  return status === "show"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
    : "border-red-500/20 bg-red-500/10 text-red-400";
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
  const [addProductStep, setAddProductStep] = useState<1 | 2>(1);
  const [newProductVariants, setNewProductVariants] = useState<
    Array<{
      id: string;
      colorId: string;
      colorName: string;
      sizeId: string;
      sizeName: string;
      priceAdjustment: number;
      quantity: number;
      status: VariantStatus;
      imageUrl?: string;
    }>
  >([]);
  const [draftVariant, setDraftVariant] = useState<{
    colorId: string;
    sizeId: string;
    priceAdjustment: string;
    quantity: string;
    status: VariantStatus;
    imageUrl: string;
  }>({
    colorId: "",
    sizeId: "",
    priceAdjustment: "0",
    quantity: "10",
    status: "show",
    imageUrl: "",
  });
  const [previewProductId, setPreviewProductId] = useState<string | null>(null);
  const [previewVariantKey, setPreviewVariantKey] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null);
  const [previewProductStatus, setPreviewProductStatus] =
    useState<ProductStatus>("hidden");
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<{
    productId: string;
    name: string;
  } | null>(null);
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

  const openCreateProduct = () => {
    setProductForm(emptyProductForm);
    setAddProductStep(1);
    setNewProductVariants([]);
    setDraftVariant({
      colorId: "",
      sizeId: "",
      priceAdjustment: "0",
      quantity: "10",
      status: "show",
      imageUrl: "",
    });
    setFeedback(null);
    closePreview();
    setProductModalOpen(true);
  };

  const validatePngJpg = (file: File): boolean => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    const ext = file.name.toLowerCase().split('.').pop();
    const validExts = ["png", "jpg", "jpeg"];
    return validTypes.includes(file.type) || (ext ? validExts.includes(ext) : false);
  };

  const handleMultipleImagesUpload = async (
    files: FileList | File[],
    callback: (urls: string[]) => void
  ) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const invalidFiles = fileArray.filter((f) => !validatePngJpg(f));
    if (invalidFiles.length > 0) {
      setFeedback({
        message: `Format error! Only PNG and JPG/JPEG files are allowed. Rejected: ${invalidFiles.map(f => f.name).join(", ")}`,
        type: "error",
      });
      return;
    }

    setIsUploadingImg(true);
    setFeedback(null);
    const uploadedUrls: string[] = [];

    try {
      for (const file of fileArray) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await authenticatedFetch("/admin/upload", {
          method: "POST",
          body: formData,
        });
        if (!res?.ok) {
          throw new Error(await getResponseMessage(res as Response, `Failed to upload ${file.name}`));
        }
        const data = await res.json();
        if (data.url) {
          uploadedUrls.push(data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        callback(uploadedUrls);
        setFeedback({
          message: `Successfully uploaded ${uploadedUrls.length} PNG/JPG image(s) to Cloudinary!`,
          type: "success",
        });
      }
    } catch (err: any) {
      setFeedback({ message: err.message || "Failed to upload images", type: "error" });
    } finally {
      setIsUploadingImg(false);
    }
  };

  const handleImageUpload = async (
    file: File,
    callback: (url: string) => void
  ) => {
    await handleMultipleImagesUpload([file], (urls) => callback(urls[0]));
  };

  const handleProductModalImageUpload = async (
    files: FileList | File[],
    target: 'main' | 'draft'
  ) => {
    await handleMultipleImagesUpload(files, (urls) => {
      if (target === 'main') {
        setProductForm((curr) => ({
          ...curr,
          imageUrl: urls[0],
        }));
      } else {
        setDraftVariant((curr) => ({
          ...curr,
          imageUrl: urls[0],
        }));
      }
    });
  };

  const addVariantToList = () => {
    if (!draftVariant.colorId || !draftVariant.sizeId) {
      setFeedback({ message: "Please select both Color and Size for the variant.", type: "error" });
      return;
    }
    const colorObj = catalog.colors.find((c) => c.colorId === draftVariant.colorId);
    const sizeObj = catalog.sizes.find((s) => s.sizeId === draftVariant.sizeId);

    const exists = newProductVariants.some(
      (v) => v.colorId === draftVariant.colorId && v.sizeId === draftVariant.sizeId,
    );
    if (exists) {
      setFeedback({ message: "A variant with this Color and Size already exists in the list.", type: "error" });
      return;
    }

    setNewProductVariants((curr) => [
      ...curr,
      {
        id: `${draftVariant.colorId}-${draftVariant.sizeId}-${Date.now()}`,
        colorId: draftVariant.colorId,
        colorName: colorObj?.name || "Unknown",
        sizeId: draftVariant.sizeId,
        sizeName: sizeObj?.name || "Unknown",
        priceAdjustment: Number(draftVariant.priceAdjustment || 0),
        quantity: Number(draftVariant.quantity || 0),
        status: draftVariant.status,
        imageUrl: draftVariant.imageUrl.trim() || undefined,
      },
    ]);

    setDraftVariant({
      colorId: "",
      sizeId: "",
      priceAdjustment: "0",
      quantity: "10",
      status: "show",
      imageUrl: "",
    });
    setFeedback({ message: "Variant added to queue!", type: "success" });
  };

  const removeVariantFromList = (id: string) => {
    setNewProductVariants((curr) => curr.filter((v) => v.id !== id));
  };

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch("/admin/inventory/catalog", {
        cache: "no-store",
      });
      if (!response) {
        setFeedback({
          message: "Unable to connect to backend server. Please make sure the backend is running.",
          type: "error",
        });
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
    } catch (err: any) {
      setFeedback({
        message: err.message || "Failed to load inventory catalog.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
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
        statusFilter === "all" ||
        (inventoryView === "variants"
          ? item.variantStatus === statusFilter
          : item.status === statusFilter);
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
    }).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  }, [
    branchFilter,
    catalog.items,
    categoryFilter,
    inventoryView,
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
        existing.hasLowStock ||= item.availableQuantity <= item.reorderLevel;
        existing.imageUrl ||= item.imageUrl;
        if (new Date(item.createdAt) > new Date(existing.createdAt)) {
          existing.createdAt = item.createdAt;
        }
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
        hasLowStock: item.availableQuantity <= item.reorderLevel,
        createdAt: item.createdAt,
        lastUpdated: item.lastUpdated,
      });
    }
    return [...groups.values()].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  }, [filteredItems]);

  const previewItems = useMemo(
    () =>
      previewProductId
        ? catalog.items.filter(
            (item) =>
              item.productId === previewProductId &&
              (previewMode !== "variant" ||
                `${item.variantId}:${item.inventoryId || "none"}` ===
                  previewVariantKey),
          )
        : [],
    [catalog.items, previewMode, previewProductId, previewVariantKey],
  );
  const previewProduct = previewItems[0] || null;
  const previewTotals = useMemo(
    () => ({
      variants: new Set(previewItems.map((item) => item.variantId)).size,
      onHand: previewItems.reduce((total, item) => total + item.quantity, 0),
      reserved: previewItems.reduce(
        (total, item) => total + item.reservedQuantity,
        0,
      ),
      available: previewItems.reduce(
        (total, item) => total + item.availableQuantity,
        0,
      ),
    }),
    [previewItems],
  );

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

  const openProductPreview = (productId: string, status: string) => {
    setPreviewMode("product");
    setPreviewVariantKey(null);
    setPreviewProductStatus(normalizeProductStatus(status));
    setPreviewProductId(productId);
  };

  const openVariantPreview = (item: InventoryItem) => {
    setPreviewMode("variant");
    setPreviewVariantKey(
      `${item.variantId}:${item.inventoryId || "none"}`,
    );
    setPreviewProductStatus(normalizeProductStatus(item.status));
    setPreviewProductId(item.productId);
  };

  const closePreview = () => {
    setPreviewProductId(null);
    setPreviewVariantKey(null);
    setPreviewMode(null);
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
      const res = await authenticatedFetch(`/admin/${type.toLowerCase()}s/${id}`, { method: 'DELETE' });
      if (!res?.ok) throw new Error(await getResponseMessage(res as Response, `Failed to delete ${type}`));
      setFeedback({ type: 'success', message: `Deleted ${type} "${name}"` });
      loadCatalog();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    setSaving(true);
    try {
      const res = await authenticatedFetch(`/admin/products/${id}`, { method: 'DELETE' });
      if (!res?.ok) throw new Error(await getResponseMessage(res as Response, 'Failed to delete product'));
      setFeedback({ type: 'success', message: `Permanently deleted "${name}" and all its inventory nodes.` });
      setProductModalOpen(false);
      setPendingDeleteProduct(null);
      closePreview();
      await loadCatalog();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const savePreviewProductStatus = async () => {
    if (!previewProductId || previewMode !== "product") return;
    setSaving(true);
    setFeedback(null);
    const response = await authenticatedFetch(
      `/admin/products/${previewProductId}/visibility`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: previewProductStatus }),
      },
    );
    if (!response?.ok) {
      setFeedback({
        type: "error",
        message: response
          ? await getResponseMessage(
              response,
              "Unable to update product status.",
            )
          : "Unable to update product status.",
      });
      setSaving(false);
      return;
    }
    setFeedback({
      type: "success",
      message: `Product status changed to ${previewProductStatus}.`,
    });
    await loadCatalog();
    setSaving(false);
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
      status: normalizeProductStatus(item.status),
      variantStatus: item.variantStatus,
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
    closePreview();
    setProductModalOpen(true);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const isEditing = Boolean(productForm.inventoryId);

    if (!isEditing) {
      if (newProductVariants.length === 0) {
        setFeedback({
          message: "Please add at least one product variant in Step 2 before submitting.",
          type: "error",
        });
        setSaving(false);
        return;
      }

      const formatShortName = (str: string) =>
        str.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");

      const payloadVariants = newProductVariants.map((v, idx) => ({
        sku: `VG-${formatShortName(productForm.name)}-${formatShortName(v.colorName)}-${formatShortName(v.sizeName)}-${idx + 1}`,
        colorId: v.colorId,
        sizeId: v.sizeId,
        priceAdjustment: v.priceAdjustment,
        quantity: v.quantity,
        status: v.status,
        imageUrl: v.imageUrl || undefined,
      }));

      const response = await authenticatedFetch("/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name.trim(),
          description: productForm.description.trim() || undefined,
          categoryId: productForm.categoryId || undefined,
          supplierId: productForm.supplierId || undefined,
          basePrice: Number(productForm.basePrice),
          status: productForm.status,
          imageUrl: productForm.imageUrl.trim() || undefined,
          variants: payloadVariants,
        }),
      });

      if (!response) {
        setSaving(false);
        return;
      }
      if (!response.ok) {
        setFeedback({
          message: await getResponseMessage(response, "Unable to create this product."),
          type: "error",
        });
        setSaving(false);
        return;
      }

      setProductModalOpen(false);
      setFeedback({
        message: `Product "${productForm.name}" with ${newProductVariants.length} variants created successfully!`,
        type: "success",
      });
      await loadCatalog();
      setSaving(false);
      return;
    }

    const common = {
      name: productForm.name.trim(),
      description: productForm.description.trim() || undefined,
      categoryId: productForm.categoryId || undefined,
      supplierId: productForm.supplierId || undefined,
      basePrice: Number(productForm.basePrice),
    };
    const variant = {
      sku: productForm.sku,
      colorId: productForm.colorId,
      sizeId: productForm.sizeId,
      priceAdjustment: Number(productForm.priceAdjustment),
      quantity: Number(productForm.quantity),
      reorderLevel: Number(productForm.reorderLevel),
      imageUrl: productForm.imageUrl.trim() || undefined,
    };

    const response = await authenticatedFetch(
      `/admin/inventory/records/${productForm.inventoryId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...common,
          ...variant,
          variantStatus: productForm.variantStatus,
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
          "Unable to update this inventory record.",
        ),
        type: "error",
      });
      setSaving(false);
      return;
    }

    setProductModalOpen(false);
    setFeedback({
      message: "Inventory record updated successfully.",
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

  const startNewVariantOption = (optionType: VariantOptionType) => {
    setVariantOptionForm({ ...emptyVariantOptionForm, optionType });
    requestAnimationFrame(() =>
      document
        .getElementById("variant-option-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

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
          { id: "stock" as const, label: "Stock Overview" },
          { id: "categories" as const, label: "Categories" },
          { id: "options" as const, label: "Colors & Sizes" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeTab === tab.id
                ? "bg-white text-black"
                : "border border-white/10 text-[#8e8e93] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "stock" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                {inventoryView === "products" ? "Products Stock" : "Variant Stock Overview"}
              </div>
              <div className="mt-1 text-[9px] text-[#555]">
                Product Groups combines all matching variants and inventory levels.
              </div>
            </div>
            <div className="flex rounded border border-white/10 bg-[#070707] p-1">
              {[
                { id: "products" as const, label: "Products Stock" },
                { id: "variants" as const, label: "Variant Stock" },
              ].map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => {
                    setInventoryView(view.id);
                    setStatusFilter("all");
                  }}
                  className={`rounded px-3 py-1.5 text-[10px] font-medium transition-all ${
                    inventoryView === view.id
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-[#8e8e93] hover:text-white"
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
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={fieldClass}
            >
              <option value="all">
                {inventoryView === "products"
                  ? "All product statuses"
                  : "All variant statuses"}
              </option>
              {inventoryView === "products" ? (
                <>
                  <option value="live">Live</option>
                  <option value="hold">Hold</option>
                  <option value="hidden">Hidden</option>
                </>
              ) : (
                <>
                  <option value="show">Show</option>
                  <option value="hidden">Hidden</option>
                </>
              )}
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
            <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-[#0a0a0a]">
              <div className="min-w-[1100px] overflow-hidden">
                <table className="w-full table-fixed text-left">
                  <colgroup>
                    <col className="w-[20%]" />
                    <col className="w-[12%]" />
                    <col className="w-[11%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[9%]" />
                    <col className="w-[11%]" />
                    <col className="w-[8%]" />
                    <col className="w-[5%]" />
                  </colgroup>
                  <thead className="bg-[#070707]">
                    <tr className="border-b border-white/[0.06]">
                      {[
                        "Product",
                        "Category",
                        "Variant",
                        "On Hand",
                        "Reserved",
                        "Available",
                        "Reorder At",
                        "Price",
                        "Status",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-3 py-4 text-[8px] font-bold uppercase tracking-wide text-[#777]"
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
                          <td className="px-3 py-4">
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
                                <div className="truncate text-[10px] font-bold uppercase tracking-wide text-white">
                                  {item.name}
                                </div>
                                <div className="mt-1 max-w-[180px] truncate text-[9px] text-[#666]">
                                  {item.supplierName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="truncate text-[10px] font-bold uppercase text-white">
                              {item.categoryName}
                            </div>
                          </td>
                          <td className="px-2 py-4">
                            <div className="truncate font-mono text-[9px] text-white">
                              {item.sku}
                            </div>
                            <div className="mt-1 text-[9px] uppercase text-[#777]">
                              {item.color} / {item.size}
                            </div>
                          </td>
                          <td className="px-2 py-4 font-mono text-[10px] text-white">
                            {item.quantity}
                          </td>
                          <td className="px-2 py-4 font-mono text-[10px] text-amber-400">
                            {item.reservedQuantity}
                          </td>
                          <td className="px-2 py-4">
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
                          <td className="px-2 py-4 font-mono text-[10px] text-[#a0a0a0]">
                            {item.reorderLevel}
                          </td>
                          <td className="px-2 py-4">
                            <div className="font-mono text-[9px] text-white">
                              LKR {item.sellingPrice.toFixed(2)}
                            </div>
                            {item.priceAdjustment !== 0 && (
                              <div className="mt-1 font-mono text-[8px] text-[#666]">
                                {item.priceAdjustment > 0 ? "+" : ""}
                                {item.priceAdjustment.toFixed(2)} adjustment
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-wider ${variantStatusTone(item.variantStatus)}`}
                            >
                              {item.variantStatus}
                            </span>
                          </td>
                          <td className="px-2 py-4">
                            <button
                              type="button"
                              onClick={() => openVariantPreview(item)}
                              className="rounded border border-sky-500/20 bg-sky-500/10 p-1.5 text-sky-300 transition-colors hover:bg-sky-500/20"
                              title="Preview variant details"
                              aria-label={`Preview ${item.name} ${item.color} ${item.size}`}
                            >
                              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                                <circle cx="12" cy="12" r="2.5" />
                              </svg>
                            </button>
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
            <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-[#0a0a0a]">
              <div className="border-b border-white/[0.05] px-5 py-3 text-[9px] uppercase tracking-widest text-[#666]">
                Group totals reflect the current search and filters.
              </div>
              <div className="min-w-[1000px] overflow-hidden">
                <table className="w-full table-fixed text-left">
                  <thead className="bg-[#070707]">
                    <tr className="border-b border-white/[0.06]">
                      {[
                        "Product",
                        "Category",
                        "Variants",
                        "Branches",
                        "On Hand",
                        "Reserved",
                        "Available",
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
                                  {group.supplierName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-[10px] font-bold uppercase text-white">
                              {group.categoryName}
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
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${productStatusTone(group.status)}`}
                            >
                              {group.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                openProductPreview(group.productId, group.status)
                              }
                              className="rounded border border-sky-500/20 bg-sky-500/10 p-1.5 text-sky-300 transition-colors hover:bg-sky-500/20"
                              title="Preview product details"
                              aria-label={`Preview ${group.name}`}
                            >
                              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                                <circle cx="12" cy="12" r="2.5" />
                              </svg>
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
        </div>
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
            id="variant-option-form"
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

            <div className="mb-5 grid grid-cols-2 gap-2 rounded border border-white/[0.06] bg-[#070707] p-1.5">
              {(["Color", "Size"] as VariantOptionType[]).map((optionType) => (
                <button
                  key={optionType}
                  type="button"
                  onClick={() => startNewVariantOption(optionType)}
                  className={`rounded px-3 py-2 text-[9px] font-bold uppercase tracking-widest transition-colors ${
                    variantOptionForm.optionType === optionType &&
                    !variantOptionForm.optionId
                      ? "bg-white text-black"
                      : "text-[#8e8e93] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  + Add {optionType}
                </button>
              ))}
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
                              if (file) void handleImageUpload(file, (url) => setVariantOptionForm(curr => ({ ...curr, imageUrl: url })));
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
                  <div
                    className={`relative mt-2 flex h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-all ${
                      isDraggingImg
                        ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                        : "border-white/20 bg-white/[0.02] hover:border-white/40 hover:bg-white/5"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingImg(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDraggingImg(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingImg(false);
                      if (e.dataTransfer.files?.length) {
                        void handleMultipleImagesUpload(e.dataTransfer.files, (urls) => setVariantOptionForm(curr => ({ ...curr, imageUrl: urls[0] })));
                      }
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      className="absolute inset-0 z-10 cursor-pointer opacity-0"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          void handleMultipleImagesUpload(e.target.files, (urls) => setVariantOptionForm(curr => ({ ...curr, imageUrl: urls[0] })));
                        }
                      }}
                      disabled={isUploadingImg}
                    />
                    {isUploadingImg ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white">Uploading PNG/JPG image...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 p-3">
                        <span className="text-xl">📥</span>
                        <p className="text-xs font-bold text-white">Drag & Drop PNG / JPG Image Here</p>
                        <p className="text-[9px] text-[#8e8e93]">OR CLICK TO BROWSE MULTIPLE FILES</p>
                        <div className="mt-1 rounded border border-white/20 bg-white/5 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-white/10">
                          Select PNG or JPG
                        </div>
                      </div>
                    )}
                  </div>
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
                  <div className="flex items-center justify-between border-b border-white/[0.05] bg-[#080808] px-5 py-3">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
                      {group.type}s
                    </span>
                    <button
                      type="button"
                      onClick={() => startNewVariantOption(group.type)}
                      className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-white hover:bg-white/10"
                    >
                      + Add {group.type}
                    </button>
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

      {previewProduct && (
        <div
          className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewProduct.name} preview`}
        >
          <div className="my-auto w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
            <div className="flex items-start justify-between gap-6 border-b border-white/[0.06] px-6 py-5">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className="h-20 w-16 flex-shrink-0 rounded-lg border border-white/10 bg-[#151515] bg-cover bg-center"
                  style={
                    previewProduct.imageUrl
                      ? {
                          backgroundImage: `url("${previewProduct.imageUrl}")`,
                        }
                      : undefined
                  }
                />
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-bold uppercase tracking-[0.16em] text-white">
                      {previewProduct.name}
                    </h2>
                    <span
                      className={`rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${productStatusTone(previewProduct.status)}`}
                    >
                      {previewProduct.status}
                    </span>
                  </div>
                  <p className="max-w-2xl text-[11px] leading-relaxed text-[#8e8e93]">
                    {previewProduct.description || "No product description."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[9px] uppercase tracking-wider text-[#666]">
                    <span>{previewProduct.categoryName}</span>
                    <span>{previewProduct.supplierName}</span>
                    <span>
                      Created{" "}
                      {new Date(previewProduct.createdAt).toLocaleDateString(
                        "en-GB",
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {previewMode === "variant" && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditProduct(previewProduct)}
                      disabled={!previewProduct.inventoryId}
                      className="rounded border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDeleteProduct({
                          productId: previewProduct.productId,
                          name: previewProduct.name,
                        })
                      }
                      className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-red-300 hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={closePreview}
                  className="rounded border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-[#aaa] hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            {previewMode === "product" && (
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] bg-[#070707] px-6 py-4">
                <div>
                  <div className="text-[8px] font-bold uppercase tracking-widest text-[#666]">
                    Product Status
                  </div>
                  <p className="mt-1 text-[9px] text-[#777]">
                    This status applies to every variant under the product.
                  </p>
                </div>
                <div className="flex min-w-[320px] gap-2">
                  <select
                    value={previewProductStatus}
                    onChange={(event) =>
                      setPreviewProductStatus(
                        event.target.value as ProductStatus,
                      )
                    }
                    className={fieldClass}
                    aria-label="Product status"
                  >
                    <option value="live">Live — available to buy</option>
                    <option value="hold">Hold — visible as out of stock</option>
                    <option value="hidden">Hidden — removed from storefront</option>
                  </select>
                  <button
                    type="button"
                    onClick={savePreviewProductStatus}
                    disabled={
                      saving ||
                      previewProductStatus ===
                        normalizeProductStatus(previewProduct.status)
                    }
                    className="whitespace-nowrap rounded bg-white px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? "Saving..." : "Update Status"}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 border-b border-white/[0.06] sm:grid-cols-5">
              {[
                {
                  label: "Base Price",
                  value: `LKR ${previewProduct.basePrice.toFixed(2)}`,
                },
                { label: "Variants", value: previewTotals.variants },
                { label: "On Hand", value: previewTotals.onHand },
                { label: "Reserved", value: previewTotals.reserved },
                { label: "Available", value: previewTotals.available },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="border-r border-white/[0.05] px-5 py-4 last:border-r-0"
                >
                  <div className="text-[8px] font-bold uppercase tracking-widest text-[#666]">
                    {stat.label}
                  </div>
                  <div className="mt-2 font-mono text-sm font-bold text-white">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-5">
              <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#777]">
                {previewMode === "product"
                  ? "All variants and branch stock"
                  : "Variant and branch stock details"}
              </div>
              <div className="space-y-2">
                {previewItems.map((item) => (
                  <div
                    key={`${item.variantId}:${item.inventoryId || "none"}`}
                    className="grid gap-3 rounded-lg border border-white/[0.06] bg-[#070707] p-4 sm:grid-cols-[1.4fr_1fr_1fr_1fr]"
                  >
                    <div>
                      <div className="font-mono text-[10px] font-bold text-white">
                        {item.sku}
                      </div>
                      <div className="mt-1 text-[9px] uppercase tracking-wider text-[#777]">
                        {item.color} / {item.size} · {item.variantStatus}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-[#555]">
                        Branch
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase text-[#ccc]">
                        {item.branchName}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-[#555]">
                        Stock
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-[#ccc]">
                        {item.quantity} on hand · {item.reservedQuantity} reserved
                        · {item.availableQuantity} available
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-widest text-[#555]">
                        Selling Price
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-white">
                        LKR {item.sellingPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteProduct && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Delete ${pendingDeleteProduct.name}`}
        >
          <div className="w-full max-w-md rounded-xl border border-red-500/20 bg-[#0a0a0a] p-6 shadow-2xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-300">
              !
            </div>
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              Delete Product
            </h2>
            <p className="mt-3 text-[11px] leading-relaxed text-[#8e8e93]">
              Permanently delete “{pendingDeleteProduct.name}” and all its
              variants, stock records, and product images? This action cannot be
              undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteProduct(null)}
                disabled={saving}
                className="rounded border border-white/10 bg-white/5 px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-white/10 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  void deleteProduct(
                    pendingDeleteProduct.productId,
                    pendingDeleteProduct.name,
                  )
                }
                disabled={saving}
                className="rounded bg-red-500 px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-red-400 disabled:opacity-40"
              >
                {saving ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {productModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/85 p-6 backdrop-blur-sm">
          <div className="my-6 w-full max-w-5xl rounded-lg border border-white/10 bg-[#0a0a0a] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-7 py-5">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                  {productForm.inventoryId
                    ? "Edit Variant & Stock"
                    : `Add Product — Step ${addProductStep} of 2`}
                </h2>
                <p className="mt-1 text-[10px] text-[#666]">
                  {productForm.inventoryId
                    ? "Update pricing, status, or image for this specific variant."
                    : addProductStep === 1
                    ? "Step 1: Enter product basic info, category, supplier and price."
                    : `Step 2: Add color/size variants for "${productForm.name}".`}
                </p>
              </div>

              {!productForm.inventoryId && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAddProductStep(1)}
                    className={`rounded px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                      addProductStep === 1
                        ? "bg-white text-black"
                        : "border border-white/10 text-[#777] hover:text-white"
                    }`}
                  >
                    1. Product Info
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !productForm.name.trim() ||
                        !productForm.supplierId ||
                        !productForm.basePrice
                      ) {
                        setFeedback({
                          message:
                            "Please fill in Product Name, Supplier, and Base Price first.",
                          type: "error",
                        });
                        return;
                      }
                      setAddProductStep(2);
                    }}
                    className={`rounded px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                      addProductStep === 2
                        ? "bg-white text-black"
                        : "border border-white/10 text-[#777] hover:text-white"
                    }`}
                  >
                    2. Add Variants ({newProductVariants.length})
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="text-xl text-[#777] transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={saveProduct} className="space-y-7 p-7">
              {/* EDITING SINGLE VARIANT MODE */}
              {productForm.inventoryId && (
                <div className="space-y-6">
                  <section>
                    <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
                      Product Meta
                    </h3>
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                      <label className="lg:col-span-2">
                        <span className={labelClass}>Product Name</span>
                        <input
                          required
                          minLength={2}
                          value={productForm.name}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              name: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>Category</span>
                        <select
                          value={productForm.categoryId}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              categoryId: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        >
                          <option value="">Unassigned</option>
                          {catalog.categories.map((c) => (
                            <option key={c.categoryId} value={c.categoryId}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className={labelClass}>Supplier</span>
                        <select
                          required
                          value={productForm.supplierId}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              supplierId: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        >
                          <option value="" disabled>
                            Select supplier
                          </option>
                          {catalog.suppliers.map((s) => (
                            <option key={s.supplierId} value={s.supplierId}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="border-t border-white/[0.06] pt-6">
                    <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
                      Variant Details & Image
                    </h3>
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                      <label>
                        <span className={labelClass}>Base Price (LKR)</span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={productForm.basePrice}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              basePrice: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>Price Adjustment (LKR)</span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={productForm.priceAdjustment}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              priceAdjustment: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>Quantity</span>
                        <input
                          required
                          type="number"
                          min="0"
                          value={productForm.quantity}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              quantity: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        />
                      </label>
                      <label>
                        <span className={labelClass}>Variant Status</span>
                        <select
                          value={productForm.variantStatus}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              variantStatus: e.target.value as VariantStatus,
                            }))
                          }
                          className={fieldClass}
                        >
                          <option value="show">Show</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={labelClass}>Product Image (PNG & JPG only)</span>
                        <span className="text-[9px] font-semibold text-emerald-400">Drag & Drop + Multiple Files</span>
                      </div>
                      <div className="space-y-3">
                        <div
                          className={`relative flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-all ${
                            isDraggingImg
                              ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                              : "border-white/20 bg-white/[0.02] hover:border-white/40 hover:bg-white/[0.04]"
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingImg(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDraggingImg(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingImg(false);
                            if (e.dataTransfer.files?.length) {
                              void handleProductModalImageUpload(e.dataTransfer.files, 'main');
                            }
                          }}
                        >
                          <input
                            type="file"
                            multiple
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={(e) => {
                              if (e.target.files?.length) {
                                void handleProductModalImageUpload(e.target.files, 'main');
                              }
                            }}
                            className="absolute inset-0 z-10 cursor-pointer opacity-0"
                            disabled={isUploadingImg}
                          />
                          {isUploadingImg ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                                Uploading PNG/JPG to Cloudinary...
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xl">📁</span>
                              <span className="text-[11px] font-bold text-white">
                                Drag & Drop PNG or JPG images here, or click to select multiple files
                              </span>
                              <span className="text-[9px] uppercase tracking-widest text-[#777]">
                                Allowed formats: PNG, JPG, JPEG only
                              </span>
                            </div>
                          )}
                        </div>

                        {productForm.imageUrl && (
                          <div className="flex items-center gap-3 rounded border border-white/10 bg-[#0f0f0f] p-3">
                            <img
                              src={productForm.imageUrl}
                              alt="Product Main Preview"
                              className="h-12 w-12 rounded border border-white/10 object-cover"
                            />
                            <div className="flex-1 overflow-hidden">
                              <p className="truncate text-[10px] font-mono text-emerald-400">
                                {productForm.imageUrl}
                              </p>
                              <p className="text-[9px] text-[#666]">Main Cloudinary Image URL</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setProductForm((curr) => ({ ...curr, imageUrl: "" }))}
                              className="rounded border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[9px] font-bold uppercase text-red-400 hover:bg-red-500/20"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

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
                      disabled={saving || isUploadingImg}
                      className="rounded bg-white px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#e5e5e5] disabled:opacity-40"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* CREATING NEW PRODUCT — STEP 1: PRODUCT INFO */}
              {!productForm.inventoryId && addProductStep === 1 && (
                <div className="space-y-6">
                  <section>
                    <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
                      Basic Product Information
                    </h3>
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                      <label className="lg:col-span-2">
                        <span className={labelClass}>Product Name *</span>
                        <input
                          required
                          minLength={2}
                          placeholder="e.g. Vintage Oversized Hoodie"
                          value={productForm.name}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              name: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        />
                      </label>

                      <label>
                        <span className={labelClass}>Category</span>
                        <select
                          value={productForm.categoryId}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              categoryId: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        >
                          <option value="">Unassigned</option>
                          {catalog.categories.map((c) => (
                            <option key={c.categoryId} value={c.categoryId}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span className={labelClass}>Supplier *</span>
                        <select
                          required
                          value={productForm.supplierId}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              supplierId: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        >
                          <option value="" disabled>
                            Select supplier
                          </option>
                          {catalog.suppliers.map((s) => (
                            <option key={s.supplierId} value={s.supplierId}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="lg:col-span-2">
                        <span className={labelClass}>Description</span>
                        <textarea
                          value={productForm.description}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Optional product description..."
                          className={`${fieldClass} min-h-20 resize-y`}
                        />
                      </label>

                      <label>
                        <span className={labelClass}>Base Price (LKR) *</span>
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          value={productForm.basePrice}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              basePrice: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        />
                      </label>

                      <label>
                        <span className={labelClass}>Product Status</span>
                        <select
                          value={productForm.status}
                          onChange={(e) =>
                            setProductForm((curr) => ({
                              ...curr,
                              status: e.target.value as ProductStatus,
                            }))
                          }
                          className={fieldClass}
                        >
                          <option value="live">Live — available to buy</option>
                          <option value="hold">Hold — visible as out of stock</option>
                          <option value="hidden">Hidden — removed from store</option>
                        </select>
                      </label>
                    </div>
                  </section>

                  <div className="flex justify-end border-t border-white/[0.06] pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !productForm.name.trim() ||
                          !productForm.supplierId ||
                          !productForm.basePrice
                        ) {
                          setFeedback({
                            message:
                              "Please enter Product Name, Supplier, and Base Price before proceeding.",
                            type: "error",
                          });
                          return;
                        }
                        setAddProductStep(2);
                      }}
                      className="rounded bg-white px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#e5e5e5]"
                    >
                      Next: Add Variants ({newProductVariants.length}) →
                    </button>
                  </div>
                </div>
              )}

              {/* CREATING NEW PRODUCT — STEP 2: ADD MULTIPLE VARIANTS */}
              {!productForm.inventoryId && addProductStep === 2 && (
                <div className="space-y-6">
                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-[#070707] p-4">
                    <div className="text-[11px] font-semibold text-white">
                      <span className="text-[#777]">Product:</span>{" "}
                      <strong className="text-white">{productForm.name}</strong>{" "}
                      <span className="mx-2 text-[#444]">|</span>
                      <span className="text-[#777]">Base Price:</span>{" "}
                      <strong className="text-emerald-400">
                        LKR {Number(productForm.basePrice || 0).toLocaleString()}
                      </strong>{" "}
                      <span className="mx-2 text-[#444]">|</span>
                      <span className="text-[#777]">Category:</span>{" "}
                      <strong className="text-[#aaa]">
                        {catalog.categories.find(
                          (c) => c.categoryId === productForm.categoryId,
                        )?.name || "Unassigned"}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddProductStep(1)}
                      className="text-[9px] font-bold uppercase tracking-wider text-[#8e8e93] hover:text-white"
                    >
                      ← Edit Product Info
                    </button>
                  </div>

                  {/* Add Variant Form Card */}
                  <div className="rounded-lg border border-white/10 bg-[#070707] p-5">
                    <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
                      Add New Variant Entry
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                      <label>
                        <span className={labelClass}>Color *</span>
                        <select
                          value={draftVariant.colorId}
                          onChange={(e) =>
                            setDraftVariant((curr) => ({
                              ...curr,
                              colorId: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        >
                          <option value="" disabled>
                            Select Color
                          </option>
                          {colorOptions.map((c) => (
                            <option key={c.optionId} value={c.optionId}>
                              {c.value}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span className={labelClass}>Size *</span>
                        <select
                          value={draftVariant.sizeId}
                          onChange={(e) =>
                            setDraftVariant((curr) => ({
                              ...curr,
                              sizeId: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        >
                          <option value="" disabled>
                            Select Size
                          </option>
                          {sizeOptions.map((s) => (
                            <option key={s.optionId} value={s.optionId}>
                              {s.value}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span className={labelClass}>Price Adj (LKR)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={draftVariant.priceAdjustment}
                          onChange={(e) =>
                            setDraftVariant((curr) => ({
                              ...curr,
                              priceAdjustment: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        />
                      </label>

                      <label>
                        <span className={labelClass}>Initial Stock</span>
                        <input
                          type="number"
                          min="0"
                          value={draftVariant.quantity}
                          onChange={(e) =>
                            setDraftVariant((curr) => ({
                              ...curr,
                              quantity: e.target.value,
                            }))
                          }
                          className={fieldClass}
                        />
                      </label>

                      <label>
                        <span className={labelClass}>Status</span>
                        <select
                          value={draftVariant.status}
                          onChange={(e) =>
                            setDraftVariant((curr) => ({
                              ...curr,
                              status: e.target.value as VariantStatus,
                            }))
                          }
                          className={fieldClass}
                        >
                          <option value="show">Show</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </label>
                    </div>

                    {/* Variant Image Drag and Drop Multi Upload Box */}
                    <div className="mt-4 border-t border-white/[0.06] pt-4">
                      <span className={labelClass}>Variant Image (PNG & JPG Drag & Drop)</span>
                      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
                        <div
                          className={`relative flex-1 min-h-[85px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-3 text-center transition-all ${
                            isDraggingImg
                              ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.2)]"
                              : "border-white/20 bg-white/[0.02] hover:border-white/40 hover:bg-white/[0.04]"
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingImg(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDraggingImg(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingImg(false);
                            if (e.dataTransfer.files?.length) {
                              void handleProductModalImageUpload(e.dataTransfer.files, 'draft');
                            }
                          }}
                        >
                          <input
                            type="file"
                            multiple
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={(e) => {
                              if (e.target.files?.length) {
                                void handleProductModalImageUpload(e.target.files, 'draft');
                              }
                            }}
                            className="absolute inset-0 z-10 cursor-pointer opacity-0"
                            disabled={isUploadingImg}
                          />
                          {isUploadingImg ? (
                            <div className="flex items-center justify-center gap-2 text-[10px] text-white">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                              <span>Uploading PNG/JPG to Cloudinary...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-bold text-white">
                                📥 Drag & Drop PNG/JPG image or click to select multiple files
                              </span>
                              <span className="text-[8px] uppercase tracking-widest text-[#777]">
                                Restricted to PNG & JPG files only
                              </span>
                            </div>
                          )}
                        </div>

                        {draftVariant.imageUrl && (
                          <div className="flex items-center gap-3 rounded border border-white/10 bg-[#0f0f0f] p-2">
                            <img
                              src={draftVariant.imageUrl}
                              alt="Variant Preview"
                              className="h-10 w-10 rounded border border-white/10 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setDraftVariant((curr) => ({ ...curr, imageUrl: "" }))}
                              className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[8px] font-bold uppercase text-red-400 hover:bg-red-500/20"
                            >
                              Clear
                            </button>
                          </div>
                        )}

                        <div>
                          <button
                            type="button"
                            onClick={addVariantToList}
                            className="h-[42px] w-full rounded border border-emerald-500/30 bg-emerald-500/20 px-6 text-[9px] font-bold uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/30 md:w-auto"
                          >
                            + Add Variant
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Added Variants List */}
                  <div>
                    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
                      Variants Added ({newProductVariants.length})
                    </h3>

                    {newProductVariants.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-white/10 bg-[#070707] p-6 text-center text-[10px] text-[#666]">
                        No variants added yet. Select a Color and Size above and click "+ Add Variant".
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#070707]">
                        <table className="w-full text-left text-[11px]">
                          <tbody className="divide-y divide-white/[0.04]">
                            {newProductVariants.map((v) => {
                              const sellingPrice =
                                Number(productForm.basePrice || 0) +
                                v.priceAdjustment;
                              return (
                                <tr key={v.id} className="hover:bg-white/[0.02]">
                                  <td className="p-3">
                                    {v.imageUrl ? (
                                      <img
                                        src={v.imageUrl}
                                        alt={v.colorName}
                                        className="h-8 w-8 rounded border border-white/10 object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-8 w-8 items-center justify-center rounded border border-white/5 bg-white/5 text-[8px] text-[#555]">
                                        No img
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 font-semibold text-white">
                                    {v.colorName}
                                  </td>
                                  <td className="p-3 font-semibold text-white">
                                    {v.sizeName}
                                  </td>
                                  <td className="p-3 text-[#aaa]">
                                    {v.priceAdjustment > 0
                                      ? `+ LKR ${v.priceAdjustment.toLocaleString()}`
                                      : v.priceAdjustment < 0
                                      ? `- LKR ${Math.abs(v.priceAdjustment).toLocaleString()}`
                                      : "LKR 0.00"}
                                  </td>
                                  <td className="p-3 font-mono font-semibold text-emerald-400">
                                    LKR {sellingPrice.toLocaleString()}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-white">
                                    {v.quantity}
                                  </td>
                                  <td className="p-3">
                                    <span
                                      className={`inline-block rounded px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${variantStatusTone(
                                        v.status,
                                      )}`}
                                    >
                                      {v.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeVariantFromList(v.id)}
                                      className="rounded bg-red-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Submit Footer */}
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
                      disabled={saving || newProductVariants.length === 0}
                      className="rounded bg-white px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {saving
                        ? "Submitting..."
                        : `Submit Product & (${newProductVariants.length}) Variants`}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
