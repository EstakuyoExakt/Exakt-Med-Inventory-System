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
} from "lucide-react";
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import { facilities as initialFacilities } from "../../data/facility";

function FacilityManagement() {
  const [facilityList, setFacilityList] = useState(initialFacilities);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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

  // Extract unique facility types for filter
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
        facility.type.toLowerCase().includes(searchQuery.toLowerCase());

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
                  Facility Name & Code
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
                    {/* Facility Name & Code */}
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
                          className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                          title="View Facility"
                          aria-label="View Facility"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn-secondary p-1.5 text-gray-600 hover:text-amber-600 hover:border-amber-300"
                          title="Edit Facility"
                          aria-label="Edit Facility"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
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
    </div>
  );
}

export default FacilityManagement;
