import React from "react";
import Link from "next/link";
import Image from "next/image";
import "@/styles/employee.css";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="employee-layout-wrapper">
      <header className="employee-header">
        <div className="employee-logo">
          <Image
            src="/images/wlogo.png"
            alt="VERGO"
            width={100}
            height={30}
            style={{ objectFit: "contain", height: "auto" }}
          />
          <span>STAFF</span>
        </div>

        <nav className="employee-nav">
          <Link href="/employee" className="employee-nav-link active">
            DASHBOARD
          </Link>
          <Link href="/employee/tasks" className="employee-nav-link">
            TASKS
          </Link>
          <Link href="/employee/transfers" className="employee-nav-link">
            TRANSFERS
          </Link>
        </nav>

        <div>
          <span className="employee-user-badge">EM-409 (STATION_A)</span>
        </div>
      </header>

      <main className="employee-main">{children}</main>
    </div>
  );
}
