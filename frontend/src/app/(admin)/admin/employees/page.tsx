"use client";

import { useAdmin } from "../AdminContext";

export default function EmployeesPage() {
  const { employees } = useAdmin();
  return <div className="space-y-8 select-none text-xs">
    <div><h2 className="text-sm font-bold tracking-widest text-white uppercase">EMPLOYEE ROSTER</h2><p className="text-[10px] text-[#8e8e93] mt-1 uppercase font-semibold">Live employee and profile status records</p></div>
    <div className="admin-card p-6"><div className="space-y-4">
      {employees.map((employee) => <div key={employee.id} className="flex items-center justify-between p-4 bg-[#121212] border border-white/5 rounded">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">{employee.avatar}</div><div><h4 className="font-bold text-white">{employee.name}</h4><p className="text-[10px] text-[#8e8e93]">DATABASE ID: {employee.id}</p></div></div>
        <span className={employee.status === "ON SHIFT" ? "text-[#10b981]" : "text-[#8e8e93]"}>{employee.status === "ON SHIFT" ? "ACTIVE ACCOUNT" : "INACTIVE ACCOUNT"}</span>
      </div>)}
      {employees.length === 0 && <p className="py-8 text-center text-[#8e8e93]">No employee records in the database.</p>}
    </div></div>
  </div>;
}
