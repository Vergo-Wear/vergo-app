"use client";

import React, { useState, useMemo } from "react";
import { useAdmin } from "../AdminContext";

// --- TYPES ---
interface OrderCustomerDetails {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
}

interface OrderShippingDetails {
    receiver_name: string;
    phone: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    district: string;
    postal_code: string;
}

interface PaymentProof {
    status: "Pending Upload" | "Pending Verification" | "Approved" | "Rejected" | "Expired";
    receipt_url?: string;
    uploaded_at?: string;
    expires_at?: string;
    rejected_reason?: string;
    acted_by?: string;
    acted_at?: string;
}

interface Order {
    order_id: string;
    payment_method: "Cash On Delivery" | "Bank Transfer";
    order_status: "Pending" | "Ready to Process" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Rejected";
    total_amount: number;
    confirmation_status: "Pending" | "Confirmed" | "Rejected";
    order_date: string;
    payment_proofs?: PaymentProof;
    order_customer_details: OrderCustomerDetails;
    order_shipping_details: OrderShippingDetails;
    items: { name: string; quantity: number; price: number }[];
    delivery_fee: number;
}

// --- MOCK DATA ---
const MOCK_ORDERS: Order[] = [
    {
        order_id: "ORD-99321",
        payment_method: "Cash On Delivery",
        order_status: "Pending",
        total_amount: 15400,
        confirmation_status: "Pending",
        order_date: "2026-07-19T09:30:00Z",
        order_customer_details: { first_name: "John", last_name: "Doe", email: "john@example.com", phone: "+94 77 123 4567" },
        order_shipping_details: { receiver_name: "John Doe", phone: "+94 77 123 4567", address_line_1: "123 Galle Rd", address_line_2: "Apt 4B", city: "Colombo 03", district: "Colombo", postal_code: "00300" },
        items: [{ name: "Oversized Graphic Tee", quantity: 2, price: 6500 }],
        delivery_fee: 2400
    },
    {
        order_id: "ORD-99322",
        payment_method: "Bank Transfer",
        order_status: "Pending",
        total_amount: 8500,
        confirmation_status: "Pending",
        order_date: "2026-07-18T14:20:00Z",
        payment_proofs: { status: "Pending Upload", expires_at: "2026-07-20T14:20:00Z" },
        order_customer_details: { first_name: "Sarah", last_name: "Smith", email: "sarah@example.com", phone: "+94 71 987 6543" },
        order_shipping_details: { receiver_name: "Sarah Smith", phone: "+94 71 987 6543", address_line_1: "45 Kandy Rd", address_line_2: "", city: "Peradeniya", district: "Kandy", postal_code: "20400" },
        items: [{ name: "Minimalist Hoodie", quantity: 1, price: 8000 }],
        delivery_fee: 500
    },
    {
        order_id: "ORD-99323",
        payment_method: "Bank Transfer",
        order_status: "Pending",
        total_amount: 22000,
        confirmation_status: "Pending",
        order_date: "2026-07-18T10:15:00Z",
        payment_proofs: { status: "Pending Verification", receipt_url: "/placeholder-receipt.jpg", uploaded_at: "2026-07-18T11:00:00Z" },
        order_customer_details: { first_name: "Michael", last_name: "Tan", email: "michael.t@example.com", phone: "+94 76 555 4444" },
        order_shipping_details: { receiver_name: "Michael Tan", phone: "+94 76 555 4444", address_line_1: "88 Beach Rd", address_line_2: "", city: "Negombo", district: "Gampaha", postal_code: "11500" },
        items: [{ name: "Cargo Pants", quantity: 1, price: 12000 }, { name: "Basic Blank Tee", quantity: 2, price: 4500 }],
        delivery_fee: 1000
    },
    {
        order_id: "ORD-99324",
        payment_method: "Bank Transfer",
        order_status: "Processing",
        total_amount: 14500,
        confirmation_status: "Confirmed",
        order_date: "2026-07-17T16:45:00Z",
        payment_proofs: { status: "Approved", receipt_url: "/placeholder-receipt.jpg", uploaded_at: "2026-07-17T17:30:00Z", acted_by: "Marcus V.", acted_at: "2026-07-17T18:00:00Z" },
        order_customer_details: { first_name: "David", last_name: "Perera", email: "david.p@example.com", phone: "+94 70 111 2222" },
        order_shipping_details: { receiver_name: "David Perera", phone: "+94 70 111 2222", address_line_1: "12 Temple Rd", address_line_2: "", city: "Matara", district: "Matara", postal_code: "81000" },
        items: [{ name: "Zip-up Jacket", quantity: 1, price: 14000 }],
        delivery_fee: 500
    },
    {
        order_id: "ORD-99325",
        payment_method: "Bank Transfer",
        order_status: "Rejected",
        total_amount: 9000,
        confirmation_status: "Rejected",
        order_date: "2026-07-17T08:10:00Z",
        payment_proofs: { status: "Rejected", receipt_url: "/placeholder-receipt.jpg", uploaded_at: "2026-07-17T09:00:00Z", rejected_reason: "Blurred receipt image, unable to read transaction ID.", acted_by: "Jane D.", acted_at: "2026-07-17T09:30:00Z" },
        order_customer_details: { first_name: "Emily", last_name: "W", email: "emily@example.com", phone: "+94 77 999 8888" },
        order_shipping_details: { receiver_name: "Emily W", phone: "+94 77 999 8888", address_line_1: "54 Hill St", address_line_2: "", city: "Nuwara Eliya", district: "Nuwara Eliya", postal_code: "22000" },
        items: [{ name: "Knit Sweater", quantity: 1, price: 8500 }],
        delivery_fee: 500
    },
    {
        order_id: "ORD-99326",
        payment_method: "Bank Transfer",
        order_status: "Cancelled",
        total_amount: 12000,
        confirmation_status: "Pending",
        order_date: "2026-07-15T11:20:00Z",
        payment_proofs: { status: "Expired", expires_at: "2026-07-17T11:20:00Z" },
        order_customer_details: { first_name: "Liam", last_name: "Fernando", email: "liam@example.com", phone: "+94 72 333 4444" },
        order_shipping_details: { receiver_name: "Liam Fernando", phone: "+94 72 333 4444", address_line_1: "90 Main St", address_line_2: "", city: "Galle", district: "Galle", postal_code: "80000" },
        items: [{ name: "Track Pants", quantity: 1, price: 11000 }],
        delivery_fee: 1000
    },
    {
        order_id: "ORD-99327",
        payment_method: "Cash On Delivery",
        order_status: "Cancelled",
        total_amount: 7500,
        confirmation_status: "Pending",
        order_date: "2026-07-14T10:00:00Z",
        order_customer_details: { first_name: "Anna", last_name: "Silva", email: "anna@example.com", phone: "+94 78 555 6666" },
        order_shipping_details: { receiver_name: "Anna Silva", phone: "+94 78 555 6666", address_line_1: "33 Lake View", address_line_2: "", city: "Kurunegala", district: "Kurunegala", postal_code: "60000" },
        items: [{ name: "V-Neck Tee", quantity: 2, price: 3500 }],
        delivery_fee: 500
    },
];
// --- ICONS ---
const Icons = {
    BadgeInfo: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    CheckCircle: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Clock: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    XCircle: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    AlertTriangle: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    Ban: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
    Receipt: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    Eye: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    Close: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
    Check: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
    Cross: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
};


export default function OrdersDashboard() {
    const { searchQuery, addNotification } = useAdmin();

    const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);

    // Filters State
    const [statusFilter, setStatusFilter] = useState("All");
    const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
    const [dateRangeFilter, setDateRangeFilter] = useState("All");
    const [sortOption, setSortOption] = useState("Newest First");

    // Modals & Drawers State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [receiptModalOrder, setReceiptModalOrder] = useState<Order | null>(null);
    const [shippingModalOrder, setShippingModalOrder] = useState<Order | null>(null);
    const [customerDrawerOrder, setCustomerDrawerOrder] = useState<Order | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ action: 'confirmCOD' | 'rejectCOD' | 'approvePayment' | 'rejectPayment', orderId: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Admin Verification Form States inside Dialog
    const [rejectReason, setRejectReason] = useState("");
    const [adminNotes, setAdminNotes] = useState("");

    // --- ACTIONS ---
    const handleConfirmCOD = (orderId: string) => {
        setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, confirmation_status: "Confirmed", order_status: "Ready to Process" } : o));
        addNotification(`COD Confirmed for ${orderId}`, "success");
        setSelectedOrder((prev: any) => prev && prev.order_id === orderId ? { ...prev, confirmation_status: "Confirmed", order_status: "Ready to Process" } : prev);
    };

    const handleRejectCOD = (orderId: string) => {
        setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, confirmation_status: "Rejected", order_status: "Rejected" } : o));
        addNotification(`COD Rejected for ${orderId}. Notification queued for customer. Email trigger prepared.`, "success");
        setSelectedOrder((prev: any) => prev && prev.order_id === orderId ? { ...prev, confirmation_status: "Rejected", order_status: "Rejected" } : prev);
    };

    const handleApprovePayment = (orderId: string) => {
        setOrders(prev => prev.map(o => o.order_id === orderId && o.payment_proofs ? {
            ...o,
            payment_proofs: { ...o.payment_proofs, status: "Approved", acted_by: "Admin", acted_at: new Date().toISOString() },
            order_status: "Ready to Process"
        } : o));
        addNotification(`Bank Transfer Approved for ${orderId}`, "success");
        setSelectedOrder(prev => prev && prev.order_id === orderId ? {
            ...prev,
            payment_proofs: { ...prev.payment_proofs!, status: "Approved", acted_by: "Admin", acted_at: new Date().toISOString() },
            order_status: "Ready to Process"
        } : prev);
    };

    const handleRejectPayment = (orderId: string) => {
        setOrders(prev => prev.map(o => o.order_id === orderId && o.payment_proofs ? {
            ...o,
            payment_proofs: { ...o.payment_proofs, status: "Rejected", rejected_reason: rejectReason, acted_by: "Admin", acted_at: new Date().toISOString() },
            order_status: "Rejected"
        } : o));
        addNotification(`Bank Transfer Rejected for ${orderId}. Notification queued for customer. Email trigger prepared.`, "success");
        setSelectedOrder(prev => prev && prev.order_id === orderId ? {
            ...prev,
            payment_proofs: { ...prev.payment_proofs!, status: "Rejected", rejected_reason: rejectReason, acted_by: "Admin", acted_at: new Date().toISOString() },
            order_status: "Rejected"
        } : prev);
    };

    const confirmActionProcessor = () => {
        if (!confirmAction) return;
        const { action, orderId } = confirmAction;

        setIsProcessing(true);
        setTimeout(() => {
            if (action === 'confirmCOD') handleConfirmCOD(orderId);
            else if (action === 'rejectCOD') handleRejectCOD(orderId);
            else if (action === 'approvePayment') handleApprovePayment(orderId);
            else if (action === 'rejectPayment') handleRejectPayment(orderId);

            setIsProcessing(false);
            setConfirmAction(null);
            setRejectReason("");
            setAdminNotes("");
        }, 1000);
    };


    // --- DERIVATIONS ---
    const getDerivedStatus = (order: Order) => {
        if (order.order_status === "Cancelled") return "Cancelled";
        if (order.payment_method === "Cash On Delivery" && order.confirmation_status === "Pending") return "Waiting COD";
        if (order.payment_method === "Bank Transfer") {
            if (order.payment_proofs?.status) return order.payment_proofs.status;
            return "Pending Upload"; // Fallback
        }
        return "Approved"; // Fallback
    };

    const statusConfig: Record<string, { color: string, bg: string, border: string, icon: any }> = {
        "Waiting COD": { color: "text-[#3b82f6]", bg: "bg-[#3b82f6]/15", border: "border-[#3b82f6]/30", icon: Icons.Clock },
        "Pending Upload": { color: "text-[#8e8e93]", bg: "bg-[#252525]", border: "border-white/5", icon: Icons.AlertTriangle },
        "Pending Verification": { color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/15", border: "border-[#f59e0b]/30", icon: Icons.BadgeInfo },
        "Approved": { color: "text-[#10b981]", bg: "bg-[#10b981]/15", border: "border-[#10b981]/30", icon: Icons.CheckCircle },
        "Rejected": { color: "text-[#ef4444]", bg: "bg-[#ef4444]/15", border: "border-[#ef4444]/30", icon: Icons.XCircle },
        "Expired": { color: "text-[#a855f7]", bg: "bg-[#a855f7]/15", border: "border-[#a855f7]/30", icon: Icons.Clock },
        "Cancelled": { color: "text-[#8e8e93]", bg: "bg-[#161616]", border: "border-white/10", icon: Icons.Ban },
    };

    const filteredOrders = useMemo(() => {
        let result = [...orders];
        if (statusFilter !== "All") result = result.filter(o => getDerivedStatus(o) === statusFilter);
        if (paymentMethodFilter !== "All") result = result.filter(o => o.payment_method === paymentMethodFilter);
        if (searchQuery) {
            const sq = searchQuery.toLowerCase();
            result = result.filter(o =>
                o.order_id.toLowerCase().includes(sq) ||
                o.order_customer_details.first_name.toLowerCase().includes(sq) ||
                o.order_customer_details.last_name.toLowerCase().includes(sq) ||
                o.order_customer_details.phone.includes(sq)
            );
        }
        result.sort((a, b) => {
            if (sortOption === "Newest First") return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
            if (sortOption === "Oldest First") return new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
            if (sortOption === "Highest Amount") return b.total_amount - a.total_amount;
            if (sortOption === "Lowest Amount") return a.total_amount - b.total_amount;
            return 0;
        });
        return result;
    }, [orders, statusFilter, paymentMethodFilter, sortOption, searchQuery]);

    const statCounts = useMemo(() => {
        const counts: Record<string, number> = { "Waiting COD": 0, "Pending Upload": 0, "Pending Verification": 0, "Approved": 0, "Rejected": 0, "Expired": 0, "Cancelled": 0 };
        orders.forEach(o => { const s = getDerivedStatus(o); if (counts[s] !== undefined) counts[s]++; });
        return counts;
    }, [orders]);


    return (
        <div className="space-y-8 select-none">

            {/* PAGE TITLE */}
            <div className="mb-8">
                <h2 className="text-xl font-bold tracking-widest text-white uppercase mb-2">Order & Payment Management</h2>
                <p className="text-xs text-[#8e8e93] font-medium tracking-wide">
                    Manage customer orders, verify bank transfer payments, approve Cash on Delivery orders, and monitor the complete order workflow.
                </p>
            </div>

            {/* CONFIRM ACTION POPUP */}
            {confirmAction && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-[#0d0d0d] border border-white/10 shadow-2xl rounded-xl overflow-hidden animate-slide-in">
                        <div className="px-6 py-4 border-b border-white/10">
                            <h2 className="text-white font-bold tracking-widest uppercase text-sm">
                                {confirmAction.action === 'approvePayment' && "Approve Payment?"}
                                {confirmAction.action === 'rejectPayment' && "Reject Payment?"}
                                {confirmAction.action === 'confirmCOD' && "Confirm COD?"}
                                {confirmAction.action === 'rejectCOD' && "Reject COD?"}
                            </h2>
                        </div>
                        <div className="p-6">
                            {(confirmAction.action === 'approvePayment' || confirmAction.action === 'confirmCOD') ? (
                                <p className="text-[#8e8e93] text-xs mb-4">
                                    {confirmAction.action === 'approvePayment'
                                        ? "This payment receipt has been verified. The order will become Ready to Process and will be available for employee processing."
                                        : "This will mark the Cash on Delivery request as confirmed. The order will become Ready to Process."
                                    }
                                </p>
                            ) : (
                                <p className="text-[#ef4444] text-xs mb-4 font-bold border border-[#ef4444]/20 bg-[#ef4444]/5 p-3 rounded">
                                    Reserved stock will be released automatically.
                                </p>
                            )}

                            {(confirmAction.action === 'rejectPayment' || confirmAction.action === 'rejectCOD') && (
                                <div className="space-y-4 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">Reject Reason <span className="text-[#ef4444]">*</span></label>
                                        <input
                                            type="text"
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Required for rejection..."
                                            className="w-full bg-[#161616] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">Admin Notes</label>
                                        <textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            placeholder="Internal notes..."
                                            className="w-full bg-[#161616] border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-white/30 h-16 resize-none custom-scrollbar"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-4">
                                <button disabled={isProcessing} onClick={() => setConfirmAction(null)} className="disabled:opacity-50 flex-1 bg-transparent border border-white/10 hover:bg-white/5 text-white font-bold px-4 py-2.5 rounded transition-colors uppercase text-[10px] tracking-widest">
                                    Cancel
                                </button>
                                <button
                                    disabled={isProcessing || ((confirmAction.action === 'rejectPayment' || confirmAction.action === 'rejectCOD') && !rejectReason.trim())}
                                    onClick={confirmActionProcessor}
                                    className={`flex-1 font-bold px-4 py-2.5 rounded transition-colors uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${(confirmAction.action === 'rejectPayment' || confirmAction.action === 'rejectCOD')
                                        ? "bg-[#ef4444] hover:bg-[#dc2626] text-white"
                                        : "bg-[#10b981] hover:bg-[#059669] text-black"
                                        }`}
                                >
                                    {isProcessing ? "Processing..." : (confirmAction.action === 'rejectPayment' || confirmAction.action === 'rejectCOD') ? "Reject" : "Approve"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TOP SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.keys(statCounts).map((status) => {
                    const config = statusConfig[status];
                    const isActive = statusFilter === status;
                    const Icon = config.icon;
                    return (
                        <div
                            key={status}
                            onClick={() => setStatusFilter(isActive ? "All" : status)}
                            className={`p-4 rounded-xl border border-[rgba(255,255,255,0.04)] shadow-md shadow-black/20 cursor-pointer transition-all ${isActive ? "bg-[#161616] ring-1 ring-white/20" : "bg-[#0d0d0d] hover:bg-[#121212]"
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2 rounded-lg ${config.bg} ${config.color} border ${config.border}`}>
                                    <Icon />
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-1">{status}</p>
                                <h3 className={`text-2xl font-bold font-mono-meta ${config.color}`}>{statCounts[status]}</h3>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* FILTER BAR */}
            <div className="bg-[#0d0d0d] p-4 rounded-xl border border-[rgba(255,255,255,0.04)] flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">Status Filter</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-[#161616] border border-white/5 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        {Object.keys(statCounts).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">Payment Method</label>
                    <select
                        value={paymentMethodFilter}
                        onChange={(e) => setPaymentMethodFilter(e.target.value)}
                        className="w-full bg-[#161616] border border-white/5 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 cursor-pointer"
                    >
                        <option value="All">All Methods</option>
                        <option value="Cash On Delivery">Cash On Delivery</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">Date Range</label>
                    <select
                        value={dateRangeFilter}
                        onChange={(e) => setDateRangeFilter(e.target.value)}
                        className="w-full bg-[#161616] border border-white/5 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 cursor-pointer"
                    >
                        <option value="All">All Time</option>
                        <option value="Today">Today</option>
                        <option value="Last 7 Days">Last 7 Days</option>
                        <option value="Last 30 Days">Last 30 Days</option>
                        <option value="Custom">Custom</option>
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-2">Sort By</label>
                    <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="w-full bg-[#161616] border border-white/5 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 cursor-pointer"
                    >
                        <option value="Newest First">Newest First</option>
                        <option value="Oldest First">Oldest First</option>
                        <option value="Highest Amount">Highest Amount</option>
                        <option value="Lowest Amount">Lowest Amount</option>
                    </select>
                </div>
            </div>

            {/* MAIN TABLE */}
            <div className="bg-[#0d0d0d] rounded-xl border border-[rgba(255,255,255,0.04)] overflow-hidden shadow-lg">
                <div className="overflow-x-auto custom-scrollbar">
                    {filteredOrders.length === 0 ? (
                        <div className="py-24 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-[#8e8e93]">
                                <Icons.AlertTriangle />
                            </div>
                            <h3 className="text-white font-bold tracking-widest uppercase text-sm mb-2">No orders found</h3>
                            <p className="text-xs text-[#8e8e93]">Try adjusting your filters or search query.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs whitespace-nowrap border-collapse min-w-full">
                            <thead>
                                <tr className="bg-[#121212] border-b border-[rgba(255,255,255,0.04)] text-[#8e8e93]">
                                    <th className="px-3 py-3 font-bold tracking-wider text-[10px] uppercase">Order ID / Date</th>
                                    <th className="px-3 py-3 font-bold tracking-wider text-[10px] uppercase">Customer</th>
                                    <th className="px-3 py-3 font-bold tracking-wider text-[10px] uppercase">Payment</th>
                                    <th className="px-3 py-3 font-bold tracking-wider text-[10px] uppercase">Status Logics</th>
                                    <th className="px-3 py-3 font-bold tracking-wider text-[10px] uppercase">Receipt</th>
                                    <th className="px-3 py-3 font-bold tracking-wider text-[10px] uppercase text-right">Amount</th>
                                    <th className="px-3 py-3 font-bold tracking-wider text-[10px] uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgba(255,255,255,0.02)]">
                                {filteredOrders.map((order) => {
                                    const status = getDerivedStatus(order);
                                    const config = statusConfig[status];

                                    return (
                                        <tr key={order.order_id} className="hover:bg-white/[0.02] transition-colors">
                                            {/* Order ID & Date */}
                                            <td className="px-3 py-3">
                                                <div className="text-white font-bold font-mono-meta">{order.order_id}</div>
                                                <div className="text-[#8e8e93] text-[10px] mt-1">{new Date(order.order_date).toLocaleString()}</div>
                                            </td>

                                            {/* Customer */}
                                            <td className="px-3 py-3">
                                                <div
                                                    className="font-semibold text-white hover:text-white/80 cursor-pointer underline underline-offset-2 decoration-white/20"
                                                    onClick={() => setCustomerDrawerOrder(order)}
                                                >
                                                    {order.order_customer_details.first_name} {order.order_customer_details.last_name}
                                                </div>
                                                <div className="text-[#8e8e93] text-[10px] mt-1">{order.order_customer_details.phone}</div>
                                            </td>

                                            {/* Payment Method */}
                                            <td className="px-3 py-3">
                                                <div className="text-[#8e8e93] font-medium uppercase text-[10px] tracking-wide bg-white/5 inline-block px-2 py-1 rounded">
                                                    {order.payment_method}
                                                </div>
                                            </td>

                                            {/* Status Badges */}
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide border uppercase ${config.bg} ${config.color} ${config.border}`}>
                                                        {status}
                                                    </span>
                                                    {order.order_status !== "Pending" && (
                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded tracking-wide border uppercase bg-white/5 text-[#8e8e93] border-white/10">
                                                            Order: {order.order_status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Receipt */}
                                            <td className="px-3 py-3">
                                                {order.payment_proofs?.receipt_url ? (
                                                    <button
                                                        onClick={() => setReceiptModalOrder(order)}
                                                        className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded transition-colors font-bold text-[9px] uppercase tracking-widest"
                                                    >
                                                        <Icons.Receipt /> View Receipt
                                                    </button>
                                                ) : (
                                                    <span className="text-[#555] text-[10px] uppercase tracking-wider font-semibold">No Receipt</span>
                                                )}
                                            </td>

                                            {/* Amount */}
                                            <td className="px-3 py-3 text-right">
                                                <div className="text-white font-bold font-mono-meta">{order.total_amount.toLocaleString()} LKR</div>
                                                {order.delivery_fee > 0 && <div className="text-[#8e8e93] text-[9px] mt-1">+{order.delivery_fee.toLocaleString()} LKR Shipping</div>}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-3 text-right">
                                                <div className="flex justify-end gap-2 items-center">
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        title="View Details"
                                                        className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                                                    >
                                                        <Icons.Eye />
                                                    </button>

                                                    {status === "Waiting COD" && (
                                                        <>
                                                            <button
                                                                onClick={() => setConfirmAction({ action: 'confirmCOD', orderId: order.order_id })}
                                                                title="Confirm COD"
                                                                className="flex items-center justify-center w-8 h-8 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] rounded transition-colors border border-[#10b981]/30"
                                                            >
                                                                <Icons.CheckCircle />
                                                            </button>
                                                            <button
                                                                onClick={() => { setRejectReason(""); setConfirmAction({ action: 'rejectCOD', orderId: order.order_id }); }}
                                                                title="Reject COD"
                                                                className="flex items-center justify-center w-8 h-8 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] rounded transition-colors border border-[#ef4444]/30"
                                                            >
                                                                <Icons.Cross />
                                                            </button>
                                                        </>
                                                    )}

                                                    {status === "Pending Verification" && (
                                                        <>
                                                            <button onClick={() => setConfirmAction({ action: 'approvePayment', orderId: order.order_id })} title="Approve Payment" className="flex items-center justify-center w-8 h-8 bg-[#10b981] hover:bg-[#059669] text-black rounded transition-colors">
                                                                <Icons.Check />
                                                            </button>
                                                            <button onClick={() => { setRejectReason(""); setConfirmAction({ action: 'rejectPayment', orderId: order.order_id }); }} title="Reject Payment" className="flex items-center justify-center w-8 h-8 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded transition-colors">
                                                                <Icons.Cross />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>


            {/* DETAILS RIGHT DRAWER */}
            {selectedOrder && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={() => setSelectedOrder(null)} />
                    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#0d0d0d] border-l border-white/10 shadow-2xl z-[110] flex flex-col animate-slide-in select-text">

                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-white font-bold tracking-widest uppercase text-sm">Order Details</h2>
                                <p className="text-[#8e8e93] text-[10px] font-mono-meta mt-1">{selectedOrder.order_id}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-[#8e8e93] hover:text-white transition-colors">
                                <Icons.Close />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                            {/* Order Information */}
                            <section>
                                <h3 className="text-xs font-bold text-[#8e8e93] tracking-widest uppercase mb-4 border-b border-white/5 pb-2">Order Summary</h3>
                                <div className="grid grid-cols-2 gap-4 text-xs font-mono-meta">
                                    <div>
                                        <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">Date</p>
                                        <p className="text-white">{new Date(selectedOrder.order_date).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">Status</p>
                                        <p className="text-white uppercase">{selectedOrder.order_status}</p>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">Ordered Items</p>
                                    {selectedOrder.items.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center bg-[#161616] p-3 rounded">
                                            <div>
                                                <p className="text-white font-medium text-xs">{item.name}</p>
                                                <p className="text-[#8e8e93] text-[10px] mt-1 font-mono-meta">Qty: {item.quantity} Ã— {item.price.toLocaleString()} LKR</p>
                                            </div>
                                            <p className="text-white font-bold font-mono-meta">{(item.quantity * item.price).toLocaleString()} LKR</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                                    <div className="flex justify-between text-xs text-[#8e8e93] font-mono-meta">
                                        <span>Subtotal</span>
                                        <span>{(selectedOrder.total_amount - selectedOrder.delivery_fee).toLocaleString()} LKR</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-[#8e8e93] font-mono-meta">
                                        <span>Delivery Fee</span>
                                        <span>{selectedOrder.delivery_fee.toLocaleString()} LKR</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-white font-bold font-mono-meta pt-2">
                                        <span>Total</span>
                                        <span className="text-[#10b981]">{selectedOrder.total_amount.toLocaleString()} LKR</span>
                                    </div>
                                </div>
                            </section>

                            {/* Customer Details */}
                            <section>
                                <h3 className="text-xs font-bold text-[#8e8e93] tracking-widest uppercase mb-4 border-b border-white/5 pb-2">Customer Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">Full Name</p>
                                        <p className="text-white font-semibold">{selectedOrder.order_customer_details.first_name} {selectedOrder.order_customer_details.last_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">Contact</p>
                                        <p className="text-white font-mono-meta">{selectedOrder.order_customer_details.phone}</p>
                                        <p className="text-[#8e8e93] mt-0.5 truncate">{selectedOrder.order_customer_details.email}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Shipping Details */}
                            <section>
                                <h3 className="text-xs font-bold text-[#8e8e93] tracking-widest uppercase mb-4 border-b border-white/5 pb-2">Shipping Details</h3>
                                <div className="bg-[#121212] p-4 rounded border border-white/5 text-xs space-y-1">
                                    <p className="text-white font-bold mb-2">{selectedOrder.order_shipping_details.receiver_name} <span className="text-[#8e8e93] ml-2 font-normal font-mono-meta">{selectedOrder.order_shipping_details.phone}</span></p>
                                    <p className="text-[#8e8e93]">{selectedOrder.order_shipping_details.address_line_1}</p>
                                    {selectedOrder.order_shipping_details.address_line_2 && <p className="text-[#8e8e93]">{selectedOrder.order_shipping_details.address_line_2}</p>}
                                    <p className="text-[#8e8e93]">{selectedOrder.order_shipping_details.city}, {selectedOrder.order_shipping_details.district} {selectedOrder.order_shipping_details.postal_code}</p>
                                </div>
                            </section>

                            {/* Payment Details */}
                            <section>
                                <h3 className="text-xs font-bold text-[#8e8e93] tracking-widest uppercase mb-4 border-b border-white/5 pb-2">Payment Information</h3>
                                <div className="grid grid-cols-2 gap-4 text-xs font-mono-meta">
                                    <div>
                                        <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">Method</p>
                                        <p className="text-white uppercase">{selectedOrder.payment_method}</p>
                                    </div>
                                    <div>
                                        <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">Status</p>
                                        <p className={`font-bold uppercase ${statusConfig[getDerivedStatus(selectedOrder)].color}`}>{getDerivedStatus(selectedOrder)}</p>
                                    </div>
                                </div>

                                {selectedOrder.payment_proofs && (
                                    <div className="mt-4 bg-[#121212] p-4 rounded border border-white/5">
                                        <p className="text-[#555] uppercase tracking-wider text-[9px] mb-2">Receipt Preview</p>
                                        {selectedOrder.payment_proofs.uploaded_at && <p className="text-xs text-[#8e8e93] font-mono-meta mb-1">Uploaded: {new Date(selectedOrder.payment_proofs.uploaded_at).toLocaleString()}</p>}
                                        {selectedOrder.payment_proofs.expires_at && <p className="text-xs text-[#8e8e93] font-mono-meta mb-3">Expires: {new Date(selectedOrder.payment_proofs.expires_at).toLocaleString()}</p>}
                                        {selectedOrder.payment_proofs.receipt_url && (
                                            <button
                                                onClick={() => setReceiptModalOrder(selectedOrder)}
                                                className="bg-white/10 hover:bg-white/20 text-white text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded transition-colors w-full flex justify-center items-center gap-2"
                                            >
                                                <Icons.Eye /> Preview Receipt
                                            </button>
                                        )}
                                    </div>
                                )}
                            </section>

                            {/* Admin Log History (replaces old verification form) */}
                            {((selectedOrder.payment_method === "Bank Transfer" && (getDerivedStatus(selectedOrder) === "Approved" || getDerivedStatus(selectedOrder) === "Rejected")) ||
                                (selectedOrder.payment_method === "Cash On Delivery" && selectedOrder.confirmation_status !== "Pending")) && (
                                    <section className={`border p-5 rounded-xl mt-6 relative overflow-hidden ${getDerivedStatus(selectedOrder) === "Approved" || selectedOrder.confirmation_status === "Confirmed"
                                        ? "bg-[#121212] border-[#10b981]/10"
                                        : "bg-[#121212] border-[#ef4444]/10"
                                        }`}>
                                        <div className={`absolute top-0 left-0 w-1 h-full ${getDerivedStatus(selectedOrder) === "Approved" || selectedOrder.confirmation_status === "Confirmed"
                                            ? "bg-[#10b981]"
                                            : "bg-[#ef4444]"
                                            }`} />

                                        <h3 className="text-xs font-bold text-white tracking-widest uppercase mb-4 flex items-center gap-2">
                                            {getDerivedStatus(selectedOrder) === "Approved" || selectedOrder.confirmation_status === "Confirmed"
                                                ? <Icons.CheckCircle /> : <Icons.XCircle />
                                            }
                                            {getDerivedStatus(selectedOrder) === "Approved" || selectedOrder.confirmation_status === "Confirmed"
                                                ? "Approval Verification Log" : "Rejection Verification Log"
                                            }
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4 text-xs font-mono-meta mb-3 bg-[#161616] p-3 rounded">
                                            <div>
                                                <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">Final Status</p>
                                                <div className="inline-block mt-0.5">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide border uppercase ${getDerivedStatus(selectedOrder) === "Approved" || selectedOrder.confirmation_status === "Confirmed"
                                                        ? statusConfig["Approved"].bg + " " + statusConfig["Approved"].color + " " + statusConfig["Approved"].border
                                                        : statusConfig["Rejected"].bg + " " + statusConfig["Rejected"].color + " " + statusConfig["Rejected"].border
                                                        }`}>
                                                        {getDerivedStatus(selectedOrder) === "Approved" || selectedOrder.confirmation_status === "Confirmed" ? "Approved Badge" : "Rejected Badge"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                                                    {getDerivedStatus(selectedOrder) === "Approved" || selectedOrder.confirmation_status === "Confirmed" ? "Approved By" : "Rejected By"}
                                                </p>
                                                <p className="text-white">Admin</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">
                                                    {getDerivedStatus(selectedOrder) === "Approved" || selectedOrder.confirmation_status === "Confirmed" ? "Approved Time" : "Rejected Time"}
                                                </p>
                                                <p className="text-white">
                                                    {selectedOrder.payment_proofs?.acted_at
                                                        ? new Date(selectedOrder.payment_proofs.acted_at).toLocaleString()
                                                        : new Date().toLocaleString()
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {selectedOrder.payment_proofs?.rejected_reason && (
                                            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 p-3 rounded mt-3">
                                                <p className="text-[#ef4444] uppercase tracking-wider text-[9px] mb-1 font-bold">Reject Reason</p>
                                                <p className="text-[#fca5a5] text-xs font-medium">{selectedOrder.payment_proofs.rejected_reason}</p>
                                            </div>
                                        )}
                                    </section>
                                )}

                            <div className="bg-[#121212] p-4 rounded text-center text-[10px] text-[#555] uppercase tracking-widest mt-8">
                                End of Record
                            </div>

                        </div>
                    </div>
                </>
            )}

            {/* RECEIPT IMAGE MODAL */}
            {receiptModalOrder && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className="absolute top-6 right-6">
                        <button onClick={() => setReceiptModalOrder(null)} className="text-white/50 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                            <Icons.Close />
                        </button>
                    </div>
                    <div className="bg-[#121212] p-2 rounded-xl border border-white/10 flex flex-col items-center">
                        <div className="w-[450px] bg-[#161616] rounded-t-lg pt-4 px-6 border-b border-white/5 text-center">
                            <h3 className="text-white font-bold tracking-widest uppercase text-sm">Receipt Preview</h3>
                            <div className="text-[10px] text-[#8e8e93] font-mono-meta mt-2 mb-4 grid grid-cols-2 gap-2 text-left">
                                <div>
                                    <span className="text-[#555] uppercase tracking-wider">Method:</span>
                                    <p className="text-white mt-0.5">{receiptModalOrder.payment_method}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[#555] uppercase tracking-wider">Status:</span>
                                    <p className="text-white mt-0.5">{getDerivedStatus(receiptModalOrder)}</p>
                                </div>
                                <div className="col-span-2 border-t border-white/5 pt-2 mt-1">
                                    <span className="text-[#555] uppercase tracking-wider">Uploaded:</span>
                                    <p className="text-white mt-0.5">
                                        {receiptModalOrder.payment_proofs?.uploaded_at ? new Date(receiptModalOrder.payment_proofs.uploaded_at).toLocaleString() : new Date().toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="w-[450px] h-[500px] rounded-b-lg bg-[#161616] flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="text-center z-10 flex flex-col items-center justify-center text-[#555]">
                                <Icons.Receipt />
                                <p className="text-xs text-[#8e8e93] mt-4 font-mono-meta">IMAGE NOT FOUND</p>
                                <p className="text-[10px] text-[#555] mt-1">{receiptModalOrder.payment_proofs?.receipt_url}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOMER INFO DRAWER */}
            {customerDrawerOrder && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={() => setCustomerDrawerOrder(null)} />
                    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-[#0d0d0d] border-l border-white/10 shadow-2xl z-[110] flex flex-col animate-slide-in select-text">
                        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
                            <h2 className="text-white font-bold tracking-widest uppercase text-sm">Customer Info</h2>
                            <button onClick={() => setCustomerDrawerOrder(null)} className="text-[#8e8e93] hover:text-white transition-colors">
                                <Icons.Close />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-white/10 flex flex-col justify-center items-center text-white font-bold text-xl uppercase border border-white/5 shadow-inner">
                                    {customerDrawerOrder.order_customer_details.first_name[0]}{customerDrawerOrder.order_customer_details.last_name[0]}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{customerDrawerOrder.order_customer_details.first_name} {customerDrawerOrder.order_customer_details.last_name}</h3>
                                    <p className="text-xs text-[#10b981] font-mono-meta mt-1">Verified Customer</p>
                                </div>
                            </div>

                            <div className="space-y-4 bg-[#121212] p-4 rounded-xl border border-white/5">
                                <div>
                                    <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">Email Address</p>
                                    <p className="text-white text-sm">{customerDrawerOrder.order_customer_details.email}</p>
                                </div>
                                <div>
                                    <p className="text-[#555] uppercase tracking-wider text-[9px] mb-1">Phone Number</p>
                                    <p className="text-white text-sm font-mono-meta">{customerDrawerOrder.order_customer_details.phone}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

        </div>
    );
}
