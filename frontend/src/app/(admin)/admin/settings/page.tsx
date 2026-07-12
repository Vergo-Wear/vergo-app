"use client";

export default function SettingsPage() {
  return <div className="space-y-8 select-none text-xs">
    <div><h2 className="text-sm font-bold tracking-widest text-white uppercase">SYSTEM SETTINGS</h2><p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">Database and environment configuration</p></div>
    <div className="admin-card p-6 space-y-4">
      <h3 className="text-[10px] font-bold tracking-widest uppercase text-white">CONFIGURATION STATUS</h3>
      <p className="text-[#8e8e93]">Operational settings are read from the backend environment and database. No editable settings records currently exist, so this screen does not display or save invented values.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-[#121212] p-4 rounded"><span className="text-[#8e8e93]">API</span><strong className="block mt-1">Configured by NEXT_PUBLIC_API_URL</strong></div><div className="bg-[#121212] p-4 rounded"><span className="text-[#8e8e93]">Stock thresholds</span><strong className="block mt-1">Stored per inventory record</strong></div></div>
    </div>
  </div>;
}
