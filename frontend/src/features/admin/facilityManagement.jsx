import { useState, useMemo } from "react";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Plus,
  Mail,
  Phone,
  Hospital,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Calendar,
  MapPin,
  User as UserIcon,
} from "lucide-react";

// Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";

import { facilities as initialFacilities } from "../../data/facility";

const FACILITY_TYPE_OPTIONS = [
  "Main Hospital",
  "Branch Hospital",
  "Central Warehouse",
  "Outpatient Clinic",
  "Emergency Center",
  "Specialty Hospital",
  "Diagnostic Center",
  "Cold Storage Facility",
];

const DEFAULT_FORM_DATA = {
  name: "",
  facilityCode: "",
  type: "Main Hospital",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  status: "Active",
};

function FacilityManagement() {
  const [facilityList, setFacilityList] = useState(initialFacilities);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal State
  const [modalMode, setModalMode] = useState(null); // 'add' | 'view' | 'edit' | 'delete' | null
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [formErrors, setFormErrors] = useState({});

  // Calculate 3 Total Metric Counts
  const totalFacilities = facilityList.length;
  const totalActive = useMemo(
    () => facilityList.filter((f) => f.status === "Active").length,
    [facilityList],
  );
  const totalInactive = useMemo(
    () => facilityList.filter((f) => f.status === "Inactive").length,
    [facilityList],
  );

  // Extract unique facility types for filter dropdown
  const facilityTypes = useMemo(() => {
    return Array.from(new Set(facilityList.map((f) => f.type)));
  }, [facilityList]);

  // Filtered facilities based on search, type, and status
  const filteredFacilities = useMemo(() => {
    return facilityList.filter((facility) => {
      const matchesSearch =
        facility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        facility.facilityCode
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        facility.contactPerson
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        facility.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        facility.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (facility.address &&
          facility.address.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType =
        selectedType === "ALL" || facility.type === selectedType;

      const matchesStatus =
        selectedStatus === "ALL" || facility.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [facilityList, searchQuery, selectedType, selectedStatus]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredFacilities.length / itemsPerPage) || 1;
  const paginatedFacilities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFacilities.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFacilities, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    setCurrentPage(1);
  };

  // Generate next facility code suggestion
  const generateNextFacilityCode = () => {
    const maxNum = facilityList.reduce((max, f) => {
      const match = f.facilityCode?.match(/FAC-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    return `FAC-${String(maxNum + 1).padStart(3, "0")}`;
  };

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      facilityCode: generateNextFacilityCode(),
    });
    setFormErrors({});
    setSelectedFacility(null);
    setModalMode("add");
  };

  const handleOpenViewModal = (facility) => {
    setSelectedFacility(facility);
    setModalMode("view");
  };

  const handleOpenEditModal = (facility) => {
    setSelectedFacility(facility);
    setFormData({
      name: facility.name || "",
      facilityCode: facility.facilityCode || "",
      type: facility.type || "Main Hospital",
      contactPerson: facility.contactPerson || "",
      email: facility.email || "",
      phone: facility.phone || "",
      address: facility.address || "",
      status: facility.status || "Active",
    });
    setFormErrors({});
    setModalMode("edit");
  };

  const handleOpenDeleteModal = (facility) => {
    setSelectedFacility(facility);
    setModalMode("delete");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedFacility(null);
    setFormErrors({});
  };

  // Form Field Change Handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Facility name is required.";
    }

    if (!formData.facilityCode.trim()) {
      errors.facilityCode = "Facility code is required.";
    } else {
      const codeExists = facilityList.some(
        (f) =>
          f.facilityCode.toLowerCase() ===
            formData.facilityCode.trim().toLowerCase() &&
          (!selectedFacility || f.id !== selectedFacility.id),
      );
      if (codeExists) {
        errors.facilityCode = "Facility code already exists.";
      }
    }

    if (!formData.type) {
      errors.type = "Facility type is required.";
    }

    if (!formData.contactPerson.trim()) {
      errors.contactPerson = "Contact person is required.";
    }

    if (!formData.email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    } else {
      const emailExists = facilityList.some(
        (f) =>
          f.email.toLowerCase() === formData.email.trim().toLowerCase() &&
          (!selectedFacility || f.id !== selectedFacility.id),
      );
      if (emailExists) {
        errors.email = "Email address is already used by another facility.";
      }
    }

    if (!formData.status) {
      errors.status = "Status is required.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save (Add or Edit) Facility
  const handleSaveFacility = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (modalMode === "add") {
      const newFacility = {
        id: Date.now(),
        name: formData.name.trim(),
        facilityCode: formData.facilityCode.trim().toUpperCase(),
        type: formData.type,
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || "+63 2 0000 0000",
        address: formData.address.trim() || "Metro Manila, Philippines",
        status: formData.status,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setFacilityList((prev) => [newFacility, ...prev]);
    } else if (modalMode === "edit" && selectedFacility) {
      setFacilityList((prev) =>
        prev.map((f) =>
          f.id === selectedFacility.id
            ? {
                ...f,
                name: formData.name.trim(),
                facilityCode: formData.facilityCode.trim().toUpperCase(),
                type: formData.type,
                contactPerson: formData.contactPerson.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                address: formData.address.trim(),
                status: formData.status,
              }
            : f,
        ),
      );
    }

    handleCloseModal();
  };

  // Delete Facility Confirmation
  const handleConfirmDelete = () => {
    if (!selectedFacility) return;

    setFacilityList((prev) =>
      prev.filter((f) => f.id !== selectedFacility.id),
    );

    if (paginatedFacilities.length === 1 && currentPage > 1) {
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
            Facility Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage hospital branches, clinics, and pharmaceutical storage hubs
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="btn-primary self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Facility</span>
        </button>
      </div>

      {/* 3 Total Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Facilities */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Facilities
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalFacilities}
              </h3>
              <span className="inline-block text-[11px] font-medium text-blue-600 mt-1">
                Branches & clinics
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Hospital className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Total Active */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Active
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalActive}
              </h3>
              <span className="inline-block text-[11px] font-medium text-emerald-600 mt-1">
                Operational sites
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Total Inactive */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Inactive
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalInactive}
              </h3>
              <span className="inline-block text-[11px] font-medium text-rose-600 mt-1">
                Inactive / Maintenance
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <XCircle className="w-5 h-5" />
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
              placeholder="Search by facility name, code, contact..."
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={handleTypeChange}
              className="input py-2 text-xs w-full sm:w-44"
            >
              <option value="ALL">All Facility Types</option>
              {facilityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={handleStatusChange}
              className="input py-2 text-xs w-full sm:w-32"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Facility Name
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Facility Type
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Contact Person
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Established
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedFacilities.length > 0 ? (
                paginatedFacilities.map((facility) => (
                  <tr
                    key={facility.id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    {/* Facility Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-semibold text-xs border border-blue-100 shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {facility.name}
                        </div>
                      </div>
                    </td>

                    {/* Facility Type Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        {facility.type}
                      </span>
                    </td>

                    {/* Contact Person Details */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {facility.contactPerson}
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" />
                          {facility.email}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          facility.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            facility.status === "Active"
                              ? "bg-emerald-500"
                              : "bg-rose-500"
                          }`}
                        />
                        {facility.status}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {facility.createdAt}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenViewModal(facility)}
                          className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                          title="View Facility"
                          aria-label="View Facility"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(facility)}
                          className="btn-secondary p-1.5 text-gray-600 hover:text-amber-600 hover:border-amber-300"
                          title="Edit Facility"
                          aria-label="Edit Facility"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(facility)}
                          className="btn-danger p-1.5"
                          title="Delete Facility"
                          aria-label="Delete Facility"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    <Hospital className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No facilities found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search query or filter criteria
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {filteredFacilities.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredFacilities.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* --- ADD / EDIT FACILITY MODAL --- */}
      <Modal
        isOpen={modalMode === "add" || modalMode === "edit"}
        onClose={handleCloseModal}
        title={
          modalMode === "add" ? "Add New Facility" : "Edit Facility Details"
        }
        size="lg"
      >
        <form onSubmit={handleSaveFacility} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Facility Name */}
            <div className="sm:col-span-2">
              <label
                htmlFor="facility-name"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Facility / Branch Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="facility-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Exakt Central General Hospital"
                  className={`input pl-10 ${
                    formErrors.name
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                      : ""
                  }`}
                />
                <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.name && (
                <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* Facility Code */}
            <div>
              <label
                htmlFor="facility-code"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Facility Code <span className="text-red-500">*</span>
              </label>
              <input
                id="facility-code"
                type="text"
                name="facilityCode"
                value={formData.facilityCode}
                onChange={handleInputChange}
                placeholder="FAC-001"
                className={`input uppercase font-mono ${
                  formErrors.facilityCode
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                    : ""
                }`}
              />
              {formErrors.facilityCode && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.facilityCode}
                </p>
              )}
            </div>

            {/* Facility Type */}
            <div>
              <label
                htmlFor="facility-type"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Facility Type <span className="text-red-500">*</span>
              </label>
              <select
                id="facility-type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="input"
              >
                {FACILITY_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Person */}
            <div>
              <label
                htmlFor="facility-contact"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Lead Administrator / Contact <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="facility-contact"
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder="e.g. Dr. Jonathan Mendoza"
                  className={`input pl-10 ${
                    formErrors.contactPerson
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                      : ""
                  }`}
                />
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.contactPerson && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.contactPerson}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="facility-email"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Official Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="facility-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="central.admin@exaktmed.com"
                  className={`input pl-10 ${
                    formErrors.email
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                      : ""
                  }`}
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.email && (
                <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="facility-phone"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Phone / Hotline
              </label>
              <div className="relative">
                <input
                  id="facility-phone"
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+63 2 8920 5000"
                  className="input pl-10"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="facility-status"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Operational Status <span className="text-red-500">*</span>
              </label>
              <select
                id="facility-status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="input"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Physical Address */}
            <div className="sm:col-span-2">
              <label
                htmlFor="facility-address"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Physical Facility Address
              </label>
              <div className="relative">
                <input
                  id="facility-address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. E. Rodriguez Sr. Ave, Quezon City, Metro Manila"
                  className="input pl-10"
                />
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  <span>Add Facility</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- VIEW FACILITY MODAL --- */}
      <Modal
        isOpen={modalMode === "view" && Boolean(selectedFacility)}
        onClose={handleCloseModal}
        title="Facility Details"
        size="md"
      >
        {selectedFacility && (
          <div className="space-y-5">
            {/* Header with Facility details */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 font-bold text-white text-xl shadow-sm">
                <Hospital className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900 truncate">
                    {selectedFacility.name}
                  </h3>
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                    {selectedFacility.facilityCode}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      selectedFacility.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedFacility.status === "Active"
                          ? "bg-emerald-500"
                          : "bg-rose-500"
                      }`}
                    />
                    {selectedFacility.status}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500 font-medium">
                    {selectedFacility.type}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" /> Administrator
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedFacility.contactPerson}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </span>
                <p className="font-semibold text-gray-900 truncate">
                  {selectedFacility.email}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Hotline / Phone
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedFacility.phone || "Not provided"}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Established Date
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedFacility.createdAt || "N/A"}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1 sm:col-span-2">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Physical Address
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedFacility.address || "Not specified"}
                </p>
              </div>
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
              <button
                type="button"
                onClick={() => handleOpenEditModal(selectedFacility)}
                className="btn-primary text-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Facility</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- DELETE FACILITY CONFIRMATION MODAL --- */}
      <Modal
        isOpen={modalMode === "delete" && Boolean(selectedFacility)}
        onClose={handleCloseModal}
        title="Delete Facility"
        size="sm"
      >
        {selectedFacility && (
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-red-900">
                  Are you sure you want to delete this facility?
                </p>
                <p className="text-red-700">
                  This will permanently remove the record for{" "}
                  <span className="font-bold">{selectedFacility.name}</span> (
                  <span className="font-mono font-semibold">
                    {selectedFacility.facilityCode}
                  </span>
                  ). This action cannot be undone.
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
                <span>Delete Facility</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default FacilityManagement;
