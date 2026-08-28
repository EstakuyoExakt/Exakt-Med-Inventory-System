import { useState, useMemo } from "react";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Check,
  X,
  Search,
  Filter,
  Package,
  Building2,
  Truck,
  Pill,
  Calendar,
  AlertTriangle,
  FileText,
  DollarSign,
  UserCheck,
} from "lucide-react";

// Common Components & Guards
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import RoleGuard from "../../components/guard/roleGuard";
import { ROLES } from "../../config/roles";

// Mock Data
import { requestedOrders as initialOrders } from "../../data/orders";

function RequestedOrders() {
  const [orders, setOrders] = useState(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'view' | 'approve' | 'reject' | null
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(
      (o) => o.status === "Pending Approval",
    ).length;
    const approved = orders.filter((o) => o.status === "Approved").length;
    const rejected = orders.filter((o) => o.status === "Rejected").length;
    return { total, pending, approved, rejected };
  }, [orders]);

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(q) ||
        order.sku.toLowerCase().includes(q) ||
        order.brandName.toLowerCase().includes(q) ||
        order.genericName.toLowerCase().includes(q) ||
        order.supplierName.toLowerCase().includes(q) ||
        order.targetFacility.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" || order.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [orders, searchQuery, statusFilter, priorityFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePriorityChange = (e) => {
    setPriorityFilter(e.target.value);
    setCurrentPage(1);
  };

  // Modal Openers
  const handleOpenViewModal = (order) => {
    setSelectedOrder(order);
    setModalMode("view");
  };

  const handleOpenApproveModal = (order) => {
    setSelectedOrder(order);
    setModalMode("approve");
  };

  const handleOpenRejectModal = (order) => {
    setSelectedOrder(order);
    setRejectReason("");
    setRejectError("");
    setModalMode("reject");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedOrder(null);
    setRejectReason("");
    setRejectError("");
  };

  // Actions
  const handleApproveOrder = () => {
    if (!selectedOrder) return;
    const today = new Date().toISOString().split("T")[0];

    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrder.id
          ? {
              ...o,
              status: "Approved",
              approvedBy: "Sarah Jenkins (Admin)",
              approvalDate: today,
              rejectionReason: null,
            }
          : o,
      ),
    );
    handleCloseModal();
  };

  const handleRejectOrder = (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setRejectError("Please provide a reason for denying this requisition.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrder.id
          ? {
              ...o,
              status: "Rejected",
              approvedBy: "Sarah Jenkins (Admin)",
              approvalDate: today,
              rejectionReason: rejectReason.trim(),
            }
          : o,
      ),
    );
    handleCloseModal();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return {
          label: "Approved",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
        };
      case "Pending Approval":
        return {
          label: "Pending Approval",
          color: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
        };
      case "Rejected":
        return {
          label: "Denied / Rejected",
          color: "bg-red-50 text-red-700 border-red-200",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color: "bg-gray-50 text-gray-700 border-gray-200",
          icon: AlertCircle,
        };
    }
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Requested Purchase Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review, track, and manage all medication purchase order requisitions
            submitted by the Procurement Officer
          </p>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Orders */}
        <Card className="p-5 border border-gray-200 shadow-xs hover:border-gray-300 transition-all bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Requisitions
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1.5">
                {metrics.total}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 mt-1">
                All submitted order records
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
              <ClipboardCheck className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 2. Pending Approval */}
        <Card className="p-5 border border-amber-200/80 shadow-xs hover:border-amber-300 transition-all bg-linear-to-br from-white to-amber-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Pending Approval
              </p>
              <h3 className="text-3xl font-extrabold text-amber-600 mt-1.5">
                {metrics.pending}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mt-1 bg-amber-100/70 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> Requires Admin Review
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 border border-amber-200 shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 3. Approved Orders */}
        <Card className="p-5 border border-emerald-200/80 shadow-xs hover:border-emerald-300 transition-all bg-linear-to-br from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Approved Orders
              </p>
              <h3 className="text-3xl font-extrabold text-emerald-600 mt-1.5">
                {metrics.approved}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-1 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Dispatched to Vendor
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 4. Rejected Orders */}
        <Card className="p-5 border border-red-200/80 shadow-xs hover:border-red-300 transition-all bg-linear-to-br from-white to-red-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                Denied / Rejected
              </p>
              <h3 className="text-3xl font-extrabold text-red-600 mt-1.5">
                {metrics.rejected}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 mt-1 bg-red-100/70 px-2 py-0.5 rounded-full">
                <XCircle className="w-3 h-3" /> Cancelled Requisitions
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 border border-red-200 shadow-xs">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Table Container */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/30">
          <div className="w-full md:w-80">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search PO #, SKU, drug, supplier, facility..."
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="input py-2 text-xs w-full sm:w-44"
            >
              <option value="ALL">All Statuses ({orders.length})</option>
              <option value="Pending Approval">
                Pending Approval ({metrics.pending})
              </option>
              <option value="Approved">Approved ({metrics.approved})</option>
              <option value="Rejected">Rejected ({metrics.rejected})</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={handlePriorityChange}
              className="input py-2 text-xs w-full sm:w-36"
            >
              <option value="ALL">All Priorities</option>
              <option value="Urgent">Urgent Only</option>
              <option value="Normal">Normal Standard</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  PO Number & Date
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Supplier & Destination
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Priority & Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedOrders.length > 0 ? (
                paginatedOrders.map((order) => {
                  const statusInfo = getStatusBadge(order.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      {/* PO Number & Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 text-sm">
                            {order.orderNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{order.requestedDate}</span>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {order.quantity.toLocaleString()}{" "}
                          <span className="text-xs font-normal text-gray-500">
                            units
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                          Est: ₱{order.estimatedCost?.toLocaleString() || "—"}
                        </div>
                      </td>

                      {/* Supplier & Destination */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                          <Truck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate max-w-45">
                            {order.supplierName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate max-w-45">
                            {order.targetFacility}
                          </span>
                        </div>
                      </td>

                      {/* Priority & Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.color}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusInfo.label}
                          </span>
                          <div>
                            <span
                              className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                order.priority === "Urgent"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-gray-50 text-gray-600 border-gray-200"
                              }`}
                            >
                              {order.priority} Priority
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. View Requisition Details (Shared: All Roles) */}
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(order)}
                            className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                            title="View Requisition Details"
                            aria-label="View Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Admin Protected Approval & Denial Actions */}
                          <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                            {order.status === "Pending Approval" && (
                              <>
                                {/* Approve Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenApproveModal(order)}
                                  className="btn-primary py-1.5 px-2.5 text-xs shadow-xs flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                                  title="Approve Purchase Order"
                                  aria-label="Approve Order"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>

                                {/* Deny / Reject Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(order)}
                                  className="btn-danger py-1.5 px-2.5 text-xs shadow-xs flex items-center gap-1"
                                  title="Deny / Reject Order"
                                  aria-label="Deny Order"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Deny</span>
                                </button>
                              </>
                            )}
                          </RoleGuard>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <ClipboardCheck className="w-9 h-9 mx-auto mb-2 text-gray-300" />
                    <p className="text-base font-semibold text-gray-800">
                      No purchase order requests found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search query or filter selections.
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
      {/* 1. MODAL: VIEW ORDER DETAILS (Shared)                    */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "view" && Boolean(selectedOrder)}
        onClose={handleCloseModal}
        title="Purchase Order Details"
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-4">
            {/* Header Box */}
            <div className="p-4 rounded-xl bg-linear-to-r from-blue-50 to-indigo-50/60 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-800 text-base">
                    {selectedOrder.orderNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      getStatusBadge(selectedOrder.status).color
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Requested on {selectedOrder.requestedDate} by{" "}
                  <span className="font-semibold text-gray-800">
                    {selectedOrder.requestedBy}
                  </span>
                </p>
              </div>
              <div className="text-center">
                <span
                  className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    selectedOrder.priority === "Urgent"
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-white text-gray-700 border-gray-200"
                  }`}
                >
                  {selectedOrder.priority} Priority
                </span>
              </div>
            </div>

            {/* Requisition Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
                <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">
                  Medication Information
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Brand Name:</span>
                    <span className="font-bold text-gray-900">
                      {selectedOrder.brandName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Generic Name:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedOrder.genericName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Dosage & Form:</span>
                    <span className="text-gray-700">
                      {selectedOrder.dosage} ({selectedOrder.dosageForm})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Packaging:</span>
                    <span className="text-gray-700">
                      {selectedOrder.packagingUnit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">SKU Code:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {selectedOrder.sku}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 space-y-2">
                <p className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">
                  Procurement & Destination
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Order Quantity:</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {selectedOrder.quantity.toLocaleString()} units
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Supplier:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedOrder.supplierName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Destination:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedOrder.targetFacility}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Estimated Cost:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₱{selectedOrder.estimatedCost?.toLocaleString() || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes / Justification */}
            {selectedOrder.notes && (
              <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 text-xs">
                <p className="font-bold text-blue-900 uppercase tracking-wider text-[10px] mb-1">
                  Procurement Officer Justification
                </p>
                <p className="text-gray-700">{selectedOrder.notes}</p>
              </div>
            )}

            {/* Approval / Rejection Result Banner if processed */}
            {selectedOrder.approvedBy && (
              <div
                className={`p-3.5 rounded-xl text-xs border ${
                  selectedOrder.status === "Approved"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                <p className="font-bold uppercase tracking-wider text-[10px] mb-1">
                  {selectedOrder.status === "Approved"
                    ? "Approval Confirmation"
                    : "Rejection / Denial Notice"}
                </p>
                <p className="text-xs">
                  Processed by{" "}
                  <span className="font-semibold">
                    {selectedOrder.approvedBy}
                  </span>{" "}
                  on {selectedOrder.approvalDate}.
                </p>
                {selectedOrder.rejectionReason && (
                  <p className="mt-1.5 text-red-800 bg-white/70 p-2 rounded-lg border border-red-200">
                    <span className="font-semibold">Reason:</span>{" "}
                    {selectedOrder.rejectionReason}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 2. MODAL: APPROVE REQUISITION (Admin Only)               */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "approve" && Boolean(selectedOrder)}
        onClose={handleCloseModal}
        title="Approve Purchase Requisition"
        size="md"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-950 text-sm">
                  Confirm Purchase Order Approval
                </p>
                <p className="text-emerald-800 mt-1">
                  Approving this requisition will authorize supplier{" "}
                  <span className="font-semibold">
                    {selectedOrder.supplierName}
                  </span>{" "}
                  to process the purchase order for{" "}
                  <span className="font-bold font-mono">
                    {selectedOrder.quantity} units
                  </span>{" "}
                  of {selectedOrder.brandName}.
                </p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Order Reference:</span>
                <span className="font-mono font-bold text-blue-700">
                  {selectedOrder.orderNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Destination:</span>
                <span className="font-semibold text-gray-800">
                  {selectedOrder.targetFacility}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated Total:</span>
                <span className="font-mono font-bold text-emerald-700">
                  ₱{selectedOrder.estimatedCost?.toLocaleString() || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveOrder}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Approval</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 3. MODAL: DENY / REJECT REQUISITION (Admin Only)         */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "reject" && Boolean(selectedOrder)}
        onClose={handleCloseModal}
        title="Deny / Reject Requisition"
        size="md"
      >
        {selectedOrder && (
          <form onSubmit={handleRejectOrder} className="space-y-4">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-950 text-sm">
                  Deny Purchase Order Request
                </p>
                <p className="text-red-800 mt-1">
                  Rejecting requisition{" "}
                  <span className="font-mono font-bold">
                    {selectedOrder.orderNumber}
                  </span>{" "}
                  will notify the Procurement Officer. Please provide a reason.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="reject-reason"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Reason for Denial <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reject-reason"
                rows="3"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError("");
                }}
                placeholder="e.g. Budget allocation exceeded for this quarter / Alternative SKU available"
                className="input resize-none"
              />
              {rejectError && (
                <p className="text-xs text-red-500 mt-1">{rejectError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-danger">
                <X className="w-4 h-4" />
                <span>Deny Request</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default RequestedOrders;
