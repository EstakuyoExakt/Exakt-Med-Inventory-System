import { useState, useMemo, useEffect, useCallback } from "react";
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
  ClipboardList,
  User,
} from "lucide-react";

// Common Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import SuccessModal from "../../components/common/successModal";

// Data & Service Imports
import { initialSkus } from "../../data/skuManagement";
import { suppliers } from "../../data/supplier";
import { facilities } from "../../data/facility";
import { getStockStatus } from "../../utils/helpers";
import { DEFAULT_ORDER_FORM } from "../../utils/constants";
import useAuth from "../../hooks/useAuth";
import skuService from "../../services/sku";
import supplierService from "../../services/supplier";
import orderService from "../../services/order";
import restockRequestService from "../../services/restockRequest";

const extractDosageFromDescription = (description) => {
  if (!description) return "";

  const singleDosePattern =
    /(?:\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|iu|units?|u|meq|mmol)(?:\s*\/\s*\d*(?:\.\d+)?\s*(?:ml|l|g|dose|actuation|drop|spray))?\b)/i;

  const comboPattern = new RegExp(
    `${singleDosePattern.source}(?:\\s*\\+\\s*${singleDosePattern.source})+`,
    "i",
  );

  const comboMatch = description.match(comboPattern);
  if (comboMatch) {
    return comboMatch[0].trim();
  }

  const formKeywords =
    /(TABLET|CAPSULE|OINTMENT|CREAM|SYRUP|SUSPENSION|SOLUTION|INJECTION|DROPS|GEL|LOTION|INHALER|PATCH|SUPPOSITORY|POWDER|SHAMPOO)/i;
  const formIndex = description.search(formKeywords);

  const unitPatternGlobal = new RegExp(singleDosePattern.source, "gi");

  if (formIndex > 0) {
    const textBeforeForm = description.substring(0, formIndex);
    const matchesBefore = textBeforeForm.match(unitPatternGlobal);
    if (matchesBefore && matchesBefore.length > 0) {
      return matchesBefore[0].trim();
    }
  }

  const allMatches = description.match(unitPatternGlobal);
  if (allMatches && allMatches.length > 0) {
    const nonPackMatches = allMatches.filter((m) => {
      const regex = new RegExp(
        `${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:bottle|tube|vial|ampoule|pack|box|bag|canister)`,
        "i",
      );
      return !regex.test(description);
    });
    if (nonPackMatches.length > 0) {
      return nonPackMatches[0].trim();
    }
    return allMatches[0].trim();
  }

  return "";
};

const mapDtoToSku = (dto) => {
  return {
    id: dto.id,
    sku: dto.name || "",
    name: dto.name || "",
    medicineId: dto.medicineId,
    brandName: dto.brandName || "",
    genericName: dto.drugDescription || "",
    dosage: extractDosageFromDescription(dto.drugDescription) || "",
    dosageForm: dto.dosageForm || "",
    packagingUnit: dto.packagingUnit || "",
    type:
      dto.type ||
      initialSkus.find((s) => s.sku === dto.name)?.type ||
      "General",
    currentStock: Number(dto.units ?? 0),
    units: Number(dto.units ?? 0),
    minimumLevel: Number(dto.minimumLevel ?? 0),
    reorderLevel: Number(dto.reorderLevel ?? 0),
    maximumLevel: Number(dto.maximumLevel ?? 0),
    facilityId: dto.facilityId,
    facility: dto.facilityName || "",
    status: "Active",
    createdAt: dto.createdAt
      ? String(dto.createdAt).split("T")[0]
      : new Date().toISOString().split("T")[0],
    updatedAt: dto.updatedAt ? String(dto.updatedAt).split("T")[0] : "",
  };
};

function OrderRequest() {
  const { facility } = useAuth();

  // Automatically detect current active facility
  const currentFacilityName = useMemo(() => {
    return (
      facility?.name || facilities[0]?.name || "Exakt Central General Hospital"
    );
  }, [facility]);

  const [skuList, setSkuList] = useState(initialSkus);
  const [isLoadingSkus, setIsLoadingSkus] = useState(false);
  const [skuError, setSkuError] = useState(null);
  const [supplierList, setSupplierList] = useState(suppliers);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrgency, setSelectedUrgency] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch SKUs that need reordering from backend API (excluding active Pending/Approved orders)
  const fetchSkus = useCallback(
    async (query = "") => {
      try {
        setIsLoadingSkus(true);
        setSkuError(null);
        const targetFacilityId =
          facility?.id ||
          facilities.find((f) => f.name === currentFacilityName)?.id;

        if (!targetFacilityId) {
          setSkuList([]);
          return;
        }

        const data = await skuService.getReorderNeededSkus(
          targetFacilityId,
          query ? query.trim() : "",
        );

        if (Array.isArray(data)) {
          setSkuList(data.map(mapDtoToSku));
        }
      } catch (err) {
        console.error("Failed to load SKUs in Order Request:", err);
        setSkuError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load SKUs from server.",
        );
      } finally {
        setIsLoadingSkus(false);
      }
    },
    [facility?.id, currentFacilityName],
  );

  // Debounced search when user types in search bar
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSkus(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchSkus]);

  // Fetch suppliers from backend API
  const fetchSuppliers = useCallback(async () => {
    try {
      setIsLoadingSuppliers(true);
      const targetFacilityId =
        facility?.id ||
        facilities.find((f) => f.name === currentFacilityName)?.id;
      const data = await supplierService.getAllSuppliers(targetFacilityId);
      if (Array.isArray(data) && data.length > 0) {
        setSupplierList(data);
      }
    } catch (err) {
      console.error("Failed to load suppliers in Order Request:", err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, [facility?.id, currentFacilityName]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Filter active suppliers, fallback to all suppliers in list if none explicitly active
  const activeSuppliers = useMemo(() => {
    const active = supplierList.filter(
      (s) => !s.status || s.status.toLowerCase() === "active",
    );
    return active.length > 0 ? active : supplierList;
  }, [supplierList]);

  // Filter SKUs that reference the current active facility
  const currentFacilitySkus = useMemo(() => {
    return skuList.filter(
      (s) => (s.facility || facilities[0]?.name) === currentFacilityName,
    );
  }, [skuList, currentFacilityName]);

  // Multi-Selection State for Table Checkboxes
  const [selectedSkuIds, setSelectedSkuIds] = useState([]);
  const [selectedRestockRequestIds, setSelectedRestockRequestIds] = useState(
    [],
  );

  // Restock Request States
  const [restockRequests, setRestockRequests] = useState([]);
  const [isLoadingRestockRequests, setIsLoadingRestockRequests] =
    useState(false);
  const [restockRequestError, setRestockRequestError] = useState(null);
  const [activeTab, setActiveTab] = useState("requests"); // "requests" | "thresholds"
  const [restockSearchQuery, setRestockSearchQuery] = useState("");
  const [restockCurrentPage, setRestockCurrentPage] = useState(1);
  const restockItemsPerPage = 6;

  // Fetch Restock Requests from backend API (Pending only - awaiting PO creation)
  const fetchRestockRequests = useCallback(async () => {
    try {
      setIsLoadingRestockRequests(true);
      setRestockRequestError(null);
      const targetFacilityId =
        facility?.id ||
        facilities.find((f) => f.name === currentFacilityName)?.id;

      const data = await restockRequestService.getAllRestockRequests(
        targetFacilityId,
        true, // pendingOnly = true
      );

      if (Array.isArray(data)) {
        // Exclude any requests that already have a PO generated
        setRestockRequests(data.filter((r) => !r.orderId));
      }
    } catch (err) {
      console.error("Failed to load restock requests:", err);
      setRestockRequestError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load restock requests.",
      );
    } finally {
      setIsLoadingRestockRequests(false);
    }
  }, [facility?.id, currentFacilityName]);

  useEffect(() => {
    fetchRestockRequests();
  }, [fetchRestockRequests]);

  // Count pending unfulfilled restock requests
  const pendingRestockRequestsCount = useMemo(() => {
    return restockRequests.filter((r) => !r.orderId).length;
  }, [restockRequests]);

  // Filter restock requests by search query (only pending requests are listed)
  const filteredRestockRequests = useMemo(() => {
    return restockRequests.filter((r) => {
      if (r.orderId) return false;

      const query = restockSearchQuery.trim().toLowerCase();
      if (!query) return true;

      return (
        (r.skuName || "").toLowerCase().includes(query) ||
        (r.brandName || "").toLowerCase().includes(query) ||
        (r.genericName || "").toLowerCase().includes(query) ||
        (r.userName || "").toLowerCase().includes(query) ||
        (r.reason || "").toLowerCase().includes(query)
      );
    });
  }, [restockRequests, restockSearchQuery]);

  const restockTotalPages =
    Math.ceil(filteredRestockRequests.length / restockItemsPerPage) || 1;

  const paginatedRestockRequests = useMemo(() => {
    const startIndex = (restockCurrentPage - 1) * restockItemsPerPage;
    return filteredRestockRequests.slice(
      startIndex,
      startIndex + restockItemsPerPage,
    );
  }, [filteredRestockRequests, restockCurrentPage, restockItemsPerPage]);

  // Checkbox Selection Handlers for Restock Requests
  const handleToggleSelectRestock = (id) => {
    setSelectedRestockRequestIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAllVisibleRestock = () => {
    const visibleIds = paginatedRestockRequests.map((r) => r.id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedRestockRequestIds.includes(id));
    if (allSelected) {
      setSelectedRestockRequestIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedRestockRequestIds((prev) => [
        ...prev,
        ...visibleIds.filter((id) => !prev.includes(id)),
      ]);
    }
  };

  // Modal States
  const [selectedSkuForView, setSelectedSkuForView] = useState(null);
  const [selectedRestockForView, setSelectedRestockForView] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'order' | 'view' | 'view_restock' | 'success' | null
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Multi-Item Order Form State
  const [orderForm, setOrderForm] = useState({
    ...DEFAULT_ORDER_FORM,
    supplierId: suppliers[0]?.id || 1,
    targetFacility: currentFacilityName,
    restockRequestIds: [],
  });
  const [formErrors, setFormErrors] = useState({});

  // Additional SKU Selector inside Modal
  const [skuToAdd, setSkuToAdd] = useState("");

  // 1. Total Minimum SKUs for Current Facility (currentStock <= minimumLevel)
  const totalMinimumSkus = useMemo(() => {
    return currentFacilitySkus.filter((s) => s.currentStock <= s.minimumLevel)
      .length;
  }, [currentFacilitySkus]);

  // 2. Total Needs Reorder SKUs for Current Facility (currentStock <= reorderLevel)
  const totalNeedsReorderSkus = useMemo(() => {
    return currentFacilitySkus.filter((s) => s.currentStock <= s.reorderLevel)
      .length;
  }, [currentFacilitySkus]);

  // Filtered List: Only display SKUs for current facility that need reordering (currentStock <= reorderLevel)
  const reorderSkus = useMemo(() => {
    return currentFacilitySkus.filter((item) => {
      const needsReorder = item.currentStock <= item.reorderLevel;
      if (!needsReorder) return false;

      const matchesSearch =
        !searchQuery.trim() ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.dosage.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesUrgency = true;
      if (selectedUrgency === "MINIMUM") {
        matchesUrgency = item.currentStock <= item.minimumLevel;
      } else if (selectedUrgency === "REORDER_ONLY") {
        matchesUrgency =
          item.currentStock <= item.reorderLevel &&
          item.currentStock > item.minimumLevel;
      }

      return matchesSearch && matchesUrgency;
    });
  }, [currentFacilitySkus, searchQuery, selectedUrgency]);

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
    const criticalIds = currentFacilitySkus
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
      price: "",
    };
  };

  // Open Multi-Item Requisition Modal with selected items
  const handleOpenMultiOrderModal = (initialSkusToOrder = []) => {
    let itemsToInclude = [];

    if (initialSkusToOrder.length > 0) {
      itemsToInclude = initialSkusToOrder.map(buildLineItem);
    } else if (selectedSkuIds.length > 0) {
      const selectedObjList = currentFacilitySkus.filter((s) =>
        selectedSkuIds.includes(s.id),
      );
      itemsToInclude = selectedObjList.map(buildLineItem);
    } else if (reorderSkus.length > 0) {
      // Default with the first reorder SKU if none selected
      itemsToInclude = [buildLineItem(reorderSkus[0])];
    }

    const hasCritical = itemsToInclude.some(
      (item) => item.currentStock <= item.minimumLevel,
    );

    setOrderForm({
      supplierId:
        activeSuppliers[0]?.id || supplierList[0]?.id || suppliers[0]?.id || 1,
      targetFacility: currentFacilityName,
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

  // Open View SKU Threshold Diagnostics Modal
  const handleOpenViewModal = (sku) => {
    setSelectedSkuForView(sku);
    setModalMode("view");
  };

  // Open View Pharmacist Restock Request Modal
  const handleOpenViewRestockModal = (req) => {
    setSelectedRestockForView(req);
    setModalMode("view_restock");
  };

  // Process one or multiple Pharmacist Restock Requests into a Purchase Order
  const handleProcessRestockRequests = (requestsToProcess = []) => {
    let targetRequests = [];
    if (requestsToProcess.length > 0) {
      targetRequests = requestsToProcess;
    } else if (selectedRestockRequestIds.length > 0) {
      targetRequests = restockRequests.filter((r) =>
        selectedRestockRequestIds.includes(r.id),
      );
    }

    if (targetRequests.length === 0) return;

    // Build line items for each request
    const items = targetRequests.map((req) => {
      const matchedSku =
        currentFacilitySkus.find(
          (s) => s.id === req.skuId || s.sku === req.skuName,
        ) ||
        skuList.find((s) => s.id === req.skuId || s.sku === req.skuName);

      return {
        id: req.skuId || matchedSku?.id || 1,
        sku: req.skuName || matchedSku?.sku || "",
        brandName: req.brandName || matchedSku?.brandName || "",
        genericName: req.genericName || matchedSku?.genericName || "",
        dosage: matchedSku?.dosage || "",
        dosageForm: req.dosageForm || matchedSku?.dosageForm || "",
        packagingUnit:
          req.packagingUnit || matchedSku?.packagingUnit || "",
        currentStock: matchedSku?.currentStock ?? 0,
        minimumLevel: matchedSku?.minimumLevel ?? 0,
        maximumLevel: matchedSku?.maximumLevel ?? 0,
        reorderLevel: matchedSku?.reorderLevel ?? 0,
        quantity: Number(req.requestedUnits) || 100,
        price: "",
      };
    });

    const reasons = targetRequests
      .map((r) => r.reason?.trim())
      .filter(Boolean);
    const combinedNotes =
      reasons.length > 0
        ? `Pharmacist Restock Requests: ${reasons.join("; ")}`
        : "Requested by Pharmacy Department";

    setOrderForm({
      supplierId:
        activeSuppliers[0]?.id || supplierList[0]?.id || suppliers[0]?.id || 1,
      targetFacility: currentFacilityName,
      priority: "Normal",
      totalCost: "",
      notes: combinedNotes,
      restockRequestIds: targetRequests.map((r) => r.id),
      items,
    });
    setFormErrors({});
    setSkuToAdd("");
    setModalMode("order");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedSkuForView(null);
    setSelectedRestockForView(null);
    setFormErrors({});
    setOrderForm((prev) => ({
      ...prev,
      restockRequestIds: [],
    }));
  };

  // Add Item to Order Form within the Modal
  const handleAddItemToForm = (skuCode) => {
    if (!skuCode) return;
    const targetSku = currentFacilitySkus.find((s) => s.sku === skuCode);
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

  // Update item price in Order Form
  const handleUpdateItemPrice = (skuCode, price) => {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.sku === skuCode ? { ...i, price } : i,
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

  // Total Quoted Cost in the current Order Form (auto-calculated from sum of item prices)
  const computedTotalCost = useMemo(() => {
    return orderForm.items.reduce(
      (sum, i) => sum + (Number(i.price) || 0),
      0,
    );
  }, [orderForm.items]);

  // Available SKUs that need restocking in active facility and haven't been added yet
  const availableSkusToAdd = useMemo(() => {
    const addedSkus = new Set(orderForm.items.map((i) => i.sku));
    return currentFacilitySkus.filter(
      (s) => s.currentStock <= s.reorderLevel && !addedSkus.has(s.sku),
    );
  }, [currentFacilitySkus, orderForm.items]);

  // Handle Form Submission
  const handleSubmitOrder = async (e) => {
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

    if (
      orderForm.items.some(
        (i) =>
          i.price === "" ||
          i.price === null ||
          i.price === undefined ||
          Number(i.price) < 0 ||
          isNaN(Number(i.price)),
      )
    ) {
      errors.items =
        "Please enter a valid price (₱0 or higher) for each ordered medicine.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const supplierObj =
      supplierList.find((s) => s.id === Number(orderForm.supplierId)) ||
      suppliers.find((s) => s.id === Number(orderForm.supplierId));

    const targetFacilityId =
      facility?.id ||
      facilities.find((f) => f.name === currentFacilityName)?.id ||
      1;

    const orderPayload = {
      facilityId: Number(targetFacilityId),
      supplierId: Number(orderForm.supplierId),
      priority: orderForm.priority || "Normal",
      totalPrice: Math.round(computedTotalCost),
      notes: orderForm.notes || "",
      restockRequestIds:
        Array.isArray(orderForm.restockRequestIds) &&
        orderForm.restockRequestIds.length > 0
          ? orderForm.restockRequestIds.map(Number)
          : null,
      items: orderForm.items.map((i) => {
        const matchedSku = skuList.find(
          (s) => s.sku === i.sku || s.id === i.id,
        );
        return {
          skuId: matchedSku?.id || i.id || 1,
          orderedUnits: Number(i.quantity) || 1,
          price: Math.round(Number(i.price) || 0),
        };
      }),
    };

    try {
      setIsSubmittingOrder(true);
      const response = await orderService.createOrder(orderPayload);

      const resolvedPoNumber =
        response.purchaseOrderNum || response.poNumberFormatted;

      const newRequest = {
        orderId: resolvedPoNumber,
        orderNumber: resolvedPoNumber,
        supplierId: response.supplierId || Number(orderForm.supplierId),
        supplierName:
          response.supplierName || (supplierObj ? supplierObj.name : "Supplier"),
        targetFacility: orderForm.targetFacility,
        priority: response.priority || orderForm.priority,
        status: response.status || "Pending",
        totalCost: response.totalPrice ?? Math.round(computedTotalCost),
        notes: orderForm.notes,
        items: orderForm.items,
        totalUnits: totalFormUnits,
        createdAt: new Date().toLocaleDateString(),
      };

      setSubmittedOrder(newRequest);
      setSelectedSkuIds([]); // Clear selection
      setModalMode("success");

      // Optimistically remove ordered items and fulfilled restock requests from current list
      const orderedIds = new Set(orderPayload.items.map((i) => i.skuId));
      setSkuList((prev) => prev.filter((s) => !orderedIds.has(s.id)));
      if (orderPayload.restockRequestIds) {
        const reqIdsSet = new Set(orderPayload.restockRequestIds);
        setRestockRequests((prev) =>
          prev.filter((r) => !reqIdsSet.has(r.id)),
        );
        setSelectedRestockRequestIds((prev) =>
          prev.filter((id) => !reqIdsSet.has(id)),
        );
      }
      fetchSkus(searchQuery);
      fetchRestockRequests();
    } catch (err) {
      console.error("Failed to submit purchase order to backend:", err);
      // Fallback format PO-[year]-[month]-[id] if offline during local dev
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const fallbackPo = `PO-${year}-${month}-0001`;

      const fallbackRequest = {
        orderId: fallbackPo,
        orderNumber: fallbackPo,
        supplierId: Number(orderForm.supplierId),
        supplierName: supplierObj ? supplierObj.name : "Supplier",
        targetFacility: orderForm.targetFacility,
        priority: orderForm.priority,
        status: "Pending",
        totalCost: Number(orderForm.totalCost) || 0,
        notes: orderForm.notes,
        items: orderForm.items,
        totalUnits: totalFormUnits,
        createdAt: new Date().toLocaleDateString(),
      };
      setSubmittedOrder(fallbackRequest);
      setSelectedSkuIds([]);
      setModalMode("success");

      // Optimistically remove ordered items and fulfilled restock requests in fallback
      const orderedIds = new Set(orderPayload.items.map((i) => i.skuId));
      setSkuList((prev) => prev.filter((s) => !orderedIds.has(s.id)));
      if (orderPayload.restockRequestIds) {
        const reqIdsSet = new Set(orderPayload.restockRequestIds);
        setRestockRequests((prev) =>
          prev.filter((r) => !reqIdsSet.has(r.id)),
        );
        setSelectedRestockRequestIds((prev) =>
          prev.filter((id) => !reqIdsSet.has(id)),
        );
      }
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <PackagePlus className="w-7 h-7 text-blue-600" />
              <span>Procurement Order Requests</span>
            </h1>
            {/* Active Facility Indicator */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentFacilityName}</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Batch restock items into a consolidated purchase order requisition
            for{" "}
            <span className="font-semibold text-gray-700">
              {currentFacilityName}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === "requests" && (
            <button
              type="button"
              onClick={() => handleProcessRestockRequests()}
              disabled={selectedRestockRequestIds.length === 0}
              className={`btn-primary shadow-xs flex items-center gap-2 text-xs py-2 px-3.5 ${
                selectedRestockRequestIds.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <ListPlus className="w-4 h-4" />
              <span>
                {selectedRestockRequestIds.length > 0
                  ? `Create Consolidated PO for (${selectedRestockRequestIds.length}) Selected`
                  : "Consolidate Restock Requests into PO"}
              </span>
            </button>
          )}

          {activeTab === "thresholds" && (
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
          )}
        </div>
      </div>

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <AlertCircle className="w-3 h-3" /> Critical shortage (&le; Min)
                </span>
                {totalMinimumSkus > 0 && activeTab === "thresholds" && (
                  <button
                    type="button"
                    onClick={handleSelectAllCritical}
                    className="text-[11px] font-bold text-red-700 underline hover:text-red-900 cursor-pointer"
                  >
                    Select Critical
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
                Needs Reorder SKUs
              </p>
              <h3 className="text-3xl font-extrabold text-amber-600 mt-1.5">
                {totalNeedsReorderSkus}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mt-1 bg-amber-100/70 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> &le; Reorder point
              </span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 border border-amber-200 shadow-xs">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* 3. Pending Pharmacist Restock Requests */}
        <Card className="p-5 border border-blue-200/80 shadow-xs hover:border-blue-300 transition-all bg-linear-to-br from-white to-blue-50/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Pharmacist Requests
              </p>
              <h3 className="text-3xl font-extrabold text-blue-600 mt-1.5">
                {pendingRestockRequestsCount}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                  <ClipboardList className="w-3 h-3" /> Pending Review
                </span>
                {activeTab !== "requests" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("requests")}
                    className="text-[11px] font-bold text-blue-700 underline hover:text-blue-900 cursor-pointer"
                  >
                    View Requests
                  </button>
                )}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 border border-blue-200 shadow-xs">
              <ClipboardList className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Workspace Card with Navigation Tabs */}
      <Card className="p-0 overflow-hidden border border-gray-200">
        {/* Navigation Tabs Header */}
        <div className="flex border-b border-gray-200 bg-gray-50/75 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "requests"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Pharmacist Restock Requests</span>
            {pendingRestockRequestsCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-600 text-white shadow-xs">
                {pendingRestockRequestsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("thresholds")}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "thresholds"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>System Threshold Alerts</span>
            {reorderSkus.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500 text-white shadow-xs">
                {reorderSkus.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: PHARMACIST RESTOCK REQUESTS */}
        {activeTab === "requests" && (
          <div>
            {/* Search & Filter Bar */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-50/50">
              <div className="w-full md:w-96">
                <SearchBar
                  value={restockSearchQuery}
                  onChange={(e) => {
                    setRestockSearchQuery(e.target.value);
                    setRestockCurrentPage(1);
                  }}
                  onClear={() => {
                    setRestockSearchQuery("");
                    setRestockCurrentPage(1);
                  }}
                  placeholder="Search pending request by drug, requester, notes..."
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {filteredRestockRequests.length} Pending Requisition
                    {filteredRestockRequests.length !== 1 ? "s" : ""}
                  </span>
                </span>
              </div>
            </div>

            {/* Multi-Select Floating Action Bar if requests checked */}
            {selectedRestockRequestIds.length > 0 && (
              <div className="p-3 bg-blue-50/90 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">
                    {selectedRestockRequestIds.length}
                  </span>
                  <span>Restock requests selected for consolidated purchase order</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRestockRequestIds([])}
                    className="btn-secondary py-1 px-2.5 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProcessRestockRequests()}
                    className="btn-primary py-1 px-3 text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Create Consolidated PO ({selectedRestockRequestIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Restock Requests Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAllVisibleRestock}
                        className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Select all visible requests"
                        aria-label="Select all visible requests"
                      >
                        {paginatedRestockRequests.length > 0 &&
                        paginatedRestockRequests.every((r) =>
                          selectedRestockRequestIds.includes(r.id),
                        ) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Request Date & Pharmacist
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Target SKU & Medicine
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Requested Units
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoadingRestockRequests ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-12 text-center text-gray-400"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs font-medium text-gray-500">
                            Loading pharmacist restock requests...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRestockRequests.length > 0 ? (
                    paginatedRestockRequests.map((req) => (
                      <tr
                        key={req.id}
                        className={`hover:bg-blue-50/30 transition-colors ${
                          selectedRestockRequestIds.includes(req.id)
                            ? "bg-blue-50/20"
                            : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectRestock(req.id)}
                            className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                            aria-label={`Select request ${req.id}`}
                          >
                            {selectedRestockRequestIds.includes(req.id) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        {/* Date & Requester */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900">
                            {req.createdAt
                              ? new Date(req.createdAt).toLocaleDateString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )
                              : "—"}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>{req.userName || "Pharmacist"}</span>
                          </div>
                        </td>

                        {/* Target SKU & Medicine */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-semibold text-xs border border-blue-100 shrink-0 mt-0.5">
                              <Pill className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {req.brandName || "Medication"}
                                </span>
                                <span className="font-mono text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                                  {req.skuName}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {req.genericName || "—"}
                              </div>
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                {req.dosageForm}{" "}
                                {req.packagingUnit && `• ${req.packagingUnit}`}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Requested Units */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <div className="inline-flex items-baseline gap-1 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                            <span className="font-extrabold text-blue-800 text-sm">
                              {req.requestedUnits}
                            </span>
                            <span className="text-[11px] text-blue-600 font-medium">
                              units
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenViewRestockModal(req)}
                              className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 cursor-pointer"
                              title="View Restock Request Details"
                              aria-label={`View restock request ${req.id}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleProcessRestockRequests([req])}
                              className="btn-primary py-1.5 px-3 text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer font-medium"
                              title="Convert this request into a purchase order"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Process into PO</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-12 text-center text-gray-400"
                      >
                        <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-emerald-500" />
                        <p className="text-base font-semibold text-gray-800">
                          All pharmacist restock requests have been processed!
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          No pending replenishment requests currently require
                          procurement ordering.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Restock Requests */}
            {filteredRestockRequests.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50/40">
                <Pagination
                  currentPage={restockCurrentPage}
                  totalPages={restockTotalPages}
                  totalItems={filteredRestockRequests.length}
                  itemsPerPage={restockItemsPerPage}
                  onPageChange={setRestockCurrentPage}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SYSTEM THRESHOLD ALERTS */}
        {activeTab === "thresholds" && (
          <div>
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
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                    title="Select all visible on page"
                    aria-label="Select all visible on page"
                  >
                    {paginatedReorderSkus.length > 0 &&
                    paginatedReorderSkus.every((s) =>
                      selectedSkuIds.includes(s.id),
                    ) ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
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
              {isLoadingSkus ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium text-gray-500">
                        Loading critical and reorder level SKUs...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedReorderSkus.length > 0 ? (
                paginatedReorderSkus.map((item) => {
                  const status = getStockStatus(item);
                  const isSelected = selectedSkuIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isSelected
                          ? "bg-blue-50/20"
                          : item.currentStock <= item.minimumLevel
                            ? "bg-red-50/15"
                            : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectSku(item.id)}
                          className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                          aria-label={`Select SKU ${item.sku}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
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
        size="4xl"
      >
        <form onSubmit={handleSubmitOrder} className="space-y-4">
          {/* Linked Restock Requests Banner if applicable */}
          {orderForm.restockRequestIds &&
            orderForm.restockRequestIds.length > 0 && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900">
                <ClipboardList className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold block">
                    Fulfilling ({orderForm.restockRequestIds.length}) Pharmacist
                    Restock Request
                    {orderForm.restockRequestIds.length > 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] text-blue-700 font-medium">
                    Submitting this consolidated purchase order will fulfill and
                    link requests #{orderForm.restockRequestIds.join(", #")}.
                  </span>
                </div>
              </div>
            )}

          {/* Supplier, Facility & Priority Header Controls */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
                {isLoadingSuppliers && activeSuppliers.length === 0 ? (
                  <option value="">Loading suppliers...</option>
                ) : (
                  activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
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

            {/* Destination Facility (Auto-detected based on active facility) */}
            <div className="sm:col-span-2">
              <label
                htmlFor="order-facility"
                className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1"
              >
                Destination Facility
              </label>
              <div
                id="order-facility"
                className="flex items-center gap-2 px-3 py-2 bg-blue-50/70 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900"
              >
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">{currentFacilityName}</span>
              </div>
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
                    <th className="px-3.5 py-2.5 w-28">Order Quantity</th>
                    <th className="px-3.5 py-2.5 w-36">Item Price (₱)</th>
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
                              {item.maximumLevel}
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
                              className="input py-1 px-2 text-xs w-20 font-bold text-gray-900"
                            />
                            <span className="text-[10px] text-gray-500">
                              units
                            </span>
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5">
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-gray-400 text-xs font-bold">
                              ₱
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={item.price ?? ""}
                              onChange={(e) =>
                                handleUpdateItemPrice(
                                  item.sku,
                                  e.target.value,
                                )
                              }
                              className="input py-1 pl-6 pr-2 text-xs w-28 font-mono font-bold text-gray-900"
                            />
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
                        colSpan="5"
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
            {/* Total Cost Field (Read-only, auto-calculated from item prices) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="order-total-cost"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  Total PO Cost (₱)
                </label>
                <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                  Read Only • Auto Calculated
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                  ₱
                </span>
                <input
                  id="order-total-cost"
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={computedTotalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  className="input pl-7 font-mono font-bold bg-gray-100/80 text-gray-700 cursor-not-allowed border-gray-200 select-all"
                />
              </div>
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
              disabled={orderForm.items.length === 0 || isSubmittingOrder}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isSubmittingOrder ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Requisition...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Submit Purchase Requisition ({orderForm.items.length} SKUs)
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. MODAL: ORDER SUCCESS CONFIRMATION                     */}
      {/* ======================================================== */}
      <SuccessModal
        isOpen={modalMode === "success" && Boolean(submittedOrder)}
        onClose={handleCloseModal}
        title="Purchase Order Requisition Submitted"
        message="Consolidated purchase order reference has been generated and dispatched to the supplier."
        size="xl"
        confirmText="Done"
      >
        {submittedOrder && (
          <div className="space-y-4 text-left">
            {/* PO Summary Card */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-2">
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">PO Number:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {submittedOrder.orderId}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-200/60 pb-1.5">
                <span className="text-gray-500">Status:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {submittedOrder.status || "Pending"}
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
          </div>
        )}
      </SuccessModal>

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

      {/* ======================================================== */}
      {/* 4. MODAL: VIEW RESTOCK REQUEST DETAILS                   */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "view_restock" && Boolean(selectedRestockForView)}
        onClose={handleCloseModal}
        title="Pharmacist Restock Request Details"
        size="lg"
      >
        {selectedRestockForView && (() => {
          const matchedSku =
            currentFacilitySkus.find(
              (s) =>
                s.id === selectedRestockForView.skuId ||
                s.sku === selectedRestockForView.skuName,
            ) ||
            skuList.find(
              (s) =>
                s.id === selectedRestockForView.skuId ||
                s.sku === selectedRestockForView.skuName,
            );

          const isStockCritical =
            matchedSku && matchedSku.currentStock <= matchedSku.minimumLevel;
          const isStockReorder =
            matchedSku && matchedSku.currentStock <= matchedSku.reorderLevel;

          return (
            <div className="space-y-4 text-xs">
              {/* Top Banner / Header Status */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/80 border border-blue-200">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">
                        Request #{selectedRestockForView.id}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Pending Fulfillment
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Pharmacist Replenishment Submission
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Target Facility
                  </span>
                  <span className="font-semibold text-gray-800 flex items-center justify-end gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    {selectedRestockForView.facilityName || currentFacilityName}
                  </span>
                </div>
              </div>

              {/* Requester & Submission Metadata */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Requested By
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">
                        {selectedRestockForView.userName || "Pharmacy Staff"}
                      </p>
                      <p className="text-[11px] text-gray-500">Pharmacist</p>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Submission Timestamp
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">
                        {selectedRestockForView.createdAt
                          ? new Date(
                              selectedRestockForView.createdAt,
                            ).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "N/A"}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {selectedRestockForView.createdAt
                          ? new Date(
                              selectedRestockForView.createdAt,
                            ).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Medication Information */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-xs space-y-3">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Requested Medication & SKU
                </span>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-gray-900">
                        {selectedRestockForView.brandName ||
                          selectedRestockForView.skuName}
                      </h4>
                      <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                        {selectedRestockForView.skuName}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 font-medium">
                      {selectedRestockForView.genericName ||
                        matchedSku?.genericName ||
                        "Generic formula unrecorded"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                      <span>
                        {selectedRestockForView.dosageForm ||
                          matchedSku?.dosageForm ||
                          "Dosage form N/A"}
                      </span>
                      <span>•</span>
                      <span>
                        {selectedRestockForView.packagingUnit ||
                          matchedSku?.packagingUnit ||
                          "Unit"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stock vs Requirement Metrics */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-gray-100 text-center">
                  <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-blue-700 block">
                      Requested Units
                    </span>
                    <span className="font-extrabold text-blue-900 text-base">
                      {selectedRestockForView.requestedUnits}
                    </span>
                    <span className="text-[10px] text-blue-600 block">
                      units
                    </span>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border ${
                      isStockCritical
                        ? "bg-red-50 border-red-100 text-red-900"
                        : isStockReorder
                        ? "bg-amber-50 border-amber-100 text-amber-900"
                        : "bg-gray-50 border-gray-100 text-gray-900"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">
                      Current Stock
                    </span>
                    <span className="font-bold text-base">
                      {matchedSku ? matchedSku.currentStock : "—"}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      {isStockCritical
                        ? "Critical stock"
                        : isStockReorder
                        ? "Under reorder"
                        : "Current level"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">
                      Reorder Threshold
                    </span>
                    <span className="font-bold text-base text-gray-800">
                      {matchedSku ? matchedSku.reorderLevel : "—"}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      Min: {matchedSku ? matchedSku.minimumLevel : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Clinical Justification / Remarks */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                  Clinical Justification & Remarks
                </span>
                <p className="text-xs text-gray-800 bg-white p-3 rounded-lg border border-gray-200/60 italic leading-relaxed whitespace-pre-wrap">
                  {selectedRestockForView.reason
                    ? `"${selectedRestockForView.reason}"`
                    : "No specific clinical notes or justification provided."}
                </p>
              </div>

              {/* Action Buttons in Modal Footer */}
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
                    const reqToProcess = selectedRestockForView;
                    handleCloseModal();
                    handleProcessRestockRequests([reqToProcess]);
                  }}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Process into PO</span>
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

export default OrderRequest;
