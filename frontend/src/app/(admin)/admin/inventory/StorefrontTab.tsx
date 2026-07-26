"use client";

import { useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import Image from "next/image";

interface StorefrontTabProps {
    categoryGroups: any[];
    onRefresh: () => void;
    setFeedback: (f: null | { type: "success" | "error"; message: string }) => void;
}

export function StorefrontTab({
    categoryGroups,
    onRefresh,
    setFeedback,
}: StorefrontTabProps) {
    const [editingGallery, setEditingGallery] = useState<any | null>(null);

    const updateVisibility = async (productId: string, status: string) => {
        try {
            const res = await authenticatedFetch(
                `/admin/products/${productId}/visibility`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status }),
                },
            );
            if (!res || !res.ok) throw new Error("Failed to update visibility");
            // Do not naturally call onRefresh() here because we are firing it once manually via bulk array resolving in the UI.
        } catch (err: any) {
            throw err;
        }
    };

    const openGalleryModal = async (group: any) => {
        setEditingGallery(group);
    };

    return (
        <section className="space-y-4 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#0a0a0a] px-4 py-4">
                <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#8e8e93]">
                        Storefront Presentation
                    </div>
                    <div className="mt-1 text-[11px] text-[#707070]">
                        Manage the frontend visibility of categorised products and preview their layout configurations.
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0a0a]">
                <table className="w-full text-left text-[11px]">
                    <thead className="border-b border-white/[0.06] bg-white/[0.02] text-[9px] uppercase tracking-widest text-[#666]">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Category Name</th>
                            <th className="px-4 py-3 font-semibold">Base Price</th>
                            <th className="px-4 py-3 font-semibold text-right">Total Stock</th>
                            <th className="px-4 py-3 font-semibold">Website Visibility</th>
                            <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] text-[#e5e5e5]">
                        {categoryGroups.map((group) => (
                            <tr key={group.categoryName} className="transition-colors hover:bg-white/[0.02]">
                                <td className="px-4 py-4">
                                    <div className="font-semibold text-white">{group.categoryName}</div>
                                    <div className="mt-0.5 text-[#666] line-clamp-1 max-w-sm">{group.description || "No description provided."}</div>
                                </td>
                                <td className="px-4 py-4 text-[11px]">Rs. {group.basePrice.toLocaleString()}</td>
                                <td className="px-4 py-4 text-right font-mono text-[11px] font-medium">{group.totalStock} Units</td>
                                <td className="px-4 py-4">
                                    <select
                                        value={group.status || "draft"}
                                        onChange={(e) => {
                                            Promise.all(group.productIds.map((id: string) => updateVisibility(id, e.target.value)))
                                                .then(() => {
                                                    setFeedback({ type: "success", message: `Visibility updated for all products in ${group.categoryName}.` });
                                                    onRefresh();
                                                })
                                                .catch(() => setFeedback({ type: "error", message: "Failed to update bulk visibility." }));
                                        }}
                                        className="rounded border border-white/[0.06] bg-black px-2 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                                    >
                                        <option value="draft">Unpublished (Draft)</option>
                                        <option value="active">Published (Live)</option>
                                        <option value="hidden">Hidden</option>
                                    </select>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <button
                                        onClick={() => openGalleryModal(group)}
                                        className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[#e5e5e5] transition-colors hover:bg-white/10"
                                    >
                                        Preview Config
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {categoryGroups.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-[10px] text-[#666] uppercase tracking-widest">
                                    No categorized products ready for storefront.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingGallery && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 px-4 py-10 backdrop-blur-sm">
                    <div className="relative w-full max-w-4xl rounded-lg border border-white/[0.06] bg-[#0a0a0a] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/[0.06] px-8 py-5">
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    {editingGallery.categoryName} <span className="ml-2 rounded bg-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-emerald-400">Preview</span>
                                </h2>
                                <p className="mt-1 text-[11px] text-[#8e8e93] max-w-2xl">{editingGallery.description || "No description."}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingGallery(null)}
                                className="text-[10px] font-bold text-[#666] uppercase tracking-widest transition-colors hover:text-white"
                            >
                                CLOSE
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
                            <div className="p-8 space-y-8 lg:col-span-2">
                                <div>
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-4">Base Price</div>
                                    <div className="font-mono text-xl text-white">Rs. {editingGallery.basePrice.toLocaleString()}</div>
                                </div>

                                <div>
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-4">Color Palette & Images</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {editingGallery.colors.map((color: any) => (
                                            <div key={color.name} className="flex flex-col gap-2 p-3 border border-white/5 bg-white/[0.02] rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
                                                    <span className="text-[11px] font-bold text-[#e5e5e5]">{color.name}</span>
                                                </div>
                                                <div className="relative aspect-[3/4] w-full rounded overflow-hidden border border-white/[0.05] bg-black">
                                                    {color.imageUrl ? (
                                                        <Image src={color.imageUrl} alt={color.name} fill className="object-cover" />
                                                    ) : (
                                                        <div className="flex w-full h-full items-center justify-center text-[8px] text-[#444]">NO IMAGE</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-[#050505] min-h-[300px]">
                                <div className="text-[9px] font-bold uppercase tracking-widest text-[#555] mb-6">Stock Availability</div>

                                <div className="space-y-6">
                                    {editingGallery.colors.map((color: any) => (
                                        <div key={color.name} className="border-b border-white/[0.05] pb-4 last:border-0">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-white mb-3">{color.name}</div>
                                            <div className="space-y-2">
                                                {color.sizes.map((size: any) => (
                                                    <div key={size.name} className="flex items-center justify-between">
                                                        <div className="font-mono text-[10px] text-[#8e8e93]">Size {size.name}</div>
                                                        <div className={`font-mono text-[10px] font-bold ${size.quantity > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                            {size.quantity} Units
                                                        </div>
                                                    </div>
                                                ))}
                                                {color.sizes.length === 0 && (
                                                    <div className="text-[9px] text-[#555] italic">No active variants recorded.</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="pt-2">
                                        <div className="flex items-center justify-between text-white border-t border-white/10 pt-4">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#e5e5e5]">Total Stock</div>
                                            <div className="font-mono text-sm font-bold">{editingGallery.totalStock} Units</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
