import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Boxes,
  Package,
  Pill,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Eye,
  Trash2,
  Sliders,
  Pencil,
  Building2,
  PackagePlus,
  Clock,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react";

// Common Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import DeleteModal from "../../components/common/deleteModal";
import SuccessModal from "../../components/common/successModal";
import Dropdown from "../../components/common/dropdown";
import ComboBox from "./components/comboBox";
import Skeleton from "../../components/common/skeleton";
import libMedicineService from "../../services/libMedicine";
import skuService from "../../services/sku";
import restockRequestService from "../../services/restockRequest";
import batchService from "../../services/batch";
import libPackagingUnitService from "../../services/libPackagingUnit";

// Constants Imports
import {
  FORM_CODES,
  DEFAULT_SKU_FORM_DATA,
  ADJUSTMENT_REASONS,
  DEFAULT_STOCK_ADJUSTMENT,
} from "../../utils/constants";
import { getStockStatus, getExpiryStatus } from "../../utils/helpers";
import useAuth from "../../hooks/useAuth";
import useError from "../../hooks/useError";
import { validateSkuForm } from "../../validators/sku.validator";

const DEFAULT_RESTOCK_FORM_DATA = {
  skuId: "",
  requestedUnits: "",
  reason: "",
};

const extractDosageFromDescription = (description) => {
  if (!description) return "";
  const singleDosePattern =
    /(?:\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|iu|units?|u|meq|mmol)(?:\s*\/\s*\d*(?:\.\d+)?\s*(?:ml|l|g|dose|actuation|drop|spray))?\b)/i;
  const comboPattern = new RegExp(
    `${singleDosePattern.source}(?:\\s*\\+\\s*${singleDosePattern.source})+`,
    "i",
  );
  const comboMatch = description.match(comboPattern);
  if (comboMatch) return comboMatch[0].trim();

  const allMatches = description.match(new RegExp(singleDosePattern.source, "gi"));
  if (allMatches && allMatches.length > 0) {
    const nonPack = allMatches.filter((m) => {
      const rx = new RegExp(`${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:bottle|tube|vial|ampoule|pack|box|bag|canister)`, "i");
      return !rx.test(description);
    });
    return nonPack.length > 0 ? nonPack[0].trim() : allMatches[0].trim();
  }
  return "";
};

const extractDosageFormFromDescription = (description, rawPackageCode) => {
  const formKeywords = [
    "SOLUTION FOR INJECTION",
    "POWDER FOR SUSPENSION",
    "POWDER FOR INJECTION",
    "TABLET",
    "CAPSULE",
    "OINTMENT",
    "CREAM",
    "SYRUP",
    "SUSPENSION",
    "SOLUTION",
    "INJECTION",
    "DROPS",
    "GEL",
    "LOTION",
    "INHALER",
    "PATCH",
    "SUPPOSITORY",
    "POWDER",
    "SHAMPOO",
  ];

  if (description) {
    for (const kw of formKeywords) {
      if (new RegExp(`\\b${kw}\\b`, "i").test(description)) {
        return kw.toUpperCase();
      }
    }
  }

  if (rawPackageCode) {
    const code = rawPackageCode.trim().toUpperCase();
    const prefix = code.slice(0, 3);
    const match = Object.entries(FORM_CODES).find(
      ([fullName, shortCode]) =>
        fullName === code || shortCode === code || shortCode === prefix,
    );
    if (match) return match[0];
    return code;
  }

  return "TABLET";
};

const detectPackagingCodeFromDesc = (description) => {
  if (!description) return "BX100";
  const desc = description.toUpperCase();

  // 1. Syringes
  if (desc.includes("0.5 ML PRE-FILLED SYRINGE") || desc.includes("0.5ML PRE-FILLED SYRINGE")) return "PS05";
  if (desc.includes("1 ML PRE-FILLED SYRINGE") || desc.includes("1ML PRE-FILLED SYRINGE")) return "PS10";
  if (desc.includes("PRE-FILLED SYRINGE")) return "PS01";
  if (desc.includes("SYRINGE")) return "SY01";

  // 2. Eye / Ear Drops
  if (desc.includes("2.5 ML") && (desc.includes("DROPS") || desc.includes("OPHTHALMIC"))) return "DR02";
  if (desc.includes("5 ML") && (desc.includes("DROPS") || desc.includes("OPHTHALMIC"))) return "DR05";
  if (desc.includes("10 ML DROPS") || desc.includes("DROPS 10 ML")) return "DR10";
  if (desc.includes("15 ML DROPS") || desc.includes("DROPS 15 ML")) return "DR15";
  if (desc.includes("30 ML DROPS") || desc.includes("DROPS 30 ML")) return "DR30";

  // 3. Vials (check specific sizes first)
  if (desc.includes("200 ML VIAL") || desc.includes("200ML VIAL")) return "VL200";
  if (desc.includes("100 ML VIAL") || desc.includes("100ML VIAL")) return "VL100";
  if (desc.includes("50 ML VIAL") || desc.includes("50ML VIAL")) return "VL50";
  if (desc.includes("30 ML VIAL") || desc.includes("30ML VIAL")) return "VL30";
  if (desc.includes("25 ML VIAL") || desc.includes("25ML VIAL")) return "VL25";
  if (desc.includes("20 ML VIAL") || desc.includes("20ML VIAL")) return "VL20";
  if (desc.includes("15 ML VIAL") || desc.includes("15ML VIAL")) return "VL15";
  if (desc.includes("10 ML VIAL") || desc.includes("10ML VIAL")) return "VL10";
  if (desc.includes("5 ML VIAL") || desc.includes("5ML VIAL")) return "VL05";
  if (desc.includes("4 ML VIAL") || desc.includes("4ML VIAL")) return "VL04";
  if (desc.includes("3 ML VIAL") || desc.includes("3ML VIAL")) return "VL03";
  if (desc.includes("2 ML VIAL") || desc.includes("2ML VIAL")) return "VL02";
  if (desc.includes("1 ML VIAL") || desc.includes("1ML VIAL")) return "VL01";

  // 4. Ampoules
  if (desc.includes("10 ML AMPULE") || desc.includes("10 ML AMP") || desc.includes("10ML AMP")) return "AM10";
  if (desc.includes("5 ML AMPULE") || desc.includes("5 ML AMP") || desc.includes("5ML AMP")) return "AM05";
  if (desc.includes("2 ML AMPULE") || desc.includes("2 ML AMP") || desc.includes("2ML AMP")) return "AM02";
  if (desc.includes("1 ML AMPULE") || desc.includes("1 ML AMP") || desc.includes("1ML AMP")) return "AM01";

  // 5. Bottles & Oral Liquids
  if (desc.includes("GALLON") || desc.includes("GL")) return "GL01";
  if (desc.includes("5 L BOTTLE") || desc.includes("5L BOTTLE")) return "BL5L";
  if (desc.includes("1 L BOTTLE") || desc.includes("1L BOTTLE")) return "BL1L";
  if (desc.includes("500 ML BOTTLE") || desc.includes("500ML BOTTLE")) return "BL500";
  if (desc.includes("250 ML BOTTLE") || desc.includes("250ML BOTTLE")) return "BL250";
  if (desc.includes("240 ML BOTTLE") || desc.includes("240ML BOTTLE")) return "BL240";
  if (desc.includes("200 ML BOTTLE") || desc.includes("200ML BOTTLE")) return "BL200";
  if (desc.includes("150 ML BOTTLE") || desc.includes("150ML BOTTLE")) return "BL150";
  if (desc.includes("120 ML BOTTLE") || desc.includes("120ML BOTTLE")) return "BL120";
  if (desc.includes("100 ML BOTTLE") || desc.includes("100ML BOTTLE")) return "BL100";
  if (desc.includes("70 ML BOTTLE") || desc.includes("70ML BOTTLE")) return "BL70";
  if (desc.includes("60 ML BOTTLE") || desc.includes("60ML BOTTLE")) return "BL60";
  if (desc.includes("50 ML BOTTLE") || desc.includes("50ML BOTTLE")) return "BL50";
  if (desc.includes("30 ML BOTTLE") || desc.includes("30ML BOTTLE")) return "BL30";
  if (desc.includes("25 ML BOTTLE") || desc.includes("25ML BOTTLE")) return "BL25";
  if (desc.includes("15 ML BOTTLE") || desc.includes("15ML BOTTLE")) return "BL15";
  if (desc.includes("10 ML BOTTLE") || desc.includes("10ML BOTTLE")) return "BL10";
  if (desc.includes("5 ML BOTTLE") || desc.includes("5ML BOTTLE")) return "BL05";

  // 6. IV Bags
  if (desc.includes("1 L BAG") || desc.includes("1L BAG")) return "BG1L";
  if (desc.includes("500 ML BAG") || desc.includes("500ML BAG")) return "BG500";
  if (desc.includes("250 ML BAG") || desc.includes("250ML BAG")) return "BG250";
  if (desc.includes("100 ML BAG") || desc.includes("100ML BAG")) return "BG100";

  // 7. Topical Tubes & Jars
  if (desc.includes("500 G JAR") || desc.includes("450 G JAR")) return "JR450";
  if (desc.includes("100 G JAR")) return "JR100";
  if (desc.includes("30 G JAR")) return "JR30";
  if (desc.includes("15 G JAR")) return "JR15";
  if (desc.includes("50 G TUBE") || desc.includes("50G TUBE")) return "TB50";
  if (desc.includes("40 G TUBE") || desc.includes("40G TUBE")) return "TB40";
  if (desc.includes("30 G TUBE") || desc.includes("30G TUBE")) return "TB30";
  if (desc.includes("25 G TUBE") || desc.includes("25G TUBE")) return "TB25";
  if (desc.includes("20 G TUBE") || desc.includes("20G TUBE")) return "TB20";
  if (desc.includes("15 G TUBE") || desc.includes("15G TUBE")) return "TB15";
  if (desc.includes("10 G TUBE") || desc.includes("10G TUBE")) return "TB10";
  if (desc.includes("5 G TUBE") || desc.includes("5G TUBE")) return "TB05";
  if (desc.includes("4.5 G TUBE") || desc.includes("4G TUBE")) return "TB04";
  if (desc.includes("3.5 G TUBE") || desc.includes("3.5G TUBE")) return "TB03";
  if (desc.includes("2.5 G TUBE") || desc.includes("2G TUBE")) return "TB02";

  // 8. Nebules, Sachets & Others
  if (desc.includes("2.5 ML NEBULE") || desc.includes("NEBULE")) return "NB01";
  if (desc.includes("2 ML NEBULE")) return "NB02";
  if (desc.includes("10 ML SACHET") || desc.includes("10ML SACHET")) return "SC10";
  if (desc.includes("6 ML SACHET") || desc.includes("6ML SACHET")) return "SC06";
  if (desc.includes("SACHET")) return "SC01";
  if (desc.includes("CARTRIDGE")) return "CR01";
  if (desc.includes("CARPULE")) return "CP01";
  if (desc.includes("CANISTER") || desc.includes("INHALER")) return "IH01";
  if (desc.includes("DISPENSER")) return "DP01";
  if (desc.includes("SPRAY")) return "SP50";
  if (desc.includes("PATCH")) return "PT01";
  if (desc.includes("SUPPOSITORY")) return "SP01";

  // 9. Generic container keywords fallback
  if (desc.includes("VIAL")) return "VL01";
  if (desc.includes("AMPOULE") || desc.includes("AMP")) return "AM01";
  if (desc.includes("BOTTLE")) return "BL01";
  if (desc.includes("TUBE")) return "TB01";

  // 10. Default for tablets/capsules
  return "BX100";
};

const generateSkuPreview = (brand, generic, dosage, form, packagingUnitCode) => {
  const cleanBrand = (brand || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const brandCode = cleanBrand.length >= 4
    ? cleanBrand.slice(0, 4)
    : (cleanBrand ? cleanBrand.padEnd(4, "X") : "GENE");

  // 5-letter generic code
  let genericPart = "MEDIC";
  if (generic) {
    let cleaned = generic.replace(/^\s*\d+(?:\.\d+)?%?\s*/, "").trim();
    if (cleaned.includes("+")) {
      const parts = cleaned.split("+").map((p) => {
        const words = p.trim().split(/\s+/);
        const w = words[0].replace(/[^a-zA-Z]/g, "").toUpperCase();
        return w.length >= 5 ? w.slice(0, 5) : w;
      }).filter(Boolean);
      if (parts.length > 0) genericPart = parts.join("+");
    } else {
      const words = cleaned.split(/\s+/);
      for (const w of words) {
        const wClean = w.replace(/[^a-zA-Z]/g, "").toUpperCase();
        if (wClean.length >= 3) {
          genericPart = wClean.length >= 5 ? wClean.slice(0, 5) : wClean;
          break;
        }
      }
    }
  }

  // Strength digits (combines both for multi-ingredient medicines)
  let strengthDigits = "";
  if (dosage) {
    if (String(dosage).includes("+")) {
      const parts = String(dosage).split("+");
      const nums = parts
        .map((p) => {
          const m = p.match(/\d+(?:\.\d+)?/);
          return m ? m[0].replace(".", "") : "";
        })
        .filter(Boolean);
      strengthDigits = nums.join("+");
    } else {
      const m = String(dosage).match(/\d+(?:\.\d+)?/);
      if (m) {
        strengthDigits = m[0].replace(".", "");
      }
    }
  }

  // Form code 3 letters
  let formCode = "TAB";
  if (form) {
    const fUpper = form.toUpperCase();
    if (FORM_CODES[fUpper]) {
      formCode = FORM_CODES[fUpper];
    } else if (fUpper.includes("TAB")) formCode = "TAB";
    else if (fUpper.includes("CAP")) formCode = "CAP";
    else if (fUpper.includes("SYR")) formCode = "SYR";
    else if (fUpper.includes("SUS")) formCode = "SUS";
    else if (fUpper.includes("INJ")) formCode = "INJ";
    else if (fUpper.includes("SOL")) formCode = "SOL";
    else if (fUpper.includes("OIN")) formCode = "OIN";
    else if (fUpper.includes("CRM")) formCode = "CRM";
    else if (fUpper.includes("DRP")) formCode = "DRP";
    else if (fUpper.includes("INH")) formCode = "INH";
    else if (fUpper.includes("SUP")) formCode = "SUP";
    else if (fUpper.includes("POW")) formCode = "POW";
    else if (fUpper.includes("SAC")) formCode = "SAC";
    else if (fUpper.includes("PAT")) formCode = "PAT";
    else if (fUpper.includes("LOT")) formCode = "LOT";
    else if (fUpper.includes("GEL")) formCode = "GEL";
    else {
      const cleanF = fUpper.replace(/[^A-Z]/g, "");
      formCode = cleanF.length >= 3 ? cleanF.slice(0, 3) : cleanF.padEnd(3, "X");
    }
  }

  const packPart = packagingUnitCode || "BX100";

  return `${brandCode}-${genericPart}${strengthDigits}-${formCode}-${packPart}`;
};

const mapDtoToSku = (dto) => {
  return {
    id: dto.id,
    sku: dto.name || "",
    name: dto.name || "",
    medicineId: dto.medicineId,
    brandName: dto.brandName || "",
    genericName: dto.drugDescription || "",
    dosage: dto.dosageStrength || extractDosageFromDescription(dto.drugDescription) || "",
    dosageStrength: dto.dosageStrength || extractDosageFromDescription(dto.drugDescription) || "",
    dosageForm: dto.dosageForm || "",
    packagingUnit: dto.packagingUnit || "",
    currentStock: Number(dto.units ?? 0),
    units: Number(dto.units ?? 0),
    minimumLevel: Number(dto.minimumLevel ?? 0),
    reorderLevel: Number(dto.reorderLevel ?? 0),
    maximumLevel: Number(dto.maximumLevel ?? 0),
    facilityId: dto.facilityId,
    facility: dto.facilityName || "",
    status: "Active",
    pendingUnits: Number(dto.pendingUnits || 0),
    toReceiveUnits: Number(dto.toReceiveUnits || 0),
    hasPendingRestock: Boolean(dto.hasPendingRestock),
    pendingRestockUnits: Number(dto.pendingRestockUnits || 0),
    pendingRestockRequestId: dto.pendingRestockRequestId || null,
    pendingRestockCreatedAt: dto.pendingRestockCreatedAt || null,
    pendingRestockStatus: dto.pendingRestockStatus || null,
    createdAt: dto.createdAt
      ? String(dto.createdAt).split("T")[0]
      : new Date().toISOString().split("T")[0],
    updatedAt: dto.updatedAt ? String(dto.updatedAt).split("T")[0] : "",
  };
};

function SkuManagement() {
  const { facility } = useAuth();

  // Automatically detect current active facility
  const currentFacilityName = useMemo(() => {
    return facility?.name || "";
  }, [facility]);

  const targetFacilityId = useMemo(() => {
    return facility?.id || null;
  }, [facility]);

  const [skuList, setSkuList] = useState([]);
  const [isLoadingSkus, setIsLoadingSkus] = useState(true);
  const [skuError, setSkuError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStockFilter, setSelectedStockFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal State: 'add' | 'view' | 'edit' | 'delete' | 'adjust' | 'restock' | null
  const [modalMode, setModalMode] = useState(null);
  const [selectedSku, setSelectedSku] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_SKU_FORM_DATA);
  const [createdSkuInfo, setCreatedSkuInfo] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [restockFormData, setRestockFormData] = useState(
    DEFAULT_RESTOCK_FORM_DATA,
  );
  const [isRestockSubmitting, setIsRestockSubmitting] = useState(false);
  const [restockSuccessInfo, setRestockSuccessInfo] = useState(null);
  const [isRestockSuccessModalOpen, setIsRestockSuccessModalOpen] =
    useState(false);
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearErrors,
    clearError,
  } = useError();

  const [libMedicines, setLibMedicines] = useState([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(false);
  const [packagingUnits, setPackagingUnits] = useState([]);

  useEffect(() => {
    const fetchPackagingUnits = async () => {
      try {
        const data = await libPackagingUnitService.getAll();
        setPackagingUnits(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load packaging units:", err);
      }
    };
    fetchPackagingUnits();
  }, []);

  const packagingOptions = useMemo(() => {
    return packagingUnits.map((u) => ({
      value: u.code,
      label: `${u.name} (${u.code})`,
    }));
  }, [packagingUnits]);

  // Fetch SKUs from backend API (all or via searchSku endpoint)
  const fetchSkus = useCallback(
    async (query = "") => {
      try {
        setIsLoadingSkus(true);
        setSkuError(null);

        if (!targetFacilityId) {
          setSkuList([]);
          return;
        }

        let data;
        if (query && query.trim()) {
          data = await skuService.searchSku(query.trim(), targetFacilityId);
        } else {
          data = await skuService.getAllSkus(targetFacilityId);
        }

        if (Array.isArray(data)) {
          setSkuList(data.map(mapDtoToSku));
        }
      } catch (err) {
        console.error("Failed to load SKUs from backend:", err);
        setSkuError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load SKUs from server.",
        );
      } finally {
        setIsLoadingSkus(false);
      }
    },
    [targetFacilityId],
  );

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchSkus(searchQuery);
      return;
    }

    const timer = setTimeout(() => {
      fetchSkus(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchSkus]);

  // Search Medicine Library from backend API
  const handleSearchMedicines = async (searchQuery = "") => {
    try {
      setIsLoadingMedicines(true);
      const data = await libMedicineService.searchDropdown(
        searchQuery.trim(),
        500,
      );
      setLibMedicines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to search medicines from library API:", err);
      setLibMedicines([]);
    } finally {
      setIsLoadingMedicines(false);
    }
  };

  // Facility Batches for Expired Batches Tracking, Deduction & Stock Adjustments
  const [facilityBatches, setFacilityBatches] = useState([]);
  const [isProcessingExpired, setIsProcessingExpired] = useState(false);
  const [expiredResultModal, setExpiredResultModal] = useState(null);
  const [isConfirmExpiredModalOpen, setIsConfirmExpiredModalOpen] =
    useState(false);
  const [targetSkuForExpiredDeduction, setTargetSkuForExpiredDeduction] =
    useState(null);

  // Batch Management Action Form States in SKU Management
  const [adjustFormData, setAdjustFormData] = useState(
    DEFAULT_STOCK_ADJUSTMENT,
  );

  // Available batches for the selected SKU derived directly from already-loaded facilityBatches (FEFO sorted)
  const skuBatches = useMemo(() => {
    if (!selectedSku) return [];
    const todayStr = new Date().toISOString().split("T")[0];
    return (facilityBatches || [])
      .filter(
        (b) =>
          Number(b.skuId) === Number(selectedSku.id) &&
          b.status === "Available" &&
          b.expiryDate &&
          b.expiryDate > todayStr,
      )
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  }, [selectedSku, facilityBatches]);

  // Selected batch for stock adjustment (ADD mode)
  const selectedBatch = useMemo(() => {
    if (!adjustFormData.batchId || !skuBatches.length) return null;
    return (
      skuBatches.find((b) => String(b.id) === String(adjustFormData.batchId)) ||
      null
    );
  }, [adjustFormData.batchId, skuBatches]);

  // Expired batches that still have units and have not had SKU units deducted yet
  const expiredBatches = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return facilityBatches.filter((b) => {
      const units = Number(b.units || 0);
      if (units <= 0) return false;
      if (b.skuDeducted) return false;
      return (
        b.status === "Expired" || (b.expiryDate && b.expiryDate <= todayStr)
      );
    });
  }, [facilityBatches]);

  const expiredBatchesCount = expiredBatches.length;
  const expiredUnitsCount = useMemo(() => {
    return expiredBatches.reduce((acc, b) => acc + Number(b.units || 0), 0);
  }, [expiredBatches]);

  // Map of expired batches grouped by SKU ID
  const expiredBatchesBySkuId = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const map = {};
    for (const b of facilityBatches) {
      const units = Number(b.units || 0);
      if (units <= 0) continue;
      if (b.skuDeducted) continue;
      const isExpired =
        b.status === "Expired" || (b.expiryDate && b.expiryDate <= todayStr);
      if (isExpired) {
        const key = b.skuId;
        if (key) {
          if (!map[key]) map[key] = [];
          map[key].push(b);
        }
      }
    }
    return map;
  }, [facilityBatches]);

  const targetSkuExpiredBatches = useMemo(() => {
    if (targetSkuForExpiredDeduction) {
      return expiredBatchesBySkuId[targetSkuForExpiredDeduction.id] || [];
    }
    return expiredBatches;
  }, [targetSkuForExpiredDeduction, expiredBatchesBySkuId, expiredBatches]);

  const targetSkuExpiredUnits = useMemo(() => {
    return targetSkuExpiredBatches.reduce(
      (acc, b) => acc + Number(b.units || 0),
      0,
    );
  }, [targetSkuExpiredBatches]);

  const handleOpenExpiredModalForSku = (skuItem) => {
    setTargetSkuForExpiredDeduction(skuItem);
    setIsConfirmExpiredModalOpen(true);
  };

  const loadFacilityBatches = useCallback(async () => {
    if (!targetFacilityId) {
      setFacilityBatches([]);
      return;
    }
    try {
      const data = await batchService.getBatchesByFacility(targetFacilityId);
      setFacilityBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load facility batches for expiry check:", err);
      setFacilityBatches([]);
    }
  }, [targetFacilityId]);

  useEffect(() => {
    loadFacilityBatches();
  }, [loadFacilityBatches]);

  // Handler to manually process/deduct expired batches for a specific SKU
  const handleProcessExpiredBatches = async () => {
    if (!targetFacilityId) {
      setSkuError("Facility is required to process expired batches.");
      return;
    }
    const skuToDeduct = targetSkuForExpiredDeduction;
    if (!skuToDeduct || !skuToDeduct.id) {
      setSkuError("Target SKU is required to process expired batches.");
      return;
    }
    setIsProcessingExpired(true);
    setIsConfirmExpiredModalOpen(false);
    try {
      const result = await batchService.processExpiredBatches(
        targetFacilityId,
        skuToDeduct.id,
      );
      const count =
        typeof result?.count === "number"
          ? result.count
          : expiredBatchesBySkuId[skuToDeduct.id]?.length || 0;
      const msg =
        result?.message ||
        `Successfully processed and deducted ${count} expired batch(es) for ${skuToDeduct.brandName}.`;
      setExpiredResultModal({
        count,
        message: msg,
      });

      // Synchronously refresh both SKUs and Batches
      await Promise.all([fetchSkus(searchQuery), loadFacilityBatches()]);
    } catch (err) {
      console.error("Failed to process expired batches:", err);
      setSkuError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to process expired batches.",
      );
    } finally {
      setIsProcessingExpired(false);
      setTargetSkuForExpiredDeduction(null);
    }
  };

  // Filter SKUs that reference the current active facility
  const currentFacilitySkus = useMemo(() => {
    if (!targetFacilityId) return [];
    return skuList.filter((s) => s.facilityId === targetFacilityId);
  }, [skuList, targetFacilityId]);

  // Calculate Metrics for Current Facility
  const totalSkus = currentFacilitySkus.length;

  const optimalCount = useMemo(
    () =>
      currentFacilitySkus.filter((s) => s.currentStock > s.reorderLevel).length,
    [currentFacilitySkus],
  );

  const reorderCount = useMemo(
    () =>
      currentFacilitySkus.filter(
        (s) =>
          s.currentStock <= s.reorderLevel && s.currentStock > s.minimumLevel,
      ).length,
    [currentFacilitySkus],
  );

  const criticalCount = useMemo(
    () =>
      currentFacilitySkus.filter((s) => s.currentStock <= s.minimumLevel)
        .length,
    [currentFacilitySkus],
  );

  // Filtered SKUs for Current Facility
  const filteredSkus = useMemo(() => {
    return currentFacilitySkus.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (item.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brandName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (item.genericName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (item.dosage || "").toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStock = true;
      if (selectedStockFilter === "OPTIMAL") {
        matchesStock = item.currentStock > item.reorderLevel;
      } else if (selectedStockFilter === "REORDER") {
        matchesStock =
          item.currentStock <= item.reorderLevel &&
          item.currentStock > item.minimumLevel;
      } else if (selectedStockFilter === "CRITICAL") {
        matchesStock = item.currentStock <= item.minimumLevel;
      } else if (selectedStockFilter === "OUT_OF_STOCK") {
        matchesStock = item.currentStock === 0;
      }

      return matchesSearch && matchesStock;
    });
  }, [currentFacilitySkus, searchQuery, selectedStockFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredSkus.length / itemsPerPage) || 1;
  const paginatedSkus = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSkus.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSkus, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStockFilterChange = (e) => {
    setSelectedStockFilter(e.target.value);
    setCurrentPage(1);
  };

  // When Medicine is selected from Library in modal
  const handleMedicineSelect = (e, selectedOptionObj) => {
    const medId = Number(e?.target?.value ?? e);
    const selectedMed =
      selectedOptionObj || libMedicines.find((m) => m.id === medId);
    if (selectedMed) {
      const genericName = selectedMed.drugDescription || "";
      const rawPackageCode =
        selectedMed.packageCode || selectedMed.package_code || "";
      const dosageForm = (
        extractDosageFormFromDescription(genericName, rawPackageCode) ||
        rawPackageCode.slice(0, 3) ||
        "TABLET"
      ).toUpperCase();
      const extractedDosage =
        extractDosageFromDescription(genericName) ||
        (selectedMed.strengthCode
          ? `${selectedMed.strengthCode} ${selectedMed.unitCode || ""}`.trim()
          : "");

      const detectedCode = detectPackagingCodeFromDesc(genericName);
      const matchedUnit = packagingUnits.find((u) => u.code === detectedCode);
      const packagingUnitName = matchedUnit ? matchedUnit.name : "Box of 100";

      setFormData((prev) => {
        const brandName = (prev.brandName || "").toUpperCase();
        const generatedSku = generateSkuPreview(
          brandName,
          genericName,
          extractedDosage,
          dosageForm,
          detectedCode,
        );
        return {
          ...prev,
          medicineId: selectedMed.id,
          brandName,
          genericName,
          dosage: extractedDosage,
          dosageForm,
          packagingUnitCode: detectedCode,
          packagingUnit: packagingUnitName,
          sku: generatedSku,
        };
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        medicineId: "",
        genericName: "",
        dosage: "",
        dosageForm: "",
        packagingUnitCode: "BX100",
        packagingUnit: "Box of 100",
        sku: "",
      }));
    }
    clearError("medicineId");
  };

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setFormData(DEFAULT_SKU_FORM_DATA);
    clearErrors();
    setSelectedSku(null);
    handleSearchMedicines("");
    setModalMode("add");
  };

  const handleOpenViewModal = (skuItem) => {
    setSelectedSku(skuItem);
    setModalMode("view");
  };

  const handleOpenEditModal = (skuItem) => {
    setSelectedSku(skuItem);
    const matchedUnit = packagingUnits.find(
      (u) =>
        u.name.toLowerCase() === (skuItem.packagingUnit || "").toLowerCase() ||
        u.code === skuItem.packagingUnit,
    );
    setFormData({
      medicineId: skuItem.medicineId,
      sku: skuItem.sku,
      brandName: skuItem.brandName || "",
      genericName: skuItem.genericName || "",
      dosage: skuItem.dosage || "",
      dosageForm: skuItem.dosageForm || "TABLET",
      packagingUnitCode: matchedUnit ? matchedUnit.code : "BX100",
      packagingUnit:
        skuItem.packagingUnit ||
        (matchedUnit ? matchedUnit.name : "Box of 100"),
      minimumLevel: skuItem.minimumLevel,
      reorderLevel: skuItem.reorderLevel,
      maximumLevel: skuItem.maximumLevel,
      status: skuItem.status || "Active",
    });
    clearErrors();
    setModalMode("edit");
  };

  const handleOpenDeleteModal = (skuItem) => {
    setSelectedSku(skuItem);
    setModalMode("delete");
  };

  // --- BATCH MANAGEMENT ACTION OPENERS ---

  const handleOpenAdjustModal = (skuItem) => {
    setSelectedSku(skuItem);
    const todayStr = new Date().toISOString().split("T")[0];
    const available = (facilityBatches || []).filter(
      (b) =>
        Number(b.skuId) === Number(skuItem?.id) &&
        b.status === "Available" &&
        b.expiryDate &&
        b.expiryDate > todayStr,
    );
    setAdjustFormData({
      ...DEFAULT_STOCK_ADJUSTMENT,
      batchId: available.length === 1 ? String(available[0].id) : "",
    });
    clearErrors();
    setModalMode("adjust");
  };

  const handleOpenRestockModal = (skuItem = null) => {
    if (skuItem && skuItem.id) {
      setSelectedSku(skuItem);
      const suggestedUnits =
        skuItem.maximumLevel && skuItem.currentStock !== undefined
          ? Math.max(1, skuItem.maximumLevel - skuItem.currentStock)
          : "";
      setRestockFormData({
        skuId: String(skuItem.id),
        requestedUnits: suggestedUnits,
        reason: "",
      });
    } else {
      setSelectedSku(null);
      setRestockFormData(DEFAULT_RESTOCK_FORM_DATA);
    }
    clearErrors();
    setModalMode("restock");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedSku(null);
    setRestockFormData(DEFAULT_RESTOCK_FORM_DATA);
    setAdjustFormData(DEFAULT_STOCK_ADJUSTMENT);
    clearErrors();
  };

  const handleSaveRestockRequest = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!restockFormData.skuId) {
      errors.skuId = "Please select an SKU to restock";
    }
    const units = Number(restockFormData.requestedUnits);
    if (!restockFormData.requestedUnits || isNaN(units) || units < 1) {
      errors.requestedUnits = "Requested units must be at least 1";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const targetSku =
      selectedSku ||
      currentFacilitySkus.find(
        (s) => String(s.id) === String(restockFormData.skuId),
      );
    if (targetSku?.hasPendingRestock) {
      setFormErrors({
        requestedUnits: `A restock request is already active for this SKU (${targetSku.pendingRestockUnits} units, Status: ${targetSku.pendingRestockStatus || "Requested"}). A new request can only be submitted once the current order is Received.`,
      });
      return;
    }

    try {
      setIsRestockSubmitting(true);
      const targetFacilityIdToUse =
        facility?.id || selectedSku?.facilityId || targetFacilityId;

      if (!targetFacilityIdToUse) {
        setFormErrors({
          skuId:
            "Active facility could not be determined. Please re-select your operating facility.",
        });
        return;
      }

      const payload = {
        skuId: Number(restockFormData.skuId),
        facilityId: Number(targetFacilityIdToUse),
        requestedUnits: units,
        reason: restockFormData.reason ? restockFormData.reason.trim() : null,
      };

      const result = await restockRequestService.createRestockRequest(payload);

      setRestockSuccessInfo({
        skuCode: result?.skuCode || selectedSku?.sku,
        brandName: result?.brandName || selectedSku?.brandName,
        genericName: result?.genericName || selectedSku?.genericName,
        requestedUnits: result?.requestedUnits || units,
        facilityName: result?.facilityName || currentFacilityName,
      });
      setIsRestockSuccessModalOpen(true);
      handleCloseModal();
      await fetchSkus(searchQuery);
    } catch (err) {
      console.error("Failed to submit restock request:", err);
      const serverMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to submit restock request.";
      setFormErrors({
        requestedUnits: serverMessage,
      });
    } finally {
      setIsRestockSubmitting(false);
    }
  };

  // Form Field Change Handler
  const handleInputChange = (e) => {
    const { name, value, type: inputType } = e.target;
    const finalValue =
      inputType === "number"
        ? Number(value)
        : typeof value === "string"
          ? value.toUpperCase()
          : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: finalValue };

      if (name === "packagingUnitCode") {
        const unit = packagingUnits.find((u) => u.code === finalValue);
        if (unit) {
          updated.packagingUnit = unit.name;
        }
      }

      if (name === "brandName" || name === "packagingUnitCode") {
        const brandForSku = name === "brandName" ? finalValue : prev.brandName;
        const packCodeForSku =
          name === "packagingUnitCode"
            ? finalValue
            : prev.packagingUnitCode || "BX100";

        updated.sku = generateSkuPreview(
          brandForSku,
          prev.genericName,
          prev.dosage,
          prev.dosageForm,
          packCodeForSku,
        );
      }

      return updated;
    });

    clearError(name);
  };

  // Save (Add or Edit) SKU
  const handleSaveSku = async (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateSkuForm(formData, {
      currentFacilitySkus,
      excludeId: selectedSku?.id,
      currentFacilityName,
    });
    if (!isValid) {
      setFormErrors(validationErrors);
      return;
    }

    const targetFacilityIdToSave =
      facility?.id || selectedSku?.facilityId || targetFacilityId;

    if (!targetFacilityIdToSave) {
      setFormErrors({
        sku: "Active operating facility could not be determined. Please ensure you are logged into a valid facility.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "add") {
        const payload = {
          facilityId: Number(targetFacilityIdToSave),
          medicineId: Number(formData.medicineId),
          name: formData.sku ? formData.sku.trim().toUpperCase() : undefined,
          brandName: formData.brandName.trim().toUpperCase(),
          packagingUnitCode: formData.packagingUnitCode || undefined,
          packagingUnit: formData.packagingUnit || undefined,
          dosageForm: formData.dosageForm
            ? formData.dosageForm.trim().toUpperCase()
            : undefined,
          dosageStrength: formData.dosage
            ? formData.dosage.trim()
            : undefined,
          units: 0,
          minimumLevel: Number(formData.minimumLevel),
          reorderLevel: Number(formData.reorderLevel),
          maximumLevel: Number(formData.maximumLevel),
        };

        const responseDto = await skuService.createSku(payload);
        const newSkuItem = mapDtoToSku(responseDto);
        if (!newSkuItem.genericName)
          newSkuItem.genericName = formData.genericName;
        if (!newSkuItem.dosage) newSkuItem.dosage = formData.dosage;
        if (!newSkuItem.facility) newSkuItem.facility = currentFacilityName;

        setSkuList((prev) => [newSkuItem, ...prev]);
        handleCloseModal();
        setCreatedSkuInfo(newSkuItem);
        setIsSuccessModalOpen(true);
        return;
      } else if (modalMode === "edit" && selectedSku) {
        const editFacilityId = selectedSku.facilityId || targetFacilityIdToSave;

        const editMedicineId = formData.medicineId || selectedSku.medicineId;
        if (!editMedicineId) {
          setFormErrors({
            medicineId: "Associated medicine ID is missing.",
          });
          return;
        }

        const payload = {
          facilityId: Number(editFacilityId),
          medicineId: Number(editMedicineId),
          brandName: formData.brandName.trim().toUpperCase(),
          packagingUnitCode: formData.packagingUnitCode || undefined,
          packagingUnit: formData.packagingUnit || undefined,
          dosageForm: formData.dosageForm
            ? formData.dosageForm.trim().toUpperCase()
            : undefined,
          dosageStrength: formData.dosage
            ? formData.dosage.trim()
            : undefined,
          minimumLevel: Number(formData.minimumLevel),
          reorderLevel: Number(formData.reorderLevel),
          maximumLevel: Number(formData.maximumLevel),
        };

        const responseDto = await skuService.updateSku(selectedSku.id, payload);
        const updatedItem = mapDtoToSku(responseDto);
        if (!updatedItem.genericName)
          updatedItem.genericName =
            formData.genericName || selectedSku.genericName;
        if (!updatedItem.dosage)
          updatedItem.dosage = formData.dosage || selectedSku.dosage;
        if (!updatedItem.facility)
          updatedItem.facility = selectedSku.facility || currentFacilityName;

        setSkuList((prev) =>
          prev.map((s) => (s.id === selectedSku.id ? updatedItem : s)),
        );
        handleCloseModal();
      }
    } catch (err) {
      console.error("Failed to save SKU:", err);
      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to save SKU to server.";
      setFormErrors({ sku: backendMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete SKU Confirmation
  const handleConfirmDelete = async () => {
    if (!selectedSku) return;

    setIsSubmitting(true);
    try {
      await skuService.deleteSku(selectedSku.id);
      setSkuList((prev) => prev.filter((s) => s.id !== selectedSku.id));

      if (paginatedSkus.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }

      handleCloseModal();
    } catch (err) {
      console.error("Failed to delete SKU from server:", err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete SKU from server.";
      setSkuError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Stock Adjustment Action
  const handleSaveStockAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedSku) return;

    const errors = {};
    const amt = Number(adjustFormData.amount);

    if (adjustFormData.amount === "" || isNaN(amt) || amt < 0) {
      errors.amount = "Please enter a valid non-negative quantity.";
    } else if (
      adjustFormData.type === "SUBTRACT" &&
      (expiredBatchesBySkuId[selectedSku.id]?.length || 0) > 0
    ) {
      errors.amount =
        "This SKU has unprocessed expired batches. Please deduct expired batches first before deducting stock.";
    } else if (
      adjustFormData.type === "SUBTRACT" &&
      amt > selectedSku.currentStock
    ) {
      errors.amount = `Cannot deduct more than available current stock (${selectedSku.currentStock}).`;
    }

    const isDispensed =
      String(adjustFormData.reason || "").trim().toUpperCase() === "DISPENSED";

    if (
      adjustFormData.type === "ADD" &&
      skuBatches.length > 0 &&
      !adjustFormData.batchId
    ) {
      errors.batchId =
        "Please select a target batch to receive the added stock.";
    } else if (
      adjustFormData.type === "SUBTRACT" &&
      !isDispensed &&
      skuBatches.length > 0 &&
      !adjustFormData.batchId
    ) {
      errors.batchId =
        "Please select which batch to deduct stock from.";
    }

    if (adjustFormData.type === "ADD" && adjustFormData.batchId) {
      const todayStr = new Date().toISOString().split("T")[0];
      const chosen = skuBatches.find(
        (b) => String(b.id) === String(adjustFormData.batchId),
      );
      if (
        chosen &&
        (chosen.status === "Expired" ||
          (chosen.expiryDate && chosen.expiryDate <= todayStr))
      ) {
        errors.batchId = "Cannot add stock to an expired batch.";
      }
    } else if (
      adjustFormData.type === "SUBTRACT" &&
      !isDispensed &&
      adjustFormData.batchId
    ) {
      const chosen = skuBatches.find(
        (b) => String(b.id) === String(adjustFormData.batchId),
      );
      if (chosen && amt > (Number(chosen.units) || 0)) {
        errors.amount = `Cannot deduct ${amt} units from Batch #${chosen.batchNum} (only ${chosen.units} units available in this batch).`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      clearErrors();
      await skuService.adjustStock(selectedSku.id, {
        type: adjustFormData.type,
        amount: amt,
        reason: adjustFormData.reason,
        notes: adjustFormData.notes ? adjustFormData.notes.trim() : null,
        batchId:
          (adjustFormData.type === "ADD" ||
            (adjustFormData.type === "SUBTRACT" && !isDispensed)) &&
          adjustFormData.batchId
            ? Number(adjustFormData.batchId)
            : null,
      });

      await Promise.all([fetchSkus(searchQuery), loadFacilityBatches()]);
      handleCloseModal();
    } catch (err) {
      console.error("Failed to adjust stock:", err);
      setFormErrors({
        general:
          err.response?.data?.message ||
          err.message ||
          "Failed to adjust stock. Please try again.",
      });
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
              SKU & Stock Management
            </h1>
            {/* Active Facility Indicator */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentFacilityName}</span>
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Displaying stock-keeping units, threshold calibration, and inventory
            levels
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={fetchSkus}
            disabled={isLoadingSkus}
            className="btn-secondary p-2.5 text-gray-600 hover:text-blue-600"
            title="Refresh SKUs"
            aria-label="Refresh SKUs"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingSkus ? "animate-spin text-blue-600" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() => handleOpenRestockModal()}
            className="btn-secondary self-start sm:self-auto shadow-sm flex items-center gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
            title="Request Stock Replenishment"
          >
            <PackagePlus className="w-4 h-4 text-blue-600" />
            <span>Request Extra Stock</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="btn-primary self-start sm:self-auto shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New SKU</span>
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards for Current Facility */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up-1">
        {/* Total SKUs */}
        <Card className="p-5">
          {isLoadingSkus ? (
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
                  Facility SKUs
                </p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {totalSkus}
                </h3>
                <span className="inline-block text-[11px] font-medium text-blue-600 mt-1 truncate max-w-44">
                  At {currentFacilityName}
                </span>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
          )}
        </Card>

        {/* Optimal Stock */}
        <Card className="p-5">
          {isLoadingSkus ? (
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
                  Optimal Stock
                </p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {optimalCount}
                </h3>
                <span className="inline-block text-[11px] font-medium text-emerald-600 mt-1">
                  Above reorder level
                </span>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          )}
        </Card>

        {/* Reorder Needed */}
        <Card className="p-5">
          {isLoadingSkus ? (
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-7 w-12 mt-1" />
                <Skeleton className="h-3 w-36 mt-1" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Reorder Needed
                </p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {reorderCount}
                </h3>
                <span className="inline-block text-[11px] font-medium text-amber-600 mt-1">
                  At or below reorder trigger
                </span>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          )}
        </Card>

        {/* Critical / Out of Stock */}
        <Card className="p-5">
          {isLoadingSkus ? (
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
                  Critical / Low
                </p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {criticalCount}
                </h3>
                <span className="inline-block text-[11px] font-medium text-red-600 mt-1">
                  At or below minimum level
                </span>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden border border-gray-200 animate-slide-up-2">
        {/* Search & Filter Controls */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-50/50">
          <div className="w-full md:w-80">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              onClear={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              placeholder="Search by SKU, brand, generic, dosage..."
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* Stock Health Filter */}
            <Dropdown
              value={selectedStockFilter}
              onChange={handleStockFilterChange}
              size="sm"
              className="w-full sm:w-44"
              options={[
                { value: "ALL", label: "All Stock Levels" },
                { value: "OPTIMAL", label: "Optimal Stock" },
                { value: "REORDER", label: "Reorder Triggered" },
                { value: "CRITICAL", label: "Critical (≤ Min)" },
                { value: "OUT_OF_STOCK", label: "Out of Stock" },
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
                  SKU & Medicine
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Form & Packaging
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Stock Health & Capacity
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Thresholds (Min / Reorder / Max)
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Incoming Orders (Pending / To Receive)
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Management Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoadingSkus ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    {/* SKU & Medicine */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg shrink-0 mt-0.5" />
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-20 rounded" />
                          </div>
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </td>

                    {/* Form & Packaging */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1.5">
                        <Skeleton className="h-5 w-20 rounded-md" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </td>

                    {/* Stock Health & Capacity */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-24 rounded-full" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-1.5 w-36 rounded-full" />
                      </div>
                    </td>

                    {/* Thresholds */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-14 rounded-md" />
                        <Skeleton className="h-5 w-14 rounded-md" />
                        <Skeleton className="h-5 w-14 rounded-md" />
                      </div>
                    </td>

                    {/* Incoming Orders Skeletons */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-14 rounded-md" />
                        <Skeleton className="h-8 w-16 rounded-md" />
                      </div>
                    </td>

                    {/* Management Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Skeleton className="h-7 w-7 rounded-lg" />
                        <Skeleton className="h-7 w-7 rounded-lg" />
                        <Skeleton className="h-7 w-7 rounded-lg" />
                        <Skeleton className="h-7 w-7 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedSkus.length > 0 ? (
                paginatedSkus.map((item, index) => {
                  const status = getStockStatus(item);
                  const fillPercent = Math.min(
                    Math.round((item.currentStock / item.maximumLevel) * 100),
                    100,
                  );
                  const skuExpiredBatches =
                    expiredBatchesBySkuId[item.id] || [];
                  const skuExpiredCount = skuExpiredBatches.length;
                  const skuExpiredUnits = skuExpiredBatches.reduce(
                    (acc, b) => acc + Number(b.units || 0),
                    0,
                  );

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/30 transition-colors animate-slide-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {/* SKU & Medicine Details */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-semibold text-xs border border-blue-100 shrink-0 mt-0.5">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 text-sm">
                                {item.brandName}
                              </span>
                              <span className="font-mono text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-bold">
                                {item.sku}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 pb-1">
                              {item.genericName} • {item.dosage}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Deduct Expired Batches Button inside row */}
                              {skuExpiredCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenExpiredModalForSku(item)
                                  }
                                  disabled={isProcessingExpired}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 hover:border-amber-400 transition-colors shadow-xs cursor-pointer"
                                  title={`${skuExpiredCount} batch(es) past expiry (${skuExpiredUnits.toLocaleString()} units). Click to deduct.`}
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>
                                    Has Expired Batches ({skuExpiredCount})
                                  </span>
                                </button>
                              )}
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

                      {/* Stock Level & Progress Bar */}
                      <td className="px-6 py-4 whitespace-nowrap min-w-50">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-gray-900">
                            {item.currentStock}{" "}
                            <span className="text-gray-400 font-normal">
                              / {item.maximumLevel}
                            </span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.color}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`}
                            />
                            {status.label}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              item.currentStock <= item.minimumLevel
                                ? "bg-red-500"
                                : item.currentStock <= item.reorderLevel
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>0</span>
                          <span>Cap: {item.maximumLevel}</span>
                        </div>
                      </td>

                      {/* Threshold Settings */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="bg-red-50 border border-red-100 text-red-700 px-2 py-1 rounded text-center"
                            title="Minimum Threshold"
                          >
                            <span className="text-[10px] block uppercase font-medium text-red-500">
                              Min
                            </span>
                            <span className="font-bold">
                              {item.minimumLevel}
                            </span>
                          </div>
                          <div
                            className="bg-amber-50 border border-amber-100 text-amber-700 px-2 py-1 rounded text-center"
                            title="Reorder Threshold"
                          >
                            <span className="text-[10px] block uppercase font-medium text-amber-500">
                              Reorder
                            </span>
                            <span className="font-bold">
                              {item.reorderLevel}
                            </span>
                          </div>
                          <div
                            className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-1 rounded text-center"
                            title="Maximum Capacity"
                          >
                            <span className="text-[10px] block uppercase font-medium text-gray-400">
                              Max
                            </span>
                            <span className="font-bold">
                              {item.maximumLevel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Incoming Orders (Pending & To Receive) */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-2">
                          {/* 1. Pending Box */}
                          <div
                            className={`px-2.5 py-1 rounded text-center min-w-13 border ${
                              item.pendingUnits > 0
                                ? "bg-amber-50 border-amber-200 text-amber-700 shadow-xs"
                                : "bg-gray-50 border-gray-200 text-gray-400"
                            }`}
                            title={`Pending Orders / Requests: ${item.pendingUnits || 0} units awaiting approval/ordering`}
                          >
                            <span
                              className={`text-[10px] block uppercase font-medium ${
                                item.pendingUnits > 0
                                  ? "text-amber-600"
                                  : "text-gray-400"
                              }`}
                            >
                              Pending
                            </span>
                            <span
                              className={`font-bold text-xs ${
                                item.pendingUnits > 0
                                  ? "text-amber-800"
                                  : "text-gray-600"
                              }`}
                            >
                              {item.pendingUnits || 0}
                            </span>
                          </div>

                          {/* 2. To Receive Box */}
                          <div
                            className={`px-2.5 py-1 rounded text-center min-w-16 border ${
                              item.toReceiveUnits > 0
                                ? "bg-blue-50 border-blue-200 text-blue-700 shadow-xs"
                                : "bg-gray-50 border-gray-200 text-gray-400"
                            }`}
                            title={`To Receive (Approved Orders): ${item.toReceiveUnits || 0} units awaiting delivery`}
                          >
                            <span
                              className={`text-[10px] block uppercase font-medium ${
                                item.toReceiveUnits > 0
                                  ? "text-blue-600"
                                  : "text-gray-400"
                              }`}
                            >
                              To Receive
                            </span>
                            <span
                              className={`font-bold text-xs ${
                                item.toReceiveUnits > 0
                                  ? "text-blue-800"
                                  : "text-gray-600"
                              }`}
                            >
                              {item.toReceiveUnits || 0}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Management Actions Group */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. View SKU Details */}
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(item)}
                            className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                            title="View SKU Details"
                            aria-label="View SKU Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Stock Adjustment OR Process Expired (replaces adjustment when expired batches exist) */}
                          {skuExpiredCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenExpiredModalForSku(item)}
                              disabled={isProcessingExpired}
                              className="p-1.5 rounded border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-colors shadow-xs cursor-pointer"
                              title={`Deduct ${skuExpiredCount} expired batch(es) (${skuExpiredUnits.toLocaleString()} units)`}
                              aria-label="Process Expired Batches"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustModal(item)}
                              className="btn-secondary p-1.5 text-gray-600 hover:text-amber-600 hover:border-amber-300"
                              title="Stock Adjustment (Count / Write-off)"
                              aria-label="Stock Adjustment"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 3. Request Restock */}
                          <button
                            type="button"
                            onClick={() => handleOpenRestockModal(item)}
                            className={`p-1.5 rounded transition-colors ${
                              item.hasPendingRestock
                                ? "bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100"
                                : "btn-secondary text-gray-600 hover:text-blue-600 hover:border-blue-300"
                            }`}
                            title={
                              item.hasPendingRestock
                                ? `Active restock request (${item.pendingRestockUnits} units, Status: ${item.pendingRestockStatus || "Requested"}). Can only request again once Received.`
                                : "Request Restock for this SKU"
                            }
                            aria-label="Request Restock"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                          </button>

                          {/* 4. Edit SKU & Thresholds */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="btn-secondary p-1.5 text-gray-600 hover:text-emerald-600 hover:border-emerald-300"
                            title="Edit SKU & Thresholds"
                            aria-label="Edit SKU & Thresholds"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* 5. Delete SKU */}
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(item)}
                            className="btn-danger p-1.5"
                            title="Delete SKU"
                            aria-label="Delete SKU"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">
                      No SKUs found for {currentFacilityName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search query or creating a new SKU
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {filteredSkus.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredSkus.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* ======================================================== */}
      {/* 1. ADD NEW SKU / EDIT THRESHOLDS MODAL                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "add" || modalMode === "edit"}
        onClose={handleCloseModal}
        title={
          modalMode === "add"
            ? "Create New SKU from Medicine Library"
            : "Edit SKU & Inventory Thresholds"
        }
        size="2xl"
      >
        <form onSubmit={handleSaveSku} className="space-y-4">
          {/* Facility Assignment Badge */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-bold text-gray-900 block truncate">
                Facility: {currentFacilityName}
              </span>
              <span className="text-[11px] text-blue-700 font-medium">
                This SKU will be maintained in your current operating branch
              </span>
            </div>
          </div>

          {/* Medicine Library Picker (Only active when adding) */}
          {modalMode === "add" && (
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <ComboBox
                id="select-medicine"
                name="medicineId"
                label="1. Select Medicine from Library"
                labelClassName="text-blue-900 font-bold"
                required
                options={libMedicines}
                value={formData.medicineId}
                onChange={handleMedicineSelect}
                onSelect={(med) => handleMedicineSelect(med?.id, med)}
                onSearch={handleSearchMedicines}
                isLoading={isLoadingMedicines}
                loadingText="Searching medicine library..."
                placeholder={
                  isLoadingMedicines
                    ? "Searching medicine library..."
                    : "-- Choose or search a medicine --"
                }
                getOptionLabel={(med) => med.drugDescription || ""}
                getOptionSubtext={() => ""}
                getDisplayValue={(med) => med.drugDescription || ""}
                getOptionValue={(med) => med.id}
                error={formErrors.medicineId}
                inputClassName="uppercase"
              />
            </div>
          )}

          {/* Selected Medicine Clinical Details Card */}
          {formData.genericName && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                  Clinical Formulation
                </span>
                <span className="text-[11px] text-slate-400">
                  Auto-extracted from Drug Library
                </span>
              </div>
              <div className="font-bold text-gray-900 text-sm">
                {formData.genericName}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {formData.dosage && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                    Strength: {formData.dosage}
                  </span>
                )}
                {formData.dosageForm && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                    Form: {formData.dosageForm}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Brand Name Input - The ONLY text input required */}
            <div>
              <label
                htmlFor="sku-brandName"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                id="sku-brandName"
                type="text"
                name="brandName"
                value={formData.brandName}
                onChange={handleInputChange}
                placeholder="e.g. BIOGESIC, AMOXIL, VENTOLIN"
                className={`input uppercase ${
                  formErrors.brandName
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                    : ""
                }`}
                autoFocus={modalMode === "add"}
              />
              {formErrors.brandName && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.brandName}
                </p>
              )}
              <span className="text-[11px] text-gray-400 block mt-1">
                Enter proprietary brand name or "GENERIC"
              </span>
            </div>

            {/* Packaging Unit Dropdown */}
            <div>
              <Dropdown
                id="sku-packaging-unit"
                name="packagingUnitCode"
                label="Packaging Unit"
                required
                options={packagingOptions}
                value={formData.packagingUnitCode || "BX100"}
                onChange={(e) => {
                  handleInputChange({
                    target: {
                      name: "packagingUnitCode",
                      value: e?.target?.value ?? e,
                    },
                  });
                }}
                placeholder="Select packaging unit"
                error={formErrors.packagingUnit}
                helperText="Standardized packaging code used in SKU"
              />
            </div>

            {/* Live Generated SKU Identifier Card */}
            <div className="sm:col-span-2 p-3.5 rounded-xl bg-linear-to-r from-slate-50 to-blue-50/40 border border-blue-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  Automated SKU Identifier Preview
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  [BRAND]-[GENERIC][STRENGTH]-[FORM]-[PACK]
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-900 font-mono font-bold text-sm tracking-wide shadow-sm">
                  {formData.sku || "PROV-MEDIC-TAB-BX100"}
                </div>
                <span className="text-xs text-slate-500">
                  Deterministically generated upon saving
                </span>
              </div>
              {formErrors.sku && (
                <p className="text-xs text-red-500 mt-2 font-medium">
                  {formErrors.sku}
                </p>
              )}
            </div>

            {/* Section: Stock Threshold Levels */}
            <div className="sm:col-span-2 pt-2 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                Inventory Stock Thresholds
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Minimum Level */}
                <div className="p-3 rounded-lg bg-red-50/40 border border-red-100">
                  <label
                    htmlFor="sku-min"
                    className="block text-[11px] font-bold text-red-800 uppercase tracking-wider mb-1"
                  >
                    Minimum Level <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="sku-min"
                    type="number"
                    min="0"
                    name="minimumLevel"
                    value={formData.minimumLevel}
                    onChange={handleInputChange}
                    className="input bg-white py-1.5 text-sm font-semibold text-red-900"
                  />
                  <span className="text-[10px] text-red-600 block mt-1">
                    Emergency safety threshold
                  </span>
                  {formErrors.minimumLevel && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.minimumLevel}
                    </p>
                  )}
                </div>

                {/* Reorder Level */}
                <div className="p-3 rounded-lg bg-amber-50/40 border border-amber-100">
                  <label
                    htmlFor="sku-reorder"
                    className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1"
                  >
                    Reorder Level <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="sku-reorder"
                    type="number"
                    min="1"
                    name="reorderLevel"
                    value={formData.reorderLevel}
                    onChange={handleInputChange}
                    className="input bg-white py-1.5 text-sm font-semibold text-amber-900"
                  />
                  <span className="text-[10px] text-amber-600 block mt-1">
                    Triggers purchase requisition
                  </span>
                  {formErrors.reorderLevel && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.reorderLevel}
                    </p>
                  )}
                </div>

                {/* Maximum Level */}
                <div className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-100">
                  <label
                    htmlFor="sku-max"
                    className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1"
                  >
                    Maximum Level <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="sku-max"
                    type="number"
                    min="1"
                    name="maximumLevel"
                    value={formData.maximumLevel}
                    onChange={handleInputChange}
                    className="input bg-white py-1.5 text-sm font-semibold text-emerald-900"
                  />
                  <span className="text-[10px] text-emerald-600 block mt-1">
                    Storage capacity ceiling
                  </span>
                  {formErrors.maximumLevel && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.maximumLevel}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
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
              disabled={isSubmitting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : modalMode === "add" ? (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create SKU</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Threshold Adjustments</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. STOCK ADJUSTMENT MODAL                                */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "adjust" && Boolean(selectedSku)}
        onClose={handleCloseModal}
        title="Stock Adjustment Module"
        size="md"
      >
        {selectedSku && (
          <form onSubmit={handleSaveStockAdjustment} className="space-y-4">
            {formErrors.general && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formErrors.general}</span>
              </div>
            )}
            {/* SKU Context Card */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-gray-900 text-sm">
                  {selectedSku.brandName}
                </span>
                <p className="text-blue-700 font-mono font-bold mt-0.5">
                  {selectedSku.sku}
                </p>
                <p className="text-gray-500 text-[11px]">
                  {selectedSku.genericName} • {selectedSku.dosage}
                </p>
                <span className="inline-block mt-1 text-[10px] text-gray-400 font-medium">
                  Facility: {selectedSku.facility || currentFacilityName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[11px]">
                  Current Stock
                </span>
                <span className="text-xl font-bold text-gray-900">
                  {selectedSku.currentStock}{" "}
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
              <div className="grid grid-cols-2 gap-3">
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
                    setAdjustFormData((prev) => ({
                      ...prev,
                      type: "ADD",
                      batchId:
                        prev.batchId ||
                        (skuBatches.length === 1
                          ? String(skuBatches[0].id)
                          : ""),
                    }))
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                    adjustFormData.type === "ADD"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  + Add Stock
                </button>
              </div>
            </div>

            {/* Warning if trying to deduct when unprocessed expired batches exist */}
            {adjustFormData.type === "SUBTRACT" &&
              (expiredBatchesBySkuId[selectedSku.id]?.length || 0) > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">
                      Unprocessed Expired Batches Detected
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      This SKU has{" "}
                      <strong>
                        {expiredBatchesBySkuId[selectedSku.id].length}
                      </strong>{" "}
                      expired batch(es). Please deduct expired batches first
                      before making manual stock adjustments.
                    </p>
                  </div>
                </div>
              )}

            {/* Adjustment Reason */}
            <div>
              <Dropdown
                id="sku-adjust-reason"
                name="reason"
                label="Reason for Adjustment"
                required
                value={adjustFormData.reason}
                onChange={(e) => {
                  const val = e.target.value;
                  setAdjustFormData((prev) => ({
                    ...prev,
                    reason: val,
                  }));
                  clearError("batchId");
                }}
                options={ADJUSTMENT_REASONS.map((r) => ({
                  value: r,
                  label: r,
                }))}
              />
            </div>

            {/* If Reason is Dispensed & Deduct Stock: Automated FEFO Notice */}
            {adjustFormData.type === "SUBTRACT" &&
              adjustFormData.reason?.toUpperCase() === "DISPENSED" && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-950">
                      Automated FEFO (First-Expired, First-Out) Deduction
                    </p>
                    <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                      Because the adjustment reason is <strong>Dispensed</strong>, the system will automatically deduct units sequentially starting from your nearest-expiring available batch(es).
                    </p>
                  </div>
                </div>
              )}

            {/* Target Batch Selector:
                - Shown when ADD is active
                - OR when SUBTRACT is active AND reason is NOT "Dispensed"
            */}
            {(adjustFormData.type === "ADD" ||
              (adjustFormData.type === "SUBTRACT" &&
                adjustFormData.reason?.toUpperCase() !== "DISPENSED")) && (
              <div
                className={`space-y-2.5 p-3.5 rounded-xl border ${
                  adjustFormData.type === "ADD"
                    ? "bg-blue-50/50 border-blue-200/80"
                    : "bg-amber-50/40 border-amber-200/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="sku-adjust-batch"
                    className="block text-xs font-semibold text-gray-800 uppercase tracking-wider"
                  >
                    {adjustFormData.type === "ADD"
                      ? "Target Batch to Add Stock"
                      : "Target Batch to Deduct Stock From"}{" "}
                    {skuBatches.length > 0 && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                </div>

                {skuBatches.length > 0 ? (
                  <div className="space-y-2.5">
                    <Dropdown
                      id="sku-adjust-batch"
                      value={adjustFormData.batchId}
                      placeholder={
                        adjustFormData.type === "ADD"
                          ? "-- Select Target Batch to Add --"
                          : "-- Select Batch to Deduct From --"
                      }
                      error={formErrors.batchId}
                      size="sm"
                      onChange={(e) => {
                        const val = e.target.value;
                        setAdjustFormData((prev) => ({
                          ...prev,
                          batchId: val,
                        }));
                        clearError("batchId");
                      }}
                      options={skuBatches.map((b) => {
                        const exp = getExpiryStatus(b.expiryDate);
                        return {
                          value: b.id,
                          label: `Batch #${b.batchNum} • Exp: ${b.expiryDate} (${exp.label}) • Available: ${b.units} units`,
                        };
                      })}
                    />

                    {formErrors.batchId && (
                      <p className="text-xs text-red-500 font-medium">
                        {formErrors.batchId}
                      </p>
                    )}

                    {/* Prominent Selected Batch & Expiry Date Card */}
                    {selectedBatch &&
                      (() => {
                        const exp = getExpiryStatus(selectedBatch.expiryDate);
                        const currentBatchUnits = Number(
                          selectedBatch.units || 0,
                        );
                        const deltaAmount = Number(
                          adjustFormData.amount || 0,
                        );
                        const validDelta =
                          isNaN(deltaAmount) || deltaAmount < 0
                            ? 0
                            : deltaAmount;

                        const projectedTotal =
                          adjustFormData.type === "ADD"
                            ? currentBatchUnits + validDelta
                            : Math.max(0, currentBatchUnits - validDelta);

                        return (
                          <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-xs space-y-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                                    adjustFormData.type === "ADD"
                                      ? "bg-blue-50 text-blue-600 border-blue-100"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  <Package className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-gray-900 block">
                                    Batch #{selectedBatch.batchNum}
                                  </span>
                                  <span className="text-[11px] text-gray-500">
                                    Status:{" "}
                                    <span className="font-semibold text-gray-700">
                                      {selectedBatch.status || "Available"}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {/* Expiry Countdown Pill */}
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${exp.color}`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${exp.dot}`}
                                />
                                {exp.label}
                              </span>
                            </div>

                            {/* Expiry Date Highlight Banner */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs">
                              <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                                <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Batch Expiration Date:</span>
                              </div>
                              <span className="font-mono font-bold text-amber-950 text-xs bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300/60">
                                {selectedBatch.expiryDate}
                              </span>
                            </div>

                            {/* Units Projection Comparison */}
                            <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1.5 border-t border-gray-100">
                              <span>
                                Current Batch Stock:{" "}
                                <strong className="text-gray-900 font-semibold">
                                  {currentBatchUnits.toLocaleString()} units
                                </strong>
                              </span>
                              <span
                                className={`font-bold ${
                                  adjustFormData.type === "ADD"
                                    ? "text-emerald-700"
                                    : validDelta > currentBatchUnits
                                      ? "text-red-600"
                                      : "text-amber-700"
                                }`}
                              >
                                {adjustFormData.type === "ADD"
                                  ? `Projected: ${projectedTotal.toLocaleString()} units`
                                  : `Remaining: ${projectedTotal.toLocaleString()} units`}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">No Active Batches Found</p>
                      <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                        This SKU currently has no registered active batches.
                        Added stock will update the general SKU stock level
                        directly.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quantity Input */}
            <div>
              <label
                htmlFor="sku-adjust-amount"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Adjustment Amount (Units){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                id="sku-adjust-amount"
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

            {/* Notes */}
            <div>
              <label
                htmlFor="sku-adjust-notes"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Audit Notes / Reference (Optional)
              </label>
              <input
                id="sku-adjust-notes"
                type="text"
                value={adjustFormData.notes}
                onChange={(e) =>
                  setAdjustFormData((prev) => ({
                    ...prev,
                    notes: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g. APPROVED PHYSICAL INVENTORY RECONCILIATION"
                className="input uppercase"
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
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary disabled:opacity-50"
              >
                <Sliders className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? "Applying Adjustment..."
                    : "Apply Stock Adjustment"}
                </span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 4. VIEW SKU DETAILS MODAL                                */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "view" && Boolean(selectedSku)}
        onClose={handleCloseModal}
        title="SKU Details & Threshold Diagnostics"
        size="md"
      >
        {selectedSku && (
          <div className="space-y-5">
            {/* Header with Medicine & SKU details */}
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
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-gray-600 font-medium">
                    {selectedSku.dosageForm} ({selectedSku.packagingUnit})
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    <Building2 className="w-3 h-3" />
                    {selectedSku.facility || currentFacilityName}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Restock Status Notice in View Details */}
            {selectedSku.hasPendingRestock && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                  <div>
                    <span className="font-bold block text-amber-900">
                      Active Restock Request: {selectedSku.pendingRestockUnits}{" "}
                      units
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Status:{" "}
                      <strong className="uppercase">
                        {selectedSku.pendingRestockStatus || "Requested"}
                      </strong>{" "}
                      • Can request again once Received
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Threshold Gauge Card */}
            <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">
                  Current Stock Level:
                </span>
                <span className="text-base font-bold text-gray-900">
                  {selectedSku.currentStock}{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    units
                  </span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${
                    selectedSku.currentStock <= selectedSku.minimumLevel
                      ? "bg-red-500"
                      : selectedSku.currentStock <= selectedSku.reorderLevel
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      Math.round(
                        (selectedSku.currentStock / selectedSku.maximumLevel) *
                          100,
                      ),
                      100,
                    )}%`,
                  }}
                />
              </div>

              {/* 3 Thresholds Breakdown */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs border-t border-gray-100">
                <div className="p-2 rounded bg-red-50/50 border border-red-100">
                  <span className="text-[10px] uppercase font-bold text-red-600 block">
                    Min Threshold
                  </span>
                  <span className="font-bold text-red-900 text-sm">
                    {selectedSku.minimumLevel}
                  </span>
                </div>
                <div className="p-2 rounded bg-amber-50/50 border border-amber-100">
                  <span className="text-[10px] uppercase font-bold text-amber-600 block">
                    Reorder Trigger
                  </span>
                  <span className="font-bold text-amber-900 text-sm">
                    {selectedSku.reorderLevel}
                  </span>
                </div>
                <div className="p-2 rounded bg-emerald-50/50 border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                    Max Capacity
                  </span>
                  <span className="font-bold text-emerald-900 text-sm">
                    {selectedSku.maximumLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
              {(expiredBatchesBySkuId[selectedSku.id]?.length || 0) > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    handleCloseModal();
                    handleOpenExpiredModalForSku(selectedSku);
                  }}
                  className="btn-secondary text-xs text-amber-700 hover:text-amber-800 border-amber-300 bg-amber-50"
                  title="Deduct Expired Batches"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Deduct Expired (
                    {expiredBatchesBySkuId[selectedSku.id].length})
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenAdjustModal(selectedSku)}
                  className="btn-secondary text-xs text-amber-700 hover:text-amber-800"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Adjust Stock</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenRestockModal(selectedSku)}
                className={`text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                  selectedSku.hasPendingRestock
                    ? "bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100"
                    : "btn-secondary text-blue-700 hover:text-blue-800"
                }`}
                title={
                  selectedSku.hasPendingRestock
                    ? `Active restock request (${selectedSku.pendingRestockUnits} units, Status: ${selectedSku.pendingRestockStatus || "Requested"}). Can only request again once Received.`
                    : "Request Restock"
                }
              >
                {selectedSku.hasPendingRestock ? (
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <PackagePlus className="w-3.5 h-3.5" />
                )}
                <span>
                  {selectedSku.hasPendingRestock
                    ? `Restock: ${selectedSku.pendingRestockUnits} (${selectedSku.pendingRestockStatus || "Requested"})`
                    : "Request Restock"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditModal(selectedSku)}
                className="btn-primary text-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Thresholds</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* 5. DELETE SKU CONFIRMATION MODAL                         */}
      {/* ======================================================== */}
      <DeleteModal
        isOpen={modalMode === "delete" && Boolean(selectedSku)}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="Delete Stock-Keeping Unit"
        itemName={selectedSku?.brandName}
        itemCode={selectedSku?.sku}
        itemType="SKU"
        isDeleting={isSubmitting}
        message={
          selectedSku && (
            <>
              This will remove SKU{" "}
              <span className="font-bold font-mono">{selectedSku.sku}</span> (
              <span className="font-semibold">{selectedSku.brandName}</span>)
              from{" "}
              <span className="font-bold">
                {selectedSku.facility || currentFacilityName}
              </span>
              .
            </>
          )
        }
        confirmText="Delete SKU"
      />

      {/* ======================================================== */}
      {/* 6. CREATE SKU SUCCESS MODAL                              */}
      {/* ======================================================== */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setCreatedSkuInfo(null);
        }}
        title="Medication SKU Created!"
        message={`SKU ${createdSkuInfo?.sku || ""} has been successfully registered.`}
        details={
          createdSkuInfo && (
            <div className="space-y-1 text-xs">
              <p>
                <span className="font-semibold text-emerald-950">
                  Medicine:
                </span>{" "}
                {createdSkuInfo.brandName} ({createdSkuInfo.genericName})
              </p>
              <p>
                <span className="font-semibold text-emerald-950">
                  Specification:
                </span>{" "}
                {createdSkuInfo.dosage} &bull; {createdSkuInfo.dosageForm} (
                {createdSkuInfo.packagingUnit})
              </p>
              <p>
                <span className="font-semibold text-emerald-950">
                  Facility:
                </span>{" "}
                {createdSkuInfo.facility}
              </p>
              <p>
                <span className="font-semibold text-emerald-950">
                  Thresholds:
                </span>{" "}
                Min: {createdSkuInfo.minimumLevel} | Reorder:{" "}
                {createdSkuInfo.reorderLevel} | Max:{" "}
                {createdSkuInfo.maximumLevel}
              </p>
            </div>
          )
        }
        confirmText="Done"
      />

      {/* ======================================================== */}
      {/* 7. RESTOCK REQUEST MODAL (Pharmacist to Procurement)      */}
      {/* ======================================================== */}
      <Modal
        isOpen={modalMode === "restock"}
        onClose={handleCloseModal}
        title="Request Stock Replenishment"
        size="lg"
      >
        <form onSubmit={handleSaveRestockRequest} className="space-y-4">
          {/* Facility Assignment Badge */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-bold text-gray-900 block truncate">
                Target Facility: {currentFacilityName}
              </span>
              <span className="text-[11px] text-blue-700 font-medium">
                This replenishment request will be routed to Procurement for
                ordering.
              </span>
            </div>
          </div>

          {/* SKU Selection */}
          <div>
            <Dropdown
              id="restock-skuId"
              name="skuId"
              label="Select Target SKU"
              required
              placeholder="-- Select SKU to Replenish --"
              value={restockFormData.skuId}
              error={formErrors.skuId}
              onChange={(e) => {
                const id = e.target.value;
                const found = currentFacilitySkus.find(
                  (s) => String(s.id) === String(id),
                );
                setSelectedSku(found || null);
                setRestockFormData((prev) => ({
                  ...prev,
                  skuId: id,
                  requestedUnits:
                    prev.requestedUnits ||
                    (found?.maximumLevel && found?.currentStock !== undefined
                      ? Math.max(1, found.maximumLevel - found.currentStock)
                      : ""),
                }));
                clearError("skuId");
              }}
              options={currentFacilitySkus.map((s) => ({
                value: s.id,
                label: `${s.hasPendingRestock ? `[ACTIVE RESTOCK: ${s.pendingRestockUnits} units (${s.pendingRestockStatus || "Requested"})] ` : ""}${s.sku} — ${s.brandName} (${s.genericName}) [Current: ${s.currentStock}, Max: ${s.maximumLevel}]`,
              }))}
            />
          </div>

          {/* Active Restock Warning Banner inside Restock Modal */}
          {selectedSku && selectedSku.hasPendingRestock && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-amber-900 text-xs">
                  Active Restock Request Already In Progress
                </span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  This SKU already has an active restock request for{" "}
                  <strong>{selectedSku.pendingRestockUnits} units</strong>{" "}
                  (Status:{" "}
                  <strong className="uppercase">
                    {selectedSku.pendingRestockStatus || "Requested"}
                  </strong>
                  ). Per inventory control rules, a new restock request can only
                  be submitted once the current order has been{" "}
                  <strong>Received</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Selected SKU Inventory Summary card if SKU is chosen */}
          {selectedSku && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">
                  Current Stock
                </span>
                <span className="font-bold text-gray-800 text-sm">
                  {selectedSku.currentStock ?? 0}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">
                  Min Threshold
                </span>
                <span className="font-bold text-red-600 text-sm">
                  {selectedSku.minimumLevel ?? 0}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">
                  Reorder Trigger
                </span>
                <span className="font-bold text-amber-600 text-sm">
                  {selectedSku.reorderLevel ?? 0}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">
                  Max Capacity
                </span>
                <span className="font-bold text-emerald-600 text-sm">
                  {selectedSku.maximumLevel ?? 0}
                </span>
              </div>
            </div>
          )}

          {/* Requested Units */}
          <div>
            <label
              htmlFor="restock-requestedUnits"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Requested Quantity (Units) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="restock-requestedUnits"
              name="requestedUnits"
              min="1"
              step="1"
              value={restockFormData.requestedUnits}
              onChange={(e) => {
                setRestockFormData((prev) => ({
                  ...prev,
                  requestedUnits: e.target.value,
                }));
                clearError("requestedUnits");
              }}
              placeholder="e.g. 500"
              className={`input w-full ${formErrors.requestedUnits ? "border-red-500 focus:ring-red-500" : ""}`}
              required
            />
            {formErrors.requestedUnits && (
              <p className="text-[11px] text-red-500 font-medium mt-1">
                {formErrors.requestedUnits}
              </p>
            )}
          </div>

          {/* Reason / Clinical Justification */}
          <div>
            <label
              htmlFor="restock-reason"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Reason / Justification Notes
            </label>
            <textarea
              id="restock-reason"
              name="reason"
              rows="3"
              value={restockFormData.reason}
              onChange={(e) =>
                setRestockFormData((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))
              }
              placeholder="e.g. Critical stock deficit reached; urgent high patient consumption anticipated."
              className="input w-full resize-none text-xs"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isRestockSubmitting}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRestockSubmitting || selectedSku?.hasPendingRestock}
              className={`text-xs flex items-center gap-1.5 ${
                selectedSku?.hasPendingRestock
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed px-4 py-2 rounded-lg font-medium"
                  : "btn-primary"
              }`}
              title={
                selectedSku?.hasPendingRestock
                  ? "Restock request already active until Received"
                  : ""
              }
            >
              {isRestockSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : selectedSku?.hasPendingRestock ? (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Restock Already Active</span>
                </>
              ) : (
                <>
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Submit Restock Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 8. RESTOCK REQUEST SUCCESS MODAL                         */}
      {/* ======================================================== */}
      <SuccessModal
        isOpen={isRestockSuccessModalOpen}
        onClose={() => {
          setIsRestockSuccessModalOpen(false);
          setRestockSuccessInfo(null);
        }}
        title="Restock Request Submitted!"
        message="Your replenishment request has been forwarded to Procurement for ordering."
        details={
          restockSuccessInfo && (
            <div className="space-y-1 text-xs">
              <p>
                <span className="font-semibold text-emerald-950">
                  Target SKU:
                </span>{" "}
                {restockSuccessInfo.brandName} ({restockSuccessInfo.skuCode})
              </p>
              <p>
                <span className="font-semibold text-emerald-950">
                  Requested Units:
                </span>{" "}
                {restockSuccessInfo.requestedUnits} units
              </p>
              <p>
                <span className="font-semibold text-emerald-950">
                  Facility:
                </span>{" "}
                {restockSuccessInfo.facilityName}
              </p>
            </div>
          )
        }
        confirmText="Done"
      />

      {/* ======================================================== */}
      {/* 9. CONFIRM DEDUCT EXPIRED BATCHES MODAL                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isConfirmExpiredModalOpen}
        onClose={() => setIsConfirmExpiredModalOpen(false)}
        title="Deduct Expired Batches"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-amber-950">
                Confirm Expiration Deduction
              </p>
              <p className="text-amber-800 text-xs mt-1">
                This action will mark past-due batches for{" "}
                <span className="font-bold text-gray-900">
                  {targetSkuForExpiredDeduction?.brandName} (
                  {targetSkuForExpiredDeduction?.sku})
                </span>{" "}
                as <span className="font-bold text-red-600">Expired</span> and
                automatically deduct their units from active stock counts.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden text-xs">
            <div className="bg-gray-50 px-3.5 py-2 font-semibold text-gray-700 flex justify-between items-center border-b border-gray-200">
              <span>
                {targetSkuForExpiredDeduction?.brandName} Expired Batches (
                {targetSkuExpiredBatches.length})
              </span>
              <span className="text-red-600 font-bold">
                Total: -{targetSkuExpiredUnits.toLocaleString()} units
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
              {targetSkuExpiredBatches.map((b) => (
                <div
                  key={b.id}
                  className="p-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <span className="font-bold text-gray-900">
                      Batch #{b.batchNum}
                    </span>
                    <p className="text-gray-500 text-[11px]">
                      {b.brandName || b.skuName || "SKU"} • Exp:{" "}
                      <span className="text-red-600 font-semibold">
                        {b.expiryDate}
                      </span>
                    </p>
                  </div>
                  <span className="font-bold text-gray-900">
                    {Number(b.units || 0).toLocaleString()} units
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsConfirmExpiredModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProcessExpiredBatches}
              disabled={isProcessingExpired}
              className="btn-primary bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
            >
              {isProcessingExpired ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deducting Stock...</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Confirm & Deduct Units</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 10. EXPIRED BATCHES DEDUCTION SUCCESS MODAL              */}
      {/* ======================================================== */}
      <SuccessModal
        isOpen={Boolean(expiredResultModal)}
        onClose={() => setExpiredResultModal(null)}
        title="Expired Batches Deducted!"
        message={
          expiredResultModal?.message ||
          "Expired batches have been successfully processed."
        }
        details={
          expiredResultModal && (
            <div className="space-y-1 text-xs">
              <p>
                <span className="font-semibold text-emerald-950">
                  Facility:
                </span>{" "}
                {currentFacilityName}
              </p>
              <p>
                <span className="font-semibold text-emerald-950">
                  Batches Processed:
                </span>{" "}
                {expiredResultModal.count} batch(es)
              </p>
            </div>
          )
        }
        confirmText="Done"
      />
    </div>
  );
}

export default SkuManagement;
