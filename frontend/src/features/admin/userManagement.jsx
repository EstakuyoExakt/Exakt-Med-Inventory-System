import { useState, useMemo } from "react";
import {
  Users,
  Shield,
  Pill,
  Package,
  Receipt,
  UserPlus,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

// Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";

import { users as initialUsers } from "../../data/user";
import { ROLES, ROLE_DETAILS } from "../../config/roles";

function UserManagement() {
  const [userList, setUserList] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Calculate totals for each role
  const totalAdmins = useMemo(
    () => userList.filter((u) => u.role === ROLES.ADMIN).length,
    [userList],
  );
  const totalPharmacists = useMemo(
    () => userList.filter((u) => u.role === ROLES.PHARMACIST).length,
    [userList],
  );
  const totalProcurements = useMemo(
    () => userList.filter((u) => u.role === ROLES.PROCUREMENT).length,
    [userList],
  );
  const totalAccountants = useMemo(
    () => userList.filter((u) => u.role === ROLES.ACCOUNTANT).length,
    [userList],
  );

  // Filtered users based on search, role, and status
  const filteredUsers = useMemo(() => {
    return userList.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = selectedRole === "ALL" || user.role === selectedRole;

      const matchesStatus =
        selectedStatus === "ALL" || user.status === selectedStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [userList, searchQuery, selectedRole, selectedStatus]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleRoleChange = (e) => {
    setSelectedRole(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system access, roles, and staff account permissions
          </p>
        </div>
        <button
          type="button"
          className="btn-primary self-start sm:self-auto shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* 4 Total Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Admins */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Administrators
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalAdmins}
              </h3>
              <span className="inline-block text-[11px] font-medium text-purple-600 mt-1">
                Full system control
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Total Pharmacist Managers */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Pharmacist Managers
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalPharmacists}
              </h3>
              <span className="inline-block text-[11px] font-medium text-emerald-600 mt-1">
                Medicines & stock
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Pill className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Total Procurement Officers */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Procurement Officers
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalProcurements}
              </h3>
              <span className="inline-block text-[11px] font-medium text-blue-600 mt-1">
                Batches & suppliers
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </Card>

        {/* Total Accountants */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Accountants
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {totalAccountants}
              </h3>
              <span className="inline-block text-[11px] font-medium text-amber-600 mt-1">
                Billing & invoices
              </span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden border border-gray-200">
        {/* Table Controls (Search & Filter) */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-50/50">
          <div className="w-full md:w-80">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              onClear={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              placeholder="Search by name, email, or username..."
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={handleRoleChange}
              className="input py-2 text-xs w-full sm:w-44"
            >
              <option value="ALL">All Roles</option>
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.PHARMACIST}>Pharmacist Manager</option>
              <option value={ROLES.PROCUREMENT}>Procurement Officer</option>
              <option value={ROLES.ACCOUNTANT}>Accountant</option>
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
                  User Details
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Username
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Assigned Role
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Joined Date
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => {
                  const roleMeta = ROLE_DETAILS[user.role];
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      {/* Name & Email */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-semibold text-white text-xs">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">
                              {user.name}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          @{user.username}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                            roleMeta?.badgeColor ||
                            "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {roleMeta?.label || user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === "Active"
                                ? "bg-emerald-500"
                                : "bg-gray-400"
                            }`}
                          />
                          {user.status}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {user.createdAt}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                            title="View User"
                            aria-label="View User"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="btn-secondary p-1.5 text-gray-600 hover:text-amber-600 hover:border-amber-300"
                            title="Edit User"
                            aria-label="Edit User"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="btn-danger p-1.5"
                            title="Delete User"
                            aria-label="Delete User"
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
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No users found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search query or filters
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {filteredUsers.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

export default UserManagement;
