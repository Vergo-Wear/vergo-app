"use client";

import React, { useState, useEffect, useMemo, FormEvent } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type TabType = "catalog" | "collections" | "colors" | "storefront";

export default function InventoryDashboard() {
  const supabase = createSupabaseClient();

  // -- State: Tabs --
  const [activeTab, setActiveTab] = useState<TabType>("catalog");

  // -- State: Universal Data --
  const [loading, setLoading] = useState(true);

  // Local Config Lists
  const [colors, setColors] = useState<string[]>([]);

  type StorefrontConfig = { visibility: "Live" | "Hidden"; badge: "None" | "New" | "Limited Stock" | "Out of Stock"; discount: number };
  const [storefront, setStorefront] = useState<Record<string, StorefrontConfig>>({});

  // DB Lists
  const [categories, setCategories] = useState<any[]>([]);
  const [masterCatalog, setMasterCatalog] = useState<any[]>([]);

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
  const fetchAllData = async () => {
    setLoading(true);

    // Load local storage configs
    const localColors = JSON.parse(localStorage.getItem("vergo_colors") || '["Black", "White", "Blue", "Red", "Green", "Gray"]');
    const localCategories = JSON.parse(localStorage.getItem("vergo_categories") || "[]");
    const localStorefront = JSON.parse(localStorage.getItem("vergo_storefront") || "{}");

    setColors(localColors);
    setStorefront(localStorefront);

    if (supabase) {
      // Fetch DB categories
      let catData: any[] | null = null;
      try { const res = await supabase.from("category").select("*"); catData = res.data; } catch (e) { }

      const mergedCats = [...localCategories];
      if (catData) {
        catData.forEach((c: any) => { if (!mergedCats.find(m => m.category_id === c.category_id)) mergedCats.push(c) });
      }
      setCategories(mergedCats);

      // Fetch unified variants representing the catalog
      // This is a manual JS join because relationships aren't guaranteed client-side
      const [{ data: invData }, { data: varData }, { data: prodData }, { data: imgData }] = await Promise.all([
        supabase.from("inventory").select("*"),
        supabase.from("product_variant").select("*"),
        supabase.from("product").select("*"),
        supabase.from("images").select("*")
      ]);

      const merged = (invData || []).map((inv: any) => {
        const variant = (varData || []).find((v: any) => v.variant_id === inv.variant_id);
        const product = (prodData || []).find((p: any) => p.product_id === variant?.product_id);
        const category = mergedCats.find((c: any) => c.category_id === product?.category_id);
        const imageRecord = (imgData || []).find((i: any) => i.variant_id === inv.variant_id);

        return {
          id: inv.inventory_id,         // Primary mapping id
          variant_id: inv.variant_id,
          product_id: product?.product_id,
          image: imageRecord?.image_url || "",
          image_id: imageRecord?.id,
          name: product?.name || "Unknown",
          categoryId: category?.category_id,
          categoryName: category?.name || "None",
          color: variant?.color || "N/A",
          size: variant?.size || "N/A",
          sku: variant?.sku || "N/A",
          price: (product?.base_price || 0) + (variant?.price_adjustment || 0),
          base_price: product?.base_price || 0,
          quantity: inv.quantity || 0,
          status: product?.status || "Draft",
          sf: localStorefront[category?.category_id || ""] || { visibility: "Live", badge: "None", discount: 0 }
        };
      });

      setMasterCatalog(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [supabase]);

  // ================= TAB 1: MASTER CATALOG =================
  const filteredCatalog = useMemo(() => {
    return masterCatalog.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
      const matchCol = colFilter === "all" || item.categoryId === colFilter;
      const matchColor = colorFilter === "all" || item.color === colorFilter;
      const matchVisibility = visibilityFilter === "all" || item.sf?.visibility === visibilityFilter;
      return matchSearch && matchCol && matchColor && matchVisibility;
    });
  }, [masterCatalog, search, colFilter, colorFilter, visibilityFilter]);

  const handleDeleteVariant = async (invId: string, varId: string, imgId: string | undefined) => {
    if (!confirm("Delete this variant entirely?")) return;
    if (!supabase) return;
    setLoading(true);

    // Delete inventory (and images if needed) then variant
    await supabase.from("inventory").delete().eq("inventory_id", invId);
    if (imgId) await supabase.from("images").delete().eq("id", imgId);
    await supabase.from("product_variant").delete().eq("variant_id", varId);

    showToast("Variant deleted", "success");
    fetchAllData();
  };


  // ================= TAB 2: COLLECTIONS =================
  const [collectionForm, setCollectionForm] = useState({ id: "", name: "", desc: "", basePrice: "0" });
  const saveCollection = async () => {
    if (!collectionForm.name.trim()) {
      showToast("Collection name is required.", "error");
      return;
    }

    setLoading(true);
    const isEditing = !!collectionForm.id;
    const cid = isEditing ? collectionForm.id : `cat_${Date.now()}`;

    // Save to local state like Colors Palette
    const nextCats = [...categories];
    if (isEditing) {
      const idx = nextCats.findIndex(c => c.category_id === collectionForm.id);
      if (idx !== -1) nextCats[idx] = { ...nextCats[idx], name: collectionForm.name, description: collectionForm.desc, basePrice: collectionForm.basePrice };
    } else {
      nextCats.push({ category_id: cid, name: collectionForm.name, description: collectionForm.desc, basePrice: collectionForm.basePrice });
    }
    setCategories(nextCats);
    localStorage.setItem("vergo_categories", JSON.stringify(nextCats));

    // Batch Update Product Prices matching this category ID natively in Supabase
    if (supabase) {
      try {
        await supabase.from("product").update({ base_price: parseFloat(collectionForm.basePrice) || 0 }).eq("category_id", cid);
      } catch (e) {
        console.error("Batch update failed", e);
      }
    }

    // Silent DB Sync attempt for category info
    if (supabase) {
      const payload = { name: collectionForm.name, description: collectionForm.desc };
      try {
        if (isEditing) {
          await supabase.from("category").update(payload).eq("category_id", collectionForm.id);
        } else {
          await supabase.from("category").insert([payload]);
        }
      } catch (e) {
        // Ignored to match local-first behavior requested
      }
    }

    showToast(`${isEditing ? "Updated" : "Added"} Collection & Synced Prices`, "success");
    setCollectionForm({ id: "", name: "", desc: "", basePrice: "0" });
    setLoading(false);
  };

  const deleteCollection = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    const nextCats = categories.filter(c => c.category_id !== id);
    setCategories(nextCats);
    localStorage.setItem("vergo_categories", JSON.stringify(nextCats));

    if (supabase) {
      try { await supabase.from("category").delete().eq("category_id", id); } catch (e) { }
    }
    showToast("Collection deleted", "success");
  };

  // ================= TAB 3 & 4: LOCAL CFG MODULES =================
  const [colorInput, setColorInput] = useState("");
  const handleColorUpdate = (oldName: string | null, newName: string, isDelete = false) => {
    let next = [...colors];
    if (isDelete && oldName) {
      next = next.filter(c => c !== oldName);
    } else if (oldName && oldName !== newName) {
      const idx = next.indexOf(oldName);
      if (idx !== -1) next[idx] = newName;
    } else if (!oldName && newName) {
      if (!next.includes(newName)) next.push(newName);
    }
    setColors(next);
    localStorage.setItem("vergo_colors", JSON.stringify(next));
    showToast("Color palette updated", "success");
    setColorInput("");
  };

  const [sfModalOpen, setSfModalOpen] = useState(false);
  const [sfEditingCat, setSfEditingCat] = useState<any>(null);
  const [sfForm, setSfForm] = useState<StorefrontConfig>({ visibility: "Live", badge: "None", discount: 0 });

  const handleOpenSfModal = (category: any) => {
    setSfEditingCat(category);
    const existing = storefront[category.category_id] || { visibility: "Live", badge: "None", discount: 0 };
    setSfForm({ ...existing });
    setSfModalOpen(true);
  };

  const handleSaveSf = () => {
    if (!sfEditingCat) return;
    const nextSf = { ...storefront, [sfEditingCat.category_id]: sfForm };
    setStorefront(nextSf);
    localStorage.setItem("vergo_storefront", JSON.stringify(nextSf));
    showToast("Storefront Settings Updated", "success");
    setSfModalOpen(false);
  };


  // ================= PRODUCT & VARIANT MODAL =================
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const defaultProductState = {
    parentName: "", categoryId: "", color: "", size: "",
    quantity: "0", image: "",
    editInvId: "", editVarId: "", editImgId: "", editProdId: "" // Set if editing existing variant
  };
  const [prodForm, setProdForm] = useState(defaultProductState);

  const openProductModal = (itemToEdit: any | null = null) => {
    setProdForm(itemToEdit ? {
      parentName: itemToEdit.name,
      categoryId: itemToEdit.categoryId,
      color: itemToEdit.color,
      size: itemToEdit.size,
      quantity: itemToEdit.quantity.toString(),
      image: itemToEdit.image,
      editInvId: itemToEdit.id,
      editVarId: itemToEdit.variant_id,
      editImgId: itemToEdit.image_id,
      editProdId: itemToEdit.product_id
    } : defaultProductState);
    setIsProductModalOpen(true);
  };

  const handleSaveProductVariant = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);

    const isEditing = !!prodForm.editInvId;

    try {
      let activeProductId = prodForm.editProdId;

      // 1. Process Parent Product (Find or Create)
      if (!isEditing) {
        // Attempt to find by exact name
        const { data: existing } = await supabase.from("product").select("product_id").eq("name", prodForm.parentName).limit(1).single();
        if (existing) {
          activeProductId = existing.product_id;
        } else {
          activeProductId = `prod_${Date.now()}`;
          // Get the basePrice from the globally stored collection configuration implicitly
          const cat = categories.find(c => c.category_id === prodForm.categoryId);
          const inherentPrice = cat ? parseFloat(cat.basePrice || "0") : 0;
          await supabase.from("product").insert([{
            product_id: activeProductId,
            name: prodForm.parentName,
            category_id: prodForm.categoryId,
            base_price: inherentPrice,
            status: "Draft"
          }]);
        }
      } else {
        // Find assigned Collection's BasePrice dynamically
        const cat = categories.find(c => c.category_id === prodForm.categoryId);
        const inherentPrice = cat ? parseFloat(cat.basePrice || "0") : 0;
        // Always update parent attributes for the joined variations
        await supabase.from("product").update({
          name: prodForm.parentName,
          category_id: prodForm.categoryId,
          base_price: inherentPrice,
          status: "Draft"
        }).eq("product_id", activeProductId);
      }

      // 2. Process Variant
      let activeVariantId = prodForm.editVarId;
      const sku = `VGO-${prodForm.parentName.substring(0, 3).toUpperCase()}-${prodForm.color.substring(0, 3).toUpperCase()}-${prodForm.size}`;

      if (!isEditing) {
        activeVariantId = `var_${Date.now()}`;
        await supabase.from("product_variant").insert([{
          variant_id: activeVariantId,
          product_id: activeProductId,
          color: prodForm.color,
          size: prodForm.size,
          sku: sku,
          price_adjustment: 0
        }]);
      } else {
        await supabase.from("product_variant").update({
          color: prodForm.color,
          size: prodForm.size,
          sku: sku
        }).eq("variant_id", activeVariantId);
      }

      // 3. Process Inventory
      if (!isEditing) {
        await supabase.from("inventory").insert([{
          inventory_id: `inv_${Date.now()}`,
          variant_id: activeVariantId,
          quantity: parseInt(prodForm.quantity)
        }]);
      } else {
        await supabase.from("inventory").update({
          quantity: parseInt(prodForm.quantity)
        }).eq("inventory_id", prodForm.editInvId);
      }

      // 4. Process Images
      if (!isEditing) {
        await supabase.from("images").insert([{
          id: `img_${Date.now()}`,
          variant_id: activeVariantId,
          image_url: prodForm.image
        }]);
      } else {
        if (prodForm.editImgId) {
          await supabase.from("images").update({
            image_url: prodForm.image
          }).eq("id", prodForm.editImgId);
        } else if (prodForm.image) {
          await supabase.from("images").insert([{
            id: `img_${Date.now()}`,
            variant_id: activeVariantId,
            image_url: prodForm.image
          }]);
        }
      }

      showToast(isEditing ? "Variant updated" : "Variant added to inventory", "success");
      setIsProductModalOpen(false);
      fetchAllData();

    } catch (err: any) {
      showToast(err.message || "Failed to save variant.", "error");
      setLoading(false);
    }
  };


  // ================= UI RENDERS =================
  const renderNav = () => (
    <div className="flex gap-4 border-b border-[rgba(255,255,255,0.06)] mb-8 pb-4">
      {[
        { id: "catalog", label: "Master Catalog" },
        { id: "collections", label: "Collections" },
        { id: "colors", label: "Color Palette" },
        { id: "storefront", label: "Storefront Manager" },
      ].map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id as TabType)}
          className={`text-xs font-bold tracking-widest uppercase px-4 py-2 rounded transition-all ${activeTab === t.id ? "bg-white text-black shadow-md" : "text-[#8e8e93] hover:text-white bg-transparent border border-transparent hover:border-[rgba(255,255,255,0.1)]"
            }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f7] font-sans pb-32 pt-8 px-8">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-3 rounded text-[10px] uppercase font-bold tracking-widest shadow-lg transition-all ${toast.type === "success" ? "bg-[#1f1f1f] border border-green-500/50 text-green-400" : "bg-[#1f1f1f] border border-red-500/50 text-red-400"
          }`}>
          {toast.message}
        </div>
      )}

      {/* Header & Tabs */}
      <h1 className="text-xl font-bold tracking-[0.2em] text-white uppercase mb-8">INVENTORY COMMAND</h1>
      {renderNav()}

      {loading && (
        <div className="py-20 text-center text-[#8e8e93] font-mono text-xs uppercase tracking-widest animate-pulse">
          SYNCING CLOUD DATA...
        </div>
      )}

      {/* --- TAB: MASTER CATALOG --- */}
      {!loading && activeTab === "catalog" && (
        <section className="animate-fade-in space-y-6">
          <div className="flex justify-between items-center bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] p-6 rounded-lg">
            <div className="flex gap-4">
              <input
                type="text" placeholder="Search Catalog..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-2 text-[10px] text-white placeholder-[#555] uppercase min-w-[200px]"
              />
              <select value={colFilter} onChange={(e) => setColFilter(e.target.value)} className="bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-white cursor-pointer">
                <option value="all">ALL COLLECTIONS</option>
                {categories.map((c) => (<option key={c.category_id} value={c.category_id}>{c.name}</option>))}
              </select>
              <select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)} className="bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-white cursor-pointer">
                <option value="all">ALL COLORS</option>
                {colors.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)} className="bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-[10px] font-bold tracking-widest uppercase text-white cursor-pointer">
                <option value="all">ALL VISIBILITY</option>
                <option value="Live">LIVE</option>
                <option value="Hidden">HIDDEN</option>
              </select>
            </div>

            <button
              onClick={() => openProductModal()}
              className="bg-white text-black hover:bg-[#eaeaea] font-bold text-[10px] tracking-widest px-6 py-2.5 rounded transition-all uppercase"
            >
              + ADD PRODUCT
            </button>
          </div>

          <div className="overflow-x-auto shadow-inner bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-lg custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
              <thead className="bg-[#050505] text-[#8e8e93]">
                <tr>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)] w-16">Image</th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">Product</th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">Collection</th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">Color</th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">Size</th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">SKU</th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">Price</th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">Qty</th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">Status</th>
                  <th className="py-4 px-4 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)] bg-[#0d0d0d]">
                {filteredCatalog.map(item => (
                  <tr key={item.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                    <td className="py-3 px-4">
                      {item.image ? (
                        <div className="w-10 h-10 rounded border border-[rgba(255,255,255,0.1)] bg-[#1a1a1a] overflow-hidden">
                          <img src={item.image} alt="product" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded border border-[rgba(255,255,255,0.05)] bg-[#121212] flex items-center justify-center text-[10px] text-[#444] font-bold">N/A</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-white font-bold text-[11px] uppercase tracking-wide">{item.name}</td>
                    <td className="py-3 px-4 text-[#8e8e93] font-bold text-[9px] tracking-widest uppercase">{item.categoryName}</td>
                    <td className="py-3 px-4 text-white font-bold text-[9px] uppercase tracking-widest">{item.color}</td>
                    <td className="py-3 px-4 text-white font-bold text-[9px] uppercase"><span className="bg-[#1f1f1f] px-2 py-1 rounded border border-[rgba(255,255,255,0.06)]">{item.size}</span></td>
                    <td className="py-3 px-4 text-[#8e8e93] font-mono text-[10px]">{item.sku}</td>
                    <td className="py-3 px-4 text-white font-mono text-[10px]">
                      {item.sf?.discount > 0 ? (
                        <div className="flex flex-col">
                          <span className="line-through text-[#555]">${item.price.toFixed(2)}</span>
                          <span className="text-green-400 font-bold">${(item.price * (1 - item.sf.discount / 100)).toFixed(2)}</span>
                          <span className="text-[7px] text-[#555] uppercase mt-0.5">{item.sf.discount}% OFF</span>
                        </div>
                      ) : (
                        <span>${item.price.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-white font-mono text-[10px]">
                      {item.quantity === 0 ? <span className="text-red-400">0</span> : item.quantity}
                    </td>
                    <td className="py-3 px-4">
                      {item.sf?.badge && item.sf.badge !== "None" && (
                        <span className="bg-[#1a1a1a] text-white px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase mr-2 border border-[rgba(255,255,255,0.1)]">
                          {item.sf.badge}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase ${item.sf?.visibility === 'Live' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                        {item.sf?.visibility}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2 text-[10px] font-bold uppercase tracking-widest">
                        <button onClick={() => openProductModal(item)} className="text-[#8e8e93] hover:text-white transition-colors p-2 bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded">Edit</button>
                        <button onClick={() => handleDeleteVariant(item.id, item.variant_id, item.image_id)} className="text-red-900 hover:text-red-500 transition-colors p-2 bg-[#121212] border border-[rgba(255,255,255,0.05)] rounded">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCatalog.length === 0 && (
                  <tr><td colSpan={10} className="py-12 text-center text-[#555] font-bold text-[10px] tracking-widest uppercase">No inventory found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* --- TAB: COLLECTIONS --- */}
      {!loading && activeTab === "collections" && (
        <section className="animate-fade-in grid md:grid-cols-2 gap-8">
          <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-lg p-6">
            <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-6 border-b border-[rgba(255,255,255,0.04)] pb-4">
              {collectionForm.id ? "Edit Collection" : "Add New Collection"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Collection Name</label>
                <input type="text" value={collectionForm.name} onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })} className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-2 text-xs text-white uppercase" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Base Price ($)</label>
                <input type="number" step="0.01" min="0" value={collectionForm.basePrice} onChange={(e) => setCollectionForm({ ...collectionForm, basePrice: e.target.value })} className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-2 text-xs font-mono text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Description</label>
                <textarea value={collectionForm.desc} onChange={(e) => setCollectionForm({ ...collectionForm, desc: e.target.value })} className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-2 text-xs text-white" />
              </div>
              <div className="pt-4 flex gap-4">
                <button onClick={saveCollection} className="bg-white text-black font-bold text-[10px] tracking-widest px-8 py-3 rounded uppercase transition-all shadow-md hover:bg-gray-200">
                  SAVE COLLECTION
                </button>
                {collectionForm.id && (
                  <button onClick={() => setCollectionForm({ id: "", name: "", desc: "", basePrice: "0" })} className="text-[#8e8e93] font-bold text-[10px] tracking-widest px-8 py-3 uppercase hover:text-white">Cancel</button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-lg p-6">
            <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-6 border-b border-[rgba(255,255,255,0.04)] pb-4">Existing Collections</h2>
            <div className="space-y-3">
              {categories.map(c => (
                <div key={c.category_id} className="flex justify-between items-center p-4 bg-[#121212] border border-[rgba(255,255,255,0.04)] rounded">
                  <div>
                    <span className="text-white font-bold text-xs uppercase tracking-wider block">{c.name}</span>
                    <span className="text-[#555] text-[10px]">{c.description || "No description"}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setCollectionForm({ id: c.category_id, name: c.name, desc: c.description || "", basePrice: c.basePrice || "0" })} className="text-[9px] font-bold tracking-widest uppercase text-white bg-[#1f1f1f] px-3 py-1.5 rounded hover:bg-[#333]">Edit</button>
                    <button onClick={() => deleteCollection(c.category_id)} className="text-[9px] font-bold tracking-widest uppercase text-red-500 bg-[#1f1f1f] px-3 py-1.5 rounded hover:bg-[#333]">Del</button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <div className="text-[10px] text-[#555] uppercase">No collections created.</div>}
            </div>
          </div>
        </section>
      )}

      {/* --- TAB: COLORS --- */}
      {!loading && activeTab === "colors" && (
        <section className="animate-fade-in grid md:grid-cols-2 gap-8">
          <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-lg p-6">
            <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-6 border-b border-[rgba(255,255,255,0.04)] pb-4">Add Color Entity</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Color Name</label>
                <div className="flex gap-4">
                  <input
                    type="text" value={colorInput} onChange={(e) => setColorInput(e.target.value)} placeholder="E.g. Emerald Green"
                    className="flex-1 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-2 text-xs text-white uppercase"
                  />
                  <button onClick={() => handleColorUpdate(null, colorInput)} className="bg-white text-black font-bold text-[10px] tracking-widest px-6 py-2 rounded uppercase transition-all shadow-md hover:bg-gray-200">SAVE</button>
                </div>
              </div>
              <p className="text-[9px] text-[#555] uppercase font-bold mt-2 leading-relaxed">Colors are saved dynamically to your portal palette and linked into variants by their plain text name. No HEX codes are utilized.</p>
            </div>
          </div>
          <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-lg p-6">
            <h2 className="text-xs font-bold tracking-[0.2em] text-white uppercase mb-6 border-b border-[rgba(255,255,255,0.04)] pb-4">Available Colors</h2>
            <div className="flex flex-wrap gap-3">
              {colors.map(item => (
                <div key={item} className="flex items-center gap-2 bg-[#121212] border border-[rgba(255,255,255,0.04)] px-4 py-2 rounded">
                  <span className="text-white font-bold text-xs uppercase tracking-wider block">{item}</span>
                  <div className="w-px h-4 bg-[rgba(255,255,255,0.1)] mx-1"></div>
                  <button onClick={() => { const newName = prompt("Edit item name:", item); if (newName && newName.trim()) handleColorUpdate(item, newName.trim()); }} className="text-[#8e8e93] hover:text-white transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleColorUpdate(item, "", true)} className="text-[#8e8e93] hover:text-red-500 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
              {colors.length === 0 && <span className="text-[#555] text-[10px] uppercase">No items found.</span>}
            </div>
          </div>
        </section>
      )}

      {/* --- TAB: STOREFRONT MANAGER --- */}
      {!loading && activeTab === "storefront" && (
        <section className="animate-fade-in space-y-6">
          <div className="overflow-x-auto shadow-inner bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-lg custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse min-w-[800px]">
              <thead className="bg-[#050505] text-[#8e8e93]">
                <tr>
                  <th className="py-4 px-6 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">Collection</th>
                  <th className="py-4 px-6 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">Retail Price</th>
                  <th className="py-4 px-6 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">Website Visibility</th>
                  <th className="py-4 px-6 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">Product Badge</th>
                  <th className="py-4 px-6 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)]">After Discount Price</th>
                  <th className="py-4 px-6 font-bold tracking-widest uppercase text-[9px] border-b border-[rgba(255,255,255,0.06)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)] bg-[#0d0d0d]">
                {categories.map(c => {
                  const sf = storefront[c.category_id] || { visibility: "Live", badge: "None", discount: 0 };
                  const retailPrice = parseFloat(c.basePrice || "0");
                  const discountedPrice = retailPrice * (1 - sf.discount / 100);

                  return (
                    <tr key={c.category_id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                      <td className="py-4 px-6 text-white font-bold text-[11px] uppercase tracking-wide">{c.name}</td>
                      <td className="py-4 px-6 text-white font-mono text-[11px]">${retailPrice.toFixed(2)}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase ${sf.visibility === 'Live' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                          {sf.visibility}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-white font-bold text-[9px] uppercase tracking-wide">{sf.badge}</td>
                      <td className="py-4 px-6 text-white font-mono text-[11px]">
                        {sf.discount > 0 ? <span className="text-green-400">${discountedPrice.toFixed(2)} <span className="text-[8px] text-[#555] uppercase ml-1">(-{sf.discount}%)</span></span> : <span>${discountedPrice.toFixed(2)}</span>}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button onClick={() => handleOpenSfModal(c)} className="text-[#8e8e93] hover:text-white transition-colors px-3 py-1 bg-[#1f1f1f] border border-[rgba(255,255,255,0.05)] rounded text-[9px] font-bold tracking-widest uppercase">
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {categories.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-[#555] font-bold text-[10px] tracking-widest uppercase">No collections available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* --- STOREFRONT MODAL --- */}
      {sfModalOpen && sfEditingCat && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8 animate-fade-in overflow-y-auto mix-blend-normal">
          <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg p-8 w-full max-w-lg relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-sm font-bold tracking-[0.2em] text-white uppercase mb-8 border-b border-[rgba(255,255,255,0.04)] pb-4">
              Edit Collection Settings
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Collection Name (Read Only)</label>
                <input type="text" readOnly value={sfEditingCat.name} className="w-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.03)] rounded px-4 py-3 text-xs text-[#8e8e93] uppercase focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Website Visibility</label>
                <select value={sfForm.visibility} onChange={(e) => setSfForm({ ...sfForm, visibility: e.target.value as any })} className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-3 text-xs font-bold tracking-widest uppercase text-white cursor-pointer">
                  <option value="Live">Live</option>
                  <option value="Hidden">Hidden</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Product Badge</label>
                <select value={sfForm.badge} onChange={(e) => setSfForm({ ...sfForm, badge: e.target.value as any })} className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-3 text-xs font-bold tracking-widest uppercase text-white cursor-pointer">
                  <option value="None">None</option>
                  <option value="New">New</option>
                  <option value="Limited Stock">Limited Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Discount Percentage (%)</label>
                <input type="number" min="0" max="100" value={sfForm.discount} onChange={(e) => setSfForm({ ...sfForm, discount: parseInt(e.target.value) || 0 })} className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-3 text-xs font-mono text-white" />
              </div>
              <div className="pt-4 flex justify-end gap-4 mt-6 border-t border-[rgba(255,255,255,0.06)] pt-6">
                <button type="button" onClick={() => setSfModalOpen(false)} className="text-[#8e8e93] hover:text-white font-bold text-[10px] tracking-widest px-6 py-2.5 uppercase transition-colors">CANCEL</button>
                <button type="button" onClick={handleSaveSf} className="bg-white text-black font-bold text-[10px] tracking-widest px-6 py-2.5 rounded shadow-md hover:bg-gray-200 uppercase transition-colors">SAVE CHANGES</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= GLOBAL PRODUCT MODAL ================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8 animate-fade-in overflow-y-auto mix-blend-normal">
          <div className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] rounded-lg p-8 w-full max-w-4xl relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <button onClick={() => setIsProductModalOpen(false)} className="absolute top-6 right-6 text-[#555] hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-sm font-bold tracking-[0.2em] text-white uppercase mb-8 border-b border-[rgba(255,255,255,0.04)] pb-4">
              {prodForm.editInvId ? "EDIT INVENTORY VARIANT" : "ADD TO INVENTORY (VARIANT)"}
            </h2>

            <form onSubmit={handleSaveProductVariant} className="grid grid-cols-2 gap-x-8 gap-y-6">

              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Product Parent Name</label>
                <input required type="text" value={prodForm.parentName} onChange={(e) => setProdForm({ ...prodForm, parentName: e.target.value })} placeholder="Shared name for website grouping" className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-3 text-xs text-white uppercase" />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Collection Node</label>
                <select required value={prodForm.categoryId} onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })} className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-3 text-xs font-bold tracking-widest uppercase text-white cursor-pointer">
                  <option value="" disabled>SELECT A COLLECTION</option>
                  {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                </select>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Variant Color</label>
                <select required value={prodForm.color} onChange={(e) => setProdForm({ ...prodForm, color: e.target.value })} className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-3 text-xs font-bold tracking-widest uppercase text-white cursor-pointer">
                  <option value="" disabled>SELECT FROM PALETTE</option>
                  {colors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Variant Size</label>
                <select required value={prodForm.size} onChange={(e) => setProdForm({ ...prodForm, size: e.target.value })} className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-3 text-xs font-bold tracking-widest uppercase text-white cursor-pointer">
                  <option value="" disabled>SELECT SIZE</option>
                  {["OS", "XS", "S", "M", "L", "XL", "XXL"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Base price migrated out of Product Modal into Collection Node settings */}

              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Stock Quantity</label>
                <input required type="number" min="0" value={prodForm.quantity} onChange={(e) => setProdForm({ ...prodForm, quantity: e.target.value })} className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-3 text-xs font-mono text-white" />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Product Image (URL Upload)</label>
                <input required type="text" placeholder="https://example.com/image.jpg" value={prodForm.image} onChange={(e) => setProdForm({ ...prodForm, image: e.target.value })} className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-4 py-3 text-xs text-white" />
              </div>

              <div className="col-span-2 mt-4 pt-6 border-t border-[rgba(255,255,255,0.06)] flex justify-end gap-4">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="text-[#8e8e93] hover:text-white font-bold text-[10px] tracking-widest px-8 py-3 uppercase transition-colors">
                  CANCEL
                </button>
                <button type="submit" disabled={loading} className="bg-white text-black font-bold text-[10px] tracking-widest px-8 py-3 rounded shadow-md hover:bg-gray-200 uppercase transition-colors disabled:opacity-50">
                  {loading ? "SAVING..." : (prodForm.editInvId ? "SAVE CHANGES" : "ADD TO INVENTORY")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
