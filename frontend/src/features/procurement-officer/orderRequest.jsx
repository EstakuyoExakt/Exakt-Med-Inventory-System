import { useState, useMemo } from "react";
import {
  AlertTriangle,
  AlertCircle,
  PackagePlus,
  ShoppingCart,
  Pill,
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  Clock,
  Send,
  Eye,
  FileText,
} from "lucide-react";

// Common Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";

// Data Imports
import { initialSkus } from "../../data/skuManagement";
import { suppliers } from "../../data/supplier";
import { facilities } from "../../data/facility";
import { MEDICINE_TYPES } from "../../data/medicine";
import { getStockStatus } from "../../utils/helpers";

function OrderRequest() {
  const [skuList] = useState(initialSkus);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedUrgency, setSelectedUrgency] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal States
  const [selectedSku, setSelectedSku] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'order' | 'view' | 'success' | null
  const [submittedOrder, setSubmittedOrder] = useState(null);

  // Form State for Order Request
  const [orderForm, setOrderForm] = useState({
    supplierId: suppliers[0]?.id || 1,
    quantity: 100,
    totalCost: "",
    targetFacility: facilities[0]?.name || "Exakt Central General Hospital",
    priority: "Normal", // 'Urgent' | 'Normal'
    notes: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // 1. Total Minimum SKUs (currentStock <= minimumLevel)
  const totalMinimumSkus = useMemo(() => {
    return skuList.filter((s) => s.currentStock <= s.minimumLevel).length;
  }, [skuList]);

  // 2. Total Needs Reorder SKUs (currentStock <= reorderLevel)
  const totalNeedsReorderSkus = useMemo(() => {
    return skuList.filter((s) => s.currentStock <= s.reorderLevel).length;
  }, [skuList]);

  // Filtered List: Only display SKUs that need reordering (currentStock <= reorderLevel)
  const reorderSkus = useMemo(() => {
    return skuList.filter((item) => {
      const needsReorder = item.currentStock <= item.reorderLevel;
      if (!needsReorder) return false;

      const matchesSearch =
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.dosage.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedType === "ALL" || item.type === selectedType;

      let matchesUrgency = true;
      if (selectedUrgency === "MINIMUM") {
        matchesUrgency = item.currentStock <= item.minimumLevel;
      } else if (selectedUrgency === "REORDER_ONLY") {
        matchesUrgency =
          item.currentStock <= item.reorderLevel &&
          item.currentStock > item.minimumLevel;
      }

      return matchesSearch && matchesType && matchesUrgency;
    });
  }, [skuList, searchQuery, selectedType, selectedUrgency]);

  // Pagination calculation
  const totalPages = Math.ceil(reorderSkus.length / itemsPerPage) || 1;
  const paginatedReorderSkus = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return reorderSkus.slice(startIndex, startIndex + itemsPerPage);
  }, [reorderSkus, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
    setCurrentPage(1);
  };

  const handleUrgencyChange = (e) => {
    setSelectedUrgency(e.target.value);
    setCurrentPage(1);
  };

  // Open Order Modal for SKU
  const handleOpenOrderModal = (sku) => {
    const suggestedQty = Math.max(
      sku.maximumLevel - sku.currentStock,
      sku.reorderLevel * 2,
    );

    setSelectedSku(sku);
    setOrderForm({
      supplierId: suppliers[0]?.id || 1,
      quantity: suggestedQty,
      totalCost: "",
      targetFacility: facilities[0]?.name || "Exakt Central General Hospital",
      priority: sku.currentStock <= sku.minimumLevel ? "Urgent" : "Normal",
      notes: "",
    });
    setFormErrors({});
    setModalMode("order");
  };

  // Open View Details Modal
  const handleOpenViewModal = (sku) => {
    setSelectedSku(sku);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedSku(null);
    setFormErrors({});
  };

  // Handle Form Submission
  const handleSubmitOrder = (e) => {
    e.preventDefault();
    const errors = {};

    if (!orderForm.supplierId) {
      errors.supplierId = "Please select a supplier.";
    }

    if (Number(orderForm.quantity) <= 0) {
      errors.quantity = "Order quantity must be greater than 0.";
    }

    if (orderForm.totalCost === "" || Number(orderForm.totalCost) < 0) {
      errors.totalCost = "Please enter the total cost.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const supplierObj = suppliers.find(
      (s) => s.id === Number(orderForm.supplierId),
    );

    const newRequest = {
      orderId: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      sku: selectedSku.sku,
      brandName: selectedSku.brandName,
      genericName: selectedSku.genericName,
      dosage: selectedSku.dosage,
      quantity: Number(orderForm.quantity),
      totalCost: Number(orderForm.totalCost) || 0,
      packagingUnit: selectedSku.packagingUnit,
      supplierName: supplierObj ? supplierObj.name : "Supplier",
      targetFacility: orderForm.targetFacility,
      priority: orderForm.priority,
      notes: orderForm.notes,
      createdAt: new Date().toLocaleDateString(),
    };

    setSubmittedOrder(newRequest);
    setModalMode("success");
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Procurement Order Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Identify SKUs below reorder and safety minimum thresholds to
            initiate supplier purchase requisitions
          </p>
        </div>
      </div>

      {/* 2 Total Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Total Minimum SKUs */}
        <Card className="p-5 border border-red-200/80 shadow-xs hover:border-red-300 transition-all bg-linear-to-br from-white to-red-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                Total Minimum SKUs
              </p>
              <h3 className="text-3xl font-extrabold text-red-600 mt-1.5">
                {totalMinimumSkus}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 mt-1 bg-red-100/70 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" /> Critical emergency shortage
                (&le; Min level)
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 border border-red-200 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 2. Total Needs Reorder SKUs */}
        <Card className="p-5 border border-amber-200/80 shadow-xs hover:border-amber-300 transition-all bg-linear-to-br from-white to-amber-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Total Needs Reorder SKUs
              </p>
              <h3 className="text-3xl font-extrabold text-amber-600 mt-1.5">
                {totalNeedsReorderSkus}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mt-1 bg-amber-100/70 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> Qualified for restocking (&le;
                Reorder point)
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 border border-amber-200 shadow-xs">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Section */}
      <Card className="p-0 overflow-hidden border border-gray-200">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-50/50">
          <div className="w-full md:w-80">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              onClear={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              placeholder="Search reorder SKU, drug name..."
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* Urgency Filter */}
            <select
              value={selectedUrgency}
              onChange={handleUrgencyChange}
              className="input py-2 text-xs w-full sm:w-44"
            >
              <option value="ALL">
                All Reorder Items ({reorderSkus.length})
              </option>
              <option value="MINIMUM">Critical (&le; Minimum Level)</option>
              <option value="REORDER_ONLY">Reorder Triggered Only</option>
            </select>

            {/* Medicine Type Filter */}
            <select
              value={selectedType}
              onChange={handleTypeChange}
              className="input py-2 text-xs w-full sm:w-44"
            >
              <option value="ALL">All Medicine Types</option>
              {MEDICINE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  SKU & Medicine
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Form & Packaging
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Current vs Thresholds
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedReorderSkus.length > 0 ? (
                paginatedReorderSkus.map((item) => {
                  const status = getStockStatus(item);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        item.currentStock <= item.minimumLevel
                          ? "bg-red-50/20"
                          : ""
                      }`}
                    >
                      {/* SKU & Drug Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg font-semibold text-xs border shrink-0 mt-0.5 ${
                              item.currentStock <= item.minimumLevel
                                ? "bg-red-50 text-red-600 border-red-200"
                                : "bg-amber-50 text-amber-600 border-amber-200"
                            }`}
                          >
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 text-sm">
                                {item.brandName}
                              </span>
                              <span className="font-mono text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                                {item.sku}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.genericName} • {item.dosage}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {item.type}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dosage Form & Packaging */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-gray-800">
                          {item.dosageForm}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.packagingUnit}
                        </div>
                      </td>

                      {/* Current Stock vs Thresholds */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-2">
                          <div className="bg-gray-100 px-2.5 py-1 rounded text-center">
                            <span className="text-[10px] block uppercase font-medium text-gray-500">
                              Current
                            </span>
                            <span className="font-bold text-gray-900 text-xs">
                              {item.currentStock}
                            </span>
                          </div>
                          <div className="bg-red-50 border border-red-100 text-red-700 px-2 py-1 rounded text-center">
                            <span className="text-[10px] block uppercase font-medium text-red-500">
                              Min
                            </span>
                            <span className="font-bold">
                              {item.minimumLevel}
                            </span>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 text-amber-700 px-2 py-1 rounded text-center">
                            <span className="text-[10px] block uppercase font-medium text-amber-500">
                              Reorder
                            </span>
                            <span className="font-bold">
                              {item.reorderLevel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.color}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`}
                          />
                          {status.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(item)}
                            className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600"
                            title="View SKU Thresholds"
                            aria-label="View SKU Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenOrderModal(item)}
                            className="btn-primary py-1.5 px-3 text-xs shadow-sm flex items-center gap-1.5 font-medium"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>Create Request</span>
                          </button>
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
                    <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-emerald-500" />
                    <p className="text-base font-semibold text-gray-800">
                      All inventory stock levels are healthy!
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      No SKUs currently require purchase reordering.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {reorderSkus.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={reorderSkus.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* ======================================================== */}
      {/* 1. MODAL: CREATE ORDER REQUEST                           */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "order" && Boolean(selectedSku)}
        onClose={handleCloseModal}
        title="Create Purchase Order Requisition"
        size="lg"
      >
        {selectedSku && (
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            {/* SKU Overview Banner */}
            <div className="p-4 rounded-xl bg-linear-to-r from-blue-50 to-indigo-50/60 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">
                    {selectedSku.brandName}
                  </span>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded">
                    {selectedSku.sku}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {selectedSku.genericName} • {selectedSku.dosage} (
                  {selectedSku.packagingUnit})
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="bg-white/80 border border-blue-200 px-2.5 py-1 rounded text-center">
                  <span className="text-[10px] block uppercase text-gray-500 font-semibold">
                    Current
                  </span>
                  <span className="font-bold text-red-600">
                    {selectedSku.currentStock}
                  </span>
                </div>
                <div className="bg-white/80 border border-blue-200 px-2.5 py-1 rounded text-center">
                  <span className="text-[10px] block uppercase text-gray-500 font-semibold">
                    Max Cap
                  </span>
                  <span className="font-bold text-emerald-700">
                    {selectedSku.maximumLevel}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Supplier Selection */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="order-supplier"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Assigned Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  id="order-supplier"
                  value={orderForm.supplierId}
                  onChange={(e) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      supplierId: Number(e.target.value),
                    }))
                  }
                  className="input"
                >
                  {suppliers
                    .filter((s) => s.status === "Active")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.supplierCode}) — Terms: {s.paymentTerms}
                      </option>
                    ))}
                </select>
                {formErrors.supplierId && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.supplierId}
                  </p>
                )}
              </div>

              {/* Order Quantity */}
              <div>
                <label
                  htmlFor="order-qty"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Order Quantity (Units) <span className="text-red-500">*</span>
                </label>
                <input
                  id="order-qty"
                  type="number"
                  min="1"
                  value={orderForm.quantity}
                  onChange={(e) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      quantity: Number(e.target.value),
                    }))
                  }
                  className="input"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Suggested restock: +
                  {Math.max(
                    selectedSku.maximumLevel - selectedSku.currentStock,
                    0,
                  )}{" "}
                  units
                </span>
                {formErrors.quantity && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.quantity}
                  </p>
                )}
              </div>

              {/* Total Cost */}
              <div>
                <label
                  htmlFor="order-total-cost"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Total Cost (₱) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                    ₱
                  </span>
                  <input
                    id="order-total-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderForm.totalCost}
                    onChange={(e) =>
                      setOrderForm((prev) => ({
                        ...prev,
                        totalCost: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="input pl-7"
                  />
                </div>
                {formErrors.totalCost && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.totalCost}
                  </p>
                )}
              </div>

              {/* Target Receiving Facility */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="order-facility"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Destination Receiving Facility{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  id="order-facility"
                  value={orderForm.targetFacility}
                  onChange={(e) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      targetFacility: e.target.value,
                    }))
                  }
                  className="input"
                >
                  {facilities.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name} ({f.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Priority */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="order-priority"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Requisition Priority <span className="text-red-500">*</span>
                </label>
                <select
                  id="order-priority"
                  value={orderForm.priority}
                  onChange={(e) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  className="input"
                >
                  <option value="Normal">Normal Standard Lead Time</option>
                  <option value="Urgent">Urgent Emergency Restock</option>
                </select>
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label
                  htmlFor="order-notes"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                >
                  Procurement Notes / Justification (Optional)
                </label>
                <input
                  id="order-notes"
                  type="text"
                  value={orderForm.notes}
                  onChange={(e) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="e.g. Critical hospital safety buffer depleted"
                  className="input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <Send className="w-4 h-4" />
                <span>Submit Purchase Request</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 2. MODAL: ORDER SUCCESS CONFIRMATION                     */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "success" && Boolean(submittedOrder)}
        onClose={handleCloseModal}
        title="Purchase Request Submitted"
        size="md"
      >
        {submittedOrder && (
          <div className="space-y-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">
                Order Request Created Successfully
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Purchase Order reference has been generated and dispatched to
                the supplier.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Order Reference:</span>
                <span className="font-mono font-bold text-blue-700">
                  {submittedOrder.orderId}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Target SKU:</span>
                <span className="font-semibold text-gray-900">
                  {submittedOrder.sku} ({submittedOrder.brandName})
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Requested Quantity:</span>
                <span className="font-bold text-gray-900">
                  {submittedOrder.quantity.toLocaleString()} units
                </span>
              </div>
              {submittedOrder.totalCost !== undefined && (
                <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                  <span className="text-gray-500">Total Cost:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    ₱
                    {Number(submittedOrder.totalCost).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Vendor:</span>
                <span className="font-semibold text-gray-800">
                  {submittedOrder.supplierName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Destination:</span>
                <span className="font-semibold text-gray-800">
                  {submittedOrder.targetFacility}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-primary w-full justify-center"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 3. MODAL: VIEW SKU THRESHOLD DETAILS                     */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "view" && Boolean(selectedSku)}
        onClose={handleCloseModal}
        title="SKU Inventory & Threshold Diagnostics"
        size="md"
      >
        {selectedSku && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shrink-0">
                <Pill className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900">
                    {selectedSku.brandName}
                  </h3>
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                    {selectedSku.sku}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedSku.genericName} • {selectedSku.dosage}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-gray-500">
                  <span>{selectedSku.dosageForm}</span>
                  <span>•</span>
                  <span>{selectedSku.packagingUnit}</span>
                </div>
              </div>
            </div>

            {/* Threshold Cards */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-100">
                <span className="text-[10px] uppercase font-bold text-red-600 block">
                  Minimum Level
                </span>
                <span className="font-bold text-red-900 text-sm">
                  {selectedSku.minimumLevel}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">
                  Reorder Trigger
                </span>
                <span className="font-bold text-amber-900 text-sm">
                  {selectedSku.reorderLevel}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                  Max Capacity
                </span>
                <span className="font-bold text-emerald-900 text-sm">
                  {selectedSku.maximumLevel}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleOpenOrderModal(selectedSku)}
                className="btn-primary text-xs"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>Create Order Request</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default OrderRequest;
