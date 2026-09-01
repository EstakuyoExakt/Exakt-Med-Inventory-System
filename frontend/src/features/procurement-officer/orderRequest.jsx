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
  Clock,
  Send,
  Eye,
  Trash2,
  Plus,
  Layers,
  CheckSquare,
  Square,
  ListPlus,
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

  // Multi-Selection State for Table Checkboxes
  const [selectedSkuIds, setSelectedSkuIds] = useState([]);

  // Modal States
  const [selectedSkuForView, setSelectedSkuForView] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'order' | 'view' | 'success' | null
  const [submittedOrder, setSubmittedOrder] = useState(null);

  // Multi-Item Order Form State
  const [orderForm, setOrderForm] = useState({
    supplierId: suppliers[0]?.id || 1,
    targetFacility: facilities[0]?.name || "Exakt Central General Hospital",
    priority: "Normal", // 'Urgent' | 'Normal'
    totalCost: "",
    notes: "",
    items: [], // [{ sku, brandName, genericName, dosage, packagingUnit, currentStock, minimumLevel, maximumLevel, reorderLevel, quantity }]
  });
  const [formErrors, setFormErrors] = useState({});

  // Additional SKU Selector inside Modal
  const [skuToAdd, setSkuToAdd] = useState("");

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

  // Checkbox Selection Handlers
  const handleToggleSelectSku = (skuId) => {
    setSelectedSkuIds((prev) =>
      prev.includes(skuId)
        ? prev.filter((id) => id !== skuId)
        : [...prev, skuId],
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = paginatedReorderSkus.map((s) => s.id);
    const allSelected = visibleIds.every((id) => selectedSkuIds.includes(id));
    if (allSelected) {
      setSelectedSkuIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedSkuIds((prev) => [
        ...prev,
        ...visibleIds.filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const handleSelectAllCritical = () => {
    const criticalIds = skuList
      .filter((s) => s.currentStock <= s.minimumLevel)
      .map((s) => s.id);
    setSelectedSkuIds(criticalIds);
  };

  // Helper to build line item with suggested quantity
  const buildLineItem = (sku) => {
    const suggestedQty = Math.max(
      sku.maximumLevel - sku.currentStock,
      sku.reorderLevel * 2,
    );
    return {
      id: sku.id,
      sku: sku.sku,
      brandName: sku.brandName,
      genericName: sku.genericName,
      dosage: sku.dosage,
      dosageForm: sku.dosageForm,
      packagingUnit: sku.packagingUnit,
      currentStock: sku.currentStock,
      minimumLevel: sku.minimumLevel,
      maximumLevel: sku.maximumLevel,
      reorderLevel: sku.reorderLevel,
      quantity: suggestedQty > 0 ? suggestedQty : 100,
    };
  };

  // Open Multi-Item Requisition Modal with selected items
  const handleOpenMultiOrderModal = (initialSkusToOrder = []) => {
    let itemsToInclude = [];

    if (initialSkusToOrder.length > 0) {
      itemsToInclude = initialSkusToOrder.map(buildLineItem);
    } else if (selectedSkuIds.length > 0) {
      const selectedObjList = skuList.filter((s) =>
        selectedSkuIds.includes(s.id),
      );
      itemsToInclude = selectedObjList.map(buildLineItem);
    } else if (reorderSkus.length > 0) {
      // Default with the first 2 reorder SKUs if none selected
      itemsToInclude = [buildLineItem(reorderSkus[0])];
    }

    const hasCritical = itemsToInclude.some(
      (item) => item.currentStock <= item.minimumLevel,
    );

    setOrderForm({
      supplierId: suppliers[0]?.id || 1,
      targetFacility: facilities[0]?.name || "Exakt Central General Hospital",
      priority: hasCritical ? "Urgent" : "Normal",
      totalCost: "",
      notes: "",
      items: itemsToInclude,
    });
    setFormErrors({});
    setSkuToAdd("");
    setModalMode("order");
  };

  // Open Order Modal for a single row button
  const handleOpenSingleOrderModal = (sku) => {
    handleOpenMultiOrderModal([sku]);
  };

  // Open View Details Modal
  const handleOpenViewModal = (sku) => {
    setSelectedSkuForView(sku);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedSkuForView(null);
    setFormErrors({});
  };

  // Add Item to Order Form within the Modal
  const handleAddItemToForm = (skuCode) => {
    if (!skuCode) return;
    const targetSku = skuList.find((s) => s.sku === skuCode);
    if (!targetSku) return;

    if (orderForm.items.some((i) => i.sku === targetSku.sku)) {
      setFormErrors((prev) => ({
        ...prev,
        itemAdd: "This medicine is already added to the order request.",
      }));
      return;
    }

    setOrderForm((prev) => ({
      ...prev,
      items: [...prev.items, buildLineItem(targetSku)],
    }));
    setFormErrors((prev) => ({ ...prev, itemAdd: "", items: "" }));
    setSkuToAdd("");
  };

  // Remove Item from Order Form within the Modal
  const handleRemoveItemFromForm = (skuCode) => {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.sku !== skuCode),
    }));
  };

  // Update item quantity in Order Form
  const handleUpdateItemQuantity = (skuCode, qty) => {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.sku === skuCode
          ? { ...i, quantity: Math.max(1, Number(qty) || 1) }
          : i,
      ),
    }));
  };

  // Total Units in the current Order Form
  const totalFormUnits = useMemo(() => {
    return orderForm.items.reduce(
      (sum, i) => sum + (Number(i.quantity) || 0),
      0,
    );
  }, [orderForm.items]);

  // Available SKUs that need restocking and haven't been added yet
  const availableSkusToAdd = useMemo(() => {
    const addedSkus = new Set(orderForm.items.map((i) => i.sku));
    return skuList.filter(
      (s) => s.currentStock <= s.reorderLevel && !addedSkus.has(s.sku),
    );
  }, [skuList, orderForm.items]);

  // Handle Form Submission
  const handleSubmitOrder = (e) => {
    e.preventDefault();
    const errors = {};

    if (!orderForm.supplierId) {
      errors.supplierId = "Please select an assigned supplier.";
    }

    if (!orderForm.items || orderForm.items.length === 0) {
      errors.items = "Please add at least one medicine to this purchase order.";
    }

    if (orderForm.items.some((i) => !i.quantity || Number(i.quantity) <= 0)) {
      errors.items =
        "All ordered medicines must have a quantity greater than 0.";
    }

    if (orderForm.totalCost === "" || Number(orderForm.totalCost) < 0) {
      errors.totalCost = "Please enter a valid total requisition cost.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const supplierObj = suppliers.find(
      (s) => s.id === Number(orderForm.supplierId),
    );

    const generatedPoNumber = `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRequest = {
      orderId: generatedPoNumber,
      orderNumber: generatedPoNumber,
      supplierId: Number(orderForm.supplierId),
      supplierName: supplierObj ? supplierObj.name : "Supplier",
      targetFacility: orderForm.targetFacility,
      priority: orderForm.priority,
      totalCost: Number(orderForm.totalCost) || 0,
      notes: orderForm.notes,
      items: orderForm.items,
      totalUnits: totalFormUnits,
      createdAt: new Date().toLocaleDateString(),
    };

    setSubmittedOrder(newRequest);
    setSelectedSkuIds([]); // Clear selection
    setModalMode("success");
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <PackagePlus className="w-7 h-7 text-blue-600" />
            <span>Procurement Order Requests</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Batch multiple restock items into a consolidated purchase order
            requisition for suppliers
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenMultiOrderModal()}
            className="btn-primary shadow-xs flex items-center gap-2 text-xs py-2 px-3.5"
          >
            <ListPlus className="w-4 h-4" />
            <span>
              {selectedSkuIds.length > 0
                ? `Create PO for (${selectedSkuIds.length}) Selected`
                : "Create Multi-Item PO Request"}
            </span>
          </button>
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
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-100/70 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" /> Critical emergency
                  shortage (&le; Min)
                </span>
                {totalMinimumSkus > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllCritical}
                    className="text-[11px] font-bold text-red-700 underline hover:text-red-900 cursor-pointer"
                  >
                    Select All Critical
                  </button>
                )}
              </div>
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

        {/* Multi-Select Floating Action Bar if items checked */}
        {selectedSkuIds.length > 0 && (
          <div className="p-3 bg-blue-50/90 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">
                {selectedSkuIds.length}
              </span>
              <span>Medicines selected for batch requisition</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedSkuIds([])}
                className="btn-secondary py-1 px-2.5 text-xs text-gray-600 hover:text-gray-900"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() => handleOpenMultiOrderModal()}
                className="btn-primary py-1 px-3 text-xs shadow-xs flex items-center gap-1.5"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>Create Combined PO ({selectedSkuIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAllVisible}
                    checked={
                      paginatedReorderSkus.length > 0 &&
                      paginatedReorderSkus.every((s) =>
                        selectedSkuIds.includes(s.id),
                      )
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Select all visible on page"
                  />
                </th>
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
                  const isSelected = selectedSkuIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isSelected
                          ? "bg-blue-50/40"
                          : item.currentStock <= item.minimumLevel
                            ? "bg-red-50/15"
                            : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectSku(item.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

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
                            title="View SKU Diagnostics"
                            aria-label="View SKU Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSingleOrderModal(item)}
                            className="btn-primary py-1.5 px-3 text-xs shadow-sm flex items-center gap-1.5 font-medium"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>Add to PO</span>
                          </button>
                        </div>
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
      {/* 1. MODAL: CREATE MULTI-ITEM PURCHASE ORDER REQUEST       */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "order"}
        onClose={handleCloseModal}
        title="Create Purchase Order Requisition (Multi-Medicine)"
        size="xl"
      >
        <form onSubmit={handleSubmitOrder} className="space-y-4">
          {/* Supplier, Facility & Priority Header Controls */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Supplier Selection */}
            <div>
              <label
                htmlFor="order-supplier"
                className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1"
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
                className="input py-2 text-xs"
              >
                {suppliers
                  .filter((s) => s.status === "Active")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.supplierCode})
                    </option>
                  ))}
              </select>
            </div>

            {/* Destination Facility */}
            <div>
              <label
                htmlFor="order-facility"
                className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1"
              >
                Destination Facility <span className="text-red-500">*</span>
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
                className="input py-2 text-xs"
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Requisition Priority */}
            <div>
              <label
                htmlFor="order-priority"
                className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1"
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
                className="input py-2 text-xs font-semibold"
              >
                <option value="Normal">Normal Standard Lead Time</option>
                <option value="Urgent">Urgent Emergency Restock</option>
              </select>
            </div>
          </div>

          {/* Section: Included Medicines List */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Ordered Medicines ({orderForm.items.length})
                </span>
                <span className="text-xs text-blue-700 font-mono font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-center">
                  Total Units {totalFormUnits.toLocaleString()}
                </span>
              </div>

              {/* Add More Medicine Dropdown */}
              <div className="flex items-center gap-1.5">
                <select
                  value={skuToAdd}
                  onChange={(e) => setSkuToAdd(e.target.value)}
                  className="input py-1 px-2 text-xs w-56"
                >
                  <option value="">+ Add another medicine...</option>
                  {availableSkusToAdd.map((s) => (
                    <option key={s.id} value={s.sku}>
                      {s.brandName} ({s.sku}) — Stock: {s.currentStock}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddItemToForm(skuToAdd)}
                  disabled={!skuToAdd}
                  className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {formErrors.itemAdd && (
              <p className="text-xs text-amber-600">{formErrors.itemAdd}</p>
            )}
            {formErrors.items && (
              <p className="text-xs text-red-500">{formErrors.items}</p>
            )}

            {/* Medicines Items Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600 sticky top-0 border-b border-gray-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Medication & SKU</th>
                    <th className="px-3.5 py-2.5">Current / Max</th>
                    <th className="px-3.5 py-2.5 w-36">Order Quantity</th>
                    <th className="px-3.5 py-2.5 w-10 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orderForm.items.length > 0 ? (
                    orderForm.items.map((item, idx) => (
                      <tr key={item.sku} className="hover:bg-gray-50/80">
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">
                              {item.brandName}
                            </span>
                            <span className="font-mono text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                              {item.sku}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {item.genericName} • {item.dosage} (
                            {item.packagingUnit})
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span
                              className={`font-bold ${
                                item.currentStock <= item.minimumLevel
                                  ? "text-red-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {item.currentStock}
                            </span>
                            <span className="text-gray-400">/</span>
                            <span className="text-gray-600">
                              Max: {item.maximumLevel}
                            </span>
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItemQuantity(
                                  item.sku,
                                  e.target.value,
                                )
                              }
                              className="input py-1 px-2 text-xs w-24 font-bold text-gray-900"
                            />
                            <span className="text-[10px] text-gray-500">
                              units
                            </span>
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromForm(item.sku)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Remove line item from this PO"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        <Layers className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                        <p className="font-semibold text-gray-600">
                          No medicines selected
                        </p>
                        <p className="text-[11px]">
                          Choose from the dropdown above to add medicines to
                          this PO.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Financial & Notes Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Total Cost Field */}
            <div>
              <label
                htmlFor="order-total-cost"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Total Quoted PO Cost (₱) <span className="text-red-500">*</span>
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
                  className="input pl-7 font-mono font-bold"
                />
              </div>
              {formErrors.totalCost && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.totalCost}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="order-notes"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Procurement Justification Notes
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={orderForm.items.length === 0}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                Submit Purchase Requisition ({orderForm.items.length} SKUs)
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. MODAL: ORDER SUCCESS CONFIRMATION                     */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "success" && Boolean(submittedOrder)}
        onClose={handleCloseModal}
        title="Purchase Order Requisition Submitted"
        size="xl"
      >
        {submittedOrder && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mt-2">
                Purchase Order Requisition Created
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Consolidated purchase order reference has been generated and
                dispatched to the supplier.
              </p>
            </div>

            {/* PO Summary Card */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-2">
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">PO Number:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {submittedOrder.orderId}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Vendor:</span>
                <span className="font-semibold text-gray-900">
                  {submittedOrder.supplierName}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Destination Facility:</span>
                <span className="font-semibold text-gray-800">
                  {submittedOrder.targetFacility}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Total Quoted Cost:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  ₱
                  {Number(submittedOrder.totalCost).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Volume:</span>
                <span className="font-bold text-gray-900">
                  {submittedOrder.totalUnits.toLocaleString()} units (
                  {submittedOrder.items.length} line items)
                </span>
              </div>
            </div>

            {/* Included Line Items Table */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                Included Medication Line Items
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5">Medicine</th>
                      <th className="px-3 py-1.5">SKU</th>
                      <th className="px-3 py-1.5 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {submittedOrder.items.map((item) => (
                      <tr key={item.sku}>
                        <td className="px-3 py-1.5 font-semibold text-gray-900">
                          {item.brandName} ({item.dosage})
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[11px] text-blue-700">
                          {item.sku}
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold text-gray-900">
                          {item.quantity.toLocaleString()} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-primary w-full justify-center text-xs py-2"
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
        isOpen={modalMode === "view" && Boolean(selectedSkuForView)}
        onClose={handleCloseModal}
        title="SKU Inventory & Threshold Diagnostics"
        size="md"
      >
        {selectedSkuForView && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shrink-0">
                <Pill className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900">
                    {selectedSkuForView.brandName}
                  </h3>
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                    {selectedSkuForView.sku}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedSkuForView.genericName} • {selectedSkuForView.dosage}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-gray-500">
                  <span>{selectedSkuForView.dosageForm}</span>
                  <span>•</span>
                  <span>{selectedSkuForView.packagingUnit}</span>
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
                  {selectedSkuForView.minimumLevel}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">
                  Reorder Trigger
                </span>
                <span className="font-bold text-amber-900 text-sm">
                  {selectedSkuForView.reorderLevel}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                  Max Capacity
                </span>
                <span className="font-bold text-emerald-900 text-sm">
                  {selectedSkuForView.maximumLevel}
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
                onClick={() => {
                  handleCloseModal();
                  handleOpenSingleOrderModal(selectedSkuForView);
                }}
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
