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
} from "lucide-react";
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import { suppliers as initialSuppliers } from "../../data/supplier";

function SupplierManagement() {
  const [supplierList, setSupplierList] = useState(initialSuppliers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
        supplier.email.toLowerCase().includes(searchQuery.toLowerCase());

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
                  Supplier Name & Code
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
                    {/* Supplier Name & Code */}
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
                          className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                          title="View Details"
                          aria-label="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn-secondary p-1.5 text-gray-600 hover:text-amber-600 hover:border-amber-300"
                          title="Edit Supplier"
                          aria-label="Edit Supplier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
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
    </div>
  );
}

export default SupplierManagement;
