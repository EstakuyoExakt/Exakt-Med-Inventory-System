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
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  Building2,
  Truck,
  FileText,
} from "lucide-react";

// Common Components & Guards
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import { getExpiryStatus } from "../../utils/helpers";
import { QUARANTINE_REASONS } from "../../utils/constants";
import useAuth from "../../hooks/useAuth";

// Data Imports
import { batches as initialBatches } from "../../data/batches";
import { initialSkus } from "../../data/skuManagement";
import { facilities } from "../../data/facility";
import { requestedOrders } from "../../data/orders";

function BatchManagement() {
  const { facility } = useAuth();

  // Automatically detect current active facility from auth session / local storage
  const currentFacilityName = useMemo(() => {
    if (facility?.name) return facility.name;
    try {
      const stored = localStorage.getItem("currentFacility");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name) return parsed.name;
      }
    } catch {
      // fallback
    }
    return facilities[0]?.name || "Exakt Central General Hospital";
  }, [facility]);

  // Distribute initial lots across hospital facilities
  const [batchList, setBatchList] = useState(() =>
    initialBatches.map((b, idx) => {
      const facilityOptions = facilities.map((f) => f.name);
      const assignedLoc =
        b.location ||
        facilityOptions[idx % Math.min(4, facilityOptions.length)] ||
        "Exakt Central General Hospital";

      return {
        ...b,
        location: assignedLoc,
        isQuarantined: b.isQuarantined || false,
        quarantineReason: b.quarantineReason || "",
        quarantineDate: b.quarantineDate || "",
      };
    }),
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkuFilter, setSelectedSkuFilter] = useState("ALL");
  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal State: Only 'receive' and 'view'
  const [modalMode, setModalMode] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Filter batches to display ONLY those belonging to the CURRENT facility
  const currentFacilityBatches = useMemo(() => {
    return batchList.filter((b) => b.location === currentFacilityName);
  }, [batchList, currentFacilityName]);

  // Form State for Receive Stock via PO
  const defaultPo = useMemo(() => {
    return (
      requestedOrders.find(
        (po) =>
          po.status === "Approved" && po.targetFacility === currentFacilityName,
      ) ||
      requestedOrders.find((po) => po.status === "Approved") ||
      requestedOrders[0]
    );
  }, [currentFacilityName]);

  const [receiveFormData, setReceiveFormData] = useState({
    poNumber: defaultPo?.orderNumber || "",
    sku: defaultPo?.sku || "AMOX500-CAP-100",
    batchNumber: defaultPo
      ? `BAT-${defaultPo.orderNumber.replace("PO-", "")}`
      : "BAT-2026-0103",
    manufacturingDate: new Date().toISOString().split("T")[0],
    expiryDate: (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 2);
      return d.toISOString().split("T")[0];
    })(),
    quantity: defaultPo?.quantity || 500,
    location: currentFacilityName,
    isQuarantined: false,
    quarantineReason: QUARANTINE_REASONS[0],
    quarantineNotes: "",
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

  // Selected PO Details lookup
  const selectedPoDetails = useMemo(() => {
    return requestedOrders.find(
      (po) => po.orderNumber === receiveFormData.poNumber,
    );
  }, [receiveFormData.poNumber]);

  // Summary KPI Calculations for Current Facility
  const totalBatches = currentFacilityBatches.length;

  const totalActiveStock = useMemo(() => {
    return currentFacilityBatches
      .filter((b) => !b.isQuarantined)
      .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  }, [currentFacilityBatches]);

  const expiryAlertCount = useMemo(() => {
    return currentFacilityBatches.filter((b) => {
      const exp = getExpiryStatus(b.expiryDate);
      return exp.status === "NEAR_EXPIRY" || exp.status === "EXPIRED";
    }).length;
  }, [currentFacilityBatches]);

  const quarantinedCount = useMemo(() => {
    return currentFacilityBatches.filter((b) => b.isQuarantined).length;
  }, [currentFacilityBatches]);

  // Filtered Batches for Current Facility
  const filteredBatches = useMemo(() => {
    return currentFacilityBatches.filter((batch) => {
      const skuData = skuMetaMap[batch.sku] || {};
      const brandName = skuData.brandName || "";
      const genericName = skuData.genericName || "";

      const matchesSearch =
        batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        genericName.toLowerCase().includes(searchQuery.toLowerCase());

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
    currentFacilityBatches,
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

  // Receive Stock via PO
  const handleOpenReceiveModal = () => {
    const po = defaultPo || requestedOrders[0];
    const today = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(today.getFullYear() + 2);

    setReceiveFormData({
      poNumber: po ? po.orderNumber : "",
      sku: po ? po.sku : "AMOX500-CAP-100",
      batchNumber: po
        ? `BAT-${po.orderNumber.replace("PO-", "")}`
        : `BAT-2026-${String(batchList.length + 1).padStart(4, "0")}`,
      manufacturingDate: today.toISOString().split("T")[0],
      expiryDate: futureDate.toISOString().split("T")[0],
      quantity: po ? po.quantity : 500,
      location: currentFacilityName, // Automatically lock to current facility
      isQuarantined: false,
      quarantineReason: QUARANTINE_REASONS[0],
      quarantineNotes: "",
    });
    setFormErrors({});
    setSelectedBatch(null);
    setModalMode("receive");
  };

  // View Batch Dossier
  const handleOpenViewModal = (batch) => {
    setSelectedBatch(batch);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedBatch(null);
    setFormErrors({});
  };

  // When PO is chosen in dropdown, auto-populate details while keeping location on currentFacility
  const handlePoChange = (e) => {
    const poNum = e.target.value;
    const po = requestedOrders.find((p) => p.orderNumber === poNum);

    if (po) {
      setReceiveFormData((prev) => ({
        ...prev,
        poNumber: po.orderNumber,
        sku: po.sku,
        batchNumber: `BAT-${po.orderNumber.replace("PO-", "")}`,
        quantity: po.quantity,
        location: currentFacilityName,
      }));
    } else {
      setReceiveFormData((prev) => ({
        ...prev,
        poNumber: poNum,
        location: currentFacilityName,
      }));
    }
  };

  // Submit Received Batch
  const handleSaveReceivedBatch = (e) => {
    e.preventDefault();
    const errors = {};

    if (!receiveFormData.poNumber) {
      errors.poNumber = "Please select a Purchase Order (PO).";
    }
    if (!receiveFormData.batchNumber.trim()) {
      errors.batchNumber = "Batch number is required.";
    } else {
      const exists = batchList.some(
        (b) =>
          b.batchNumber.toLowerCase() ===
          receiveFormData.batchNumber.trim().toLowerCase(),
      );
      if (exists)
        errors.batchNumber = "Batch number already exists in inventory.";
    }
    if (!receiveFormData.manufacturingDate) {
      errors.manufacturingDate = "Manufacturing date is required.";
    }
    if (!receiveFormData.expiryDate) {
      errors.expiryDate = "Expiry date is required.";
    }
    if (
      receiveFormData.manufacturingDate &&
      receiveFormData.expiryDate &&
      new Date(receiveFormData.expiryDate) <=
        new Date(receiveFormData.manufacturingDate)
    ) {
      errors.expiryDate = "Expiry date must be after manufacturing date.";
    }
    if (Number(receiveFormData.quantity) <= 0) {
      errors.quantity = "Received quantity must be greater than 0.";
    }

    if (receiveFormData.isQuarantined && !receiveFormData.quarantineReason) {
      errors.quarantineReason = "Please specify a quarantine reason.";
    }

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
      location: currentFacilityName, // Automatically saved to current facility
      poReference: receiveFormData.poNumber,
      isQuarantined: receiveFormData.isQuarantined,
      quarantineReason: receiveFormData.isQuarantined
        ? receiveFormData.quarantineReason
        : "",
      quarantineDate: receiveFormData.isQuarantined
        ? new Date().toISOString().split("T")[0]
        : "",
      quarantineNotes: receiveFormData.isQuarantined
        ? receiveFormData.quarantineNotes
        : "",
    };

    setBatchList((prev) => [newBatch, ...prev]);
    handleCloseModal();
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Batch Management & Expiry Control
            </h1>
            {/* Active Facility Indicator */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentFacilityName}</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Displaying active batches, expiration tracking, and stock intake for{" "}
            <span className="font-semibold text-gray-700">
              {currentFacilityName}
            </span>
          </p>
        </div>

        {/* Receive Stock Action */}
        <button
          type="button"
          onClick={handleOpenReceiveModal}
          className="btn-primary self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Receive Stock via PO</span>
        </button>
      </div>

      {/* 4 Metric KPI Cards for Current Facility */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Batches in Facility */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Facility Batches
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalBatches}
              </h3>
              <span className="inline-block text-[11px] font-medium text-blue-600 mt-1 truncate max-w-44">
                At {currentFacilityName}
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
                  Facility Location
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Details
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

                      {/* Location */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate max-w-44 font-medium">
                            {batch.location}
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

                      {/* View Action */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <button
                          type="button"
                          onClick={() => handleOpenViewModal(batch)}
                          className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                          title="View Batch Dossier"
                          aria-label="View Batch Dossier"
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
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">
                      No batches found for {currentFacilityName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search query or receiving stock via PO
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
      {/* 1. MODULE: RECEIVE STOCK VIA PURCHASE ORDER (PO) MODAL   */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "receive"}
        onClose={handleCloseModal}
        title="Receive Stock via Purchase Order"
        size="lg"
      >
        <form onSubmit={handleSaveReceivedBatch} className="space-y-4">
          {/* PO Number Dropdown */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
            <label
              htmlFor="receive-po-select"
              className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5"
            >
              Select Purchase Order (PO Number){" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="receive-po-select"
                value={receiveFormData.poNumber}
                onChange={handlePoChange}
                className="input bg-white font-medium text-xs pr-8"
              >
                <option value="">-- Choose a Purchase Order --</option>
                {requestedOrders.map((po) => (
                  <option key={po.id} value={po.orderNumber}>
                    {po.orderNumber} — {po.brandName} ({po.quantity} units) •{" "}
                    {po.supplierName} [{po.status}]
                  </option>
                ))}
              </select>
            </div>
            {formErrors.poNumber && (
              <p className="text-xs text-red-500 mt-1">{formErrors.poNumber}</p>
            )}
          </div>

          {/* PO Selected Details Card */}
          {selectedPoDetails ? (
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2.5">
              <div className="flex items-start justify-between gap-2 border-b border-gray-200 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">
                      {selectedPoDetails.brandName}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                      {selectedPoDetails.sku}
                    </span>
                  </div>
                  <p className="text-gray-500 mt-0.5">
                    {selectedPoDetails.genericName} • {selectedPoDetails.dosage}{" "}
                    ({selectedPoDetails.packagingUnit})
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedPoDetails.status === "Approved"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {selectedPoDetails.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Truck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate font-medium">
                    {selectedPoDetails.supplierName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate font-medium">
                    {selectedPoDetails.targetFacility}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>
                    Ordered:{" "}
                    <strong>
                      {selectedPoDetails.quantity.toLocaleString()} units
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Please select a PO above to auto-load its receiving stock
                specifications.
              </span>
            </div>
          )}

          {/* Batch & Inspection Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Batch Number */}
            <div>
              <label
                htmlFor="receive-batch-number"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Lot / Batch Number <span className="text-red-500">*</span>
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
                placeholder="BAT-2026-0103"
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
                Received Quantity (Units){" "}
                <span className="text-red-500">*</span>
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

            {/* Automatically Detected Facility (No Dropdown) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Receiving Storage Facility (Auto-Detected)
              </label>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-gray-900 block truncate">
                    {currentFacilityName}
                  </span>
                  <span className="text-[11px] text-blue-700 font-medium">
                    Current Working Facility Session
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* QUARANTINE ACTION IN RECEIVING STOCK                     */}
          {/* ======================================================== */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Quality Inspection & Quarantine Action
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Evaluate lot integrity upon receiving before releasing to
                    active dispensing.
                  </p>
                </div>

                {/* Quarantine Checkbox / Toggle */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiveFormData.isQuarantined}
                    onChange={(e) =>
                      setReceiveFormData((prev) => ({
                        ...prev,
                        isQuarantined: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {receiveFormData.isQuarantined ? (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 space-y-3 mt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>
                      Quarantine Active: This lot will be locked upon receipt
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="receive-quarantine-reason"
                      className="block text-[11px] font-semibold text-red-900 uppercase tracking-wider mb-1"
                    >
                      Quarantine Cause / Deficiency{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="receive-quarantine-reason"
                      value={receiveFormData.quarantineReason}
                      onChange={(e) =>
                        setReceiveFormData((prev) => ({
                          ...prev,
                          quarantineReason: e.target.value,
                        }))
                      }
                      className="input bg-white text-xs"
                    >
                      {QUARANTINE_REASONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                    {formErrors.quarantineReason && (
                      <p className="text-xs text-red-500 mt-1">
                        {formErrors.quarantineReason}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="receive-quarantine-notes"
                      className="block text-[11px] font-semibold text-red-900 uppercase tracking-wider mb-1"
                    >
                      QA Receiving Notes / Remarks
                    </label>
                    <input
                      id="receive-quarantine-notes"
                      type="text"
                      value={receiveFormData.quarantineNotes}
                      onChange={(e) =>
                        setReceiveFormData((prev) => ({
                          ...prev,
                          quarantineNotes: e.target.value,
                        }))
                      }
                      placeholder="e.g. Temperature recorder logged 14°C excursion during freight"
                      className="input bg-white text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Quality Inspection Passed — Batch will be released directly
                    to available stock.
                  </span>
                </div>
              )}
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
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Stock Receipt</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. VIEW BATCH DETAILS MODAL (Read-Only Dossier)          */}
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
                  {selectedBatch.poReference && (
                    <span className="font-mono text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      PO: {selectedBatch.poReference}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-gray-100 bg-white">
                <span className="text-gray-400 block mb-0.5">
                  Quantity on Hand
                </span>
                <span className="font-bold text-gray-900 text-base">
                  {selectedBatch.quantity.toLocaleString()}{" "}
                  <span className="text-xs text-gray-500 font-normal">
                    units
                  </span>
                </span>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white">
                <span className="text-gray-400 block mb-0.5">
                  Expiry Status
                </span>
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
                <span className="text-gray-400 block mb-0.5">
                  Expiration Date
                </span>
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
                    Quarantine Cause
                  </span>
                  <p className="font-semibold">
                    {selectedBatch.quarantineReason}
                  </p>
                  {selectedBatch.quarantineDate && (
                    <span className="text-[10px] text-red-600 block">
                      Enforced on: {selectedBatch.quarantineDate}
                    </span>
                  )}
                  {selectedBatch.quarantineNotes && (
                    <p className="text-[11px] text-gray-600 italic">
                      Remarks: "{selectedBatch.quarantineNotes}"
                    </p>
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
                Close Dossier
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default BatchManagement;
