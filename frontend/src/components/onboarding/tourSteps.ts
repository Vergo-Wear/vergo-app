import { Step } from "react-joyride";

export const customerSteps: Step[] = [
  {
    target: '[data-tour="customer-nav"]',
    title: "Welcome to VERGO",
    content: "Explore modern streetwear collections, drop announcements, and handcrafted apparel.",
    skipBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="customer-collections"]',
    title: "Curated Collections",
    content: "Browse our latest streetwear collections, seasonal releases, and limited edition drops.",
    placement: "bottom",
  },
  {
    target: '[data-tour="customer-about"]',
    title: "About Us",
    content: "Learn about our brand philosophy, design ethos, and the story behind VERGO Streetwear.",
    placement: "bottom",
  },
  {
    target: '[data-tour="customer-products"]',
    title: "Newly Released Items",
    content: "Discover available pieces with live inventory status and detailed sizing information.",
    placement: "top",
  },
  {
    target: '[data-tour="customer-cart"]',
    title: "Shopping Cart",
    content: "Review your selected items, apply promo codes, and proceed to checkout seamlessly.",
    placement: "bottom-end",
  },
  {
    target: '[data-tour="customer-notifications"]',
    title: "Notifications",
    content: "Receive real-time alerts on your order updates, delivery tracking, and drop releases.",
    placement: "bottom-end",
  },
  {
    target: '[data-tour="customer-account"]',
    title: "Account & Tracking",
    content: "Access your customer profile, order history, notification hub, and live order tracking.",
    placement: "bottom-end",
  },
];

export const employeeSteps: Step[] = [
  {
    target: '[data-tour="employee-nav-dashboard"]',
    title: "Employee Portal Overview",
    content: "Welcome to your staff dashboard! Monitor daily fulfillment metrics, active orders, and shift status.",
    skipBeacon: true,
    placement: "right",
  },
  {
    target: '[data-tour="employee-duty-toggle"]',
    title: "Duty & Break Status",
    content: "Toggle your status between 'On Duty' and 'On Break' to keep management and dispatch updated.",
    placement: "bottom",
  },
  {
    target: '[data-tour="employee-nav-orders"]',
    title: "Incoming Orders",
    content: "View incoming customer orders assigned to your branch for verification and item selection.",
    placement: "right",
  },
  {
    target: '[data-tour="employee-nav-prep"]',
    title: "Product Preparation",
    content: "Access product prep tasks, picking lists, quality checks, and packaging workflows.",
    placement: "right",
  },
  {
    target: '[data-tour="employee-nav-ready"]',
    title: "Ready Orders Queue",
    content: "Review orders marked ready for customer pickup or handover to delivery couriers.",
    placement: "right",
  },
  {
    target: '[data-tour="employee-nav-stock"]',
    title: "Stock & Inventory",
    content: "Inspect current stock counts, monitor size variations, and flag low inventory.",
    placement: "right",
  },
  {
    target: '[data-tour="employee-notifications"]',
    title: "Staff Notifications",
    content: "Receive real-time alerts for urgent orders, schedule updates, or admin announcements.",
    placement: "bottom",
  },
];

export const adminSteps: Step[] = [
  {
    target: '[data-tour="admin-nav-dashboard"]',
    title: "Admin Command Center",
    content: "Welcome to the Command Center. Track store performance, revenue metrics, and system activity.",
    skipBeacon: true,
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-orders"]',
    title: "Order Management",
    content: "Monitor customer orders, review uploaded payment proofs, and oversee order status progression.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-analytics"]',
    title: "Analytics & Performance",
    content: "Analyze sales metrics, order conversion rates, traffic growth, and business insights.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-earnings"]',
    title: "Earnings & Revenue",
    content: "View financial reports, revenue breakdowns, profit margins, and payout summaries.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-employees"]',
    title: "Employee Management",
    content: "Add employee accounts, assign positions, track duty status, and monitor staff activities.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-inventory"]',
    title: "Inventory & Catalog",
    content: "Manage the product catalog, add new releases, update stock levels, and organize categories.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-suppliers"]',
    title: "Suppliers",
    content: "Manage garment suppliers, vendor details, and incoming inventory shipments.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-branches"]',
    title: "Branch Network",
    content: "Manage branch locations, local warehouse nodes, and regional distribution.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-customization"]',
    title: "Web Modify & Customization",
    content: "Customize storefront banners, drop announcements, and website messaging in real time.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-delivery"]',
    title: "Delivery Management",
    content: "Configure courier service settings, regional delivery rates, and logistics rules.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-notifications"]',
    title: "Admin Alerts",
    content: "Stay informed with instant alerts for new orders, low stock warnings, and payment proof submissions.",
    placement: "bottom",
  },
];
