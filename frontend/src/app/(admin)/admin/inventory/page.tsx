"use client";

import React, { useState } from "react";
import { useAdmin } from "../AdminContext";

export default function InventoryPage() {
  const { inventory, restockItem, setTransferModalOpen, addNotification } = useAdmin();
  const [skuFilter, setSkuFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Form states to add new inventory/SKU entry
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("NODE_LA_01");
  const [newQty, setNewQty] = useState(10);
  const [newStatus, setNewStatus] = useState<"VERIFYING" | "PENDING" | "PROCESSING" | "SHIPPED">("VERIFYING");

  const uniqueSkus = Array.from(new Set(inventory.map((item) => item.sku)));
  const allNodes = ["NODE_LA_01", "NODE_NY_04", "NODE_TK_01", "NODE_LDN_02", "NODE_PAR_01", "NODE_NY_02"];

  // Filter items
  const filteredItems = inventory.filter((item) => {
    const matchesSearch =
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());

    const matchesSku = skuFilter === "all" || item.sku === skuFilter;
    return matchesSearch && matchesSku;
  });

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku || !newName) {
      addNotification("Please provide a SKU code and item name.", "error");
      return;
    }

    // Check if node/sku already exists in state
    const existingIndex = inventory.findIndex(
      (item) => item.sku.toUpperCase() === newSku.toUpperCase() && item.location === newLocation
    );

    if (existingIndex !== -1) {
      // Just restock the existing one
      restockItem(inventory[existingIndex].sku, newLocation, newQty);
    } else {
      // Since it's simulated, we push it to state
      inventory.push({
        sku: newSku.toUpperCase(),
        name: newName,
        location: newLocation,
        inStock: newQty,
        status: newStatus,
      });
      addNotification(`Successfully registered ${newSku.toUpperCase()} at ${newLocation}.`, "success");
    }

    // Clear form
    setNewSku("");
    setNewName("");
    setNewQty(10);
  };

  return (
    <div className="space-y-8 select-none text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold tracking-widest text-white uppercase">INVENTORY MANAGEMENT</h2>
          <p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">Track and adjust stock levels across global storage nodes</p>
        </div>
        <button
          onClick={() => setTransferModalOpen(true)}
          className="bg-white text-black hover:bg-[#eaeaea] font-bold text-xs tracking-wider px-4 py-2 rounded-md transition-all uppercase cursor-pointer"
        >
          INITIATE TRANSFER
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory list - 2 Columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="admin-card p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">STOCK ENTRIES</h3>
              
              {/* Search & Filter */}
              <div className="flex gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Filter stock entries..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-1.5 text-xs text-white placeholder-[#555] focus:outline-none w-full md:w-48 font-mono-meta"
                />
                <select
                  value={skuFilter}
                  onChange={(e) => setSkuFilter(e.target.value)}
                  className="bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer font-mono-meta"
                >
                  <option value="all">ALL SKUs</option>
                  {uniqueSkus.map((sku) => (
                    <option key={sku} value={sku}>
                      {sku}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={`${item.sku}-${item.location}`}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[#121212] border border-[rgba(255,255,255,0.03)] rounded hover:border-[rgba(255,255,255,0.08)] transition-all gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-mono-meta">{item.sku}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider border border-[rgba(255,255,255,0.08)] bg-white/5 uppercase text-[#8e8e93]">
                        {item.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#8e8e93] font-medium mt-1 uppercase">{item.name}</div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-right">
                      <div className="text-[10px] text-[#8e8e93] font-bold tracking-wider uppercase mb-0.5">LOCATION</div>
                      <div className="font-mono-meta font-bold text-white text-xs">{item.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#8e8e93] font-bold tracking-wider uppercase mb-0.5">QUANTITY</div>
                      <div className="font-mono-meta font-bold text-white text-xs">{item.inStock} units</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => restockItem(item.sku, item.location, 50)}
                        className="bg-white/5 hover:bg-white/10 text-white font-semibold px-3 py-1.5 rounded transition-all border border-white/5 cursor-pointer"
                      >
                        +50
                      </button>
                      <button
                        onClick={() => restockItem(item.sku, item.location, 100)}
                        className="bg-white/5 hover:bg-white/10 text-white font-semibold px-3 py-1.5 rounded transition-all border border-white/5 cursor-pointer"
                      >
                        +100
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add SKU Entry Form - 1 Column */}
        <div className="lg:col-span-1">
          <div className="admin-card p-6">
            <div className="mb-6 pb-2 border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">REGISTER STOCK</h3>
            </div>

            <form onSubmit={handleAddNewItem} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  SKU CODE
                </label>
                <input
                  type="text"
                  placeholder="e.g. VGO-HOOD-BLK-XL"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white placeholder-[#555] focus:outline-none font-mono-meta"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  ITEM NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Heavy Cotton Hoodie (Black)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white placeholder-[#555] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                  STORAGE NODE
                </label>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white focus:outline-none cursor-pointer font-mono-meta"
                >
                  {allNodes.map((node) => (
                    <option key={node} value={node}>
                      {node}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    INITIAL QTY
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newQty}
                    onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white focus:outline-none font-mono-meta"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8e8e93] tracking-wider uppercase mb-1.5">
                    STATUS
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded px-3 py-2 text-white focus:outline-none cursor-pointer"
                  >
                    <option value="VERIFYING">VERIFYING</option>
                    <option value="PENDING">PENDING</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="SHIPPED">SHIPPED</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-white text-black hover:bg-[#eaeaea] font-bold tracking-widest py-2.5 rounded transition-all uppercase cursor-pointer"
              >
                REGISTER STOCK ENTRY
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
