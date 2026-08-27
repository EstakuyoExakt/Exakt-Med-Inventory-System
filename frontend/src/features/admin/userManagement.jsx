import { useState, useMemo } from "react";
import {
  Users,
  Shield,
  Pill,
  Package,
  Receipt,
  UserPlus,
  Mail,
  Phone,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Lock,
  User as UserIcon,
} from "lucide-react";

// Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";
import Pagination from "../../components/common/pagination";
import Modal from "../../components/common/modal";

import { users as initialUsers } from "../../data/user";
import { ROLES, ROLE_DETAILS } from "../../config/roles";

const DEFAULT_FORM_DATA = {
  name: "",
  username: "",
  email: "",
  phone: "",
  role: ROLES.PHARMACIST,
  status: "Active",
  password: "exaktpassword",
};

function UserManagement() {
  const [userList, setUserList] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal State
  const [modalMode, setModalMode] = useState(null); // 'add' | 'view' | 'edit' | 'delete' | null
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [formErrors, setFormErrors] = useState({});

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

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setFormData(DEFAULT_FORM_DATA);
    setFormErrors({});
    setSelectedUser(null);
    setModalMode("add");
  };

  const handleOpenViewModal = (user) => {
    setSelectedUser(user);
    setModalMode("view");
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || ROLES.PHARMACIST,
      status: user.status || "Active",
      password: user.password || "exaktpassword",
    });
    setFormErrors({});
    setModalMode("edit");
  };

  const handleOpenDeleteModal = (user) => {
    setSelectedUser(user);
    setModalMode("delete");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedUser(null);
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
      errors.name = "Full name is required.";
    }

    if (!formData.username.trim()) {
      errors.username = "Username is required.";
    } else {
      const usernameExists = userList.some(
        (u) =>
          u.username.toLowerCase() === formData.username.trim().toLowerCase() &&
          (!selectedUser || u.id !== selectedUser.id),
      );
      if (usernameExists) {
        errors.username = "Username is already taken.";
      }
    }

    if (!formData.email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    } else {
      const emailExists = userList.some(
        (u) =>
          u.email.toLowerCase() === formData.email.trim().toLowerCase() &&
          (!selectedUser || u.id !== selectedUser.id),
      );
      if (emailExists) {
        errors.email = "Email address is already in use.";
      }
    }

    if (!formData.role) {
      errors.role = "Role is required.";
    }

    if (!formData.status) {
      errors.status = "Status is required.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save (Add or Edit) User
  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (modalMode === "add") {
      const newUser = {
        id: Date.now(),
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || "+63 900 000 0000",
        role: formData.role,
        status: formData.status,
        password: formData.password || "exaktpassword",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setUserList((prev) => [newUser, ...prev]);
    } else if (modalMode === "edit" && selectedUser) {
      setUserList((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                name: formData.name.trim(),
                username: formData.username.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                role: formData.role,
                status: formData.status,
                password: formData.password || u.password,
              }
            : u,
        ),
      );
    }

    handleCloseModal();
  };

  // Delete User Confirmation
  const handleConfirmDelete = () => {
    if (!selectedUser) return;

    setUserList((prev) => prev.filter((u) => u.id !== selectedUser.id));

    // If deleting the last item on the current page, adjust page if needed
    if (paginatedUsers.length === 1 && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }

    handleCloseModal();
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
          onClick={handleOpenAddModal}
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
                            onClick={() => handleOpenViewModal(user)}
                            className="btn-secondary p-1.5 text-gray-600 hover:text-blue-600 hover:border-blue-300"
                            title="View User"
                            aria-label="View User"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="btn-secondary p-1.5 text-gray-600 hover:text-amber-600 hover:border-amber-300"
                            title="Edit User"
                            aria-label="Edit User"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(user)}
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

      {/* --- ADD / EDIT USER MODAL --- */}
      <Modal
        isOpen={modalMode === "add" || modalMode === "edit"}
        onClose={handleCloseModal}
        title={modalMode === "add" ? "Add New User" : "Edit User Account"}
        size="lg"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label
                htmlFor="user-fullname"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="user-fullname"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Dr. Jane Smith"
                  className={`input pl-10 ${
                    formErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""
                  }`}
                />
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.name && (
                <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="user-username"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-mono pointer-events-none">
                  @
                </span>
                <input
                  id="user-username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="jsmith"
                  className={`input pl-8 ${
                    formErrors.username ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""
                  }`}
                />
              </div>
              {formErrors.username && (
                <p className="text-xs text-red-500 mt-1">
                  {formErrors.username}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="user-email"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="user-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="jane.smith@exaktmed.com"
                  className={`input pl-10 ${
                    formErrors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""
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
                htmlFor="user-phone"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Phone Number
              </label>
              <div className="relative">
                <input
                  id="user-phone"
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+63 917 000 0000"
                  className="input pl-10"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Assigned Role */}
            <div>
              <label
                htmlFor="user-role"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="user-role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="input"
              >
                <option value={ROLES.ADMIN}>Admin</option>
                <option value={ROLES.PHARMACIST}>Pharmacist Manager</option>
                <option value={ROLES.PROCUREMENT}>Procurement Officer</option>
                <option value={ROLES.ACCOUNTANT}>Accountant</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="user-status"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Account Status <span className="text-red-500">*</span>
              </label>
              <select
                id="user-status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="input"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="user-password"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                {modalMode === "add" ? "Default Password" : "Reset Password"}
              </label>
              <div className="relative">
                <input
                  id="user-password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="input pl-10"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {modalMode === "add"
                  ? "Standard temporary password for first login."
                  : "Leave untouched to keep current password."}
              </p>
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
                  <UserPlus className="w-4 h-4" />
                  <span>Create User</span>
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

      {/* --- VIEW USER MODAL --- */}
      <Modal
        isOpen={modalMode === "view" && Boolean(selectedUser)}
        onClose={handleCloseModal}
        title="User Details"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-5">
            {/* Header Avatar & Name */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 font-bold text-white text-xl shadow-sm">
                {selectedUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-900 truncate">
                    {selectedUser.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                      ROLE_DETAILS[selectedUser.role]?.badgeColor ||
                      "bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    {selectedUser.role}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  @{selectedUser.username}
                </p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </span>
                <p className="font-semibold text-gray-900 truncate">
                  {selectedUser.email}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedUser.phone || "Not specified"}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Account Status
                </span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedUser.status === "Active"
                        ? "bg-emerald-500"
                        : "bg-gray-400"
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      selectedUser.status === "Active"
                        ? "text-emerald-700"
                        : "text-gray-600"
                    }`}
                  >
                    {selectedUser.status}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white space-y-1">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date Joined
                </span>
                <p className="font-semibold text-gray-900">
                  {selectedUser.createdAt || "N/A"}
                </p>
              </div>
            </div>

            {/* Role Summary Note */}
            <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-xs text-blue-800">
              <span className="font-semibold">Role Scope:</span>{" "}
              {ROLE_DETAILS[selectedUser.role]?.description ||
                "Standard system access permissions."}
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
                onClick={() => handleOpenEditModal(selectedUser)}
                className="btn-primary text-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit User</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- DELETE USER CONFIRMATION MODAL --- */}
      <Modal
        isOpen={modalMode === "delete" && Boolean(selectedUser)}
        onClose={handleCloseModal}
        title="Delete User Account"
        size="sm"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-red-900">
                  Are you sure you want to delete this user?
                </p>
                <p className="text-red-700">
                  This will permanently remove the account for{" "}
                  <span className="font-bold">{selectedUser.name}</span> (
                  <span className="font-mono">@{selectedUser.username}</span>).
                  This action cannot be undone.
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
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default UserManagement;
