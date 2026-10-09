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
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Common Components & Guards
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import Dropdown from "../../components/common/dropdown";
import ComboBox from "./components/comboBox";
import Skeleton from "../../components/common/skeleton";
import { getExpiryStatus } from "../../helpers/inventory";
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
    return facility?.name || "";
  }, [facility]);

  const activeFacilityId = useMemo(() => {
    return facility?.id || null;
  }, [facility]);

  // Real batches loaded directly from backend API (server-side paginated)
  const [batchList, setBatchList] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [batchSummary, setBatchSummary] = useState({
    totalBatches: 0,
    totalActiveStock: 0,
    expiryAlertCount: 0,
    quarantinedCount: 0,
  });
  const [distinctSkus, setDistinctSkus] = useState([]);

  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isBatchesLoading, setIsBatchesLoading] = useState(true);
  const [batchesError, setBatchesError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateStatusError, setUpdateStatusError] = useState(null);
  const [updateStatusSuccess, setUpdateStatusSuccess] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkuFilter, setSelectedSkuFilter] = useState("ALL");
  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal State: Only 'receive' and 'view'
  const [modalMode, setModalMode] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);

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

  // Collapsed state for SKU batches in the Receive modal
  const [collapsedSkus, setCollapsedSkus] = useState({});

  const toggleSkuCollapse = (skuKey) => {
    setCollapsedSkus((prev) => ({
      ...prev,
      [skuKey]: !prev[skuKey],
    }));
  };

  const handleCollapseAll = () => {
    const next = {};
    (receiveFormData.items || []).forEach((item, idx) => {
      const k = item.orderedItemId || item.sku || idx;
      next[k] = true;
    });
    setCollapsedSkus(next);
  };

  const handleExpandAll = () => {
    setCollapsedSkus({});
  };

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

  // Dynamically extract unique SKUs from server for filtering
  const availableSkus = useMemo(() => {
    return distinctSkus.map((skuName) => ({
      sku: skuName,
      brandName: "",
    }));
  }, [distinctSkus]);

  const normalizeApprovedOrder = useCallback(
    (po) => {
      const orderNumber =
        po.purchaseOrderNum ||
        po.poNumberFormatted ||
        `PO-${String(po.id).padStart(5, "0")}`;

      const items = (po.items || []).map((item) => {
        const orderedUnits = Number(item.orderedUnits) || 0;
        const receivedUnits = Number(item.receivedUnits) || 0;
        const remainingUnits = Math.max(0, orderedUnits - receivedUnits);

        return {
          id: item.id,
          skuId: item.skuId,
          sku: item.skuName || `SKU-${item.skuId}`,
          brandName: item.brandName || "Medicine",
          genericName: item.genericName || "—",
          dosageForm: item.dosageForm || "—",
          packagingUnit: item.packagingUnit || "—",
          quantity: remainingUnits,
          orderedUnits,
          receivedUnits,
          remainingUnits,
          price: Number(item.price) || 0,
        };
      });

      const totalOrdered =
        po.totalOrderedUnits ??
        items.reduce((sum, i) => sum + i.orderedUnits, 0);
      const totalReceived =
        po.totalReceivedUnits ??
        items.reduce((sum, i) => sum + i.receivedUnits, 0);
      const totalRemaining = Math.max(0, totalOrdered - totalReceived);
      const firstItem = items[0] || {};

      return {
        id: po.id,
        orderNumber,
        status: po.status || "Approved",
        supplierName: po.supplierName || "Supplier",
        targetFacility: po.facilityName || currentFacilityName,
        facilityId: po.facilityId,
        totalQuantity: totalOrdered,
        totalReceivedUnits: totalReceived,
        totalRemainingUnits: totalRemaining,
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
    if (!activeFacilityId) {
      setApprovedOrders([]);
      return;
    }
    try {
      setIsOrdersLoading(true);
      setOrdersError(null);
      const data = await orderService.getAllOrders(
        activeFacilityId,
        ["Approved", "Partially_Received"],
      );
      if (Array.isArray(data)) {
        setApprovedOrders(
          data
            .filter(
              (po) =>
                po.status === "Approved" ||
                po.status === "Partially_Received",
            )
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

  // Fetch aggregate KPIs and distinct SKUs for active facility
  const fetchSummaryAndSkus = useCallback(async () => {
    if (!activeFacilityId) {
      setIsSummaryLoading(false);
      return;
    }
    try {
      setIsSummaryLoading(true);
      const [summaryData, skusData] = await Promise.all([
        batchService.getBatchSummary(activeFacilityId),
        batchService.getDistinctBatchSkus(activeFacilityId),
      ]);
      if (summaryData) {
        setBatchSummary(summaryData);
      }
      if (Array.isArray(skusData)) {
        setDistinctSkus(skusData);
      }
    } catch (err) {
      console.error("Failed to load batch summary or distinct SKUs:", err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [activeFacilityId]);

  // Fetch paginated batches for active facility from backend
  const fetchBatches = useCallback(async () => {
    if (!activeFacilityId) {
      setBatchList([]);
      setTotalElements(0);
      setTotalPages(1);
      return;
    }
    try {
      setIsBatchesLoading(true);
      setBatchesError(null);
      const pageData = await batchService.getBatchesPaginated({
        facilityId: activeFacilityId,
        search: searchQuery.trim(),
        sku: selectedSkuFilter,
        status: selectedStatusFilter,
        expiryFilter: selectedExpiryFilter,
        page: currentPage - 1,
        size: itemsPerPage,
      });

      if (pageData && Array.isArray(pageData.content)) {
        setBatchList(pageData.content.map(mapBatchDtoToItem));
        setTotalElements(pageData.totalElements ?? pageData.content.length);
        setTotalPages(pageData.totalPages ?? 1);
      } else {
        setBatchList([]);
        setTotalElements(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load batches from server:", err);
      setBatchesError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load batches from server.",
      );
      setBatchList([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setIsBatchesLoading(false);
    }
  }, [
    activeFacilityId,
    searchQuery,
    selectedSkuFilter,
    selectedStatusFilter,
    selectedExpiryFilter,
    currentPage,
    itemsPerPage,
    mapBatchDtoToItem,
  ]);

  useEffect(() => {
    fetchSummaryAndSkus();
  }, [fetchSummaryAndSkus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBatches();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchBatches]);

  // Selected PO Details lookup from real approved orders
  const selectedPoDetails = useMemo(() => {
    return approvedOrders.find(
      (po) => po.orderNumber === receiveFormData.poNumber,
    );
  }, [approvedOrders, receiveFormData.poNumber]);

  // Summary KPI Calculations for Current Facility (Server Aggregated)
  const totalBatches = batchSummary.totalBatches;
  const totalActiveStock = batchSummary.totalActiveStock;
  const expiryAlertCount = batchSummary.expiryAlertCount;
  const quarantinedCount = batchSummary.quarantinedCount;

  // Server-paginated batches displayed on active page
  const paginatedBatches = batchList;

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
    setCollapsedSkus({});
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
    setCollapsedSkus({});
    setUpdateStatusError(null);
    setUpdateStatusSuccess(null);
    clearErrors();
  };

  // Change batch status from Quarantined to Available
  const handleReleaseFromQuarantine = async (batchId) => {
    if (!batchId) return;
    try {
      setIsUpdatingStatus(true);
      setUpdateStatusError(null);
      setUpdateStatusSuccess(null);
      const updatedDto = await batchService.updateBatchStatus(
        batchId,
        "Available",
        "Released from quarantine by pharmacist",
      );

      const mapped = mapBatchDtoToItem(updatedDto);
      await Promise.all([fetchBatches(), fetchSummaryAndSkus()]);
      setSelectedBatch(mapped);
      setUpdateStatusSuccess(
        `Batch ${mapped.batchNumber} successfully released to Available. Total units: ${mapped.units?.toLocaleString() || mapped.units}.`,
      );
    } catch (err) {
      console.error("Failed to release batch from quarantine:", err);
      setUpdateStatusError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update batch status to Available.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // When PO is chosen in dropdown, auto-populate SKU items, each starting with 1 default batch row
  const handlePoChange = (e) => {
    const poNum = e?.target?.value ?? e;
    const po = approvedOrders.find((p) => p.orderNumber === poNum);

    if (po) {
      setReceiveFormData({
        poNumber: po.orderNumber,
        location: currentFacilityName,
        items: (po.items || []).map((item) => {
          const remainingUnits =
            item.remainingUnits !== undefined
              ? item.remainingUnits
              : item.quantity;

          return {
            orderedItemId: item.id,
            skuId: item.skuId,
            sku: item.sku,
            brandName: item.brandName,
            genericName: item.genericName,
            dosageForm: item.dosageForm,
            packagingUnit: item.packagingUnit,
            quantity: remainingUnits,
            orderedUnits: item.orderedUnits || item.quantity,
            receivedUnits: item.receivedUnits || 0,
            remainingUnits,
            batches:
              remainingUnits > 0
                ? [
                    {
                      id:
                        typeof crypto !== "undefined" && crypto.randomUUID
                          ? crypto.randomUUID()
                          : `b-${Date.now()}-0`,
                      batchNumber: "",
                      units: remainingUnits,
                      manufacturingDate: bulkDates.manufacturingDate || "",
                      expiryDate: bulkDates.expiryDate || "",
                      isQuarantined: false,
                      quarantineNotes: "",
                    },
                  ]
                : [],
          };
        }),
      });
      setCollapsedSkus({});
    } else {
      setReceiveFormData(getInitialReceiveFormData());
      setCollapsedSkus({});
    }
    clearErrors();
  };

  // Add another batch / lot row to an existing SKU
  const handleAddBatch = (itemIdx) => {
    const currentItem = receiveFormData.items?.[itemIdx];
    if (currentItem) {
      const skuKey = currentItem.orderedItemId || currentItem.sku || itemIdx;
      setCollapsedSkus((prev) => ({ ...prev, [skuKey]: false }));
    }

    setReceiveFormData((prev) => {
      const nextItems = [...prev.items];
      const item = nextItems[itemIdx];
      const maxAllowed =
        item.remainingUnits !== undefined ? item.remainingUnits : item.quantity;
      const currentAllocated = (item.batches || []).reduce(
        (sum, b) => sum + (Number(b.units) || 0),
        0,
      );
      const remaining = Math.max(0, maxAllowed - currentAllocated);

      const newBatch = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `b-${Date.now()}-${Math.random()}`,
        batchNumber: "",
        units: remaining > 0 ? remaining : "",
        manufacturingDate: bulkDates.manufacturingDate || "",
        expiryDate: bulkDates.expiryDate || "",
        isQuarantined: false,
        quarantineNotes: "",
      };

      nextItems[itemIdx] = {
        ...item,
        batches: [...(item.batches || []), newBatch],
      };
      return { ...prev, items: nextItems };
    });

    if (formErrors[`item_${itemIdx}_allocation`]) {
      clearError(`item_${itemIdx}_allocation`);
    }
  };

  // Remove a batch row from an SKU (requires at least 1 batch to remain)
  const handleRemoveBatch = (itemIdx, batchIdx) => {
    setReceiveFormData((prev) => {
      const nextItems = [...prev.items];
      const item = nextItems[itemIdx];
      if ((item.batches || []).length <= 1) return prev;

      nextItems[itemIdx] = {
        ...item,
        batches: item.batches.filter((_, i) => i !== batchIdx),
      };
      return { ...prev, items: nextItems };
    });

    clearErrors();
  };

  // Update a field on a specific batch row
  const handleBatchFieldChange = (itemIdx, batchIdx, field, value) => {
    setReceiveFormData((prev) => {
      const nextItems = [...prev.items];
      const item = nextItems[itemIdx];
      const nextBatches = [...(item.batches || [])];
      nextBatches[batchIdx] = {
        ...nextBatches[batchIdx],
        [field]: value,
      };
      nextItems[itemIdx] = {
        ...item,
        batches: nextBatches,
      };
      return { ...prev, items: nextItems };
    });

    const errKey = `item_${itemIdx}_batch_${batchIdx}_${field}`;
    if (formErrors[errKey]) {
      clearError(errKey);
    }
    if (formErrors[`item_${itemIdx}_allocation`]) {
      clearError(`item_${itemIdx}_allocation`);
    }
  };

  // Apply common dates across all batch rows of all SKUs in the current PO
  const handleApplyBulkDates = () => {
    if (!bulkDates.manufacturingDate && !bulkDates.expiryDate) return;

    setReceiveFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({
        ...item,
        batches: (item.batches || []).map((b) => ({
          ...b,
          manufacturingDate: bulkDates.manufacturingDate || b.manufacturingDate,
          expiryDate: bulkDates.expiryDate || b.expiryDate,
        })),
      })),
    }));

    clearErrors();
  };

  // Submit Received Batches: creates all individual batch lots per SKU
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
      // Auto-expand any items that contain validation errors so user can review immediately
      setCollapsedSkus((prev) => {
        const next = { ...prev };
        receiveFormData.items.forEach((item, itemIdx) => {
          const hasError = Object.keys(errors).some((key) =>
            key.startsWith(`item_${itemIdx}_`),
          );
          if (hasError) {
            const skuKey = item.orderedItemId || item.sku || itemIdx;
            next[skuKey] = false;
          }
        });
        return next;
      });
      return;
    }

    if (!activeFacilityId) {
      setFormErrors({
        poNumber:
          "Operating facility could not be determined. Please re-select your active facility.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      clearErrors();

      // Flatten all batch rows across all SKUs into the bulk intake payload (only batches with units > 0)
      const batchPayload = [];

      receiveFormData.items.forEach((item) => {
        (item.batches || []).forEach((b) => {
          const units = Number(b.units);
          if (units > 0 && b.batchNumber?.trim()) {
            const isQuar = Boolean(b.isQuarantined);
            batchPayload.push({
              facilityId: activeFacilityId,
              orderedItemId: item.orderedItemId || item.id,
              batchNum: b.batchNumber.trim().toUpperCase(),
              units: units,
              manufactureDate: b.manufacturingDate,
              expiryDate: b.expiryDate,
              status: isQuar ? "Quarantined" : "Available",
              notes: isQuar
                ? b.quarantineNotes?.trim() || "Quality inspection hold"
                : null,
            });
          }
        });
      });

      if (batchPayload.length === 0) {
        setFormErrors({ general: "Please enter at least one batch with units to receive." });
        return;
      }

      // Call backend bulk batch intake API
      const savedBatchDtos =
        await batchService.receiveBatchesBulk(batchPayload);

      if (Array.isArray(savedBatchDtos) && savedBatchDtos.length > 0) {
        const newlyCreated = savedBatchDtos.map(mapBatchDtoToItem);
        setBatchList((prev) => [...newlyCreated, ...prev]);
      }

      // Re-fetch batches, summary, and orders to synchronize frontend state
      await Promise.all([
        fetchBatches(),
        fetchApprovedOrders(),
        fetchSummaryAndSkus(),
      ]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
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
            Displaying active batches, expiration tracking, and stock intake
          </p>
        </div>

        {/* Receive Stock Action */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              fetchBatches();
              fetchApprovedOrders();
              fetchSummaryAndSkus();
            }}
            disabled={isBatchesLoading || isSummaryLoading}
            className="btn-secondary p-2.5 text-gray-600 hover:text-blue-600"
            title="Refresh Batches"
            aria-label="Refresh Batches"
          >
            <RefreshCw
              className={`w-4 h-4 ${isBatchesLoading || isSummaryLoading ? "animate-spin text-blue-600" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={handleOpenReceiveModal}
            className="btn-primary shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Receive Stock via PO</span>
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards for Current Facility */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up-1">
        {/* Total Batches in Facility */}
        <Card className="p-5">
          {isSummaryLoading ? (
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-7 w-12 mt-1" />
                <Skeleton className="h-3 w-32 mt-1" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            </div>
          ) : (
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
          )}
        </Card>

        {/* Active Stock */}
        <Card className="p-5">
          {isSummaryLoading ? (
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-7 w-16 mt-1" />
                <Skeleton className="h-3 w-36 mt-1" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            </div>
          ) : (
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
          )}
        </Card>

        {/* Expiry Alerts */}
        <Card className="p-5">
          {isSummaryLoading ? (
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-7 w-12 mt-1" />
                <Skeleton className="h-3 w-32 mt-1" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            </div>
          ) : (
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
          )}
        </Card>

        {/* Quarantined Batches */}
        <Card className="p-5">
          {isSummaryLoading ? (
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-7 w-12 mt-1" />
                <Skeleton className="h-3 w-36 mt-1" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            </div>
          ) : (
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
          )}
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden border border-gray-200 animate-slide-up-2">
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
              placeholder="Search batch number or SKU..."
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* SKU Filter */}
            <Dropdown
              value={selectedSkuFilter}
              onChange={handleSkuFilterChange}
              size="sm"
              className="w-full sm:w-48"
              options={[
                { value: "ALL", label: "All SKUs" },
                ...availableSkus.map((s) => ({
                  value: s.sku,
                  label: `${s.sku} ${s.brandName ? `(${s.brandName})` : ""}`,
                })),
              ]}
            />

            {/* Expiry Health Filter */}
            <Dropdown
              value={selectedExpiryFilter}
              onChange={handleExpiryFilterChange}
              size="sm"
              className="w-full sm:w-36"
              options={[
                { value: "ALL", label: "All Expirations" },
                { value: "NEAR_EXPIRY", label: "Near Expiry (≤90d)" },
                { value: "EXPIRED", label: "Expired" },
                { value: "HEALTHY", label: "Valid Stock" },
              ]}
            />

            {/* Quarantine/Availability Filter */}
            <Dropdown
              value={selectedStatusFilter}
              onChange={handleStatusFilterChange}
              size="sm"
              className="w-full sm:w-36"
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "ACTIVE", label: "Active & Available" },
                { value: "QUARANTINED", label: "Quarantined Only" },
                { value: "EXPIRED", label: "Expired Only" },
                { value: "DEPLETED", label: "Depleted (0 Qty)" },
              ]}
            />
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
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    {/* Batch Number & SKU Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg shrink-0 mt-0.5" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-5 w-28 rounded" />
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                    </td>

                    {/* Manufacturing & Expiry */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </td>

                    {/* Units in Batch */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1.5">
                        <Skeleton className="h-5 w-20 rounded" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </td>

                    {/* Safety & Quarantine */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </td>

                    {/* Details */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Skeleton className="h-7 w-7 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : paginatedBatches.length > 0 ? (
                paginatedBatches.map((batch, index) => {
                  const expInfo = getExpiryStatus(batch.expiryDate);

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-blue-50/30 transition-colors animate-slide-up ${
                        batch.isQuarantined ? "bg-red-50/20" : ""
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
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
                                ({batch.genericName || "—"} •{" "}
                                {batch.dosageForm || "Standard"})
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
                        ) : batch.status === "Expired" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            Expired
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
        {totalElements > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalElements}
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
        size="5xl"
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
                getOptionSubtext={(po) => {
                  const isPart =
                    po.status === "Partially_Received" ||
                    po.status === "Partially Received";
                  return `${po.totalQuantity.toLocaleString()} units • ${po.supplierName} [${isPart ? "Partially Received" : "Approved"}]`;
                }}
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
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedPoDetails.status === "Partially_Received" ||
                          selectedPoDetails.status === "Partially Received"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {selectedPoDetails.status === "Partially_Received"
                          ? "Partially Received"
                          : selectedPoDetails.status}
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

                {/* Progress bar if partially received */}
                {Number(selectedPoDetails.totalReceivedUnits || 0) > 0 && (
                  <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-600 font-medium">
                        Fulfillment:
                      </span>
                      <span className="font-bold text-slate-900">
                        {(
                          selectedPoDetails.totalReceivedUnits || 0
                        ).toLocaleString()}{" "}
                        /{" "}
                        {selectedPoDetails.totalQuantity?.toLocaleString()}{" "}
                        units
                      </span>
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        {Math.round(
                          ((selectedPoDetails.totalReceivedUnits || 0) /
                            (selectedPoDetails.totalQuantity || 1)) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                    <div className="text-slate-600 font-medium">
                      Remaining:{" "}
                      <strong className="text-blue-900">
                        {(
                          selectedPoDetails.totalRemainingUnits || 0
                        ).toLocaleString()}{" "}
                        units
                      </strong>
                    </div>
                  </div>
                )}

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
                      <span>
                        Quick Autofill Dates across All Medicines (Optional):
                      </span>
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
                    Medicines to Receive ({receiveFormData.items?.length || 0})
                    — Multi-Batch Allocation
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCollapseAll}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                    >
                      Collapse All
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                      type="button"
                      onClick={handleExpandAll}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                    >
                      Expand All
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                  {receiveFormData.items?.map((item, idx) => {
                    const skuKey = item.orderedItemId || item.sku || idx;
                    const isCollapsed = Boolean(collapsedSkus[skuKey]);
                    const totalAllocated = (item.batches || []).reduce(
                      (sum, b) => sum + (Number(b.units) || 0),
                      0,
                    );
                    const orderedUnits = Number(
                      item.orderedUnits || item.quantity || 0,
                    );
                    const receivedUnits = Number(item.receivedUnits || 0);
                    const remainingUnits =
                      item.remainingUnits !== undefined
                        ? Number(item.remainingUnits)
                        : Math.max(0, orderedUnits - receivedUnits);

                    const isAllocatedMatch =
                      totalAllocated === remainingUnits && remainingUnits > 0;
                    const isOverAllocated = totalAllocated > remainingUnits;
                    const unallocatedForDelivery = remainingUnits - totalAllocated;

                    return (
                      <div
                        key={skuKey}
                        className="p-4 rounded-xl border border-gray-200 bg-white shadow-xs space-y-3"
                      >
                        {/* SKU Header & Allocation Summary */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100">
                              <Pill className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900 text-sm">
                                  {item.brandName}
                                </span>
                                <span className="font-mono text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                                  {item.sku}
                                </span>
                                {receivedUnits > 0 && (
                                  <span className="font-mono text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium">
                                    Ordered: {orderedUnits.toLocaleString()} • Prev: {receivedUnits.toLocaleString()} • Rem: {remainingUnits.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {item.genericName} • {item.dosageForm} (
                                {item.packagingUnit})
                              </p>
                            </div>
                          </div>

                          {/* Allocation Badges, Add Batch CTA & Collapse Toggle */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {remainingUnits <= 0 ? (
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Fully Received ({receivedUnits.toLocaleString()} units)
                              </span>
                            ) : isAllocatedMatch ? (
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                {totalAllocated.toLocaleString()} /{" "}
                                {remainingUnits.toLocaleString()} units (Fulfills remainder)
                              </span>
                            ) : isOverAllocated ? (
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                {totalAllocated.toLocaleString()} /{" "}
                                {remainingUnits.toLocaleString()} (+
                                {(
                                  totalAllocated - remainingUnits
                                ).toLocaleString()}{" "}
                                over)
                              </span>
                            ) : totalAllocated > 0 ? (
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                Partial: {totalAllocated.toLocaleString()} of{" "}
                                {remainingUnits.toLocaleString()} units (
                                {unallocatedForDelivery.toLocaleString()} pending)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg">
                                Not in this delivery (0 / {remainingUnits.toLocaleString()} units)
                              </span>
                            )}

                            {/* + Add Batch button */}
                            <button
                              type="button"
                              onClick={() => handleAddBatch(idx)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer shadow-2xs hover:border-blue-300"
                              title="Add another batch/lot for this SKU"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Batch</span>
                            </button>

                            {/* Collapse / Expand Toggle Button */}
                            <button
                              type="button"
                              onClick={() => toggleSkuCollapse(skuKey)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-gray-200 transition-colors cursor-pointer shadow-2xs"
                              title={
                                isCollapsed
                                  ? "Expand batches for this medicine"
                                  : "Collapse batches for this medicine"
                              }
                            >
                              <span>{isCollapsed ? "Expand" : "Collapse"}</span>
                              {isCollapsed ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Allocation Error notice */}
                        {formErrors[`item_${idx}_allocation`] && (
                          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                            <span className="font-semibold">
                              {formErrors[`item_${idx}_allocation`]}
                            </span>
                          </div>
                        )}

                        {/* Collapsed vs Expanded View */}
                        {isCollapsed ? (
                          /* Collapsed Single-Line Batch Summary */
                          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <Boxes className="w-3.5 h-3.5 text-blue-600" />
                                Batches ({(item.batches || []).length}):
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.batches?.map((b, bIdx) => {
                                  const batchName = b.batchNumber?.trim()
                                    ? b.batchNumber.trim().toUpperCase()
                                    : `Batch #${bIdx + 1} (Unassigned)`;
                                  const unitsDisplay =
                                    b.units !== "" && b.units !== undefined
                                      ? `${Number(b.units).toLocaleString()} units`
                                      : "0 units";

                                  return (
                                    <div
                                      key={b.id || bIdx}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${
                                        b.isQuarantined
                                          ? "bg-amber-50 text-amber-900 border-amber-200"
                                          : "bg-white text-slate-800 border-slate-200 shadow-2xs"
                                      }`}
                                    >
                                      <span className="font-bold text-slate-900">
                                        {batchName}
                                      </span>
                                      <span className="text-slate-300 font-sans">
                                        •
                                      </span>
                                      <span className="font-semibold text-blue-700 font-sans">
                                        {unitsDisplay}
                                      </span>
                                      {b.isQuarantined && (
                                        <span className="text-[10px] text-amber-700 bg-amber-100 px-1 py-0.2 rounded font-sans font-bold">
                                          Hold
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleSkuCollapse(skuKey)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer ml-auto"
                            >
                              <span>Edit Batches</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          /* Batch Rows for this specific SKU */
                          <div className="space-y-3">
                            {item.batches?.map((batch, bIdx) => {
                              const batchErrPrefix = `item_${idx}_batch_${bIdx}`;
                              return (
                                <div
                                  key={batch.id || bIdx}
                                  className="p-3.5 rounded-xl border border-gray-200/90 bg-gray-50/60 space-y-3 relative"
                                >
                                  {/* Batch Row Subheader */}
                                  <div className="flex items-center justify-between border-b border-gray-200/70 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-[11px] text-slate-700 bg-white border border-gray-200 px-2 py-0.5 rounded-md shadow-2xs">
                                        Batch #{bIdx + 1}
                                      </span>
                                      {batch.isQuarantined && (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded-md">
                                          Quarantine Hold Active
                                        </span>
                                      )}
                                    </div>

                                    {item.batches.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveBatch(idx, bIdx)
                                        }
                                        className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer text-xs flex items-center gap-1"
                                        title="Remove this batch"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                        <span className="text-[11px] font-medium text-red-600">
                                          Remove
                                        </span>
                                      </button>
                                    )}
                                  </div>

                                  {/* 4 Input Controls: Batch #, Units, Mfg Date, Expiry Date */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* Batch / Lot Number */}
                                    <div>
                                      <label
                                        htmlFor={`receive-batch-number-${idx}-${bIdx}`}
                                        className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1"
                                      >
                                        Lot / Batch Number{" "}
                                        <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        id={`receive-batch-number-${idx}-${bIdx}`}
                                        type="text"
                                        value={batch.batchNumber || ""}
                                        onChange={(e) =>
                                          handleBatchFieldChange(
                                            idx,
                                            bIdx,
                                            "batchNumber",
                                            e.target.value,
                                          )
                                        }
                                        placeholder={`e.g. BAT-${item.sku.replace("SKU-", "")}-${String(bIdx + 1).padStart(2, "0")}`}
                                        className={`input uppercase font-mono text-xs bg-white ${
                                          formErrors[
                                            `${batchErrPrefix}_batchNumber`
                                          ]
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                                            : ""
                                        }`}
                                      />
                                      {formErrors[
                                        `${batchErrPrefix}_batchNumber`
                                      ] && (
                                        <p className="text-[11px] text-red-500 mt-1">
                                          {
                                            formErrors[
                                              `${batchErrPrefix}_batchNumber`
                                            ]
                                          }
                                        </p>
                                      )}
                                    </div>

                                    {/* Units Received in this Batch */}
                                    <div>
                                      <label
                                        htmlFor={`receive-batch-units-${idx}-${bIdx}`}
                                        className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1"
                                      >
                                        Received Units{" "}
                                        <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        id={`receive-batch-units-${idx}-${bIdx}`}
                                        type="number"
                                        min="1"
                                        max={orderedUnits}
                                        value={batch.units}
                                        onChange={(e) =>
                                          handleBatchFieldChange(
                                            idx,
                                            bIdx,
                                            "units",
                                            e.target.value === ""
                                              ? ""
                                              : Math.max(
                                                  0,
                                                  parseInt(
                                                    e.target.value,
                                                    10,
                                                  ) || 0,
                                                ),
                                          )
                                        }
                                        placeholder="e.g. 100"
                                        className={`input font-mono text-xs bg-white font-semibold ${
                                          formErrors[`${batchErrPrefix}_units`]
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                                            : ""
                                        }`}
                                      />
                                      {formErrors[
                                        `${batchErrPrefix}_units`
                                      ] && (
                                        <p className="text-[11px] text-red-500 mt-1">
                                          {
                                            formErrors[
                                              `${batchErrPrefix}_units`
                                            ]
                                          }
                                        </p>
                                      )}
                                    </div>

                                    {/* Manufacturing Date */}
                                    <div>
                                      <label
                                        htmlFor={`receive-batch-mfg-${idx}-${bIdx}`}
                                        className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1"
                                      >
                                        Manufacturing Date{" "}
                                        <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        id={`receive-batch-mfg-${idx}-${bIdx}`}
                                        type="date"
                                        value={batch.manufacturingDate || ""}
                                        onChange={(e) =>
                                          handleBatchFieldChange(
                                            idx,
                                            bIdx,
                                            "manufacturingDate",
                                            e.target.value,
                                          )
                                        }
                                        className={`input text-xs bg-white ${
                                          formErrors[
                                            `${batchErrPrefix}_manufacturingDate`
                                          ]
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                                            : ""
                                        }`}
                                      />
                                      {formErrors[
                                        `${batchErrPrefix}_manufacturingDate`
                                      ] && (
                                        <p className="text-[11px] text-red-500 mt-1">
                                          {
                                            formErrors[
                                              `${batchErrPrefix}_manufacturingDate`
                                            ]
                                          }
                                        </p>
                                      )}
                                    </div>

                                    {/* Expiration Date */}
                                    <div>
                                      <label
                                        htmlFor={`receive-batch-exp-${idx}-${bIdx}`}
                                        className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1"
                                      >
                                        Expiration Date{" "}
                                        <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        id={`receive-batch-exp-${idx}-${bIdx}`}
                                        type="date"
                                        value={batch.expiryDate || ""}
                                        onChange={(e) =>
                                          handleBatchFieldChange(
                                            idx,
                                            bIdx,
                                            "expiryDate",
                                            e.target.value,
                                          )
                                        }
                                        className={`input text-xs bg-white ${
                                          formErrors[
                                            `${batchErrPrefix}_expiryDate`
                                          ]
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                                            : ""
                                        }`}
                                      />
                                      {formErrors[
                                        `${batchErrPrefix}_expiryDate`
                                      ] && (
                                        <p className="text-[11px] text-red-500 mt-1">
                                          {
                                            formErrors[
                                              `${batchErrPrefix}_expiryDate`
                                            ]
                                          }
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Quality Hold / Quarantine Option for this specific batch */}
                                  <div className="pt-2 border-t border-gray-200/70">
                                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(batch.isQuarantined)}
                                        onChange={(e) =>
                                          handleBatchFieldChange(
                                            idx,
                                            bIdx,
                                            "isQuarantined",
                                            e.target.checked,
                                          )
                                        }
                                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                      />
                                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                        Hold this batch under Quarantine
                                        (Quality inspection / damaged)
                                      </span>
                                    </label>

                                    {batch.isQuarantined && (
                                      <div className="mt-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5 animate-slide-up">
                                        <label
                                          htmlFor={`receive-batch-quarantine-notes-${idx}-${bIdx}`}
                                          className="block text-[11px] font-semibold text-red-900 uppercase tracking-wider"
                                        >
                                          Quarantine Reason / QA Remarks{" "}
                                          <span className="text-red-500">
                                            *
                                          </span>
                                        </label>
                                        <input
                                          id={`receive-batch-quarantine-notes-${idx}-${bIdx}`}
                                          type="text"
                                          value={batch.quarantineNotes || ""}
                                          onChange={(e) =>
                                            handleBatchFieldChange(
                                              idx,
                                              bIdx,
                                              "quarantineNotes",
                                              e.target.value,
                                            )
                                          }
                                          placeholder="e.g. 20 vials arrived cracked with fluid leakage during transit"
                                          className={`input text-xs bg-white ${
                                            formErrors[
                                              `${batchErrPrefix}_quarantineNotes`
                                            ]
                                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                                              : "border-red-200"
                                          }`}
                                        />
                                        {formErrors[
                                          `${batchErrPrefix}_quarantineNotes`
                                        ] && (
                                          <p className="text-[11px] text-red-500 mt-1">
                                            {
                                              formErrors[
                                                `${batchErrPrefix}_quarantineNotes`
                                              ]
                                            }
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
            {updateStatusError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{updateStatusError}</span>
              </div>
            )}

            {updateStatusSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{updateStatusSuccess}</span>
              </div>
            )}

            {/* Header Card */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-white shadow-sm shrink-0 ${
                  selectedBatch.isQuarantined
                    ? "bg-red-600"
                    : selectedBatch.status === "Expired"
                      ? "bg-amber-600"
                      : "bg-blue-600"
                }`}
              >
                {selectedBatch.isQuarantined ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : selectedBatch.status === "Expired" ? (
                  <AlertTriangle className="w-6 h-6" />
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
                        : selectedBatch.status === "Expired"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {selectedBatch.isQuarantined
                      ? "Under Quarantine"
                      : selectedBatch.status === "Expired"
                        ? "Batch Expired (Deducted from SKU Units)"
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
              {selectedBatch.isQuarantined && (
                <button
                  type="button"
                  onClick={() => handleReleaseFromQuarantine(selectedBatch.id)}
                  disabled={isUpdatingStatus}
                  className="btn-primary py-1.5 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs font-semibold"
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Releasing to Available...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Release to Available</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default BatchManagement;
