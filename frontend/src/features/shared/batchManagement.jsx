import { useState, useMemo } from "react";
import {
  Package,
  Boxes,
  Pill,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Eye,
  Sliders,
  ArrowRightLeft,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  Building2,
} from "lucide-react";

// Common Components & Guards
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import RoleGuard from "../../components/guard/roleGuard";
import { ROLES } from "../../config/roles";
import { getExpiryStatus } from "../../utils/helpers";
import {
  ADJUSTMENT_REASONS,
  QUARANTINE_REASONS,
  DEFAULT_RECEIVE_BATCH,
} from "../../utils/constants";

// Data Imports
import { batches as initialBatches } from "../../data/batches";
import { initialSkus } from "../../data/skuManagement";
import { facilities } from "../../data/facility";

function BatchManagement() {
  const [batchList, setBatchList] = useState(() =>
    initialBatches.map((b) => ({
      ...b,
      location: b.location || "Exakt Central General Hospital",
      isQuarantined: b.isQuarantined || false,
      quarantineReason: b.quarantineReason || "",
      quarantineDate: b.quarantineDate || "",
    })),
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkuFilter, setSelectedSkuFilter] = useState("ALL");
  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal State
  const [modalMode, setModalMode] = useState(null); // 'receive' | 'view' | 'adjust' | 'transfer' | 'quarantine' | null
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Form States for Modals
  const [receiveFormData, setReceiveFormData] = useState(DEFAULT_RECEIVE_BATCH);
  const [adjustFormData, setAdjustFormData] = useState({
    type: "ADD", // 'ADD' | 'SUBTRACT' | 'SET'
    amount: 10,
    reason: ADJUSTMENT_REASONS[0],
    notes: "",
  });
  const [transferFormData, setTransferFormData] = useState({
    targetLocation: facilities[1]?.name || "Exakt Northside Medical Wing",
    transferQuantity: 10,
    notes: "",
  });
  const [quarantineFormData, setQuarantineFormData] = useState({
    reason: QUARANTINE_REASONS[0],
    notes: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // Helper map for SKU metadata lookup
  const skuMetaMap = useMemo(() => {
    const map = {};
    initialSkus.forEach((s) => {
      map[s.sku] = s;
    });
    return map;
  }, []);

  // Summary KPI Calculations
  const totalBatches = batchList.length;

  const totalActiveStock = useMemo(() => {
    return batchList
      .filter((b) => !b.isQuarantined)
      .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  }, [batchList]);

  const expiryAlertCount = useMemo(() => {
    return batchList.filter((b) => {
      const exp = getExpiryStatus(b.expiryDate);
      return exp.status === "NEAR_EXPIRY" || exp.status === "EXPIRED";
    }).length;
  }, [batchList]);

  const quarantinedCount = useMemo(() => {
    return batchList.filter((b) => b.isQuarantined).length;
  }, [batchList]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batchList.filter((batch) => {
      const skuData = skuMetaMap[batch.sku] || {};
      const brandName = skuData.brandName || "";
      const genericName = skuData.genericName || "";

      const matchesSearch =
        batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSku =
        selectedSkuFilter === "ALL" || batch.sku === selectedSkuFilter;

      const exp = getExpiryStatus(batch.expiryDate);
      let matchesExpiry = true;
      if (selectedExpiryFilter === "NEAR_EXPIRY") {
        matchesExpiry = exp.status === "NEAR_EXPIRY";
      } else if (selectedExpiryFilter === "EXPIRED") {
        matchesExpiry = exp.status === "EXPIRED";
      } else if (selectedExpiryFilter === "HEALTHY") {
        matchesExpiry = exp.status === "HEALTHY";
      }

      let matchesStatus = true;
      if (selectedStatusFilter === "ACTIVE") {
        matchesStatus = !batch.isQuarantined && batch.quantity > 0;
      } else if (selectedStatusFilter === "QUARANTINED") {
        matchesStatus = batch.isQuarantined;
      } else if (selectedStatusFilter === "DEPLETED") {
        matchesStatus = batch.quantity === 0;
      }

      return matchesSearch && matchesSku && matchesExpiry && matchesStatus;
    });
  }, [
    batchList,
    searchQuery,
    selectedSkuFilter,
    selectedExpiryFilter,
    selectedStatusFilter,
    skuMetaMap,
  ]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage) || 1;
  const paginatedBatches = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBatches.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBatches, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSkuFilterChange = (e) => {
    setSelectedSkuFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleExpiryFilterChange = (e) => {
    setSelectedExpiryFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setSelectedStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  // --- MODAL OPENERS ---

  // 1. Procurement Officer: Receive Batch
  const handleOpenReceiveModal = () => {
    const defaultSku = initialSkus[0]?.sku || "AMOX500-CAP-100";
    const nextNum = String(batchList.length + 1).padStart(4, "0");
    const today = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(today.getFullYear() + 2);

    setReceiveFormData({
      sku: defaultSku,
      batchNumber: `BAT-2025-${nextNum}`,
      manufacturingDate: today.toISOString().split("T")[0],
      expiryDate: futureDate.toISOString().split("T")[0],
      quantity: 500,
      location: facilities[0]?.name || "Exakt Central General Hospital",
    });
    setFormErrors({});
    setSelectedBatch(null);
    setModalMode("receive");
  };

  // 2. View Batch Dossier (All roles)
  const handleOpenViewModal = (batch) => {
    setSelectedBatch(batch);
    setModalMode("view");
  };

  // 3. Pharmacist Manager: Stock Adjustment
  const handleOpenAdjustModal = (batch) => {
    setSelectedBatch(batch);
    setAdjustFormData({
      type: "ADD",
      amount: 10,
      reason: ADJUSTMENT_REASONS[0],
      notes: "",
    });
    setFormErrors({});
    setModalMode("adjust");
  };

  // 4. Pharmacist Manager: Transfer Stock
  const handleOpenTransferModal = (batch) => {
    setSelectedBatch(batch);
    const availableTargets = facilities.filter((f) => f.name !== batch.location);
    setTransferFormData({
      targetLocation: availableTargets[0]?.name || "Exakt Northside Medical Wing",
      transferQuantity: Math.min(50, batch.quantity),
      notes: "",
    });
    setFormErrors({});
    setModalMode("transfer");
  };

  // 5. Pharmacist Manager: Quarantine Control
  const handleOpenQuarantineModal = (batch) => {
    setSelectedBatch(batch);
    setQuarantineFormData({
      reason: batch.quarantineReason || QUARANTINE_REASONS[0],
      notes: "",
    });
    setFormErrors({});
    setModalMode("quarantine");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedBatch(null);
    setFormErrors({});
  };

  // --- ACTIONS & SUBMISSIONS ---

  // 1. Submit Received Batch (Procurement Officer)
  const handleSaveReceivedBatch = (e) => {
    e.preventDefault();
    const errors = {};

    if (!receiveFormData.sku) errors.sku = "SKU is required.";
    if (!receiveFormData.batchNumber.trim())
      errors.batchNumber = "Batch number is required.";
    else {
      const exists = batchList.some(
        (b) =>
          b.batchNumber.toLowerCase() ===
          receiveFormData.batchNumber.trim().toLowerCase(),
      );
      if (exists) errors.batchNumber = "Batch number already exists.";
    }
    if (!receiveFormData.manufacturingDate)
      errors.manufacturingDate = "Manufacturing date is required.";
    if (!receiveFormData.expiryDate) errors.expiryDate = "Expiry date is required.";
    if (
      receiveFormData.manufacturingDate &&
      receiveFormData.expiryDate &&
      new Date(receiveFormData.expiryDate) <= new Date(receiveFormData.manufacturingDate)
    ) {
      errors.expiryDate = "Expiry date must be after manufacturing date.";
    }
    if (Number(receiveFormData.quantity) <= 0)
      errors.quantity = "Received quantity must be greater than 0.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const newBatch = {
      id: Date.now(),
      batchNumber: receiveFormData.batchNumber.trim().toUpperCase(),
      sku: receiveFormData.sku,
      manufacturingDate: receiveFormData.manufacturingDate,
      expiryDate: receiveFormData.expiryDate,
      quantity: Number(receiveFormData.quantity) || 0,
      location: receiveFormData.location,
      isQuarantined: false,
      quarantineReason: "",
      quarantineDate: "",
    };

    setBatchList((prev) => [newBatch, ...prev]);
    handleCloseModal();
  };

  // 2. Submit Stock Adjustment (Pharmacist Manager)
  const handleSaveStockAdjustment = (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    const errors = {};
    const amt = Number(adjustFormData.amount);

    if (isNaN(amt) || amt < 0) {
      errors.amount = "Please enter a valid non-negative quantity.";
    } else if (
      (adjustFormData.type === "SUBTRACT" ||
        adjustFormData.type === "WRITE_OFF") &&
      amt > selectedBatch.quantity
    ) {
      errors.amount = `Cannot deduct more than available quantity (${selectedBatch.quantity}).`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setBatchList((prev) =>
      prev.map((b) => {
        if (b.id === selectedBatch.id) {
          let newQty = b.quantity;
          if (adjustFormData.type === "ADD") {
            newQty += amt;
          } else if (
            adjustFormData.type === "SUBTRACT" ||
            adjustFormData.type === "WRITE_OFF"
          ) {
            newQty = Math.max(0, newQty - amt);
          } else if (adjustFormData.type === "SET") {
            newQty = amt;
          }
          return { ...b, quantity: newQty };
        }
        return b;
      }),
    );

    handleCloseModal();
  };

  // 3. Submit Transfer Stock (Pharmacist Manager)
  const handleSaveTransferStock = (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    const errors = {};
    const transferQty = Number(transferFormData.transferQuantity);

    if (!transferFormData.targetLocation) {
      errors.targetLocation = "Please select a destination facility.";
    } else if (transferFormData.targetLocation === selectedBatch.location) {
      errors.targetLocation = "Destination cannot be the same as origin location.";
    }

    if (isNaN(transferQty) || transferQty <= 0) {
      errors.transferQuantity = "Transfer quantity must be greater than 0.";
    } else if (transferQty > selectedBatch.quantity) {
      errors.transferQuantity = `Cannot transfer more than available quantity (${selectedBatch.quantity}).`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (transferQty === selectedBatch.quantity) {
      // Entire batch moved to new location
      setBatchList((prev) =>
        prev.map((b) =>
          b.id === selectedBatch.id
            ? { ...b, location: transferFormData.targetLocation }
            : b,
        ),
      );
    } else {
      // Split batch: reduce origin, create split batch in target facility
      const splitBatch = {
        id: Date.now(),
        batchNumber: `${selectedBatch.batchNumber}-T${Math.floor(10 + Math.random() * 90)}`,
        sku: selectedBatch.sku,
        manufacturingDate: selectedBatch.manufacturingDate,
        expiryDate: selectedBatch.expiryDate,
        quantity: transferQty,
        location: transferFormData.targetLocation,
        isQuarantined: selectedBatch.isQuarantined,
        quarantineReason: selectedBatch.quarantineReason,
        quarantineDate: selectedBatch.quarantineDate,
      };

      setBatchList((prev) => [
        splitBatch,
        ...prev.map((b) =>
          b.id === selectedBatch.id
            ? { ...b, quantity: b.quantity - transferQty }
            : b,
        ),
      ]);
    }

    handleCloseModal();
  };

  // 4. Submit Quarantine / Release (Pharmacist Manager)
  const handleSaveQuarantineToggle = (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    const nowQuarantined = !selectedBatch.isQuarantined;

    setBatchList((prev) =>
      prev.map((b) =>
        b.id === selectedBatch.id
          ? {
              ...b,
              isQuarantined: nowQuarantined,
              quarantineReason: nowQuarantined
                ? quarantineFormData.reason
                : "",
              quarantineDate: nowQuarantined
                ? new Date().toISOString().split("T")[0]
                : "",
            }
          : b,
      ),
    );

    handleCloseModal();
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Batch Management & Expiry Control
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Centralized inventory lot tracking, expiration monitoring, stock
            adjustments, transfers, and quarantine protocols
          </p>
        </div>

        {/* Receive New Stock (Procurement Officer Only) */}
        <RoleGuard allowedRoles={[ROLES.PROCUREMENT]}>
          <button
            type="button"
            onClick={handleOpenReceiveModal}
            className="btn-primary self-start sm:self-auto shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Receive Stock / Register Batch</span>
          </button>
        </RoleGuard>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Batches */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Batches
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalBatches}
              </h3>
              <span className="inline-block text-[11px] font-medium text-blue-600 mt-1">
                Across all storage hubs
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Active Stock */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Active Units in Stock
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalActiveStock.toLocaleString()}
              </h3>
              <span className="inline-block text-[11px] font-medium text-emerald-600 mt-1">
                Available for dispensing
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Expiry Alerts */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Expiry Alerts
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {expiryAlertCount}
              </h3>
              <span className="inline-block text-[11px] font-medium text-amber-600 mt-1">
                &le; 90 days or expired
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Quarantined Batches */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Quarantined
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {quarantinedCount}
              </h3>
              <span className="inline-block text-[11px] font-medium text-red-600 mt-1">
                Blocked from dispensing
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden border border-gray-200">
        {/* Search & Filter Controls */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-50/50">
          <div className="w-full md:w-72">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              onClear={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              placeholder="Search batch, SKU, drug name..."
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* SKU Filter */}
            <select
              value={selectedSkuFilter}
              onChange={handleSkuFilterChange}
              className="input py-2 text-xs w-full sm:w-48"
            >
              <option value="ALL">All SKUs</option>
              {initialSkus.map((s) => (
                <option key={s.sku} value={s.sku}>
                  {s.sku} ({s.brandName})
                </option>
              ))}
            </select>

            {/* Expiry Health Filter */}
            <select
              value={selectedExpiryFilter}
              onChange={handleExpiryFilterChange}
              className="input py-2 text-xs w-full sm:w-36"
            >
              <option value="ALL">All Expirations</option>
              <option value="NEAR_EXPIRY">Near Expiry (&le;90d)</option>
              <option value="EXPIRED">Expired</option>
              <option value="HEALTHY">Valid Stock</option>
            </select>

            {/* Quarantine/Availability Filter */}
            <select
              value={selectedStatusFilter}
              onChange={handleStatusFilterChange}
              className="input py-2 text-xs w-full sm:w-36"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active & Available</option>
              <option value="QUARANTINED">Quarantined Only</option>
              <option value="DEPLETED">Depleted (0 Qty)</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Batch & SKU Details
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Batch Quantity
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Expiry Countdown
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedBatches.length > 0 ? (
                paginatedBatches.map((batch) => {
                  const skuData = skuMetaMap[batch.sku] || {};
                  const expInfo = getExpiryStatus(batch.expiryDate);

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        batch.isQuarantined ? "bg-red-50/20" : ""
                      }`}
                    >
                      {/* Batch Number & SKU Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg font-semibold text-xs border shrink-0 mt-0.5 ${
                              batch.isQuarantined
                                ? "bg-red-50 text-red-600 border-red-200"
                                : "bg-blue-50 text-blue-600 border-blue-100"
                            }`}
                          >
                            {batch.isQuarantined ? (
                              <ShieldAlert className="w-4 h-4" />
                            ) : (
                              <Package className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-900 text-sm">
                                {batch.batchNumber}
                              </span>
                              <span className="font-mono text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                                {batch.sku}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 font-medium mt-0.5">
                              {skuData.brandName || "Medicine"}{" "}
                              <span className="text-gray-400 font-normal">
                                ({skuData.genericName} • {skuData.dosage})
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {batch.quantity.toLocaleString()}{" "}
                          <span className="text-xs text-gray-400 font-normal">
                            units
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {skuData.packagingUnit || "Standard Packaging"}
                        </div>
                      </td>

                      {/* Expiry Date & Countdown */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{batch.expiryDate}</span>
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${expInfo.color}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${expInfo.dot}`}
                            />
                            {expInfo.label}
                          </span>
                        </div>
                      </td>

                      {/* Status / Quarantine */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {batch.isQuarantined ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                            Quarantined
                          </span>
                        ) : batch.quantity === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            Depleted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Available
                          </span>
                        )}
                      </td>

                      {/* Actions Group */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. View Details (Shared: All Roles) */}
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(batch)}
                            className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                            title="View Batch Details"
                            aria-label="View Batch Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Pharmacist Manager Protected Modules */}
                          <RoleGuard allowedRoles={[ROLES.PHARMACIST]}>
                            {/* Stock Adjustment */}
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustModal(batch)}
                              className="btn-secondary p-1.5 text-gray-600 hover:text-amber-600 hover:border-amber-300"
                              title="Stock Adjustment (Count / Write-off)"
                              aria-label="Stock Adjustment"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>

                            {/* Transfer Stock */}
                            <button
                              type="button"
                              onClick={() => handleOpenTransferModal(batch)}
                              className="btn-secondary p-1.5 text-gray-600 hover:text-purple-600 hover:border-purple-300"
                              title="Transfer Stock to Another Facility"
                              aria-label="Transfer Stock"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Quarantine / Release */}
                            <button
                              type="button"
                              onClick={() => handleOpenQuarantineModal(batch)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                batch.isQuarantined
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              }`}
                              title={
                                batch.isQuarantined
                                  ? "Release from Quarantine"
                                  : "Quarantine this Batch"
                              }
                              aria-label="Quarantine Control"
                            >
                              {batch.isQuarantined ? (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              ) : (
                                <ShieldAlert className="w-3.5 h-3.5" />
                              )}
                            </button>
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
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No batches found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search query or SKU filters
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {filteredBatches.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredBatches.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* ======================================================== */}
      {/* 1. MODULE: RECEIVE NEW STOCK MODAL (Procurement Officer) */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "receive"}
        onClose={handleCloseModal}
        title="Receive New Stock & Register Batch"
        size="lg"
      >
        <form onSubmit={handleSaveReceivedBatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SKU Selector */}
            <div className="sm:col-span-2">
              <label
                htmlFor="receive-batch-sku"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Target Stock-Keeping Unit (SKU) <span className="text-red-500">*</span>
              </label>
              <select
                id="receive-batch-sku"
                value={receiveFormData.sku}
                onChange={(e) =>
                  setReceiveFormData((prev) => ({ ...prev, sku: e.target.value }))
                }
                className="input"
              >
                {initialSkus.map((s) => (
                  <option key={s.sku} value={s.sku}>
                    {s.sku} — {s.brandName} ({s.genericName} {s.dosage})
                  </option>
                ))}
              </select>
              {formErrors.sku && (
                <p className="text-xs text-red-500 mt-1">{formErrors.sku}</p>
              )}
            </div>

            {/* Batch Number */}
            <div>
              <label
                htmlFor="receive-batch-number"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Batch / Lot Number <span className="text-red-500">*</span>
              </label>
              <input
                id="receive-batch-number"
                type="text"
                value={receiveFormData.batchNumber}
                onChange={(e) =>
                  setReceiveFormData((prev) => ({
                    ...prev,
                    batchNumber: e.target.value,
                  }))
                }
                placeholder="BAT-2025-0199"
                className={`input uppercase font-mono ${
                  formErrors.batchNumber
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                    : ""
                }`}
              />
              {formErrors.batchNumber && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.batchNumber}
                </p>
              )}
            </div>

            {/* Received Quantity */}
            <div>
              <label
                htmlFor="receive-batch-quantity"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Received Quantity (Units) <span className="text-red-500">*</span>
              </label>
              <input
                id="receive-batch-quantity"
                type="number"
                min="1"
                value={receiveFormData.quantity}
                onChange={(e) =>
                  setReceiveFormData((prev) => ({
                    ...prev,
                    quantity: Number(e.target.value),
                  }))
                }
                className="input"
              />
              {formErrors.quantity && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.quantity}
                </p>
              )}
            </div>

            {/* Manufacturing Date */}
            <div>
              <label
                htmlFor="receive-batch-mfg"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Manufacturing Date <span className="text-red-500">*</span>
              </label>
              <input
                id="receive-batch-mfg"
                type="date"
                value={receiveFormData.manufacturingDate}
                onChange={(e) =>
                  setReceiveFormData((prev) => ({
                    ...prev,
                    manufacturingDate: e.target.value,
                  }))
                }
                className="input"
              />
              {formErrors.manufacturingDate && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.manufacturingDate}
                </p>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <label
                htmlFor="receive-batch-exp"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Expiration Date <span className="text-red-500">*</span>
              </label>
              <input
                id="receive-batch-exp"
                type="date"
                value={receiveFormData.expiryDate}
                onChange={(e) =>
                  setReceiveFormData((prev) => ({
                    ...prev,
                    expiryDate: e.target.value,
                  }))
                }
                className="input"
              />
              {formErrors.expiryDate && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.expiryDate}
                </p>
              )}
            </div>

            {/* Storage Facility */}
            <div className="sm:col-span-2">
              <label
                htmlFor="receive-batch-location"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Receiving Facility / Location <span className="text-red-500">*</span>
              </label>
              <select
                id="receive-batch-location"
                value={receiveFormData.location}
                onChange={(e) =>
                  setReceiveFormData((prev) => ({
                    ...prev,
                    location: e.target.value,
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
              <Plus className="w-4 h-4" />
              <span>Confirm Stock Receipt</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. MODULE: STOCK ADJUSTMENT MODAL (Pharmacist Manager)   */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "adjust" && Boolean(selectedBatch)}
        onClose={handleCloseModal}
        title="Stock Adjustment Module"
        size="md"
      >
        {selectedBatch && (
          <form onSubmit={handleSaveStockAdjustment} className="space-y-4">
            {/* Batch Context Card */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-bold text-gray-900 text-sm">
                  {selectedBatch.batchNumber}
                </span>
                <p className="text-gray-500 font-mono mt-0.5">
                  SKU: {selectedBatch.sku}
                </p>
                <p className="text-gray-400 text-[11px]">
                  {selectedBatch.location}
                </p>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[11px]">
                  Current Stock
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {selectedBatch.quantity}{" "}
                  <span className="text-xs font-normal text-gray-500">
                    units
                  </span>
                </span>
              </div>
            </div>

            {/* Adjustment Operation Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Adjustment Action <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAdjustFormData((prev) => ({ ...prev, type: "ADD" }))
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    adjustFormData.type === "ADD"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAdjustFormData((prev) => ({ ...prev, type: "SUBTRACT" }))
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    adjustFormData.type === "SUBTRACT"
                      ? "bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  - Deduct Stock
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAdjustFormData((prev) => ({ ...prev, type: "SET" }))
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    adjustFormData.type === "SET"
                      ? "bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  = Set Exact Qty
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label
                htmlFor="adjust-amount"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                {adjustFormData.type === "SET"
                  ? "New Exact Total Quantity"
                  : "Adjustment Amount (Units)"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                id="adjust-amount"
                type="number"
                min="0"
                value={adjustFormData.amount}
                onChange={(e) =>
                  setAdjustFormData((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                className="input"
              />
              {formErrors.amount && (
                <p className="text-xs text-red-500 mt-1">{formErrors.amount}</p>
              )}
            </div>

            {/* Adjustment Reason */}
            <div>
              <label
                htmlFor="adjust-reason"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Reason for Adjustment <span className="text-red-500">*</span>
              </label>
              <select
                id="adjust-reason"
                value={adjustFormData.reason}
                onChange={(e) =>
                  setAdjustFormData((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                className="input"
              >
                {ADJUSTMENT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="adjust-notes"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Audit Notes / Reference (Optional)
              </label>
              <input
                id="adjust-notes"
                type="text"
                value={adjustFormData.notes}
                onChange={(e) =>
                  setAdjustFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="e.g. Approved by Pharmacist in Charge"
                className="input"
              />
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
                <Sliders className="w-4 h-4" />
                <span>Apply Stock Adjustment</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 3. MODULE: TRANSFER STOCK MODAL (Pharmacist Manager)     */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "transfer" && Boolean(selectedBatch)}
        onClose={handleCloseModal}
        title="Transfer Stock between Facilities"
        size="md"
      >
        {selectedBatch && (
          <form onSubmit={handleSaveTransferStock} className="space-y-4">
            {/* Batch Origin Card */}
            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-purple-900 text-sm">
                  {selectedBatch.batchNumber}
                </span>
                <span className="font-bold text-gray-900">
                  {selectedBatch.quantity} units available
                </span>
              </div>
              <p className="text-gray-500 font-mono">
                SKU: {selectedBatch.sku}
              </p>
              <p className="text-purple-800 font-semibold flex items-center gap-1 pt-1">
                <Building2 className="w-3.5 h-3.5 text-purple-600" /> Origin:{" "}
                {selectedBatch.location}
              </p>
            </div>

            {/* Target Destination Facility */}
            <div>
              <label
                htmlFor="transfer-target"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Destination Facility / Hub <span className="text-red-500">*</span>
              </label>
              <select
                id="transfer-target"
                value={transferFormData.targetLocation}
                onChange={(e) =>
                  setTransferFormData((prev) => ({
                    ...prev,
                    targetLocation: e.target.value,
                  }))
                }
                className="input"
              >
                {facilities
                  .filter((f) => f.name !== selectedBatch.location)
                  .map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name} ({f.type})
                    </option>
                  ))}
              </select>
              {formErrors.targetLocation && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.targetLocation}
                </p>
              )}
            </div>

            {/* Quantity to Transfer */}
            <div>
              <label
                htmlFor="transfer-qty"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Quantity to Transfer <span className="text-red-500">*</span>
              </label>
              <input
                id="transfer-qty"
                type="number"
                min="1"
                max={selectedBatch.quantity}
                value={transferFormData.transferQuantity}
                onChange={(e) =>
                  setTransferFormData((prev) => ({
                    ...prev,
                    transferQuantity: Number(e.target.value),
                  }))
                }
                className="input"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Max transferable from this batch: {selectedBatch.quantity} units
              </p>
              {formErrors.transferQuantity && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.transferQuantity}
                </p>
              )}
            </div>

            {/* Transfer Notes */}
            <div>
              <label
                htmlFor="transfer-notes"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Transfer Reference / Waybill (Optional)
              </label>
              <input
                id="transfer-notes"
                type="text"
                value={transferFormData.notes}
                onChange={(e) =>
                  setTransferFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="e.g. TRF-2026-0042 — Branch restock"
                className="input"
              />
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
                <ArrowRightLeft className="w-4 h-4" />
                <span>Execute Transfer</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 4. MODULE: QUARANTINE / RELEASE (Pharmacist Manager)     */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "quarantine" && Boolean(selectedBatch)}
        onClose={handleCloseModal}
        title={
          selectedBatch?.isQuarantined
            ? "Release Batch from Quarantine"
            : "Place Batch into Safety Quarantine"
        }
        size="md"
      >
        {selectedBatch && (
          <form onSubmit={handleSaveQuarantineToggle} className="space-y-4">
            {selectedBatch.isQuarantined ? (
              // Release state confirmation
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Confirm QA Clearance & Release</span>
                  </div>
                  <p>
                    Batch <span className="font-mono font-bold">{selectedBatch.batchNumber}</span> will be unblocked and made available for active dispensing across inventory channels.
                  </p>
                  {selectedBatch.quarantineReason && (
                    <p className="text-[11px] text-gray-500 pt-1 border-t border-emerald-100">
                      Prior Quarantine Reason: {selectedBatch.quarantineReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary text-xs">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Release Batch</span>
                  </button>
                </div>
              </div>
            ) : (
              // Quarantine Action Form
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900">
                      Quarantine Warning Protocol
                    </p>
                    <p className="text-red-700 mt-0.5">
                      Batch <span className="font-mono font-bold">{selectedBatch.batchNumber}</span> ({selectedBatch.quantity} units) will be locked immediately and barred from hospital dispensing until QA clearance.
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="quarantine-reason"
                    className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                  >
                    Quarantine Violation Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="quarantine-reason"
                    value={quarantineFormData.reason}
                    onChange={(e) =>
                      setQuarantineFormData((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    className="input"
                  >
                    {QUARANTINE_REASONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="quarantine-notes"
                    className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
                  >
                    Incident Report / QA Notes
                  </label>
                  <input
                    id="quarantine-notes"
                    type="text"
                    value={quarantineFormData.notes}
                    onChange={(e) =>
                      setQuarantineFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="e.g. Reported by pharmacy receiving officer"
                    className="input"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-danger text-xs">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Enforce Quarantine</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 5. VIEW BATCH DETAILS MODAL (Shared: All Roles)          */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "view" && Boolean(selectedBatch)}
        onClose={handleCloseModal}
        title="Batch Dossier & Expiry Diagnostics"
        size="md"
      >
        {selectedBatch && (
          <div className="space-y-4">
            {/* Header Card */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-white shadow-sm shrink-0 ${
                  selectedBatch.isQuarantined ? "bg-red-600" : "bg-blue-600"
                }`}
              >
                {selectedBatch.isQuarantined ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <Package className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold font-mono text-gray-900">
                    {selectedBatch.batchNumber}
                  </h3>
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                    {selectedBatch.sku}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 font-medium">
                  {skuMetaMap[selectedBatch.sku]?.brandName || "Medicine"}{" "}
                  <span className="text-gray-400 font-normal">
                    ({skuMetaMap[selectedBatch.sku]?.genericName} •{" "}
                    {skuMetaMap[selectedBatch.sku]?.dosage})
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      selectedBatch.isQuarantined
                        ? "bg-red-100 text-red-800 border-red-200"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {selectedBatch.isQuarantined
                      ? "Under Quarantine"
                      : "Active & Available"}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-gray-100 bg-white">
                <span className="text-gray-400 block mb-0.5">Quantity on Hand</span>
                <span className="font-bold text-gray-900 text-base">
                  {selectedBatch.quantity.toLocaleString()}{" "}
                  <span className="text-xs text-gray-500 font-normal">
                    units
                  </span>
                </span>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white">
                <span className="text-gray-400 block mb-0.5">Expiry Status</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold text-xs mt-0.5 ${
                    getExpiryStatus(selectedBatch.expiryDate).color
                  } px-2 py-0.5 rounded-full border`}
                >
                  {getExpiryStatus(selectedBatch.expiryDate).label}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white">
                <span className="text-gray-400 block mb-0.5">
                  Manufacturing Date
                </span>
                <span className="font-semibold text-gray-900">
                  {selectedBatch.manufacturingDate}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white">
                <span className="text-gray-400 block mb-0.5">Expiration Date</span>
                <span className="font-semibold text-gray-900">
                  {selectedBatch.expiryDate}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white col-span-2">
                <span className="text-gray-400 block mb-0.5">
                  Facility Location
                </span>
                <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  {selectedBatch.location}
                </span>
              </div>

              {selectedBatch.isQuarantined && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50/60 col-span-2 text-red-900 space-y-1">
                  <span className="font-bold block text-[11px] uppercase tracking-wider text-red-700">
                    Quarantine Reason
                  </span>
                  <p className="font-semibold">{selectedBatch.quarantineReason}</p>
                  {selectedBatch.quarantineDate && (
                    <span className="text-[10px] text-red-600 block">
                      Enforced on: {selectedBatch.quarantineDate}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary text-xs"
              >
                Close
              </button>

              {/* Pharmacist Action Shortcuts */}
              <RoleGuard allowedRoles={[ROLES.PHARMACIST]}>
                <button
                  type="button"
                  onClick={() => handleOpenAdjustModal(selectedBatch)}
                  className="btn-secondary text-xs text-amber-700 hover:text-amber-800"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Adjust Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenTransferModal(selectedBatch)}
                  className="btn-primary text-xs"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer Stock</span>
                </button>
              </RoleGuard>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}

export default BatchManagement;
