import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  CheckCircle2,
  Warehouse,
  Hospital,
  Stethoscope,
  ShieldAlert,
  Sparkles,
  Layers,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  AlertCircle,
} from "lucide-react";

import PortalHeader from "./components/portalHeader";
import PortalFooter from "./components/portalFooter";
import PortalHeroBanner from "./components/portalHeroBanner";
import PortalToolbar from "./components/portalToolbar";
import EmptyState from "./components/emptyState";
import Modal from "../../components/common/modal";
import RoleGuard from "../../components/guard/roleGuard";

// Data & Hooks
import { facilities as allFacilities } from "../../data/facility";
import { ROLE_DETAILS, ROLES } from "../../config/roles";
import useAuth from "../../hooks/useAuth";
import {
  FACILITY_TYPE_OPTIONS,
  DEFAULT_FACILITY_FORM,
} from "../../utils/constants";

function SelectFacility() {
  const navigate = useNavigate();
  const {
    user,
    project: activeProject,
    facility: currentSavedFacility,
    selectFacility,
    setProject,
    logout,
    isAuthenticated,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Facilities list state initialized with mock data
  const [facilityList, setFacilityList] = useState(allFacilities);

  // Modal state for adding a facility
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FACILITY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [addSuccessMsg, setAddSuccessMsg] = useState("");

  // If not logged in, redirect back to login
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const isSuperAdminOrAdmin =
    user?.role === "Super Admin" ||
    user?.role === ROLES.SUPER_ADMIN ||
    user?.role === "Admin" ||
    user?.role === ROLES.ADMIN;

  // Filter facilities assigned to the user (and scoped by active project)
  const userAssignedFacilities = useMemo(() => {
    if (!user) return [];

    // Super Admins: access to all facilities, scoped by selected project if one is active
    if (user.role === "Super Admin" || user.role === ROLES.SUPER_ADMIN) {
      if (activeProject) {
        return facilityList.filter(
          (f) =>
            activeProject.facilityIds?.includes(f.id) ||
            f.projectId === Number(activeProject.id),
        );
      }
      return facilityList;
    }

    // Admins: if a project is selected, show facilities in that project; otherwise all in their assigned projects
    if (user.role === "Admin" || user.role === ROLES.ADMIN) {
      if (activeProject) {
        return facilityList.filter(
          (f) =>
            activeProject.facilityIds?.includes(f.id) ||
            f.projectId === Number(activeProject.id),
        );
      }
      if (user.assignedProjects && user.assignedProjects.length > 0) {
        return facilityList.filter((f) =>
          user.assignedProjects.includes(f.projectId),
        );
      }
      if (user.assignedFacilities && user.assignedFacilities.length > 0) {
        return facilityList.filter((f) =>
          user.assignedFacilities.includes(f.id),
        );
      }
      return facilityList;
    }

    // If user has an assignedFacilities list, treat it as the primary source of truth
    if (Array.isArray(user.assignedFacilities)) {
      return facilityList.filter((facility) =>
        user.assignedFacilities.includes(facility.id),
      );
    }

    // Fallback: Filter by assignedUserIds on facility if user has no assignedFacilities defined
    return facilityList.filter((facility) =>
      facility.assignedUserIds?.includes(user.id),
    );
  }, [user, activeProject, facilityList]);

  const projectHasNoFacilities = userAssignedFacilities.length === 0;

  // Filtered facilities based on search query
  const filteredFacilities = useMemo(() => {
    return userAssignedFacilities.filter((facility) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        facility.name.toLowerCase().includes(query) ||
        facility.facilityCode.toLowerCase().includes(query) ||
        facility.address.toLowerCase().includes(query) ||
        facility.contactPerson.toLowerCase().includes(query)
      );
    });
  }, [userAssignedFacilities, searchQuery]);

  const handleSelect = (facility) => {
    if (facility.status !== "Active") return;
    setSelectedFacilityId(facility.id);
    setIsSubmitting(true);

    setTimeout(() => {
      selectFacility(facility);
    }, 400);
  };

  const getFacilityIcon = (type) => {
    switch (type) {
      case "Central Warehouse":
      case "Cold Storage Facility":
        return <Warehouse className="w-5 h-5 text-amber-600" />;
      case "Main Hospital":
      case "Branch Hospital":
      case "Specialty Hospital":
        return <Hospital className="w-5 h-5 text-blue-600" />;
      case "Emergency Center":
        return <ShieldAlert className="w-5 h-5 text-red-600" />;
      default:
        return <Stethoscope className="w-5 h-5 text-emerald-600" />;
    }
  };

  // Generate next facility code
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

  // Modal Handlers
  const handleOpenAddModal = () => {
    if (!isSuperAdminOrAdmin) return;
    setFormData({
      ...DEFAULT_FACILITY_FORM,
      facilityCode: generateNextFacilityCode(),
    });
    setFormErrors({});
    setAddSuccessMsg("");
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setFormData(DEFAULT_FACILITY_FORM);
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateFacilityForm = () => {
    const errors = {};
    if (!formData.name?.trim()) {
      errors.name = "Facility name is required.";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Facility name must be at least 3 characters.";
    }

    if (!formData.facilityCode?.trim()) {
      errors.facilityCode = "Facility code is required.";
    } else {
      const codeExists = facilityList.some(
        (f) =>
          f.facilityCode?.toLowerCase() ===
          formData.facilityCode.trim().toLowerCase(),
      );
      if (codeExists) {
        errors.facilityCode = "Facility code already in use.";
      }
    }

    if (!formData.contactPerson?.trim()) {
      errors.contactPerson = "Contact person is required.";
    }

    if (!formData.email?.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateFacilitySubmit = (e) => {
    e.preventDefault();
    if (!isSuperAdminOrAdmin) return;
    if (!validateFacilityForm()) return;

    const newFacId = Date.now();
    const targetProjectId = activeProject ? Number(activeProject.id) : null;

    const newFacility = {
      id: newFacId,
      facilityCode: formData.facilityCode.trim().toUpperCase(),
      name: formData.name.trim(),
      type: formData.type,
      contactPerson: formData.contactPerson.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || "+63 2 8000 0000",
      address: formData.address.trim() || "Metro Manila, Philippines",
      status: formData.status || "Active",
      createdAt: new Date().toISOString().split("T")[0],
      assignedUserIds: user?.id ? [user.id] : [1],
      projectId: targetProjectId,
    };

    setFacilityList((prev) => [newFacility, ...prev]);

    // Update activeProject facilityIds in storage and in state
    if (activeProject) {
      const updatedProject = {
        ...activeProject,
        facilityIds: [...(activeProject.facilityIds || []), newFacId],
      };
      setProject(updatedProject);
    }

    setAddSuccessMsg(`Facility "${newFacility.name}" added successfully!`);
    setTimeout(() => {
      handleCloseAddModal();
      setAddSuccessMsg("");
    }, 700);
  };

  const roleInfo = user?.role ? ROLE_DETAILS[user.role] : null;

  if (!user) return null;

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Header Navigation */}
      <PortalHeader
        user={user}
        roleInfo={roleInfo}
        subtitle="Multi-Facility Portal"
        onLogout={logout}
        badgeTheme="blue"
      />

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto my-8 space-y-8 flex-1">
        {/* Hero Welcome Banner */}
        <PortalHeroBanner
          badgeText="Assigned Healthcare Facilities"
          badgeIcon={Sparkles}
          badgeTheme="blue"
          title="Select Your Operating Facility"
          description={`Welcome back, ${user.name}. Please choose an assigned hospital branch or medical warehouse to access your workspace.`}
        >
          {/* Admin & Super Admin Mother Project indicator and switcher */}
          {isSuperAdminOrAdmin && activeProject && (
            <div className="pt-2 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold rounded-lg">
                <Layers className="w-3.5 h-3.5" />
                Mother Project:{" "}
                <strong className="font-bold">{activeProject.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => navigate("/select-project")}
                className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-semibold hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Switch Project
              </button>
            </div>
          )}
        </PortalHeroBanner>

        {/* Search Bar Toolbar */}
        <PortalToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery("")}
          placeholder="Search facility by name, code, or city..."
          showingCount={filteredFacilities.length}
          totalCount={userAssignedFacilities.length}
          itemLabel="assigned branches"
        >
          {projectHasNoFacilities && (
            <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn-primary py-2 px-3.5 text-xs shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Add a facility to this project"
              >
                <Plus className="w-4 h-4" />
                <span>Add a Facility</span>
              </button>
            </RoleGuard>
          )}
        </PortalToolbar>

        {/* Facilities Grid */}
        {filteredFacilities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-slide-up-2">
            {filteredFacilities.map((facility) => {
              const isActive = facility.status === "Active";
              const isSelected = selectedFacilityId === facility.id;
              const isCurrentlyActiveInSession =
                currentSavedFacility?.id === facility.id;

              return (
                <div
                  key={facility.id}
                  onClick={() => isActive && handleSelect(facility)}
                  className={`group relative bg-white rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between ${
                    isActive
                      ? "hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer border-gray-200"
                      : "opacity-60 bg-gray-50/80 border-gray-200 cursor-not-allowed"
                  } ${isSelected ? "ring-2 ring-blue-600 border-blue-600 bg-blue-50/20" : ""}`}
                >
                  <div>
                    {/* Top Facility Header Row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                          {getFacilityIcon(facility.type)}
                        </div>
                        <div>
                          <span className="font-mono text-[11px] font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">
                            {facility.facilityCode}
                          </span>
                          <p className="text-[11px] font-semibold text-blue-600 mt-0.5">
                            {facility.type}
                          </p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-red-400"
                            }`}
                          />
                          {facility.status}
                        </span>

                        {isCurrentlyActiveInSession && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Current Session
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Facility Name */}
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {facility.name}
                    </h3>

                    {/* Address */}
                    <div className="flex items-start gap-1.5 text-xs text-gray-500 mt-2.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{facility.address}</span>
                    </div>

                    {/* Contact Person Details */}
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate font-medium text-gray-700">
                          {facility.contactPerson}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{facility.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{facility.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Selection Button */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      disabled={!isActive || isSubmitting}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        isActive
                          ? "bg-gray-100 text-gray-800 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-blue-500/20"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isSelected && isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Entering Facility...</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {isActive ? "Select Facility" : "Facility Inactive"}
                          </span>
                          {isActive && (
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <EmptyState
            icon={Building2}
            title={
              projectHasNoFacilities && isSuperAdminOrAdmin
                ? "No Facilities in Project"
                : "No Facilities Found"
            }
            description={
              searchQuery
                ? "No assigned facilities match your search query."
                : projectHasNoFacilities && activeProject
                  ? `The project "${activeProject.name}" currently contains no facilities. Add a facility to get started.`
                  : "No assigned facilities are currently linked to your user account."
            }
            actionText={
              searchQuery
                ? "Clear Search"
                : projectHasNoFacilities && isSuperAdminOrAdmin
                  ? "Add a Facility"
                  : null
            }
            onAction={
              searchQuery
                ? () => setSearchQuery("")
                : projectHasNoFacilities && isSuperAdminOrAdmin
                  ? handleOpenAddModal
                  : null
            }
          />
        )}
      </main>

      {/* Footer */}
      <PortalFooter text="Exakt Med Multi-Facility Inventory Management System © 2026-2027" />

      {/* Super Admin & Admin Add Facility Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        title="Add New Facility"
        size="md"
      >
        <form onSubmit={handleCreateFacilitySubmit} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800">
            <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">
                {activeProject
                  ? `Assigning to Project: ${activeProject.name}`
                  : "New Facility Registration"}
              </p>
              <p className="mt-0.5 text-blue-700">
                Register a new hospital branch, warehouse, or clinic under this
                network.
              </p>
            </div>
          </div>

          {addSuccessMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{addSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Facility Name */}
            <div className="sm:col-span-2">
              <label
                htmlFor="fac-name"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Facility Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fac-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Exakt Central General Hospital"
                className={`input text-xs ${
                  formErrors.name ? "border-red-400 focus:border-red-500" : ""
                }`}
                autoFocus
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.name}
                </p>
              )}
            </div>

            {/* Facility Code */}
            <div>
              <label
                htmlFor="fac-code"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Facility Code <span className="text-red-500">*</span>
              </label>
              <input
                id="fac-code"
                type="text"
                name="facilityCode"
                value={formData.facilityCode}
                onChange={handleInputChange}
                placeholder="FAC-001"
                className={`input text-xs font-mono uppercase ${
                  formErrors.facilityCode
                    ? "border-red-400 focus:border-red-500"
                    : ""
                }`}
              />
              {formErrors.facilityCode && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.facilityCode}
                </p>
              )}
            </div>

            {/* Facility Type */}
            <div>
              <label
                htmlFor="fac-type"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Facility Type <span className="text-red-500">*</span>
              </label>
              <select
                id="fac-type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="input text-xs"
              >
                {FACILITY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Person */}
            <div>
              <label
                htmlFor="fac-contactPerson"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Contact Person <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="fac-contactPerson"
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder="e.g. Dr. Jonathan Mendoza"
                  className={`input text-xs pl-8 ${
                    formErrors.contactPerson
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                />
                <User className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.contactPerson && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.contactPerson}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="fac-email"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="fac-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@exaktmed.com"
                  className={`input text-xs pl-8 ${
                    formErrors.email
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                />
                <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.email && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="fac-phone"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Phone / Hotline
              </label>
              <div className="relative">
                <input
                  id="fac-phone"
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+63 2 8920 5000"
                  className="input text-xs pl-8"
                />
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="fac-status"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Operational Status
              </label>
              <select
                id="fac-status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="input text-xs"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label
                htmlFor="fac-address"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Physical Address
              </label>
              <div className="relative">
                <input
                  id="fac-address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. E. Rodriguez Sr. Ave, Quezon City, Metro Manila"
                  className="input text-xs pl-8"
                />
                <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCloseAddModal}
              className="btn-secondary text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Facility</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default SelectFacility;
