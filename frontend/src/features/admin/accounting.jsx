import { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Calendar,
  Layers,
  FileText,
  Search,
  Filter,
  Eye,
  PieChart,
  ArrowUpRight,
  Receipt,
  Wallet,
  Pill,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Common Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";

// Data Imports & Auth Hook
import { requestedOrders as initialOrders } from "../../data/orders";
import { suppliers } from "../../data/supplier";
import { facilities } from "../../data/facility";
import useAuth from "../../hooks/useAuth";

function Accounting() {
  const { facility: authFacility } = useAuth();

  // Automatically detect current active facility
  const currentFacility = useMemo(() => {
    if (authFacility?.id || authFacility?.name) {
      const matched = facilities.find(
        (f) =>
          f.id === authFacility.id ||
          f.name?.toLowerCase() === authFacility.name?.toLowerCase(),
      );
      if (matched) return matched;
      return authFacility;
    }
    try {
      const stored = localStorage.getItem("currentFacility");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id || parsed?.name) {
          const matched = facilities.find(
            (f) =>
              f.id === parsed.id ||
              f.name?.toLowerCase() === parsed.name?.toLowerCase(),
          );
          if (matched) return matched;
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return facilities[0] || { id: 1, name: "Exakt Central General Hospital" };
  }, [authFacility]);

  const currentFacilityName =
    currentFacility?.name || "Exakt Central General Hospital";
  const currentFacilityId = currentFacility?.id || 1;

  const [orders] = useState(initialOrders);

  // Filter orders that reference the current active facility
  const currentFacilityOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.targetFacility || "").toLowerCase() ===
        currentFacilityName.toLowerCase(),
    );
  }, [orders, currentFacilityName]);

  // Unique suppliers delivering to this active facility
  const facilitySuppliers = useMemo(() => {
    const set = new Set(
      currentFacilityOrders.map((o) => o.supplierName).filter(Boolean),
    );
    return Array.from(set);
  }, [currentFacilityOrders]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Medication Spend Card Pagination State
  const [medicationCurrentPage, setMedicationCurrentPage] = useState(1);
  const medicationItemsPerPage = 4;

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Financial Metrics Calculation (Facility Scoped)
  const metrics = useMemo(() => {
    let approvedSpend = 0;
    let pendingSpend = 0;
    let approvedCount = 0;
    let pendingCount = 0;

    currentFacilityOrders.forEach((o) => {
      const cost = Number(o.estimatedCost || o.totalCost || 0);
      if (o.status === "Approved") {
        approvedSpend += cost;
        approvedCount += 1;
      } else if (o.status === "Pending Approval") {
        pendingSpend += cost;
        pendingCount += 1;
      }
    });

    const totalRequisitionSpend = approvedSpend + pendingSpend;
    const avgOrderValue =
      currentFacilityOrders.length > 0
        ? totalRequisitionSpend / currentFacilityOrders.length
        : 0;

    return {
      approvedSpend,
      pendingSpend,
      totalRequisitionSpend,
      approvedCount,
      pendingCount,
      avgOrderValue,
      totalOrders: currentFacilityOrders.length,
    };
  }, [currentFacilityOrders]);

  // 2. Spend by Medication Breakdown (Facility Scoped)
  const medicationSpendBreakdown = useMemo(() => {
    const medMap = {};

    currentFacilityOrders.forEach((o) => {
      const cost = Number(o.estimatedCost || o.totalCost || 0);
      const key = o.brandName || o.genericName || o.sku;
      if (!medMap[key]) {
        medMap[key] = {
          name: key,
          brandName: o.brandName,
          genericName: o.genericName,
          sku: o.sku,
          approvedSpend: 0,
          pendingSpend: 0,
          totalSpend: 0,
          orderCount: 0,
        };
      }

      medMap[key].totalSpend += cost;
      if (o.status === "Approved") {
        medMap[key].approvedSpend += cost;
      } else if (o.status === "Pending Approval") {
        medMap[key].pendingSpend += cost;
      }
      medMap[key].orderCount += 1;
    });

    return Object.values(medMap).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [currentFacilityOrders]);

  // Paginated Medications for Analytics Card
  const medicationTotalPages =
    Math.ceil(medicationSpendBreakdown.length / medicationItemsPerPage) || 1;
  const paginatedMedications = useMemo(() => {
    const startIndex = (medicationCurrentPage - 1) * medicationItemsPerPage;
    return medicationSpendBreakdown.slice(
      startIndex,
      startIndex + medicationItemsPerPage,
    );
  }, [medicationSpendBreakdown, medicationCurrentPage, medicationItemsPerPage]);

  // 3. Top Supplier Accounts Payable Breakdown (Facility Scoped)
  const supplierSpendBreakdown = useMemo(() => {
    const supplierMap = {};

    currentFacilityOrders.forEach((o) => {
      const cost = Number(o.estimatedCost || o.totalCost || 0);
      if (!supplierMap[o.supplierName]) {
        supplierMap[o.supplierName] = {
          name: o.supplierName,
          totalSpend: 0,
          approvedSpend: 0,
          orderCount: 0,
        };
      }
      supplierMap[o.supplierName].totalSpend += cost;
      if (o.status === "Approved") {
        supplierMap[o.supplierName].approvedSpend += cost;
      }
      supplierMap[o.supplierName].orderCount += 1;
    });

    return Object.values(supplierMap).sort(
      (a, b) => b.totalSpend - a.totalSpend,
    );
  }, [currentFacilityOrders]);

  // 4. Filtered Ledger Orders (Facility Scoped)
  const filteredOrders = useMemo(() => {
    return currentFacilityOrders.filter((order) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(q) ||
        order.sku.toLowerCase().includes(q) ||
        order.brandName.toLowerCase().includes(q) ||
        order.genericName.toLowerCase().includes(q) ||
        order.supplierName.toLowerCase().includes(q) ||
        order.targetFacility.toLowerCase().includes(q) ||
        order.requestedBy.toLowerCase().includes(q);

      const matchesSupplier =
        selectedSupplier === "ALL" || order.supplierName === selectedSupplier;

      const matchesStatus =
        selectedStatus === "ALL" || order.status === selectedStatus;

      return matchesSearch && matchesSupplier && matchesStatus;
    });
  }, [currentFacilityOrders, searchQuery, selectedSupplier, selectedStatus]);

  // 5. Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const formatCurrency = (val) => {
    return `₱${Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      "PO Number",
      "Requested Date",
      "Brand Name",
      "Generic Name",
      "SKU",
      "Quantity",
      "Total Cost (PHP)",
      "Supplier",
      "Destination Facility",
      "Status",
      "Requested By",
      "Approved By",
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${o.requestedDate}"`,
      `"${o.brandName}"`,
      `"${o.genericName}"`,
      `"${o.sku}"`,
      `"${o.quantity}"`,
      `"${o.estimatedCost || o.totalCost || 0}"`,
      `"${o.supplierName}"`,
      `"${o.targetFacility}"`,
      `"${o.status}"`,
      `"${o.requestedBy}"`,
      `"${o.approvedBy || "N/A"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const facilitySlug = currentFacilityName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_");
    link.setAttribute(
      "download",
      `exakt_financial_ledger_${facilitySlug}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span>Accounting & Procurement Spend</span>
            </h1>
            {/* Facility Scope Indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentFacilityName}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Financial ledger, purchase commitments, and vendor accounts payable
            for{" "}
            <span className="font-semibold text-gray-700">
              {currentFacilityName}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary text-xs shadow-xs flex items-center gap-1.5"
            title="Export financial ledger to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Financial Ledger</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Approved Expenditure */}
        <Card className="p-5 border border-emerald-200/80 shadow-xs hover:border-emerald-300 transition-all bg-linear-to-br from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Approved Spend (YTD)
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-700 mt-1.5 font-mono">
                {formatCurrency(metrics.approvedSpend)}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-1 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> {metrics.approvedCount}{" "}
                Dispatched Orders
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-xs">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 2. Pending Commitments Pipeline */}
        <Card className="p-5 border border-amber-200/80 shadow-xs hover:border-amber-300 transition-all bg-linear-to-br from-white to-amber-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Pending Commitments
              </p>
              <h3 className="text-2xl font-extrabold text-amber-700 mt-1.5 font-mono">
                {formatCurrency(metrics.pendingSpend)}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mt-1 bg-amber-100/70 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> {metrics.pendingCount} Awaiting
                Sign-off
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 border border-amber-200 shadow-xs">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 3. Total Requisitions Value */}
        <Card className="p-5 border border-gray-200 shadow-xs hover:border-gray-300 transition-all bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Pipeline Value
              </p>
              <h3 className="text-2xl font-extrabold text-gray-900 mt-1.5 font-mono">
                {formatCurrency(metrics.totalRequisitionSpend)}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 mt-1">
                {metrics.totalOrders} total purchase requests
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 4. Average Order Value (AOV) */}
        <Card className="p-5 border border-purple-200/80 shadow-xs hover:border-purple-300 transition-all bg-linear-to-br from-white to-purple-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700">
                Average Requisition Value
              </p>
              <h3 className="text-2xl font-extrabold text-purple-700 mt-1.5 font-mono">
                {formatCurrency(metrics.avgOrderValue)}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 mt-1 bg-purple-100/70 px-2 py-0.5 rounded-full">
                <Receipt className="w-3 h-3" /> Average Cost per PO
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 border border-purple-200 shadow-xs">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Spend Analytics: 2-Column Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Spend by Medication Breakdown */}
        <Card className="lg:col-span-6 p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-blue-600" />
                  <span>Medication Expenditure Ranking</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Procurement cost distribution by medication for{" "}
                  {currentFacilityName}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4 min-h-48">
              {paginatedMedications.length > 0 ? (
                paginatedMedications.map((med) => {
                  const percentage =
                    metrics.totalRequisitionSpend > 0
                      ? Math.round(
                          (med.totalSpend / metrics.totalRequisitionSpend) *
                            100,
                        )
                      : 0;

                  return (
                    <div key={med.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-gray-800">
                            {med.brandName || med.name}
                          </span>
                          <span className="text-[11px] text-gray-400 ml-1.5">
                            ({med.genericName} • {med.orderCount}{" "}
                            {med.orderCount === 1 ? "order" : "orders"})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-gray-900">
                            {formatCurrency(med.totalSpend)}
                          </span>
                          <span className="text-[11px] text-gray-500 font-semibold ml-1.5">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{
                            width: `${
                              metrics.totalRequisitionSpend > 0
                                ? (med.approvedSpend /
                                    metrics.totalRequisitionSpend) *
                                  100
                                : 0
                            }%`,
                          }}
                          title={`Approved: ${formatCurrency(
                            med.approvedSpend,
                          )}`}
                        />
                        <div
                          className="bg-amber-400 h-full transition-all"
                          style={{
                            width: `${
                              metrics.totalRequisitionSpend > 0
                                ? (med.pendingSpend /
                                    metrics.totalRequisitionSpend) *
                                  100
                                : 0
                            }%`,
                          }}
                          title={`Pending: ${formatCurrency(med.pendingSpend)}`}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                  <Pill className="w-8 h-8 mb-2 text-gray-300" />
                  <p className="text-xs font-semibold text-gray-500">
                    No medication spend recorded for this facility
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Approved Spend</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Pending Approvals</span>
              </span>
            </div>

            {medicationTotalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setMedicationCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={medicationCurrentPage === 1}
                  className="btn-secondary py-1 px-2 text-xs"
                  aria-label="Previous medication page"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-xs font-semibold text-gray-700 px-1">
                  Page {medicationCurrentPage} of {medicationTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setMedicationCurrentPage((prev) =>
                      Math.min(medicationTotalPages, prev + 1),
                    )
                  }
                  disabled={medicationCurrentPage === medicationTotalPages}
                  className="btn-secondary py-1 px-2 text-xs"
                  aria-label="Next medication page"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Right Column: Top Supplier Accounts Payable */}
        <Card className="lg:col-span-6 p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-600" />
                  <span>Vendor Accounts & Spend Ranking</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Consolidated expenditure per pharmaceutical supplier for{" "}
                  {currentFacilityName}
                </p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 pt-1">
              {supplierSpendBreakdown.length > 0 ? (
                supplierSpendBreakdown.slice(0, 4).map((supplier, idx) => (
                  <div
                    key={supplier.name}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 shrink-0">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">
                          {supplier.name}
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          {supplier.orderCount}{" "}
                          {supplier.orderCount === 1
                            ? "Purchase Order"
                            : "Purchase Orders"}{" "}
                          Placed
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-gray-900">
                        {formatCurrency(supplier.totalSpend)}
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                        Approved: {formatCurrency(supplier.approvedSpend)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                  <Truck className="w-8 h-8 mb-2 text-gray-300" />
                  <p className="text-xs font-semibold text-gray-500">
                    No vendor transactions for this facility
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing top {Math.min(4, supplierSpendBreakdown.length)} vendors
              by procurement volume
            </span>
          </div>
        </Card>
      </div>

      {/* Main Table: Purchase Order Financial Ledger */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/30">
          <div className="w-full md:w-80">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              onClear={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              placeholder="Search PO #, SKU, drug, vendor, notes..."
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Supplier Filter */}
            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setCurrentPage(1);
              }}
              className="input py-2 text-xs w-full sm:w-48"
            >
              <option value="ALL">All Suppliers / Vendors</option>
              {facilitySuppliers.map((supplierName) => (
                <option key={supplierName} value={supplierName}>
                  {supplierName}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="input py-2 text-xs w-full sm:w-40"
            >
              <option value="ALL">All Financial Statuses</option>
              <option value="Approved">Approved / Authorized</option>
              <option value="Pending Approval">Pending Authorization</option>
              <option value="Rejected">Denied / Cancelled</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  PO Reference & Date
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Medication & SKU
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Vendor & Requester
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Total Amount (₱)
                </th>
                <th scope="col" className="px-6 py-3.5 text-center">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Voucher
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => {
                  const cost = Number(
                    order.estimatedCost || order.totalCost || 0,
                  );

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      {/* PO Reference & Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-700 text-xs bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded inline-block">
                          {order.orderNumber}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{order.requestedDate}</span>
                        </div>
                      </td>

                      {/* Medication & SKU */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-xs">
                          {order.brandName}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {order.genericName} • {order.dosage}
                        </div>
                        <div className="font-mono text-[10px] text-gray-400 mt-0.5">
                          {order.sku}
                        </div>
                      </td>

                      {/* Vendor & Requester */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                          <Truck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate max-w-40">
                            {order.supplierName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate max-w-40">
                            {order.requestedBy}
                          </span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono">
                        <div className="font-extrabold text-gray-900 text-sm">
                          {formatCurrency(cost)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          ~
                          {formatCurrency(
                            order.quantity > 0 ? cost / order.quantity : 0,
                          )}
                          /unit
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            order.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : order.status === "Pending Approval"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {order.status === "Approved" && (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {order.status === "Pending Approval" && (
                            <Clock className="w-3 h-3" />
                          )}
                          {order.status === "Rejected" && (
                            <XCircle className="w-3 h-3" />
                          )}
                          {order.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(order)}
                          className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                          title="View Financial Breakdown Voucher"
                          aria-label="View Financial Breakdown Voucher"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <DollarSign className="w-9 h-9 mx-auto mb-2 text-gray-300" />
                    <p className="text-base font-semibold text-gray-800">
                      No purchase order ledger records found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      No financial records found for {currentFacilityName}. Try
                      adjusting your search query or status filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {filteredOrders.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: FINANCIAL VOUCHER BREAKDOWN                       */}
      {/* ======================================================== */}
      <Modal
        isOpen={isModalOpen && Boolean(selectedOrder)}
        onClose={handleCloseModal}
        title="Purchase Order Financial Voucher"
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-4">
            {/* Header Voucher Banner */}
            <div className="p-4 rounded-xl bg-linear-to-r from-emerald-50 to-teal-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-900 text-base">
                    {selectedOrder.orderNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedOrder.status === "Approved"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Requisition submitted on {selectedOrder.requestedDate} by{" "}
                  <span className="font-semibold text-gray-900">
                    {selectedOrder.requestedBy}
                  </span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-emerald-800 font-bold">
                  Total Requisition Amount
                </p>
                <p className="text-xl font-mono font-extrabold text-emerald-900 mt-0.5">
                  {formatCurrency(
                    selectedOrder.estimatedCost || selectedOrder.totalCost,
                  )}
                </p>
              </div>
            </div>

            {/* Grid Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Item Info */}
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
                <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">
                  Medication Line Item
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Brand Name:</span>
                    <span className="font-bold text-gray-900">
                      {selectedOrder.brandName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Generic:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedOrder.genericName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dosage & Form:</span>
                    <span className="text-gray-700">
                      {selectedOrder.dosage} ({selectedOrder.dosageForm})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">SKU Reference:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {selectedOrder.sku}
                    </span>
                  </div>
                </div>
              </div>

              {/* Disbursement & Vendor */}
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
                <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">
                  Vendor & Destination Accounting
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vendor:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedOrder.supplierName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Destination:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedOrder.targetFacility}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Quantity Ordered:</span>
                    <span className="font-bold text-gray-900">
                      {selectedOrder.quantity.toLocaleString()} units
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Imputed Unit Cost:</span>
                    <span className="font-mono font-semibold text-gray-800">
                      ~
                      {formatCurrency(
                        selectedOrder.quantity > 0
                          ? (selectedOrder.estimatedCost ||
                              selectedOrder.totalCost ||
                              0) / selectedOrder.quantity
                          : 0,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval Info if Approved */}
            {selectedOrder.approvedBy && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                <p className="font-bold text-[10px] uppercase tracking-wider mb-0.5">
                  Financial Authorization Verified
                </p>
                <p>
                  Authorized for disbursement by{" "}
                  <span className="font-semibold">
                    {selectedOrder.approvedBy}
                  </span>{" "}
                  on {selectedOrder.approvalDate}.
                </p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Accounting;
