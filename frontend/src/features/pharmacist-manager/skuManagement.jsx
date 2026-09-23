import { useState, useMemo, useEffect, useCallback } from "react";
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
} from "lucide-react";

// Common Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";
import DeleteModal from "../../components/common/deleteModal";
import SuccessModal from "../../components/common/successModal";
import ComboBox from "./components/comboBox";
import libMedicineService from "../../services/libMedicine";
import skuService from "../../services/sku";
import restockRequestService from "../../services/restockRequest";

// Constants Imports
import {
  FORM_CODES,
  DEFAULT_SKU_FORM_DATA,
  ADJUSTMENT_REASONS,
  DEFAULT_STOCK_ADJUSTMENT,
} from "../../utils/constants";
import { getStockStatus } from "../../utils/helpers";
import useAuth from "../../hooks/useAuth";
import useError from "../../hooks/useError";
import { validateSkuForm } from "../../validators/sku.validator";

const DEFAULT_RESTOCK_FORM_DATA = {
  skuId: "",
  requestedUnits: "",
  reason: "",
};

const extractPackSize = (packagingUnit) => {
  const match = packagingUnit ? packagingUnit.match(/\b(\d+)\b/) : null;
  if (match) {
    return String(match[1]).padStart(3, "0");
  }
  return "000";
};

const extractDosageFromDescription = (description) => {
  if (!description) return "";

  // Single dose pattern (supports percentages like 10%, 0.9%, as well as mg, mcg, units, etc.)
  const singleDosePattern =
    /(?:\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|iu|units?|u|meq|mmol)(?:\s*\/\s*\d*(?:\.\d+)?\s*(?:ml|l|g|dose|actuation|drop|spray))?\b)/i;

  // 1. Check for combination dosage separated by "+", e.g. "200 units + 3 mg + 4000 units/g", "20 mg + 120 mg", or "5% + 0.9%"
  const comboPattern = new RegExp(
    `${singleDosePattern.source}(?:\\s*\\+\\s*${singleDosePattern.source})+`,
    "i",
  );

  const comboMatch = description.match(comboPattern);
  if (comboMatch) {
    return comboMatch[0].trim();
  }

  // 2. Look for dosage before dosage form keywords to avoid container sizes (e.g. "10 g TUBE" or "500 mL BOTTLE")
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

  // 3. Fallback: match any dose unit not directly preceding packaging container descriptors
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

const extractPackagingFromDescription = (description) => {
  if (!description) return null;

  const trimmed = description.trim();
  // Standalone TABLET or CAPSULE is a dosage form, not packaging unit
  if (/^(?:TABLET|CAPSULE|TAB|CAP)S?$/i.test(trimmed)) {
    return null;
  }

  // 1. Look after dosage form keywords for packaging info
  const formKeywords =
    /(?:SOLUTION FOR INJECTION|POWDER FOR SUSPENSION|POWDER FOR INJECTION|TABLET|CAPSULE|OINTMENT|CREAM|SYRUP|SUSPENSION|SOLUTION|INJECTION|DROPS|GEL|LOTION|INHALER|PATCH|SUPPOSITORY|POWDER|SHAMPOO)/i;
  const formMatch = trimmed.match(formKeywords);
  if (formMatch) {
    const formIndex = trimmed.indexOf(formMatch[0]);
    const afterForm = trimmed.substring(formIndex + formMatch[0].length).trim();
    if (afterForm) {
      let cleaned = afterForm.trim();
      if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      cleaned = cleaned.replace(/^[-,/:\s]+|[-,/:\s]+$/g, "").trim();
      if (cleaned) {
        // Refactor for TABLET === null or CAPSULE === null
        if (/^(?:TABLET|CAPSULE|TAB|CAP)S?$/i.test(cleaned)) {
          return null;
        }
        if (!/^(?:ORAL|IV|IM|SC|TOPICAL)$/i.test(cleaned)) {
          return cleaned;
        }
      }
    }
  }

  // 2. Match container patterns anywhere in description
  const packMatch = trimmed.match(
    /\b(?:\d+(?:\.\d+)?\s*(?:ml|l|g|kg|'s|s)\s+)?(?:BOTTLE|TUBE|VIAL|AMPOULE|AMP|BAG|BOX|BLISTER|STRIP|CANISTER|SACHET|CARPULE|JAR|TIN)\b.*$/i,
  );
  if (packMatch) {
    let res = packMatch[0].trim();
    if (res.startsWith("(") && res.endsWith(")")) {
      res = res.slice(1, -1).trim();
    }
    res = res.replace(/^[-,/:\s]+|[-,/:\s]+$/g, "").trim();
    if (res && !/^(?:TABLET|CAPSULE|TAB|CAP)S?$/i.test(res)) {
      return res;
    }
  }

  // No packaging unit displayed in drug_description
  return null;
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
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      if (regex.test(description)) {
        return kw.toUpperCase();
      }
    }
  }

  if (rawPackageCode) {
    const code = rawPackageCode.trim().toUpperCase();
    const prefix = code.slice(0, 3);
    // Find matching full name from FORM_CODES
    const match = Object.entries(FORM_CODES).find(
      ([fullName, shortCode]) =>
        fullName === code || shortCode === code || shortCode === prefix,
    );
    if (match) return match[0];
    return code;
  }

  return "";
};

const extractSkuIdentifierGeneric = (generic, dosage) => {
  if (!generic && !dosage) return "";

  const effectiveDosage = dosage || extractDosageFromDescription(generic) || "";

  // 1. Isolate the generic active ingredient names from any trailing dosage/container text
  let ingredientText = generic || "";
  if (
    effectiveDosage &&
    ingredientText.toLowerCase().includes(effectiveDosage.toLowerCase())
  ) {
    ingredientText = ingredientText.substring(
      0,
      ingredientText.toLowerCase().indexOf(effectiveDosage.toLowerCase()),
    );
  } else {
    // Find the start of dosage units or strength numbers
    const doseMatch = ingredientText.match(
      /\b\d+(?:\.\d+)?\s*(?:%|mg|mcg|µg|g|iu|units?|u|meq|mmol)\b/i,
    );
    if (doseMatch && doseMatch.index > 0) {
      ingredientText = ingredientText.substring(0, doseMatch.index);
    }
  }

  // 2. Extract 4-letter codes for each active ingredient (handles combinations like "ALUMINUM HYDROXIDE + MAGNESIUM HYDROXIDE")
  let genericCode = "";
  if (ingredientText.includes("+")) {
    const parts = ingredientText
      .split("+")
      .map((part) => {
        const words = part.trim().split(/\s+/);
        if (!words || words.length === 0 || !words[0]) return "";
        const clean = words[0].replace(/[^a-zA-Z]/g, "");
        return clean.slice(0, 4).toUpperCase();
      })
      .filter(Boolean);
    genericCode = parts.join("+");
  } else {
    const words = ingredientText.trim().split(/\s+/);
    const firstWord =
      words && words.length > 0 && words[0] ? words[0] : ingredientText;
    const clean = firstWord.replace(/[^a-zA-Z]/g, "");
    genericCode = clean.slice(0, 4).toUpperCase();
  }

  // 3. Extract dosage numbers (handles combinations like "225 mg + 200 mg/5 mL" -> "225+200")
  let dosageDigits = "";
  if (effectiveDosage) {
    if (String(effectiveDosage).includes("+")) {
      const doseParts = String(effectiveDosage)
        .split("+")
        .map((part) => {
          const m = part.match(/\d+(?:\.\d+)?/);
          return m ? m[0] : "";
        })
        .filter(Boolean);
      dosageDigits = doseParts.join("+");
    } else {
      const nums = String(effectiveDosage).match(/\d+/g);
      if (nums) {
        if (String(effectiveDosage).includes("/")) {
          dosageDigits = nums.slice(0, 2).join("");
        } else {
          dosageDigits = nums[0];
        }
      }
    }
  }

  return `${genericCode}${dosageDigits}`;
};

const generateSkuCode = (brand, generic, dosage, form, packagingUnit) => {
  const brandCode = (brand || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();

  const genericStrength = extractSkuIdentifierGeneric(generic, dosage);
  const formCode =
    (form && FORM_CODES[form]) || (form ? form.slice(0, 3).toUpperCase() : "");
  const packSize = packagingUnit ? extractPackSize(packagingUnit) : "";

  const parts = [];
  if (brandCode) parts.push(brandCode);
  if (genericStrength) parts.push(genericStrength);
  if (formCode) parts.push(formCode);
  if (packSize) parts.push(packSize);

  return parts.join("-");
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
    currentStock: Number(dto.units ?? 0),
    units: Number(dto.units ?? 0),
    minimumLevel: Number(dto.minimumLevel ?? 0),
    reorderLevel: Number(dto.reorderLevel ?? 0),
    maximumLevel: Number(dto.maximumLevel ?? 0),
    facilityId: dto.facilityId,
    facility: dto.facilityName || "",
    status: "Active",
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
  const [isLoadingSkus, setIsLoadingSkus] = useState(false);
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

  useEffect(() => {
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

  // Batch Management Action Form States in SKU Management
  const [adjustFormData, setAdjustFormData] = useState(
    DEFAULT_STOCK_ADJUSTMENT,
  );

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
        ""
      ).toUpperCase();
      const extractedDosage =
        extractDosageFromDescription(genericName) ||
        (selectedMed.strengthCode
          ? `${selectedMed.strengthCode} ${selectedMed.unitCode || ""}`.trim()
          : "");

      let extractedPackaging = extractPackagingFromDescription(genericName);

      // Refactor for TABLET === null or CAPSULE === null
      if (
        extractedPackaging === null ||
        extractedPackaging === "TABLET" ||
        extractedPackaging === "CAPSULE" ||
        extractedPackaging === "TAB" ||
        extractedPackaging === "CAP"
      ) {
        extractedPackaging = null;
      }

      setFormData((prev) => {
        const dosage = (extractedDosage || prev.dosage || "").toUpperCase();
        const packagingUnit = extractedPackaging
          ? extractedPackaging.toUpperCase()
          : null;
        const brandName = (prev.brandName || "").toUpperCase();
        const finalDosageForm = dosageForm || prev.dosageForm || "";
        const generatedSku = generateSkuCode(
          brandName,
          genericName,
          dosage,
          finalDosageForm,
          packagingUnit,
        );
        return {
          ...prev,
          medicineId: selectedMed.id,
          brandName,
          genericName,
          dosage,
          dosageForm: finalDosageForm,
          packagingUnit,
          sku: generatedSku,
        };
      });
      if (dosageForm) {
        clearError("dosageForm");
      }
      if (extractedDosage) {
        clearError("dosage");
      }
      if (extractedPackaging) {
        clearError("packagingUnit");
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        medicineId: "",
        genericName: "",
        dosage: "",
        dosageForm: "",
        packagingUnit: null,
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
    setFormData({
      medicineId: skuItem.medicineId,
      sku: skuItem.sku,
      brandName: skuItem.brandName,
      genericName: skuItem.genericName,
      dosage: skuItem.dosage,
      dosageForm: skuItem.dosageForm,
      packagingUnit: skuItem.packagingUnit,
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
    setAdjustFormData(DEFAULT_STOCK_ADJUSTMENT);
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
      currentFacilitySkus.find((s) => String(s.id) === String(restockFormData.skuId));
    if (targetSku?.hasPendingRestock) {
      setFormErrors({
        requestedUnits: `A restock request is already active for this SKU (${targetSku.pendingRestockUnits} units, Status: ${targetSku.pendingRestockStatus || "Requested"}). A new request can only be submitted once the current order is Received.`,
      });
      return;
    }

    try {
      setIsRestockSubmitting(true);
      const targetFacilityIdToUse =
        facility?.id ||
        selectedSku?.facilityId ||
        targetFacilityId;

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

      if (
        (name === "brandName" ||
          name === "dosage" ||
          name === "dosageForm" ||
          name === "packagingUnit") &&
        modalMode === "add"
      ) {
        const brandForSku = name === "brandName" ? finalValue : prev.brandName;
        const dosageForSku = name === "dosage" ? finalValue : prev.dosage;
        const formForSku = name === "dosageForm" ? finalValue : prev.dosageForm;
        const packForSku =
          name === "packagingUnit" ? finalValue : prev.packagingUnit;

        updated.sku = generateSkuCode(
          brandForSku,
          prev.genericName,
          dosageForSku,
          formForSku,
          packForSku,
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
      facility?.id ||
      selectedSku?.facilityId ||
      targetFacilityId;

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
          name: formData.sku.trim().toUpperCase(),
          brandName: formData.brandName.trim().toUpperCase(),
          dosageForm: formData.dosageForm.trim().toUpperCase(),
          packagingUnit: (formData.packagingUnit || "").trim().toUpperCase(),
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
        const editFacilityId =
          selectedSku.facilityId ||
          targetFacilityIdToSave;

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
          name: formData.sku.trim().toUpperCase(),
          brandName: formData.brandName.trim().toUpperCase(),
          dosageForm: formData.dosageForm.trim().toUpperCase(),
          packagingUnit: (formData.packagingUnit || "").trim().toUpperCase(),
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
      amt > selectedSku.currentStock
    ) {
      errors.amount = `Cannot deduct more than available current stock (${selectedSku.currentStock}).`;
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
      });

      await fetchSkus(searchQuery);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            levels for{" "}
            <span className="font-semibold text-gray-700">
              {currentFacilityName}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenRestockModal()}
            className="btn-secondary self-start sm:self-auto shadow-sm flex items-center gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
            title="Request Stock Replenishment"
          >
            <PackagePlus className="w-4 h-4 text-blue-600" />
            <span>Request Restock</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <Card className="p-5">
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
        </Card>

        {/* Optimal Stock */}
        <Card className="p-5">
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
        </Card>

        {/* Reorder Needed */}
        <Card className="p-5">
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
        </Card>

        {/* Critical / Out of Stock */}
        <Card className="p-5">
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
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden border border-gray-200">
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
            <select
              value={selectedStockFilter}
              onChange={handleStockFilterChange}
              className="input py-2 text-xs w-full sm:w-44"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="OPTIMAL">Optimal Stock</option>
              <option value="REORDER">Reorder Triggered</option>
              <option value="CRITICAL">Critical (&le; Min)</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
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
                  Stock Health & Capacity
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Thresholds (Min / Reorder / Max)
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Management Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoadingSkus ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium text-gray-500">
                        Loading SKUs from server...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedSkus.length > 0 ? (
                paginatedSkus.map((item) => {
                  const status = getStockStatus(item);
                  const fillPercent = Math.min(
                    Math.round((item.currentStock / item.maximumLevel) * 100),
                    100,
                  );

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/30 transition-colors"
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
                              {item.hasPendingRestock && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                  title={`Active restock request: ${item.pendingRestockUnits} units (${item.pendingRestockStatus || "Requested"}). Can only request again once Received.`}
                                >
                                  <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                  <span>Restock: {item.pendingRestockUnits} units</span>
                                  {item.pendingRestockStatus && (
                                    <span className="text-[9px] uppercase font-bold px-1 py-0.2 bg-amber-200/60 rounded text-amber-900">
                                      {item.pendingRestockStatus}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.genericName} • {item.dosage}
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

                          {/* 2. Stock Adjustment (Batch Action) */}
                          <button
                            type="button"
                            onClick={() => handleOpenAdjustModal(item)}
                            className="btn-secondary p-1.5 text-gray-600 hover:text-amber-600 hover:border-amber-300"
                            title="Stock Adjustment (Count / Write-off)"
                            aria-label="Stock Adjustment"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

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
                    colSpan="5"
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
        size="lg"
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

          {modalMode === "edit" && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700">
              <span className="font-semibold text-gray-900">
                Generic Formula:
              </span>{" "}
              {formData.genericName} — {formData.dosage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Brand Name Input */}
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
              />
              {formErrors.brandName && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.brandName}
                </p>
              )}
            </div>

            {/* Dosage / Strength Input */}
            <div>
              <label
                htmlFor="sku-dosage"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Dosage / Strength <span className="text-red-500">*</span>
              </label>
              <input
                id="sku-dosage"
                type="text"
                name="dosage"
                value={formData.dosage}
                onChange={handleInputChange}
                placeholder="e.g. 500MG, 250MG/5ML, 10MCG"
                className={`input uppercase ${
                  formErrors.dosage
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                    : ""
                }`}
              />
              {formErrors.dosage && (
                <p className="text-xs text-red-500 mt-1">{formErrors.dosage}</p>
              )}
            </div>

            {/* Dosage Form Input */}
            <div>
              <label
                htmlFor="sku-dosageForm"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Dosage Form <span className="text-red-500">*</span>
              </label>
              <input
                id="sku-dosageForm"
                type="text"
                name="dosageForm"
                value={formData.dosageForm}
                onChange={handleInputChange}
                placeholder="e.g. TAB, CAP, SYR, SOL, OIN"
                className={`input uppercase ${
                  formErrors.dosageForm
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                    : ""
                }`}
              />
              {formErrors.dosageForm && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.dosageForm}
                </p>
              )}
            </div>

            {/* Packaging Unit */}
            <div>
              <label
                htmlFor="sku-packaging"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Packaging Unit <span className="text-red-500">*</span>
              </label>
              <input
                id="sku-packaging"
                type="text"
                name="packagingUnit"
                value={formData.packagingUnit ?? ""}
                onChange={handleInputChange}
                placeholder="e.g. 500 ML BOTTLE, 10 G TUBE, BOX OF 100"
                className={`input uppercase ${
                  formErrors.packagingUnit
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                    : ""
                }`}
              />
              {formErrors.packagingUnit && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.packagingUnit}
                </p>
              )}
            </div>

            {/* SKU Code */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="sku-code"
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wider"
                >
                  SKU Identifier <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400 font-mono">
                  Format: [BRAND]-[GENERIC][STRENGTH]-[FORM]-[PACK]
                </span>
              </div>
              <input
                id="sku-code"
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                placeholder="BIOG-PARA500-TAB-010"
                className={`input uppercase font-mono ${
                  formErrors.sku
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                    : ""
                }`}
                disabled
              />
              {formErrors.sku && (
                <p className="text-xs text-red-500 mt-1">{formErrors.sku}</p>
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
                htmlFor="sku-adjust-amount"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                {adjustFormData.type === "SET"
                  ? "New Exact Total Quantity"
                  : "Adjustment Amount (Units)"}{" "}
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

            {/* Adjustment Reason */}
            <div>
              <label
                htmlFor="sku-adjust-reason"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Reason for Adjustment <span className="text-red-500">*</span>
              </label>
              <select
                id="sku-adjust-reason"
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
                      Active Restock Request: {selectedSku.pendingRestockUnits} units
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Status: <strong className="uppercase">{selectedSku.pendingRestockStatus || "Requested"}</strong> • Can request again once Received
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
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdjustModal(selectedSku)}
                className="btn-secondary text-xs text-amber-700 hover:text-amber-800"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Adjust Stock</span>
              </button>
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
            <label
              htmlFor="restock-skuId"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Select Target SKU <span className="text-red-500">*</span>
            </label>
            <select
              id="restock-skuId"
              name="skuId"
              value={restockFormData.skuId}
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
              className={`input w-full ${formErrors.skuId ? "border-red-500 focus:ring-red-500" : ""}`}
              required
            >
              <option value="">-- Select SKU to Replenish --</option>
              {currentFacilitySkus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.hasPendingRestock
                    ? `[ACTIVE RESTOCK: ${s.pendingRestockUnits} units (${s.pendingRestockStatus || "Requested"})] `
                    : ""}
                  {s.sku} — {s.brandName} ({s.genericName}) [Current:{" "}
                  {s.currentStock}, Max: {s.maximumLevel}]
                </option>
              ))}
            </select>
            {formErrors.skuId && (
              <p className="text-[11px] text-red-500 font-medium mt-1">
                {formErrors.skuId}
              </p>
            )}
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
                  <strong>{selectedSku.pendingRestockUnits} units</strong> (Status:{" "}
                  <strong className="uppercase">{selectedSku.pendingRestockStatus || "Requested"}</strong>).
                  Per inventory control rules, a new restock request can only be submitted once the current order has been <strong>Received</strong>.
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
    </div>
  );
}

export default SkuManagement;
