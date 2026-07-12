"use client";

import Link from "next/link";
import { useAdmin } from "../AdminContext";

export default function InventoryPage() {
  const { inventory, restockItem } = useAdmin();
  return <div className="space-y-8 select-none text-xs">
    <div className="flex justify-between items-center"><div><h2 className="text-sm font-bold tracking-widest text-white uppercase">INVENTORY</h2><p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">Live variant stock records</p></div><Link href="/product-creation" className="bg-white text-black px-4 py-2 rounded font-bold">Create Product</Link></div>
    <div className="admin-card p-6 overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[#8e8e93]"><th>SKU</th><th>PRODUCT</th><th>BRANCH</th><th>QUANTITY</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
      {inventory.map((item) => <tr key={item.inventoryId || `${item.sku}-${item.location}`} className="border-t border-white/5"><td className="py-4 font-mono-meta">{item.sku}</td><td>{item.name}</td><td>{item.location}</td><td>{item.inStock}</td><td>{item.status}</td><td><button className="bg-white text-black px-3 py-1 rounded" onClick={() => restockItem(item.sku, item.location, 1)}>+1 Stock</button></td></tr>)}
      {inventory.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-[#8e8e93]">No inventory records in the database.</td></tr>}
    </tbody></table></div>
  </div>;
}
