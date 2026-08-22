"use client";

import React, { useState, KeyboardEvent, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Variant {
    id: string;
    sku: string;
    color: string;
    size: string;
    price_adjustment: number;
    quantity: number;
    image_url: string | null;
}

export default function ProductCreationPage() {
    const router = useRouter();

    // Section A: Parent Product Metadata
    const [productName, setProductName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [supplierId, setSupplierId] = useState("");
    const [basePrice, setBasePrice] = useState<number>(0);

    // Section B: Option Combinator
    const [colorInput, setColorInput] = useState("");
    const [colors, setColors] = useState<string[]>([]);
    const [sizeInput, setSizeInput] = useState("");
    const [sizes, setSizes] = useState<string[]>([]);

    // Section C: Dynamic Matrix
    const [variants, setVariants] = useState<Variant[]>([]);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Handlers for Tag Inputs
    const handleAddColor = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && colorInput.trim()) {
            e.preventDefault();
            const val = colorInput.trim();
            if (!colors.includes(val)) setColors([...colors, val]);
            setColorInput("");
        }
    };

    const handleRemoveColor = (col: string) => {
        setColors(colors.filter((c) => c !== col));
    };

    const handleAddSize = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && sizeInput.trim()) {
            e.preventDefault();
            const val = sizeInput.trim();
            if (!sizes.includes(val)) setSizes([...sizes, val]);
            setSizeInput("");
        }
    };

    const handleRemoveSize = (sz: string) => {
        setSizes(sizes.filter((s) => s !== sz));
    };

    // Matrix Generation: Cartesian Product
    const generateMatrix = () => {
        const newVariants: Variant[] = [];

        // Prefix fallback
        const prefix = productName.slice(0, 3).toUpperCase() || "PRD";

        if (colors.length > 0 && sizes.length > 0) {
            colors.forEach((color) => {
                sizes.forEach((size) => {
                    const sku = `${prefix}-${color.substring(0, 3).toUpperCase()}-${size.toUpperCase()}`;
                    // Preserve existing if possible
                    const existing = variants.find((v) => v.color === color && v.size === size);
                    newVariants.push(existing || {
                        id: `${color}-${size}`,
                        sku,
                        color,
                        size,
                        price_adjustment: 0,
                        quantity: 0,
                        image_url: null
                    });
                });
            });
        } else if (colors.length > 0) {
            colors.forEach((color) => {
                const sku = `${prefix}-${color.substring(0, 3).toUpperCase()}`;
                const existing = variants.find((v) => v.color === color && !v.size);
                newVariants.push(existing || {
                    id: `${color}`,
                    sku,
                    color,
                    size: "",
                    price_adjustment: 0,
                    quantity: 0,
                    image_url: null
                });
            });
        } else if (sizes.length > 0) {
            sizes.forEach((size) => {
                const sku = `${prefix}-${size.toUpperCase()}`;
                const existing = variants.find((v) => !v.color && v.size === size);
                newVariants.push(existing || {
                    id: `${size}`,
                    sku,
                    color: "",
                    size,
                    price_adjustment: 0,
                    quantity: 0,
                    image_url: null
                });
            });
        } else {
            // Base product with no options
            newVariants.push({
                id: "base",
                sku: `${prefix}-BASE`,
                color: "",
                size: "",
                price_adjustment: 0,
                quantity: 0,
                image_url: null
            });
        }

        setVariants(newVariants);
    };

    // Section C Handlers
    const handleVariantChange = (id: string, field: keyof Variant, value: string | number) => {
        setVariants((prev) => prev.map((v) => v.id === id ? { ...v, [field]: value } : v));
    };

    // Section D Actions
    const saveProduct = async (status: "hidden" | "live") => {
        const token = sessionStorage.getItem("vergo_access_token");
        if (!token) return setSaveError("Admin authentication is required.");
        if (!productName.trim() || variants.length === 0) return setSaveError("Add a product name and generate at least one variant.");
        setIsSaving(true); setSaveError(null);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/admin/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: productName, categoryId: categoryId || undefined, supplierId: supplierId || undefined, basePrice, status, variants: variants.map((variant) => ({ sku: variant.sku, color: variant.color, size: variant.size, priceAdjustment: variant.price_adjustment, quantity: variant.quantity, imageUrl: variant.image_url || undefined })) }),
        });
        setIsSaving(false);
        if (!response.ok) { const body = await response.json().catch(() => ({})); return setSaveError(Array.isArray(body.message) ? body.message.join(" ") : body.message || "Unable to save product."); }
        router.push("/admin/inventory");
    };
    const handleSaveHidden = () => void saveProduct("hidden");
    const handlePublish = () => void saveProduct("live");

    return (
        <div className="flex flex-col min-h-screen bg-[#050505] text-[#f5f5f7] font-sans">
            {/* Top Header */}
            <header className="h-16 border-b border-[rgba(255,255,255,0.06)] bg-[#0d0d0d] flex items-center justify-between px-8 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <Link href="/admin/inventory" className="text-[#8e8e93] hover:text-white transition-colors flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-xs font-bold tracking-widest uppercase">BACK TO INVENTORY</span>
                    </Link>
                    <div className="h-6 border-l border-[rgba(255,255,255,0.1)]"></div>
                    <h1 className="text-sm font-bold tracking-[0.2em] text-white uppercase">PRODUCT CREATION</h1>
                </div>
            </header>

            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar pb-32 max-w-[1600px] w-full mx-auto space-y-12">
                {/* Section A: Parent Product Metadata */}
                <section className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-lg p-6">
                    <h2 className="text-xs font-bold tracking-[0.2em] text-[#8e8e93] uppercase mb-6 flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)] pb-4">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Parent Product Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Product Name</label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                autoFocus
                                placeholder="e.g. Tactical Cargo Pants"
                                className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded py-2 px-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Base Price ($)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={basePrice || ""}
                                onChange={(e) => setBasePrice(parseFloat(e.target.value))}
                                placeholder="0.00"
                                className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded py-2 px-3 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Category</label>
                            <div className="relative">
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded py-2 pl-3 pr-8 text-sm text-white appearance-none focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors cursor-pointer"
                                >
                                    <option value="" disabled>Select Category</option>
                                    <option value="apparel">Apparel</option>
                                    <option value="footwear">Footwear</option>
                                    <option value="accessories">Accessories</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#8e8e93]">
                                    <svg className="fill-current w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Supplier</label>
                            <div className="relative">
                                <select
                                    value={supplierId}
                                    onChange={(e) => setSupplierId(e.target.value)}
                                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded py-2 pl-3 pr-8 text-sm text-white appearance-none focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors cursor-pointer"
                                >
                                    <option value="" disabled>Select Supplier</option>
                                    <option value="sup_1">Apex MFG</option>
                                    <option value="sup_2">Global Textiles</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#8e8e93]">
                                    <svg className="fill-current w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section B: Variant Combinator */}
                <section className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-lg p-6">
                    <h2 className="text-xs font-bold tracking-[0.2em] text-[#8e8e93] uppercase mb-6 flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] pb-4">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Option Combinator
                        </div>

                        <button
                            onClick={generateMatrix}
                            className="bg-white text-black hover:bg-gray-200 active:bg-gray-300 font-bold text-xs tracking-widest px-4 py-2 rounded-md transition-all shadow-md uppercase cursor-pointer"
                        >
                            Generate Variant Matrix
                        </button>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Colors Input */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Variant Colors</label>
                            <div className="min-h-[46px] p-2 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded focus-within:border-white focus-within:ring-1 focus-within:ring-white transition-all flex flex-wrap gap-2 items-center">
                                {colors.map((c) => (
                                    <span key={c} className="bg-[#1f1f1f] text-sm text-white px-2 py-1 rounded flex items-center gap-1 border border-[rgba(255,255,255,0.1)]">
                                        {c}
                                        <button onClick={() => handleRemoveColor(c)} className="hover:text-red-400 focus:outline-none">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={colorInput}
                                    onChange={(e) => setColorInput(e.target.value)}
                                    onKeyDown={handleAddColor}
                                    placeholder="Type color and press enter..."
                                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-white placeholder-[#555] min-w-[120px]"
                                />
                            </div>
                        </div>

                        {/* Sizes Input */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#8e8e93] tracking-widest uppercase mb-2">Variant Sizes</label>
                            <div className="min-h-[46px] p-2 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded focus-within:border-white focus-within:ring-1 focus-within:ring-white transition-all flex flex-wrap gap-2 items-center">
                                {sizes.map((s) => (
                                    <span key={s} className="bg-[#1f1f1f] text-sm text-white px-2 py-1 rounded flex items-center gap-1 border border-[rgba(255,255,255,0.1)]">
                                        {s}
                                        <button onClick={() => handleRemoveSize(s)} className="hover:text-red-400 focus:outline-none">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={sizeInput}
                                    onChange={(e) => setSizeInput(e.target.value)}
                                    onKeyDown={handleAddSize}
                                    placeholder="Type size and press enter..."
                                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-white placeholder-[#555] min-w-[120px]"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section C: Dynamic Matrix Grid */}
                {variants.length > 0 && (
                    <section className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.06)] rounded-lg p-6">
                        <h2 className="text-xs font-bold tracking-[0.2em] text-[#8e8e93] uppercase mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            Bulk Stock & Variant Matrix
                        </h2>
                        <div className="overflow-x-auto border border-[rgba(255,255,255,0.06)] rounded shadow-inner custom-scrollbar">
                            <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                                <thead className="bg-[#050505] text-[#8e8e93]">
                                    <tr>
                                        <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px] border-b border-[rgba(255,255,255,0.06)]">SKU</th>
                                        <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px] border-b border-[rgba(255,255,255,0.06)]">Attributes</th>
                                        <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px] border-b border-[rgba(255,255,255,0.06)]">Initial Qty</th>
                                        <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px] border-b border-[rgba(255,255,255,0.06)]">Price Adjust ($)</th>
                                        <th className="py-3 px-4 font-bold tracking-wider uppercase text-[10px] border-b border-[rgba(255,255,255,0.06)] text-center">Image Upload</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[rgba(255,255,255,0.04)] bg-[#0d0d0d]">
                                    {variants.map((v) => (
                                        <tr key={v.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                                            <td className="py-3 px-4 text-white font-mono text-xs">{v.sku}</td>
                                            <td className="py-3 px-4 text-[#8e8e93]">
                                                {v.color && <span className="bg-[#1f1f1f] text-white px-1.5 py-0.5 rounded text-[10px] mr-1 border border-[rgba(255,255,255,0.04)]">{v.color}</span>}
                                                {v.size && <span className="bg-[#1f1f1f] text-white px-1.5 py-0.5 rounded text-[10px] border border-[rgba(255,255,255,0.04)]">{v.size}</span>}
                                                {!v.color && !v.size && <span className="text-gray-500 italic">None</span>}
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={v.quantity}
                                                    onChange={(e) => handleVariantChange(v.id, "quantity", parseInt(e.target.value) || 0)}
                                                    className="w-20 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded py-1 px-2 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors"
                                                />
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={v.price_adjustment}
                                                    onChange={(e) => handleVariantChange(v.id, "price_adjustment", parseFloat(e.target.value) || 0)}
                                                    className="w-24 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded py-1 px-2 text-white font-mono text-xs focus:outline-none focus:border-white transition-colors"
                                                />
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button className="text-[#8e8e93] hover:text-white transition-colors p-2 bg-[#161616] border border-[rgba(255,255,255,0.05)] rounded m-auto block group-hover:bg-[#1f1f1f] cursor-pointer">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </main>

            {/* Section D: Global Action Bar */}
            <footer className="fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-[rgba(255,255,255,0.08)] py-4 px-8 z-50 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
                <div className="text-xs text-[#8e8e93] font-mono-meta flex gap-4">
                    {saveError && <span className="text-red-400">{saveError}</span>}
                    <span>{variants.length} Matrix Definitions</span>
                    <span>•</span>
                    <span>{variants.reduce((acc, curr) => acc + curr.quantity, 0)} Total Units</span>
                </div>
                <div className="flex gap-4">
                    <Link href="/admin/inventory" className="bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 text-[#8e8e93] hover:text-white font-bold text-[11px] tracking-widest px-6 py-3 rounded-md transition-all uppercase cursor-pointer">
                        Cancel
                    </Link>
                    <button
                        onClick={handleSaveHidden}
                        disabled={isSaving}
                        className="bg-[#121212] hover:bg-[#1f1f1f] border border-[rgba(255,255,255,0.2)] text-white font-bold text-[11px] tracking-widest px-6 py-3 rounded-md transition-all uppercase shadow-md cursor-pointer"
                    >
                        Save as Hidden
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={isSaving || !productName || variants.length === 0}
                        className="bg-white text-black hover:bg-[#eaeaea] disabled:bg-white/30 disabled:text-[#8e8e93] active:bg-[#d9d9d9] font-bold text-[11px] tracking-widest px-8 py-3 rounded-md transition-all uppercase shadow-md cursor-pointer"
                    >
                        {isSaving ? "Saving..." : "Set Product Live"}
                    </button>
                </div>
            </footer>
        </div>
    );
}
