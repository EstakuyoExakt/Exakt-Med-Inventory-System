import { useState, useMemo } from "react";
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
} from "lucide-react";

// Common Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";

// Data & Constants Imports
import {
  initialSkus,
  DOSAGE_FORMS,
  PACKAGING_UNITS,
} from "../../data/skuManagement";
import { medicines, MEDICINE_TYPES } from "../../data/medicine";
import { FORM_CODES, DEFAULT_FORM_DATA } from "../../utils/constants";
import { getStockStatus } from "../../utils/helpers";

const extractPackSize = (packagingUnit) => {
  const match = packagingUnit ? packagingUnit.match(/\b(\d+)\b/) : null;
  if (match) {
    return String(match[1]).padStart(3, "0");
  }
  return "100";
};

const generateSkuCode = (brandOrGeneric, dosage, form, packagingUnit) => {
  const prefix = (brandOrGeneric || "PARA")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 4)
    .toUpperCase();
  const dosageMatch = (dosage || "").match(/\d+/);
  const dosageDigits = dosageMatch ? dosageMatch[0] : "500";
  const formCode = FORM_CODES[form] || "TAB";
  const packSize = extractPackSize(packagingUnit || "Box of 100");

  return `${prefix}${dosageDigits}-${formCode}-${packSize}`;
};

function SkuManagement() {
  const [skuList, setSkuList] = useState(initialSkus);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStockFilter, setSelectedStockFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal State
  const [modalMode, setModalMode] = useState(null); // 'add' | 'view' | 'edit' | 'delete' | null
  const [selectedSku, setSelectedSku] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [formErrors, setFormErrors] = useState({});

  // Calculate Metrics
  const totalSkus = skuList.length;

  const optimalCount = useMemo(
    () => skuList.filter((s) => s.currentStock > s.reorderLevel).length,
    [skuList],
  );

  const reorderCount = useMemo(
    () =>
      skuList.filter(
        (s) =>
          s.currentStock <= s.reorderLevel && s.currentStock > s.minimumLevel,
      ).length,
    [skuList],
  );

  const criticalCount = useMemo(
    () => skuList.filter((s) => s.currentStock <= s.minimumLevel).length,
    [skuList],
  );

  // Filtered SKUs
  const filteredSkus = useMemo(() => {
    return skuList.filter((item) => {
      const matchesSearch =
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.dosage.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedType === "ALL" || item.type === selectedType;

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

      return matchesSearch && matchesType && matchesStock;
    });
  }, [skuList, searchQuery, selectedType, selectedStockFilter]);

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

  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
    setCurrentPage(1);
  };

  const handleStockFilterChange = (e) => {
    setSelectedStockFilter(e.target.value);
    setCurrentPage(1);
  };

  // When Medicine is selected from Library in modal
  const handleMedicineSelect = (e) => {
    const medId = Number(e.target.value);
    const selectedMed = medicines.find((m) => m.id === medId);
    if (selectedMed) {
      const generatedSku = generateSkuCode(
        selectedMed.brandName,
        selectedMed.dosage,
        formData.dosageForm || "Tablet",
        formData.packagingUnit || "Box of 100",
      );
      setFormData((prev) => ({
        ...prev,
        medicineId: selectedMed.id,
        brandName: selectedMed.brandName,
        genericName: selectedMed.genericName,
        dosage: selectedMed.dosage,
        type: selectedMed.type,
        sku: generatedSku,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        medicineId: "",
        brandName: "",
        genericName: "",
        dosage: "",
      }));
    }
  };

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    const defaultMed = medicines[0];
    const initialSkuCode = defaultMed
      ? generateSkuCode(
          defaultMed.brandName,
          defaultMed.dosage,
          "Tablet",
          "Box of 100",
        )
      : "AMOX500-CAP-100";

    setFormData({
      ...DEFAULT_FORM_DATA,
      medicineId: defaultMed ? defaultMed.id : "",
      brandName: defaultMed ? defaultMed.brandName : "",
      genericName: defaultMed ? defaultMed.genericName : "",
      dosage: defaultMed ? defaultMed.dosage : "",
      type: defaultMed ? defaultMed.type : "Antibiotics",
      sku: initialSkuCode,
    });
    setFormErrors({});
    setSelectedSku(null);
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
      type: skuItem.type,
      dosageForm: skuItem.dosageForm,
      packagingUnit: skuItem.packagingUnit,
      minimumLevel: skuItem.minimumLevel,
      reorderLevel: skuItem.reorderLevel,
      maximumLevel: skuItem.maximumLevel,
      status: skuItem.status || "Active",
    });
    setFormErrors({});
    setModalMode("edit");
  };

  const handleOpenDeleteModal = (skuItem) => {
    setSelectedSku(skuItem);
    setModalMode("delete");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedSku(null);
    setFormErrors({});
  };

  // Form Field Change Handler
  const handleInputChange = (e) => {
    const { name, value, type: inputType } = e.target;
    const finalValue = inputType === "number" ? Number(value) : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: finalValue };

      // If dosageForm or packagingUnit changes in add mode, update SKU code suggestion
      if (
        (name === "dosageForm" || name === "packagingUnit") &&
        modalMode === "add" &&
        prev.brandName
      ) {
        updated.sku = generateSkuCode(
          prev.brandName,
          prev.dosage,
          name === "dosageForm" ? value : prev.dosageForm,
          name === "packagingUnit" ? value : prev.packagingUnit,
        );
      }

      return updated;
    });

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};

    if (!formData.medicineId) {
      errors.medicineId = "Please select a medicine from the library.";
    }

    if (!formData.sku.trim()) {
      errors.sku = "SKU code is required.";
    } else {
      const skuExists = skuList.some(
        (s) =>
          s.sku.toLowerCase() === formData.sku.trim().toLowerCase() &&
          (!selectedSku || s.id !== selectedSku.id),
      );
      if (skuExists) {
        errors.sku = "This SKU code already exists in the system.";
      }
    }

    if (!formData.dosageForm) {
      errors.dosageForm = "Dosage form is required.";
    }

    if (!formData.packagingUnit) {
      errors.packagingUnit = "Packaging unit is required.";
    }

    if (Number(formData.minimumLevel) < 0) {
      errors.minimumLevel = "Minimum level cannot be negative.";
    }

    if (Number(formData.reorderLevel) <= Number(formData.minimumLevel)) {
      errors.reorderLevel =
        "Reorder level must be greater than minimum level threshold.";
    }

    if (Number(formData.maximumLevel) <= Number(formData.reorderLevel)) {
      errors.maximumLevel =
        "Maximum capacity must be greater than reorder level threshold.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save (Add or Edit) SKU
  const handleSaveSku = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (modalMode === "add") {
      const newSkuItem = {
        id: Date.now(),
        medicineId: Number(formData.medicineId),
        sku: formData.sku.trim().toUpperCase(),
        brandName: formData.brandName,
        genericName: formData.genericName,
        dosage: formData.dosage,
        type: formData.type,
        dosageForm: formData.dosageForm,
        packagingUnit: formData.packagingUnit,
        minimumLevel: Number(formData.minimumLevel),
        reorderLevel: Number(formData.reorderLevel),
        maximumLevel: Number(formData.maximumLevel),
        currentStock: 0,
        status: formData.status || "Active",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setSkuList((prev) => [newSkuItem, ...prev]);
    } else if (modalMode === "edit" && selectedSku) {
      setSkuList((prev) =>
        prev.map((s) =>
          s.id === selectedSku.id
            ? {
                ...s,
                sku: formData.sku.trim().toUpperCase(),
                dosageForm: formData.dosageForm,
                packagingUnit: formData.packagingUnit,
                minimumLevel: Number(formData.minimumLevel),
                reorderLevel: Number(formData.reorderLevel),
                maximumLevel: Number(formData.maximumLevel),
                status: formData.status,
              }
            : s,
        ),
      );
    }

    handleCloseModal();
  };

  // Delete SKU Confirmation
  const handleConfirmDelete = () => {
    if (!selectedSku) return;

    setSkuList((prev) => prev.filter((s) => s.id !== selectedSku.id));

    if (paginatedSkus.length === 1 && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }

    handleCloseModal();
  };

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            SKU & Threshold Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create stock-keeping units from the medicine library and calibrate
            inventory thresholds
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="btn-primary self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create New SKU</span>
        </button>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total SKUs
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalSkus}
              </h3>
              <span className="inline-block text-[11px] font-medium text-blue-600 mt-1">
                Registered stock units
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

            {/* Stock Health Filter */}
            <select
              value={selectedStockFilter}
              onChange={handleStockFilterChange}
              className="input py-2 text-xs w-full sm:w-40"
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedSkus.length > 0 ? (
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

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(item)}
                            className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                            title="View SKU Details"
                            aria-label="View SKU Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="btn-secondary p-1.5 text-gray-600 hover:text-amber-600 hover:border-amber-300"
                            title="Adjust Levels & Edit SKU"
                            aria-label="Adjust Levels & Edit SKU"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
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
                    <p className="text-sm font-medium">No SKUs found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search query or filter thresholds
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

      {/* --- ADD NEW SKU / ADJUST MODAL --- */}
      <Modal
        isOpen={modalMode === "add" || modalMode === "edit"}
        onClose={handleCloseModal}
        title={
          modalMode === "add"
            ? "Create New SKU from Medicine Library"
            : "Adjust SKU & Inventory Thresholds"
        }
        size="lg"
      >
        <form onSubmit={handleSaveSku} className="space-y-4">
          {/* Medicine Library Picker (Only active when adding) */}
          {modalMode === "add" && (
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <label
                htmlFor="select-medicine"
                className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5"
              >
                1. Select Medicine from Library{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                id="select-medicine"
                name="medicineId"
                value={formData.medicineId}
                onChange={handleMedicineSelect}
                className="input bg-white"
              >
                <option value="">-- Choose a medicine --</option>
                {medicines.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.brandName} ({med.genericName}) — {med.dosage} [
                    {med.type}]
                  </option>
                ))}
              </select>
              {formErrors.medicineId && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.medicineId}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  Format: [DRUG][STRENGTH]-[FORM]-[PACK] (e.g. PARA500-TAB-010)
                </span>
              </div>
              <input
                id="sku-code"
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                placeholder="PARA500-TAB-010"
                className={`input uppercase font-mono ${
                  formErrors.sku
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                    : ""
                }`}
              />
              {formErrors.sku && (
                <p className="text-xs text-red-500 mt-1">{formErrors.sku}</p>
              )}
            </div>

            {/* Dosage Form */}
            <div>
              <label
                htmlFor="sku-form"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Dosage Form <span className="text-red-500">*</span>
              </label>
              <select
                id="sku-form"
                name="dosageForm"
                value={formData.dosageForm}
                onChange={handleInputChange}
                className="input"
              >
                {DOSAGE_FORMS.map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
              </select>
            </div>

            {/* Packaging Unit */}
            <div>
              <label
                htmlFor="sku-packaging"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Packaging Unit <span className="text-red-500">*</span>
              </label>
              <select
                id="sku-packaging"
                name="packagingUnit"
                value={formData.packagingUnit}
                onChange={handleInputChange}
                className="input"
              >
                {PACKAGING_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
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
            <button type="submit" className="btn-primary">
              {modalMode === "add" ? (
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

      {/* --- VIEW SKU DETAILS MODAL --- */}
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
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    {selectedSku.type}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-600 font-medium">
                    {selectedSku.dosageForm} ({selectedSku.packagingUnit})
                  </span>
                </div>
              </div>
            </div>

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
                onClick={() => handleOpenEditModal(selectedSku)}
                className="btn-primary text-xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Adjust Thresholds</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- DELETE SKU CONFIRMATION MODAL --- */}
      <Modal
        isOpen={modalMode === "delete" && Boolean(selectedSku)}
        onClose={handleCloseModal}
        title="Delete Stock-Keeping Unit"
        size="sm"
      >
        {selectedSku && (
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-red-900">
                  Are you sure you want to delete this SKU?
                </p>
                <p className="text-red-700">
                  This will remove SKU{" "}
                  <span className="font-bold font-mono">{selectedSku.sku}</span>{" "}
                  (
                  <span className="font-semibold">{selectedSku.brandName}</span>
                  ) and its calibrated thresholds.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn-danger text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete SKU</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SkuManagement;
