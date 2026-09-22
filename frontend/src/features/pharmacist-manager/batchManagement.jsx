import { useState, useMemo, useEffect, useCallback } from "react";
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
  Loader2,
} from "lucide-react";

// Common Components & Guards
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import ComboBox from "./components/comboBox";
import { getExpiryStatus } from "../../utils/helpers";
import useAuth from "../../hooks/useAuth";
import useError from "../../hooks/useError";
import { validateBatchForm } from "../../validators/batch.validator";

// Service Imports
import orderService from "../../services/order";
import batchService from "../../services/batch";

function BatchManagement() {
  const { facility } = useAuth();

  // Automatically detect current active facility from auth session
  const currentFacilityName = useMemo(() => {
    return facility?.name || "Hospital Facility";
  }, [facility]);

  const activeFacilityId = useMemo(() => {
    return facility?.id || 1;
  }, [facility]);

  // Real batches loaded directly from backend API (no mock data fallback)
  const [batchList, setBatchList] = useState([]);

  const [isBatchesLoading, setIsBatchesLoading] = useState(false);
  const [batchesError, setBatchesError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkuFilter, setSelectedSkuFilter] = useState("ALL");
  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal State: Only 'receive' and 'view'
  const [modalMode, setModalMode] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Filter batches to display only those belonging to the current facility
  const currentFacilityBatches = useMemo(() => {
    return batchList.filter(
      (b) =>
        (b.facilityId && b.facilityId === activeFacilityId) ||
        !b.location ||
        b.location === currentFacilityName,
    );
  }, [batchList, activeFacilityId, currentFacilityName]);

  // Form State for Receive Stock via PO (Individual batch per SKU)
  const getInitialReceiveFormData = () => ({
    poNumber: "",
    items: [],
    location: currentFacilityName,
  });

  const [receiveFormData, setReceiveFormData] = useState(
    getInitialReceiveFormData,
  );

  // Quick autofill state for common dates across multi-SKU receipts
  const [bulkDates, setBulkDates] = useState({
    manufacturingDate: "",
    expiryDate: "",
  });

  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearErrors,
    clearError,
  } = useError();

  // Live Approved Purchase Orders for Current Facility
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  // Dynamically extract unique SKUs from real batches for filtering
  const availableSkus = useMemo(() => {
    const skuMap = new Map();
    currentFacilityBatches.forEach((b) => {
      if (b.sku && !skuMap.has(b.sku)) {
        skuMap.set(b.sku, {
          sku: b.sku,
          brandName: b.brandName || b.sku,
        });
      }
    });
    return Array.from(skuMap.values()).sort((a, b) =>
      a.sku.localeCompare(b.sku),
    );
  }, [currentFacilityBatches]);

  const normalizeApprovedOrder = useCallback(
    (po) => {
      const orderNumber =
        po.purchaseOrderNum ||
        po.poNumberFormatted ||
        `PO-${String(po.id).padStart(5, "0")}`;

      const items = (po.items || []).map((item) => ({
        id: item.id,
        skuId: item.skuId,
        sku: item.skuName || `SKU-${item.skuId}`,
        brandName: item.brandName || "Medicine",
        genericName: item.genericName || "—",
        dosageForm: item.dosageForm || "—",
        packagingUnit: item.packagingUnit || "—",
        quantity: Number(item.orderedUnits) || 0,
        price: Number(item.price) || 0,
      }));

      const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
      const firstItem = items[0] || {};

      return {
        id: po.id,
        orderNumber,
        status: po.status || "Approved",
        supplierName: po.supplierName || "Supplier",
        targetFacility: po.facilityName || currentFacilityName,
        facilityId: po.facilityId,
        totalQuantity: po.totalOrderedUnits ?? totalQuantity,
        totalPrice: po.totalPrice || 0,
        items,
        itemCount: items.length,
        brandName:
          items.length === 1
            ? firstItem.brandName
            : `${items.length} Medicines`,
        genericName:
          items.length === 1
            ? firstItem.genericName
            : items.map((i) => i.brandName).join(", "),
        sku: items.length === 1 ? firstItem.sku : "Multiple SKUs",
      };
    },
    [currentFacilityName],
  );

  const fetchApprovedOrders = useCallback(async () => {
    try {
      setIsOrdersLoading(true);
      setOrdersError(null);
      const data = await orderService.getAllOrders(
        activeFacilityId,
        "Approved",
      );
      if (Array.isArray(data)) {
        setApprovedOrders(
          data
            .filter((po) => po.status === "Approved")
            .map(normalizeApprovedOrder),
        );
      } else {
        setApprovedOrders([]);
      }
    } catch (err) {
      console.error("Failed to fetch approved orders:", err);
      setOrdersError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load approved purchase orders.",
      );
      setApprovedOrders([]);
    } finally {
      setIsOrdersLoading(false);
    }
  }, [activeFacilityId, normalizeApprovedOrder]);

  useEffect(() => {
    fetchApprovedOrders();
  }, [fetchApprovedOrders]);

  // Convert backend BatchResponseDto to table display model
  const mapBatchDtoToItem = useCallback(
    (dto) => {
      const isQuarantined = dto.status === "Quarantined";
      return {
        id: dto.id,
        batchNumber: dto.batchNum,
        sku: dto.skuName || `SKU-${dto.skuId || ""}`,
        brandName: dto.brandName || "Medicine",
        genericName: dto.genericName || "—",
        dosageForm: dto.dosageForm || "—",
        packagingUnit: dto.packagingUnit || "—",
        manufacturingDate: dto.manufactureDate,
        expiryDate: dto.expiryDate,
        quantity: Number(dto.units ?? dto.quantity) || 0,
        units: Number(dto.units ?? dto.quantity) || 0,
        location: dto.facilityName || currentFacilityName,
        facilityId: dto.facilityId,
        poReference:
          dto.poNumber ||
          (dto.orderId
            ? `PO-${String(dto.orderId).padStart(5, "0")}`
            : "Direct Receipt"),
        isQuarantined,
        quarantineReason: isQuarantined
          ? dto.notes || "Quality inspection hold"
          : "",
        quarantineDate: dto.receivedAt ? dto.receivedAt.split("T")[0] : "",
        quarantineNotes: dto.notes || "",
        status: dto.status,
        receivedAt: dto.receivedAt,
        orderedItemId: dto.orderedItemId,
      };
    },
    [currentFacilityName],
  );

  // Fetch batches for current active facility from backend
  const fetchBatches = useCallback(async () => {
    if (!activeFacilityId) {
      setBatchList([]);
      return;
    }
    try {
      setIsBatchesLoading(true);
      setBatchesError(null);
      const data = await batchService.getBatchesByFacility(activeFacilityId);
      if (Array.isArray(data)) {
        setBatchList(data.map(mapBatchDtoToItem));
      } else {
        setBatchList([]);
      }
    } catch (err) {
      console.error("Failed to load batches from server:", err);
      setBatchesError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load batches from server.",
      );
      setBatchList([]);
    } finally {
      setIsBatchesLoading(false);
    }
  }, [activeFacilityId, mapBatchDtoToItem]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Selected PO Details lookup from real approved orders
  const selectedPoDetails = useMemo(() => {
    return approvedOrders.find(
      (po) => po.orderNumber === receiveFormData.poNumber,
    );
  }, [approvedOrders, receiveFormData.poNumber]);

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
      const brandName = batch.brandName || "";
      const genericName = batch.genericName || "";

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
    setReceiveFormData(getInitialReceiveFormData());
    setBulkDates({ manufacturingDate: "", expiryDate: "" });
    clearErrors();
    setSelectedBatch(null);
    setModalMode("receive");
    fetchApprovedOrders();
  };

  // View Batch Dossier
  const handleOpenViewModal = (batch) => {
    setSelectedBatch(batch);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedBatch(null);
    setBulkDates({ manufacturingDate: "", expiryDate: "" });
    clearErrors();
  };

  // When PO is chosen in dropdown, auto-populate SKU items so each gets its own batch
  const handlePoChange = (e) => {
    const poNum = e?.target?.value ?? e;
    const po = approvedOrders.find((p) => p.orderNumber === poNum);

    if (po) {
      setReceiveFormData({
        poNumber: po.orderNumber,
        location: currentFacilityName,
        items: (po.items || []).map((item) => ({
          orderedItemId: item.id,
          skuId: item.skuId,
          sku: item.sku,
          brandName: item.brandName,
          genericName: item.genericName,
          dosageForm: item.dosageForm,
          packagingUnit: item.packagingUnit,
          quantity: item.quantity,
          batchNumber: "",
          manufacturingDate: "",
          expiryDate: "",
          isQuarantined: false,
          quarantineNotes: "",
        })),
      });
    } else {
      setReceiveFormData(getInitialReceiveFormData());
    }
    clearErrors();
  };

  // Update batch details for an individual SKU item
  const handleItemBatchChange = (index, field, value) => {
    setReceiveFormData((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = {
        ...nextItems[index],
        [field]: value,
      };
      return {
        ...prev,
        items: nextItems,
      };
    });

    const errorKey = `item_${index}_${field}`;
    if (formErrors[errorKey]) {
      clearError(errorKey);
    }
  };

  // Apply common dates across all SKUs in the current PO
  const handleApplyBulkDates = () => {
    if (!bulkDates.manufacturingDate && !bulkDates.expiryDate) return;

    setReceiveFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({
        ...item,
        manufacturingDate: bulkDates.manufacturingDate || item.manufacturingDate,
        expiryDate: bulkDates.expiryDate || item.expiryDate,
      })),
    }));

    if (bulkDates.manufacturingDate) {
      receiveFormData.items.forEach((_, idx) => {
        clearError(`item_${idx}_manufacturingDate`);
      });
    }
    if (bulkDates.expiryDate) {
      receiveFormData.items.forEach((_, idx) => {
        clearError(`item_${idx}_expiryDate`);
      });
    }
  };

  // Submit Received Batches: creates a distinct batch intake per SKU
  const handleSaveReceivedBatch = async (e) => {
    e.preventDefault();

    if (!receiveFormData.poNumber) {
      setFormErrors({ poNumber: "Please select a Purchase Order (PO)." });
      return;
    }

    if (
      !selectedPoDetails ||
      !receiveFormData.items ||
      receiveFormData.items.length === 0
    ) {
      setFormErrors({
        poNumber: "Selected purchase order contains no medicines to receive.",
      });
      return;
    }

    const { errors, isValid } = validateBatchForm(receiveFormData, {
      batchList,
    });

    if (!isValid) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      clearErrors();

      // Format payload for backend batch bulk endpoint
      const batchPayload = receiveFormData.items.map((item) => ({
        facilityId: activeFacilityId,
        orderedItemId: item.orderedItemId || item.id,
        batchNum: item.batchNumber.trim().toUpperCase(),
        manufactureDate: item.manufacturingDate,
        expiryDate: item.expiryDate,
        status: item.isQuarantined ? "Quarantined" : "Available",
        notes: item.isQuarantined
          ? item.quarantineNotes || "Quality inspection hold"
          : null,
      }));

      // Call backend bulk batch intake API (this increments Sku.units by orderedItem.orderedUnits)
      const savedBatchDtos = await batchService.receiveBatchesBulk(batchPayload);

      if (Array.isArray(savedBatchDtos) && savedBatchDtos.length > 0) {
        const newlyCreated = savedBatchDtos.map(mapBatchDtoToItem);
        setBatchList((prev) => [...newlyCreated, ...prev]);
      }

      // Re-fetch batches and orders to synchronize frontend state
      await Promise.all([fetchBatches(), fetchApprovedOrders()]);

      handleCloseModal();
    } catch (err) {
      console.error("Failed to receive batch:", err);
      const serverMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to receive batch. Please verify batch numbers and dates.";
      setFormErrors({ general: serverMessage });
    } finally {
      setIsSubmitting(false);
    }
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
              {availableSkus.map((s) => (
                <option key={s.sku} value={s.sku}>
                  {s.sku} {s.brandName ? `(${s.brandName})` : ""}
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
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isBatchesLoading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-spin" />
                    <p className="text-sm font-medium text-gray-600">
                      Loading batches for {currentFacilityName}...
                    </p>
                  </td>
                </tr>
              ) : paginatedBatches.length > 0 ? (
                paginatedBatches.map((batch) => {
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
                              {batch.brandName || "Medicine"}{" "}
                              <span className="text-gray-400 font-normal">
                                (
                                {batch.genericName || "—"}{" "}
                                •{" "}
                                {batch.dosageForm || "Standard"}
                                )
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
                          {batch.packagingUnit || "Standard Packaging"}
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
                    colSpan="5"
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
        size="4xl"
      >
        <form onSubmit={handleSaveReceivedBatch} className="space-y-4">
          {formErrors.general && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formErrors.general}</span>
            </div>
          )}

          {/* PO Number Dropdown */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
            {isOrdersLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading approved purchase orders...</span>
              </div>
            ) : approvedOrders.length === 0 ? (
              <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    No approved purchase orders found.
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Only orders with "Approved" status for {currentFacilityName}{" "}
                    can be received into inventory.
                  </p>
                </div>
              </div>
            ) : (
              <ComboBox
                id="receive-po-select"
                name="poNumber"
                label="Select Purchase Order (Approved PO Number)"
                labelClassName="text-blue-900 font-bold"
                required
                options={approvedOrders}
                value={receiveFormData.poNumber}
                onChange={handlePoChange}
                placeholder="-- Choose or search an Approved Purchase Order --"
                getOptionValue={(po) => po.orderNumber}
                getOptionLabel={(po) => `${po.orderNumber}`}
                getOptionSubtext={(po) =>
                  `${po.totalQuantity.toLocaleString()} units • ${po.supplierName} [Approved]`
                }
                getDisplayValue={(po) =>
                  `${po.orderNumber} — ${po.supplierName}`
                }
                error={formErrors.poNumber}
              />
            )}
            {ordersError && (
              <p className="text-xs text-red-500 mt-1">{ordersError}</p>
            )}
          </div>

          {/* PO Selected Details Card */}
          {selectedPoDetails ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2 border-b border-gray-200 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-900 text-sm">
                        {selectedPoDetails.orderNumber}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {selectedPoDetails.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">
                      Supplier:{" "}
                      <span className="font-semibold text-gray-800">
                        {selectedPoDetails.supplierName}
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-gray-500 block">
                      Total PO Units
                    </span>
                    <span className="font-mono font-bold text-blue-800 text-sm">
                      {selectedPoDetails.totalQuantity?.toLocaleString()} units
                    </span>
                  </div>
                </div>

                <div className="flex justify-between gap-2.5 text-[11px]">
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
                      Items:{" "}
                      <strong>
                        {selectedPoDetails.items.length}{" "}
                        {selectedPoDetails.items.length === 1
                          ? "medicine"
                          : "medicines"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Quick Autofill Dates Bar (for multi-item POs) */}
              {receiveFormData.items?.length > 1 && (
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs">
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Quick Autofill Dates across All Medicines (Optional):</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <input
                        type="date"
                        value={bulkDates.manufacturingDate}
                        onChange={(e) =>
                          setBulkDates((prev) => ({
                            ...prev,
                            manufacturingDate: e.target.value,
                          }))
                        }
                        title="Common Manufacturing Date"
                        className="input py-1 px-2 text-xs bg-white w-36"
                      />
                      <input
                        type="date"
                        value={bulkDates.expiryDate}
                        onChange={(e) =>
                          setBulkDates((prev) => ({
                            ...prev,
                            expiryDate: e.target.value,
                          }))
                        }
                        title="Common Expiration Date"
                        className="input py-1 px-2 text-xs bg-white w-36"
                      />
                      <button
                        type="button"
                        onClick={handleApplyBulkDates}
                        className="btn-secondary py-1 px-2.5 text-xs text-blue-700 border-blue-300 hover:bg-blue-50 cursor-pointer whitespace-nowrap"
                      >
                        Apply Dates to All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Per-SKU Stock Intake Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-600" />
                    Medicines to Receive ({receiveFormData.items?.length || 0}) — Individual Batch Allocation
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Each SKU receives its own lot & expiration data
                  </span>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {receiveFormData.items?.map((item, idx) => (
                    <div
                      key={item.orderedItemId || item.sku || idx}
                      className="p-4 rounded-xl border border-gray-200 bg-white shadow-xs space-y-3"
                    >
                      {/* SKU Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-sm">
                                {item.brandName}
                              </span>
                              <span className="font-mono text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                                {item.sku}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {item.genericName} • {item.dosageForm} ({item.packagingUnit})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Delivered:</span>
                          <span className="font-mono font-bold text-gray-900 text-sm bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-lg">
                            {Number(item.quantity || 0).toLocaleString()} units
                          </span>
                        </div>
                      </div>

                      {/* Batch Inputs for this specific SKU */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Batch / Lot Number */}
                        <div>
                          <label
                            htmlFor={`receive-batch-number-${idx}`}
                            className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1"
                          >
                            Lot / Batch Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            id={`receive-batch-number-${idx}`}
                            type="text"
                            value={item.batchNumber || ""}
                            onChange={(e) =>
                              handleItemBatchChange(idx, "batchNumber", e.target.value)
                            }
                            placeholder={`e.g. BAT-${item.sku.replace("SKU-", "")}-01`}
                            className={`input uppercase font-mono text-xs ${
                              formErrors[`item_${idx}_batchNumber`]
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                                : ""
                            }`}
                          />
                          {formErrors[`item_${idx}_batchNumber`] && (
                            <p className="text-[11px] text-red-500 mt-1">
                              {formErrors[`item_${idx}_batchNumber`]}
                            </p>
                          )}
                        </div>

                        {/* Manufacturing Date */}
                        <div>
                          <label
                            htmlFor={`receive-batch-mfg-${idx}`}
                            className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1"
                          >
                            Manufacturing Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            id={`receive-batch-mfg-${idx}`}
                            type="date"
                            value={item.manufacturingDate || ""}
                            onChange={(e) =>
                              handleItemBatchChange(idx, "manufacturingDate", e.target.value)
                            }
                            className={`input text-xs ${
                              formErrors[`item_${idx}_manufacturingDate`]
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                                : ""
                            }`}
                          />
                          {formErrors[`item_${idx}_manufacturingDate`] && (
                            <p className="text-[11px] text-red-500 mt-1">
                              {formErrors[`item_${idx}_manufacturingDate`]}
                            </p>
                          )}
                        </div>

                        {/* Expiration Date */}
                        <div>
                          <label
                            htmlFor={`receive-batch-exp-${idx}`}
                            className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1"
                          >
                            Expiration Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            id={`receive-batch-exp-${idx}`}
                            type="date"
                            value={item.expiryDate || ""}
                            onChange={(e) =>
                              handleItemBatchChange(idx, "expiryDate", e.target.value)
                            }
                            className={`input text-xs ${
                              formErrors[`item_${idx}_expiryDate`]
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                                : ""
                            }`}
                          />
                          {formErrors[`item_${idx}_expiryDate`] && (
                            <p className="text-[11px] text-red-500 mt-1">
                              {formErrors[`item_${idx}_expiryDate`]}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quarantine / Inspection Checkbox for this SKU */}
                      <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(item.isQuarantined)}
                            onChange={(e) =>
                              handleItemBatchChange(idx, "isQuarantined", e.target.checked)
                            }
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            Flag / Quarantine this medicine (Inspection Required)
                          </span>
                        </label>

                        {item.isQuarantined && (
                          <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            Will be locked upon receipt
                          </span>
                        )}
                      </div>

                      {item.isQuarantined && (
                        <div>
                          <label
                            htmlFor={`receive-batch-quarantine-notes-${idx}`}
                            className="block text-[11px] font-semibold text-red-900 uppercase tracking-wider mb-1"
                          >
                            Quarantine Notes / QA Remarks <span className="text-red-500">*</span>
                          </label>
                          <input
                            id={`receive-batch-quarantine-notes-${idx}`}
                            type="text"
                            value={item.quarantineNotes || ""}
                            onChange={(e) =>
                              handleItemBatchChange(idx, "quarantineNotes", e.target.value)
                            }
                            placeholder="e.g. Temperature recorder logged 14°C excursion during freight"
                            className={`input text-xs bg-red-50/20 ${
                              formErrors[`item_${idx}_quarantineNotes`]
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                                : ""
                            }`}
                          />
                          {formErrors[`item_${idx}_quarantineNotes`] && (
                            <p className="text-[11px] text-red-500 mt-1">
                              {formErrors[`item_${idx}_quarantineNotes`]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Please select an approved PO above to auto-load its receiving
                stock specifications.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedPoDetails ||
                !receiveFormData.items ||
                receiveFormData.items.length === 0
              }
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording Stock...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Confirm Stock Receipt
                    {receiveFormData.items?.length > 1
                      ? ` (All ${receiveFormData.items.length} Medicines)`
                      : ""}
                  </span>
                </>
              )}
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
                  {selectedBatch.brandName || "Medicine"}{" "}
                  <span className="text-gray-400 font-normal">
                    ({selectedBatch.genericName || "—"} •{" "}
                    {selectedBatch.dosageForm || "Standard"})
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
                    Quarantine Status
                  </span>
                  {selectedBatch.quarantineReason && (
                    <p className="font-semibold">
                      {selectedBatch.quarantineReason}
                    </p>
                  )}
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
