import { useState, useMemo, useEffect, useCallback } from "react";
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
  Pencil,
  Trash2,
  Check,
  Users,
  RefreshCw,
} from "lucide-react";

import PortalHeader from "./components/portalHeader";
import PortalFooter from "./components/portalFooter";
import PortalHeroBanner from "./components/portalHeroBanner";
import PortalToolbar from "./components/portalToolbar";
import EmptyState from "./components/emptyState";
import SearchableChecklist from "./components/searchableChecklist";
import PortalEntityCard from "./components/portalEntityCard";
import Modal from "../../components/common/modal";
import DeleteModal from "../../components/common/deleteModal";
import SuccessModal from "../../components/common/successModal";
import RoleGuard from "../../components/guard/roleGuard";

// Services, Data & Hooks
import facilityService from "../../services/facility";
import assignFacilityService from "../../services/assignFacility";
import userService from "../../services/user";
import { users as initialUsers } from "../../data/user";
import { ROLES } from "../../config/roles";
import useAuth from "../../hooks/useAuth";
import useRole from "../../hooks/useRole";
import useError from "../../hooks/useError";
import { DEFAULT_FACILITY_FORM } from "../../utils/constants";
import { validateFacilityForm } from "../../validators/facility.validator";

function SelectFacility() {
  const navigate = useNavigate();
  const {
    user,
    project: activeProject,
    facility: currentSavedFacility,
    selectFacility,
    setProject,
    setFacility,
    logout,
    isAuthenticated,
  } = useAuth();
  const { isSuperAdmin, isAdmin, roleDetails } = useRole();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Facilities list state loaded from backend API
  const [facilityList, setFacilityList] = useState([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);
  const [fetchFacilitiesError, setFetchFacilitiesError] = useState("");

  // Submitting states for CRUD
  const [isCreatingFacility, setIsCreatingFacility] = useState(false);
  const [isUpdatingFacility, setIsUpdatingFacility] = useState(false);
  const [isDeletingFacility, setIsDeletingFacility] = useState(false);
  const [deleteFacilityError, setDeleteFacilityError] = useState("");

  // User list state for managing staff assignments
  const [userList, setUserList] = useState(initialUsers);

  // Modal state for adding a facility
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FACILITY_FORM);
  const {
    errors: formErrors,
    setErrors: setFormErrors,
    clearErrors: clearAddFacilityErrors,
    handleInputChange: handleAddFacilityChange,
    handleApiError: handleAddFacilityApiError,
  } = useError();
  const [addSuccessMsg, setAddSuccessMsg] = useState("");

  // Modal & form state for editing a facility
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [editFormData, setEditFormData] = useState(DEFAULT_FACILITY_FORM);
  const {
    errors: editFormErrors,
    setErrors: setEditFormErrors,
    clearErrors: clearEditFacilityErrors,
    handleInputChange: handleEditFacilityChange,
    handleApiError: handleEditFacilityApiError,
  } = useError();
  const [editSuccessMsg, setEditSuccessMsg] = useState("");

  // Modal state for deleting a facility
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState(null);

  // Modal & Form state for assigning users to a facility
  const [isAssignUserModalOpen, setIsAssignUserModalOpen] = useState(false);
  const [selectedFacilityIdForAssignment, setSelectedFacilityIdForAssignment] =
    useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);
  const [assignErrorMsg, setAssignErrorMsg] = useState("");

  // SuccessModal state for assignment confirmation
  const [isAssignSuccessModalOpen, setIsAssignSuccessModalOpen] =
    useState(false);
  const [assignSuccessData, setAssignSuccessData] = useState({
    facilityName: "",
    count: 0,
  });

  // If Super Admin has no project selected, redirect to select-project
  useEffect(() => {
    if (isSuperAdmin && !activeProject) {
      navigate("/select-project", { replace: true });
    }
  }, [isSuperAdmin, activeProject, navigate]);

  const isSuperAdminOrAdmin = isAdmin;

  // Fetch facilities from backend API:
  // - Super Admin: fetch all facilities for the selected active project
  // - Admin & staff: fetch assigned facilities directly from backend
  const fetchFacilities = useCallback(async () => {
    if (isSuperAdmin) {
      const targetProjectId = activeProject?.id;
      if (!targetProjectId) {
        setFacilityList([]);
        setIsLoadingFacilities(false);
        return;
      }

      try {
        setIsLoadingFacilities(true);
        setFetchFacilitiesError("");
        const facilities =
          await facilityService.getFacilitiesByProjectId(targetProjectId);
        setFacilityList(Array.isArray(facilities) ? facilities : []);
      } catch (err) {
        console.error("Failed to fetch facilities by project:", err);
        const errMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to load facilities from server.";
        setFetchFacilitiesError(
          typeof errMsg === "string" ? errMsg : "Failed to load facilities.",
        );
      } finally {
        setIsLoadingFacilities(false);
      }
      return;
    }

    // Admin & staff: fetch assigned facilities directly from backend
    try {
      setIsLoadingFacilities(true);
      setFetchFacilitiesError("");
      const facilities = await assignFacilityService.getMyAssignedFacilities();
      const list = Array.isArray(facilities)
        ? facilities.map((fac) => ({ ...fac, isAssignedToCurrentUser: true }))
        : [];
      setFacilityList(list);
    } catch (err) {
      console.error("Failed to fetch assigned facilities:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to load assigned facilities.";
      setFetchFacilitiesError(
        typeof errMsg === "string" ? errMsg : "Failed to load assigned facilities.",
      );
    } finally {
      setIsLoadingFacilities(false);
    }
  }, [isSuperAdmin, activeProject?.id]);

  // Fetch users list for account creation & facility assignment (SuperAdmin only)
  const fetchUsers = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const backendUsers = await userService.getAllUsers();
      if (Array.isArray(backendUsers)) {
        setUserList(
          backendUsers.map((u) => ({
            ...u,
            status: u.status ? "Active" : "Inactive",
          })),
        );
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      if (activeProject?.id) {
        fetchFacilities();
      }
    } else {
      // Admins and staff go directly to select-facility without choosing a project
      fetchFacilities();
    }

    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [
    activeProject?.id,
    isSuperAdmin,
    fetchFacilities,
    fetchUsers,
  ]);

  // Facilities assigned to the user (Super Admins: all for active project; Admins/staff: backend provides assigned only)
  const userAssignedFacilities = useMemo(() => {
    if (!user) return [];
    return facilityList;
  }, [user, facilityList]);

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

    if (!activeProject && facility.projectId) {
      setProject({
        id: facility.projectId,
        name: facility.projectName || "",
      });
    }

    setTimeout(() => {
      selectFacility(facility);
    }, 400);
  };

  const getFacilityIcon = () => {
    return <Building2 className="w-5 h-5 text-blue-600" />;
  };

  // Modal Handlers
  const handleOpenAddModal = () => {
    if (!isSuperAdmin) return;
    setFormData(DEFAULT_FACILITY_FORM);
    clearAddFacilityErrors();
    setAddSuccessMsg("");
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setFormData(DEFAULT_FACILITY_FORM);
    clearAddFacilityErrors();
  };

  const handleInputChange = (e) => {
    handleAddFacilityChange(e, setFormData);
  };

  const handleCreateFacilitySubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    const { isValid, errors } = validateFacilityForm(formData, {
      activeProjectId: activeProject?.id,
      checkProjectId: true,
    });
    if (!isValid) {
      setFormErrors(errors);
      return;
    }

    const targetProjectId = Number(activeProject?.id);
    if (!targetProjectId) {
      setFormErrors((prev) => ({
        ...prev,
        general: "An active project is required to create a facility.",
      }));
      return;
    }

    try {
      setIsCreatingFacility(true);
      const payload = {
        projectId: targetProjectId,
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        status: formData.status || "Active",
      };

      const newFacility = await facilityService.createFacility(payload);

      setFacilityList((prev) => [newFacility, ...prev]);

      setAddSuccessMsg(`Facility "${newFacility.name}" created successfully!`);
      setTimeout(() => {
        handleCloseAddModal();
        setAddSuccessMsg("");
      }, 700);
    } catch (err) {
      handleAddFacilityApiError(err, "Failed to create facility. Please try again.");
    } finally {
      setIsCreatingFacility(false);
    }
  };

  // --- EDIT FACILITY HANDLERS ---
  const handleOpenEditModal = (fac) => {
    if (!isSuperAdmin) return;
    setEditingFacility(fac);
    setEditFormData({
      name: fac.name || "",
      facilityCode: fac.facilityCode || "",
      contactPerson: fac.contactPerson || "",
      email: fac.email || "",
      phone: fac.phone || "",
      address: fac.address || "",
      status: fac.status || "Active",
      projectId: fac.projectId
        ? String(fac.projectId)
        : activeProject
          ? String(activeProject.id)
          : "",
    });
    clearEditFacilityErrors();
    setEditSuccessMsg("");
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingFacility(null);
    clearEditFacilityErrors();
    setEditSuccessMsg("");
  };

  const handleEditInputChange = (e) => {
    handleEditFacilityChange(e, setEditFormData);
  };

  const handleUpdateFacilitySubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!editingFacility) return;

    const { errors } = validateFacilityForm(editFormData);
    const targetProjectId = Number(
      editFormData.projectId || editingFacility.projectId || activeProject?.id,
    );
    const finalErrors = { ...errors };
    if (!targetProjectId) {
      finalErrors.projectId = "Project selection is required.";
    }
    if (Object.keys(finalErrors).length > 0) {
      setEditFormErrors(finalErrors);
      return;
    }

    try {
      setIsUpdatingFacility(true);
      const payload = {
        projectId: targetProjectId,
        name: editFormData.name.trim(),
        contactPerson: editFormData.contactPerson.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        address: editFormData.address.trim(),
        status: editFormData.status || "Active",
      };

      const updatedFacility = await facilityService.updateFacility(
        editingFacility.id,
        payload,
      );

      setFacilityList((prev) =>
        prev.map((f) =>
          f.id === editingFacility.id ? { ...f, ...updatedFacility } : f,
        ),
      );

      // If this facility is currently active in session, update session
      if (currentSavedFacility?.id === editingFacility.id) {
        setFacility({ ...currentSavedFacility, ...updatedFacility });
      }

      setEditSuccessMsg(
        `Facility "${updatedFacility.name}" updated successfully!`,
      );
      setTimeout(() => {
        handleCloseEditModal();
        setEditSuccessMsg("");
      }, 700);
    } catch (err) {
      handleEditFacilityApiError(err, "Failed to update facility. Please try again.");
    } finally {
      setIsUpdatingFacility(false);
    }
  };

  // --- DELETE FACILITY HANDLERS ---
  const handleOpenDeleteModal = (fac) => {
    if (!isSuperAdmin) return;
    setFacilityToDelete(fac);
    setDeleteFacilityError("");
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setFacilityToDelete(null);
    setDeleteFacilityError("");
  };

  const handleConfirmDeleteFacility = async () => {
    if (!isSuperAdmin || !facilityToDelete) return;
    const targetId = facilityToDelete.id;

    try {
      setIsDeletingFacility(true);
      setDeleteFacilityError("");
      await facilityService.deleteFacility(targetId);

      // Remove from facility list
      setFacilityList((prev) => prev.filter((f) => f.id !== targetId));

      // Clean up if it was the active facility in session
      if (currentSavedFacility?.id === targetId) {
        setFacility(null);
      }
      if (selectedFacilityId === targetId) {
        setSelectedFacilityId(null);
      }

      handleCloseDeleteModal();
    } catch (err) {
      console.error("Failed to delete facility:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to delete facility. Please try again.";
      setDeleteFacilityError(
        typeof errMsg === "string" ? errMsg : "Failed to delete facility.",
      );
    } finally {
      setIsDeletingFacility(false);
    }
  };

  // Helper: All assignable user accounts (excluding Super Admin)
  const assignableUsers = useMemo(() => {
    return userList.filter(
      (u) => u.role !== ROLES.SUPER_ADMIN && u.role !== "Super Admin",
    );
  }, [userList]);

  // Helper: Get users assigned to a specific facility
  const getAssignedUsers = (facilityId) => {
    const fac = facilityList.find((f) => f.id === Number(facilityId));
    if (!fac || !Array.isArray(fac.assignedUserIds)) return [];
    return userList.filter(
      (u) =>
        u.role !== ROLES.SUPER_ADMIN &&
        u.role !== "Super Admin" &&
        fac.assignedUserIds.includes(u.id),
    );
  };

  // --- Assign Users Modal Handlers ---
  const handleOpenAssignUsersModal = async (facility) => {
    if (!isSuperAdminOrAdmin) return;
    const targetFacility =
      facility ||
      userAssignedFacilities[0] ||
      filteredFacilities[0] ||
      facilityList[0];
    if (!targetFacility) return;

    const fid = targetFacility.id;
    setSelectedFacilityIdForAssignment(fid);
    setUserSearchTerm("");
    setAssignErrorMsg("");
    setIsAssignUserModalOpen(true);

    // Immediate selection from cached assignedUserIds if available
    if (Array.isArray(targetFacility.assignedUserIds)) {
      setSelectedUserIds(targetFacility.assignedUserIds);
    }

    // Fetch on-demand assigned users specifically for this facility
    try {
      const assignedUsers = await assignFacilityService.getUsersByFacilityId(fid);
      const userIds = Array.isArray(assignedUsers)
        ? assignedUsers.map((u) => u.id)
        : [];
      setSelectedUserIds(userIds);
      setFacilityList((prev) =>
        prev.map((f) => (f.id === fid ? { ...f, assignedUserIds: userIds } : f)),
      );
    } catch (err) {
      console.error("Failed to load facility assigned users:", err);
    }
  };

  const handleFacilityChangeInModal = async (facilityId) => {
    const fid = Number(facilityId);
    setSelectedFacilityIdForAssignment(fid);
    setAssignErrorMsg("");

    const targetFac = facilityList.find((f) => f.id === fid);
    if (targetFac && Array.isArray(targetFac.assignedUserIds)) {
      setSelectedUserIds(targetFac.assignedUserIds);
    }

    try {
      const assignedUsers = await assignFacilityService.getUsersByFacilityId(fid);
      const userIds = Array.isArray(assignedUsers)
        ? assignedUsers.map((u) => u.id)
        : [];
      setSelectedUserIds(userIds);
      setFacilityList((prev) =>
        prev.map((f) => (f.id === fid ? { ...f, assignedUserIds: userIds } : f)),
      );
    } catch (err) {
      console.error("Failed to load facility assigned users:", err);
    }
  };

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSaveAssignments = async (e) => {
    e.preventDefault();
    if (!isSuperAdminOrAdmin || !selectedFacilityIdForAssignment) return;

    const targetFid = Number(selectedFacilityIdForAssignment);
    const targetFac = facilityList.find((f) => f.id === targetFid);

    // Current assigned user IDs for this facility
    const currentAssigned = getAssignedUsers(targetFid).map((u) => u.id);

    // Newly selected users to assign
    const usersToAssign = selectedUserIds.filter(
      (id) => !currentAssigned.includes(id),
    );
    // Users to unassign
    const usersToUnassign = currentAssigned.filter(
      (id) => !selectedUserIds.includes(id),
    );

    try {
      setIsSavingAssignments(true);
      setAssignErrorMsg("");

      // Call backend assign/unassign endpoints
      if (usersToAssign.length > 0) {
        await assignFacilityService.assignUsersToFacility(targetFid, {
          userIds: usersToAssign,
        });
      }
      if (usersToUnassign.length > 0) {
        await assignFacilityService.unassignUsersFromFacility(targetFid, {
          userIds: usersToUnassign,
        });
      }

      // Update facilityList with new assignedUserIds
      setFacilityList((prevFacilities) =>
        prevFacilities.map((f) =>
          f.id === targetFid
            ? {
                ...f,
                assignedUserIds: selectedUserIds,
              }
            : f,
        ),
      );

      // Update userList assignedFacilities
      setUserList((prevUsers) =>
        prevUsers.map((u) => {
          if (u.role === ROLES.SUPER_ADMIN || u.role === "Super Admin")
            return u;
          const shouldBeAssigned = selectedUserIds.includes(u.id);
          const currentFacilities = Array.isArray(u.assignedFacilities)
            ? u.assignedFacilities
            : [];

          if (shouldBeAssigned && !currentFacilities.includes(targetFid)) {
            return {
              ...u,
              assignedFacilities: [...currentFacilities, targetFid],
            };
          } else if (
            !shouldBeAssigned &&
            currentFacilities.includes(targetFid)
          ) {
            return {
              ...u,
              assignedFacilities: currentFacilities.filter(
                (fid) => fid !== targetFid,
              ),
            };
          }
          return u;
        }),
      );

      // Close assign modal and open SuccessModal
      setIsAssignUserModalOpen(false);
      setAssignSuccessData({
        facilityName: targetFac?.name || "the facility",
        count: selectedUserIds.length,
      });
      setIsAssignSuccessModalOpen(true);
    } catch (err) {
      console.error("Failed to save facility assignments:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to update assignments. Please try again.";
      setAssignErrorMsg(
        typeof errMsg === "string" ? errMsg : "Failed to update assignments.",
      );
    } finally {
      setIsSavingAssignments(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Header Navigation */}
      <PortalHeader
        user={user}
        roleInfo={roleDetails}
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
          {/* Super Admin Mother Project indicator and switcher */}
          {isSuperAdmin && activeProject && (
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
          <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]}>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() =>
                  handleOpenAssignUsersModal(
                    filteredFacilities[0] || facilityList[0],
                  )
                }
                className="btn-secondary py-2 px-3 text-xs shadow-sm flex items-center gap-1.5 shrink-0 hover:border-blue-300 hover:text-blue-700 cursor-pointer"
                title="Assign Users to Facility"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Assign Users</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn-primary py-2 px-3.5 text-xs shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Create New Facility"
              >
                <Plus className="w-4 h-4" />
                <span>Create Facility</span>
              </button>
            </div>
          </RoleGuard>
        </PortalToolbar>

        {/* Facilities Grid */}
        {isLoadingFacilities ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium">
              Loading facilities from server...
            </p>
          </div>
        ) : fetchFacilitiesError ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <div>
              <p className="font-semibold text-red-900">
                Unable to load facilities
              </p>
              <p className="text-xs text-red-700 mt-1">
                {fetchFacilitiesError}
              </p>
            </div>
            <button
              type="button"
              onClick={fetchFacilities}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg shadow-2xs hover:bg-blue-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredFacilities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-slide-up-2">
            {filteredFacilities.map((facility) => {
              const isActive = facility.status === "Active";
              const isSelected = selectedFacilityId === facility.id;
              const isCurrentlyActiveInSession =
                currentSavedFacility?.id === facility.id;

              return (
                <PortalEntityCard
                  key={facility.id}
                  icon={getFacilityIcon()}
                  code={facility.facilityCode}
                  badgeText="Healthcare Branch"
                  title={facility.name}
                  themeColor="blue"
                  status={facility.status}
                  showStatusBadge={true}
                  isActiveSession={isCurrentlyActiveInSession}
                  sessionBadgeLabel="Current Session"
                  isSelected={isSelected}
                  isSubmitting={isSubmitting}
                  onSelect={() => handleSelect(facility)}
                  onEdit={() => handleOpenEditModal(facility)}
                  onDelete={() => handleOpenDeleteModal(facility)}
                  editRoles={[ROLES.SUPER_ADMIN]}
                  editTitle="Edit Facility"
                  deleteTitle="Delete Facility"
                  assignedLabel="Assigned Users"
                  assignedItems={getAssignedUsers(facility.id)}
                  assignedIconType="user"
                  assignRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}
                  onAssign={() => handleOpenAssignUsersModal(facility)}
                  emptyAssignedText="No users assigned yet"
                  footerVariant="full"
                  selectButtonText="Select Facility"
                  enteringText="Entering Facility..."
                >
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
                </PortalEntityCard>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <EmptyState
            icon={Building2}
            title={
              projectHasNoFacilities && isSuperAdmin && activeProject
                ? "No Facilities in Project"
                : "No Facilities Found"
            }
            description={
              searchQuery
                ? "No assigned facilities match your search query."
                : isSuperAdmin && activeProject && projectHasNoFacilities
                  ? `The project "${activeProject.name}" currently contains no facilities. Create a facility to get started.`
                  : "No assigned facilities are currently linked to your user account. Please contact an administrator."
            }
            actionText={
              searchQuery
                ? "Clear Search"
                : isSuperAdmin
                  ? "Create Facility"
                  : null
            }
            onAction={
              searchQuery
                ? () => setSearchQuery("")
                : isSuperAdmin
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
        title="Create New Facility"
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

          {formErrors.general && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{formErrors.general}</span>
            </div>
          )}

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
                disabled={isCreatingFacility}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.name}
                </p>
              )}
            </div>

            {/* Facility Code (Auto-generated by server) */}
            <div>
              <label
                htmlFor="fac-code"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Facility Code
              </label>
              <input
                id="fac-code"
                type="text"
                disabled
                value="Auto-generated (e.g. FAC-001)"
                className="input text-xs font-mono uppercase bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Operational Status */}
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
                disabled={isCreatingFacility}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
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
                  disabled={isCreatingFacility}
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
                  disabled={isCreatingFacility}
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
            <div className="sm:col-span-2">
              <label
                htmlFor="fac-phone"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Phone / Hotline <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="fac-phone"
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+63 2 8920 5000"
                  className={`input text-xs pl-8 ${
                    formErrors.phone
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                  disabled={isCreatingFacility}
                />
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.phone && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.phone}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label
                htmlFor="fac-address"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Physical Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="fac-address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. E. Rodriguez Sr. Ave, Quezon City, Metro Manila"
                  className={`input text-xs pl-8 ${
                    formErrors.address
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                  disabled={isCreatingFacility}
                />
                <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {formErrors.address && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.address}
                </p>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={isCreatingFacility}
              onClick={handleCloseAddModal}
              className="btn-secondary text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingFacility}
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isCreatingFacility ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>
                {isCreatingFacility ? "Creating..." : "Create Facility"}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin & Admin Edit Facility Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isUpdatingFacility && handleCloseEditModal()}
        title={`Edit Facility - ${editingFacility?.name || ""}`}
        size="md"
      >
        <form onSubmit={handleUpdateFacilitySubmit} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900">
            <Pencil className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">
                Modify Facility Information
              </p>
              <p className="mt-0.5 text-amber-800">
                Update operational branch details, contact points, or operating
                status.
              </p>
            </div>
          </div>

          {editFormErrors.general && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{editFormErrors.general}</span>
            </div>
          )}

          {editSuccessMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{editSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Facility Name */}
            <div className="sm:col-span-2">
              <label
                htmlFor="edit-fac-name"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Facility Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-fac-name"
                type="text"
                name="name"
                value={editFormData.name}
                onChange={handleEditInputChange}
                className={`input text-xs ${editFormErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""}`}
                disabled={isUpdatingFacility}
              />
              {editFormErrors.name && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {editFormErrors.name}
                </p>
              )}
            </div>

            {/* Facility Code */}
            <div>
              <label
                htmlFor="edit-fac-code"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Facility Code
              </label>
              <input
                id="edit-fac-code"
                type="text"
                name="facilityCode"
                value={editFormData.facilityCode}
                readOnly
                className="input text-xs font-mono uppercase bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Operational Status */}
            <div>
              <label
                htmlFor="edit-fac-status"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Operational Status
              </label>
              <select
                id="edit-fac-status"
                name="status"
                value={editFormData.status}
                onChange={handleEditInputChange}
                className="input text-xs"
                disabled={isUpdatingFacility}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Contact Person */}
            <div>
              <label
                htmlFor="edit-fac-contact"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Contact Person <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-fac-contact"
                type="text"
                name="contactPerson"
                value={editFormData.contactPerson}
                onChange={handleEditInputChange}
                className={`input text-xs ${editFormErrors.contactPerson ? "border-red-500" : ""}`}
                disabled={isUpdatingFacility}
              />
              {editFormErrors.contactPerson && (
                <p className="text-[11px] text-red-500 mt-1">
                  {editFormErrors.contactPerson}
                </p>
              )}
            </div>

            {/* Contact Email */}
            <div>
              <label
                htmlFor="edit-fac-email"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Contact Email <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-fac-email"
                type="email"
                name="email"
                value={editFormData.email}
                onChange={handleEditInputChange}
                className={`input text-xs ${editFormErrors.email ? "border-red-500" : ""}`}
                disabled={isUpdatingFacility}
              />
              {editFormErrors.email && (
                <p className="text-[11px] text-red-500 mt-1">
                  {editFormErrors.email}
                </p>
              )}
            </div>

            {/* Contact Phone */}
            <div className="sm:col-span-2">
              <label
                htmlFor="edit-fac-phone"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-fac-phone"
                type="text"
                name="phone"
                value={editFormData.phone}
                onChange={handleEditInputChange}
                className={`input text-xs ${editFormErrors.phone ? "border-red-500" : ""}`}
                disabled={isUpdatingFacility}
              />
              {editFormErrors.phone && (
                <p className="text-[11px] text-red-500 mt-1">
                  {editFormErrors.phone}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label
                htmlFor="edit-fac-address"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Physical Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="edit-fac-address"
                  type="text"
                  name="address"
                  value={editFormData.address}
                  onChange={handleEditInputChange}
                  className={`input text-xs pl-8 ${editFormErrors.address ? "border-red-500" : ""}`}
                  disabled={isUpdatingFacility}
                />
                <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {editFormErrors.address && (
                <p className="text-[11px] text-red-500 mt-1">
                  {editFormErrors.address}
                </p>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={isUpdatingFacility}
              onClick={handleCloseEditModal}
              className="btn-secondary text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingFacility}
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isUpdatingFacility ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{isUpdatingFacility ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin & Admin Delete Facility Confirmation Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDeleteFacility}
        title="Delete Facility"
        itemName={facilityToDelete?.name}
        itemCode={facilityToDelete?.facilityCode}
        itemType="facility"
        message={
          facilityToDelete && (
            <>
              This will permanently delete{" "}
              <strong className="font-bold text-red-900">
                {facilityToDelete.name}
              </strong>{" "}
              (
              <span className="font-mono font-semibold">
                {facilityToDelete.facilityCode}
              </span>
              ) from this network. If it is currently selected in your active
              session, it will be unselected. This action cannot be undone.
            </>
          )
        }
        isDeleting={isDeletingFacility}
        error={deleteFacilityError}
        confirmText="Delete Facility"
      />

      {/* Super Admin & Admin Assign Users Modal */}
      <Modal
        isOpen={isAssignUserModalOpen}
        onClose={() => setIsAssignUserModalOpen(false)}
        title="Assign Users to Facility"
        size="md"
      >
        <form onSubmit={handleSaveAssignments} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800">
            <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">
                Facility Staff Delegation
              </p>
              <p className="mt-0.5 text-blue-700">
                Grant or revoke user access to healthcare facilities and
                hospital branches. Assigned users will be able to select and
                operate within this facility.
              </p>
            </div>
          </div>

          {assignErrorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{assignErrorMsg}</span>
            </div>
          )}

          {/* Select Target Facility Dropdown */}
          <div>
            <label
              htmlFor="targetFacility"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
            >
              Target Healthcare Facility
            </label>
            <select
              id="targetFacility"
              value={selectedFacilityIdForAssignment || ""}
              onChange={(e) => handleFacilityChangeInModal(e.target.value)}
              className="input text-xs font-medium"
            >
              {facilityList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({getAssignedUsers(f.id).length} Users) -{" "}
                  {f.facilityCode}
                </option>
              ))}
            </select>
          </div>

          {/* Users List */}
          <SearchableChecklist
            label="Select Users"
            selectedCount={selectedUserIds.length}
            totalCount={assignableUsers.length}
            selectedIds={selectedUserIds}
            onToggle={handleToggleUser}
            onSelectAll={() =>
              setSelectedUserIds(assignableUsers.map((u) => u.id))
            }
            onDeselectAll={() => setSelectedUserIds([])}
            searchTerm={userSearchTerm}
            onSearchChange={setUserSearchTerm}
            placeholder="Search users by name, username, or email..."
            items={assignableUsers.filter((u) => {
              if (!userSearchTerm.trim()) return true;
              const term = userSearchTerm.toLowerCase();
              return (
                u.name.toLowerCase().includes(term) ||
                u.username.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term) ||
                (u.role && u.role.toLowerCase().includes(term))
              );
            })}
            maxHeight="max-h-56"
            helperText="Checked staff will have access to select and manage inventory in this facility upon logging in."
            renderItem={(u, isChecked, toggleFn) => {
              const facCount = Array.isArray(u.assignedFacilities)
                ? u.assignedFacilities.length
                : 0;

              return (
                <label
                  key={u.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? "bg-blue-50/90 text-blue-950 border border-blue-200/90 shadow-2xs"
                      : "hover:bg-white text-gray-700 bg-white/70 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={toggleFn}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div className="truncate text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-gray-900 truncate">
                          {u.name}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-medium shrink-0">
                          {u.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">
                        @{u.username} &bull; {u.email}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right ml-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                      <Building2 className="w-2.5 h-2.5" />
                      {facCount} {facCount === 1 ? "facility" : "facilities"}
                    </span>
                  </div>
                </label>
              );
            }}
          />

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={isSavingAssignments}
              onClick={() => setIsAssignUserModalOpen(false)}
              className="btn-secondary text-xs cursor-pointer disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingAssignments}
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSavingAssignments ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Assignments</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Staff Assignments Success Modal */}
      <SuccessModal
        isOpen={isAssignSuccessModalOpen}
        onClose={() => setIsAssignSuccessModalOpen(false)}
        title="Staff Assignments Updated!"
        message={`User delegation for ${assignSuccessData.facilityName} has been saved successfully.`}
        details={`${assignSuccessData.count} staff member(s) now have authorized access to operate in ${assignSuccessData.facilityName}.`}
        confirmText="Done"
      />
    </div>
  );
}

export default SelectFacility;
