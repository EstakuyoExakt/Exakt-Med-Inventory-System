import { useState, useMemo } from "react";
import {
  Truck,
  CheckCircle2,
  XCircle,
  Plus,
  Mail,
  Phone,
  Building2,
  Package,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Calendar,
  CreditCard,
  MapPin,
  User as UserIcon,
} from "lucide-react";

// Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";

import { suppliers as initialSuppliers } from "../../data/supplier";

const PAYMENT_TERMS_OPTIONS = [
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "COD",
  "Advance Payment",
];

const DEFAULT_FORM_DATA = {
  name: "",
  supplierCode: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  paymentTerms: "Net 30",
  status: "Active",
  totalBatchesSupplied: 0,
};

function SupplierManagement() {
  const [supplierList, setSupplierList] = useState(initialSuppliers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal State
  const [modalMode, setModalMode] = useState(null); // 'add' | 'view' | 'edit' | 'delete' | null
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [formErrors, setFormErrors] = useState({});

  // Calculate 3 Total Metric Counts
  const totalSuppliers = supplierList.length;
  const totalActive = useMemo(
    () => supplierList.filter((s) => s.status === "Active").length,
    [supplierList],
  );
  const totalInactive = useMemo(
    () => supplierList.filter((s) => s.status !== "Active").length,
    [supplierList],
  );

  // Filtered suppliers based on search query and status
  const filteredSuppliers = useMemo(() => {
    return supplierList.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.supplierCode
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        supplier.contactPerson
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        supplier.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (supplier.address &&
          supplier.address.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        selectedStatus === "ALL" || supplier.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [supplierList, searchQuery, selectedStatus]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage) || 1;
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSuppliers, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    setCurrentPage(1);
  };

  // Generate next supplier code suggestion
  const generateNextSupplierCode = () => {
    const maxNum = supplierList.reduce((max, s) => {
      const match = s.supplierCode?.match(/SUP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    return `SUP-${String(maxNum + 1).padStart(3, "0")}`;
  };

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      supplierCode: generateNextSupplierCode(),
    });
    setFormErrors({});
    setSelectedSupplier(null);
    setModalMode("add");
  };

  const handleOpenViewModal = (supplier) => {
    setSelectedSupplier(supplier);
    setModalMode("view");
  };

  const handleOpenEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name || "",
      supplierCode: supplier.supplierCode || "",
      contactPerson: supplier.contactPerson || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      paymentTerms: supplier.paymentTerms || "Net 30",
      status: supplier.status || "Active",
      totalBatchesSupplied: supplier.totalBatchesSupplied ?? 0,
    });
    setFormErrors({});
    setModalMode("edit");
  };

  const handleOpenDeleteModal = (supplier) => {
    setSelectedSupplier(supplier);
    setModalMode("delete");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedSupplier(null);
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
      errors.name = "Supplier name is required.";
    }

    if (!formData.supplierCode.trim()) {
      errors.supplierCode = "Supplier code is required.";
    } else {
      const codeExists = supplierList.some(
        (s) =>
          s.supplierCode.toLowerCase() ===
            formData.supplierCode.trim().toLowerCase() &&
          (!selectedSupplier || s.id !== selectedSupplier.id),
      );
      if (codeExists) {
        errors.supplierCode = "Supplier code already exists.";
      }
    }

    if (!formData.contactPerson.trim()) {
      errors.contactPerson = "Contact person name is required.";
    }

    if (!formData.email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    } else {
      const emailExists = supplierList.some(
        (s) =>
          s.email.toLowerCase() === formData.email.trim().toLowerCase() &&
          (!selectedSupplier || s.id !== selectedSupplier.id),
      );
      if (emailExists) {
        errors.email = "Email address is already used by another supplier.";
      }
    }

    if (!formData.paymentTerms) {
      errors.paymentTerms = "Payment terms are required.";
    }

    if (!formData.status) {
      errors.status = "Status is required.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save (Add or Edit) Supplier
  const handleSaveSupplier = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (modalMode === "add") {
      const newSupplier = {
        id: Date.now(),
        name: formData.name.trim(),
        supplierCode: formData.supplierCode.trim().toUpperCase(),
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || "+63 2 0000 0000",
        address: formData.address.trim() || "Metro Manila, Philippines",
        paymentTerms: formData.paymentTerms,
        status: formData.status,
        totalBatchesSupplied: Number(formData.totalBatchesSupplied) || 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setSupplierList((prev) => [newSupplier, ...prev]);
    } else if (modalMode === "edit" && selectedSupplier) {
      setSupplierList((prev) =>
        prev.map((s) =>
          s.id === selectedSupplier.id
            ? {
                ...s,
                name: formData.name.trim(),
                supplierCode: formData.supplierCode.trim().toUpperCase(),
                contactPerson: formData.contactPerson.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                address: formData.address.trim(),
                paymentTerms: formData.paymentTerms,
                status: formData.status,
                totalBatchesSupplied:
                  Number(formData.totalBatchesSupplied) || 0,
              }
            : s,
        ),
      );
    }

    handleCloseModal();
  };

  // Delete Supplier Confirmation
  const handleConfirmDelete = () => {
    if (!selectedSupplier) return;

    setSupplierList((prev) =>
      prev.filter((s) => s.id !== selectedSupplier.id),
    );

    if (paginatedSuppliers.length === 1 && currentPage > 1) {
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
            Supplier Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage pharmaceutical vendors, distributors, and delivery terms
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="btn-primary self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* 3 Total Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Suppliers */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Suppliers
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalSuppliers}
              </h3>
              <span className="inline-block text-[11px] font-medium text-blue-600 mt-1">
                Registered vendors
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Truck className="w-5 h-5" />
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
                Active partnership
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
                Inactive / Under review
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
              placeholder="Search by name, code, contact person..."
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedStatus}
              onChange={handleStatusChange}
              className="input py-2 text-xs w-full sm:w-44"
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
                  Supplier Name
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Contact Person
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Payment Terms
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Batches Delivered
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
              {paginatedSuppliers.length > 0 ? (
                paginatedSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    {/* Supplier Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-semibold text-xs border border-blue-100 shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {supplier.name}
                        </div>
                      </div>
                    </td>

                    {/* Contact Person Details */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {supplier.contactPerson}
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" />
                          {supplier.email}
                        </span>
                      </div>
                    </td>

                    {/* Payment Terms */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        {supplier.paymentTerms}
                      </span>
                    </td>

                    {/* Batches Supplied */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                        <Package className="w-4 h-4 text-blue-500" />
                        <span>{supplier.totalBatchesSupplied}</span>
                        <span className="text-xs text-gray-400 font-normal">
                          batches
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          supplier.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            supplier.status === "Active"
                              ? "bg-emerald-500"
                              : "bg-rose-500"
                          }`}
                        />
                        {supplier.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenViewModal(supplier)}
                          className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                          title="View Details"
                          aria-label="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(supplier)}
                          className="btn-secondary p-1.5 text-gray-600 hover:text-amber-600 hover:border-amber-300"
                          title="Edit Supplier"
                          aria-label="Edit Supplier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(supplier)}
                          className="btn-danger p-1.5"
                          title="Delete Supplier"
                          aria-label="Delete Supplier"
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
                    <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No suppliers found</p>
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
        {filteredSuppliers.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredSuppliers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* --- ADD / EDIT SUPPLIER MODAL --- */}
      <Modal
        isOpen={modalMode === "add" || modalMode === "edit"}
        onClose={handleCloseModal}
        title={
          modalMode === "add" ? "Add New Supplier" : "Edit Supplier Details"
        }
        size="lg"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Supplier Name */}
            <div className="sm:col-span-2">
              <label
                htmlFor="supplier-name"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Supplier / Company Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="supplier-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Unilab Pharmaceuticals Inc."
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

            {/* Supplier Code */}
            <div>
              <label
                htmlFor="supplier-code"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Supplier Code <span className="text-red-500">*</span>
              </label>
              <input
                id="supplier-code"
                type="text"
                name="supplierCode"
                value={formData.supplierCode}
                onChange={handleInputChange}
                placeholder="SUP-001"
                className={`input uppercase font-mono ${
                  formErrors.supplierCode
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
                    : ""
                }`}
              />
              {formErrors.supplierCode && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.supplierCode}
                </p>
              )}
            </div>

            {/* Contact Person */}
            <div>
              <label
                htmlFor="supplier-contact"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Contact Person <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="supplier-contact"
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder="e.g. Dr. Roberto Tan"
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
                htmlFor="supplier-email"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="supplier-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="orders@supplier.com"
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
                htmlFor="supplier-phone"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Phone / Hotline
              </label>
              <div className="relative">
                <input
                  id="supplier-phone"
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+63 2 8858 1000"
                  className="input pl-10"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <label
                htmlFor="supplier-terms"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Payment Terms <span className="text-red-500">*</span>
              </label>
              <select
                id="supplier-terms"
                name="paymentTerms"
                value={formData.paymentTerms}
                onChange={handleInputChange}
                className="input"
              >
                {PAYMENT_TERMS_OPTIONS.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="supplier-status"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Partnership Status <span className="text-red-500">*</span>
              </label>
              <select
                id="supplier-status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="input"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Total Batches Supplied */}
            <div>
              <label
                htmlFor="supplier-batches"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Total Batches Supplied
              </label>
              <div className="relative">
                <input
                  id="supplier-batches"
                  type="number"
                  min="0"
                  name="totalBatchesSupplied"
                  value={formData.totalBatchesSupplied}
                  onChange={handleInputChange}
                  className="input pl-10"
                />
                <Package className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Business Address */}
            <div className="sm:col-span-2">
              <label
                htmlFor="supplier-address"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Office / Warehouse Address
              </label>
              <div className="relative">
                <input
                  id="supplier-address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. 66 United Street, Mandaluyong City, Metro Manila"
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
                  <span>Add Supplier</span>
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

      {/* --- VIEW SUPPLIER MODAL --- */}
      <Modal
        isOpen={modalMode === "view" && Boolean(selectedSupplier)}
        onClose={handleCloseModal}
        title="Supplier Details"
        size="md"
      >
        {selectedSupplier && (
          <div className="space-y-5">
            {/* Header with Company details */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 font-bold text-white text-xl shadow-sm">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900 truncate">
                    {selectedSupplier.name}
                  </h3>
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                    {selectedSupplier.supplierCode}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      selectedSupplier.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedSupplier.status === "Active"
                          ? "bg-emerald-500"
                          : "bg-rose-500"
                      }`}
                    />
                    {selectedSupplier.status}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500 font-medium">
                    Terms: {selectedSupplier.paymentTerms}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" /> Contact Person
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedSupplier.contactPerson}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </span>
                <p className="font-semibold text-gray-900 truncate">
                  {selectedSupplier.email}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedSupplier.phone || "Not provided"}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Batches Delivered
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedSupplier.totalBatchesSupplied ?? 0} batches
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1 sm:col-span-2">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Business Address
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedSupplier.address || "Not specified"}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Payment Method
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedSupplier.paymentTerms}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Registration Date
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedSupplier.createdAt || "N/A"}
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
                onClick={() => handleOpenEditModal(selectedSupplier)}
                className="btn-primary text-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Supplier</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- DELETE SUPPLIER CONFIRMATION MODAL --- */}
      <Modal
        isOpen={modalMode === "delete" && Boolean(selectedSupplier)}
        onClose={handleCloseModal}
        title="Delete Supplier"
        size="sm"
      >
        {selectedSupplier && (
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-red-900">
                  Are you sure you want to delete this supplier?
                </p>
                <p className="text-red-700">
                  This will permanently remove the record for{" "}
                  <span className="font-bold">{selectedSupplier.name}</span> (
                  <span className="font-mono font-semibold">
                    {selectedSupplier.supplierCode}
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
                <span>Delete Supplier</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SupplierManagement;
