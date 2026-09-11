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
  Pencil,
  Trash2,
  Check,
  UserPlus,
  Users,
  Lock,
  Shield,
} from "lucide-react";

import PortalHeader from "./components/portalHeader";
import PortalFooter from "./components/portalFooter";
import PortalHeroBanner from "./components/portalHeroBanner";
import PortalToolbar from "./components/portalToolbar";
import EmptyState from "./components/emptyState";
import SearchableChecklist from "./components/searchableChecklist";
import PortalEntityCard from "./components/portalEntityCard";
import Modal from "../../components/common/modal";
import RoleGuard from "../../components/guard/roleGuard";

// Data & Hooks
import { facilities as allFacilities } from "../../data/facility";
import { users as initialUsers } from "../../data/user";
import { ROLE_DETAILS, ROLES } from "../../config/roles";
import useAuth from "../../hooks/useAuth";
import useRole from "../../hooks/useRole";
import {
  FACILITY_TYPE_OPTIONS,
  DEFAULT_FACILITY_FORM,
  DEFAULT_USER_FORM,
} from "../../utils/constants";

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

  // Facilities list state initialized with mock data
  const [facilityList, setFacilityList] = useState(allFacilities);

  // User list state for managing staff assignments
  const [userList, setUserList] = useState(initialUsers);

  // Modal state for adding a facility
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FACILITY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [addSuccessMsg, setAddSuccessMsg] = useState("");

  // Modal & form state for editing a facility
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [editFormData, setEditFormData] = useState(DEFAULT_FACILITY_FORM);
  const [editFormErrors, setEditFormErrors] = useState({});
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
  const [assignSuccessMsg, setAssignSuccessMsg] = useState("");

  // Modal & Form state for creating a new user
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState(DEFAULT_USER_FORM);
  const [selectedFacilitiesForNewUser, setSelectedFacilitiesForNewUser] =
    useState([]);
  const [userFormErrors, setUserFormErrors] = useState({});
  const [createUserSuccessMsg, setCreateUserSuccessMsg] = useState("");

  // If not logged in, redirect back to login
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const isSuperAdminOrAdmin = isAdmin;

  // Filter facilities assigned to the user (and scoped by active project)
  const userAssignedFacilities = useMemo(() => {
    if (!user) return [];

    // Super Admins: access to all facilities, scoped by selected project if one is active
    if (isSuperAdmin) {
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
    if (isAdmin) {
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

    setAddSuccessMsg(`Facility "${newFacility.name}" created successfully!`);
    setTimeout(() => {
      handleCloseAddModal();
      setAddSuccessMsg("");
    }, 700);
  };

  // --- EDIT FACILITY HANDLERS ---
  const handleOpenEditModal = (fac) => {
    if (!isSuperAdminOrAdmin) return;
    setEditingFacility(fac);
    setEditFormData({
      name: fac.name || "",
      facilityCode: fac.facilityCode || "",
      type: fac.type || "Main Hospital",
      contactPerson: fac.contactPerson || "",
      email: fac.email || "",
      phone: fac.phone || "",
      address: fac.address || "",
      status: fac.status || "Active",
    });
    setEditFormErrors({});
    setEditSuccessMsg("");
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingFacility(null);
    setEditFormErrors({});
    setEditSuccessMsg("");
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    if (editFormErrors[name]) {
      setEditFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateEditFacilityForm = () => {
    const errors = {};
    if (!editFormData.name?.trim()) {
      errors.name = "Facility name is required.";
    } else if (editFormData.name.trim().length < 3) {
      errors.name = "Facility name must be at least 3 characters.";
    }

    if (!editFormData.contactPerson?.trim()) {
      errors.contactPerson = "Contact person is required.";
    }

    if (!editFormData.email?.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!editFormData.address?.trim()) {
      errors.address = "Physical address is required.";
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateFacilitySubmit = (e) => {
    e.preventDefault();
    if (!isSuperAdminOrAdmin) return;
    if (!validateEditFacilityForm()) return;

    const updatedFacility = {
      ...editingFacility,
      name: editFormData.name.trim(),
      facilityCode: editFormData.facilityCode.trim().toUpperCase(),
      type: editFormData.type,
      contactPerson: editFormData.contactPerson.trim(),
      email: editFormData.email.trim(),
      phone: editFormData.phone.trim(),
      address: editFormData.address.trim(),
      status: editFormData.status,
    };

    setFacilityList((prev) =>
      prev.map((f) => (f.id === editingFacility.id ? updatedFacility : f)),
    );

    // If this facility is currently active in session, update session
    if (currentSavedFacility?.id === editingFacility.id) {
      setFacility(updatedFacility);
    }

    setEditSuccessMsg(
      `Facility "${updatedFacility.name}" updated successfully!`,
    );
    setTimeout(() => {
      handleCloseEditModal();
    }, 700);
  };

  // --- DELETE FACILITY HANDLERS ---
  const handleOpenDeleteModal = (fac) => {
    if (!isSuperAdminOrAdmin) return;
    setFacilityToDelete(fac);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setFacilityToDelete(null);
  };

  const handleConfirmDeleteFacility = () => {
    if (!isSuperAdminOrAdmin || !facilityToDelete) return;
    const targetId = facilityToDelete.id;

    // Remove from facility list
    setFacilityList((prev) => prev.filter((f) => f.id !== targetId));

    // Update active project facilityIds if linked
    if (activeProject && Array.isArray(activeProject.facilityIds)) {
      const updatedProject = {
        ...activeProject,
        facilityIds: activeProject.facilityIds.filter((id) => id !== targetId),
      };
      setProject(updatedProject);
    }

    // Clean up if it was the active facility in session
    if (currentSavedFacility?.id === targetId) {
      setFacility(null);
    }
    if (selectedFacilityId === targetId) {
      setSelectedFacilityId(null);
    }

    handleCloseDeleteModal();
  };

  // Helper: All assignable user accounts (excluding Super Admin)
  const assignableUsers = useMemo(() => {
    return userList.filter(
      (u) => u.role !== ROLES.SUPER_ADMIN && u.role !== "Super Admin",
    );
  }, [userList]);

  // Helper: Roles allowed for user creation based on current logged in user
  const availableRolesForCreation = useMemo(() => {
    if (isSuperAdmin) {
      return [ROLES.ADMIN, ROLES.PHARMACIST, ROLES.PROCUREMENT];
    }
    return [ROLES.PHARMACIST, ROLES.PROCUREMENT];
  }, [isSuperAdmin]);

  // Helper: Get users assigned to a specific facility
  const getAssignedUsers = (facilityId) => {
    const fac = facilityList.find((f) => f.id === Number(facilityId));
    return userList.filter((u) => {
      if (u.role === ROLES.SUPER_ADMIN || u.role === "Super Admin")
        return false;
      const inUserFacilities =
        Array.isArray(u.assignedFacilities) &&
        u.assignedFacilities.includes(Number(facilityId));
      const inFacilityUsers =
        fac &&
        Array.isArray(fac.assignedUserIds) &&
        fac.assignedUserIds.includes(u.id);
      return inUserFacilities || inFacilityUsers;
    });
  };

  // --- Assign Users Modal Handlers ---
  const handleOpenAssignUsersModal = (facility) => {
    if (!isSuperAdminOrAdmin) return;
    const targetFacility = facility || filteredFacilities[0] || facilityList[0];
    if (!targetFacility) return;

    setSelectedFacilityIdForAssignment(targetFacility.id);

    const currentlyAssignedUserIds = getAssignedUsers(targetFacility.id).map(
      (u) => u.id,
    );
    setSelectedUserIds(currentlyAssignedUserIds);
    setUserSearchTerm("");
    setAssignSuccessMsg("");
    setIsAssignUserModalOpen(true);
  };

  const handleFacilityChangeInModal = (facilityId) => {
    const fid = Number(facilityId);
    setSelectedFacilityIdForAssignment(fid);

    const currentlyAssignedUserIds = getAssignedUsers(fid).map((u) => u.id);
    setSelectedUserIds(currentlyAssignedUserIds);
    setAssignSuccessMsg("");
  };

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSaveAssignments = (e) => {
    e.preventDefault();
    if (!isSuperAdminOrAdmin || !selectedFacilityIdForAssignment) return;

    const targetFid = Number(selectedFacilityIdForAssignment);

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
        if (u.role === ROLES.SUPER_ADMIN || u.role === "Super Admin") return u;
        const shouldBeAssigned = selectedUserIds.includes(u.id);
        const currentFacilities = Array.isArray(u.assignedFacilities)
          ? u.assignedFacilities
          : [];

        if (shouldBeAssigned && !currentFacilities.includes(targetFid)) {
          return {
            ...u,
            assignedFacilities: [...currentFacilities, targetFid],
          };
        } else if (!shouldBeAssigned && currentFacilities.includes(targetFid)) {
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

    const targetFac = facilityList.find((f) => f.id === targetFid);
    setAssignSuccessMsg(
      `Updated user assignments for ${targetFac?.name || "facility"}!`,
    );

    setTimeout(() => {
      setIsAssignUserModalOpen(false);
      setAssignSuccessMsg("");
    }, 700);
  };

  // --- Create User Form Handlers ---
  const handleOpenCreateUserModal = () => {
    if (!isSuperAdminOrAdmin) return;
    setUserFormData(DEFAULT_USER_FORM);
    const initialFacs = currentSavedFacility
      ? [currentSavedFacility.id]
      : filteredFacilities[0]
        ? [filteredFacilities[0].id]
        : [];
    setSelectedFacilitiesForNewUser(initialFacs);
    setUserFormErrors({});
    setCreateUserSuccessMsg("");
    setIsCreateUserModalOpen(true);
  };

  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setUserFormData((prev) => ({ ...prev, [name]: value }));
    if (userFormErrors[name]) {
      setUserFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleToggleFacilityForNewUser = (facilityId) => {
    const fid = Number(facilityId);
    setSelectedFacilitiesForNewUser((prev) =>
      prev.includes(fid) ? prev.filter((id) => id !== fid) : [...prev, fid],
    );
  };

  const validateUserForm = () => {
    const errors = {};
    if (!userFormData.name?.trim()) {
      errors.name = "Full name is required.";
    }

    if (!userFormData.username?.trim()) {
      errors.username = "Username is required.";
    } else {
      const exists = userList.some(
        (u) =>
          u.username?.toLowerCase() ===
          userFormData.username.trim().toLowerCase(),
      );
      if (exists) {
        errors.username = "Username is already taken.";
      }
    }

    if (!userFormData.email?.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userFormData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    } else {
      const exists = userList.some(
        (u) =>
          u.email?.toLowerCase() === userFormData.email.trim().toLowerCase(),
      );
      if (exists) {
        errors.email = "Email address is already registered.";
      }
    }

    if (!userFormData.password || userFormData.password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUserSubmit = (e) => {
    e.preventDefault();
    if (!isSuperAdminOrAdmin) return;
    if (!validateUserForm()) return;

    const newUserId = Date.now();
    const newUser = {
      id: newUserId,
      name: userFormData.name.trim(),
      username: userFormData.username.trim(),
      email: userFormData.email.trim(),
      phone: userFormData.phone.trim() || "+63 900 000 0000",
      role: userFormData.role,
      status: userFormData.status || "Active",
      password: userFormData.password || "exaktpassword",
      assignedFacilities: selectedFacilitiesForNewUser,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setUserList((prev) => [newUser, ...prev]);

    if (selectedFacilitiesForNewUser.length > 0) {
      setFacilityList((prevFacilities) =>
        prevFacilities.map((fac) => {
          if (selectedFacilitiesForNewUser.includes(fac.id)) {
            const currentUsers = Array.isArray(fac.assignedUserIds)
              ? fac.assignedUserIds
              : [];
            return {
              ...fac,
              assignedUserIds: [...currentUsers, newUserId],
            };
          }
          return fac;
        }),
      );
    }

    setCreateUserSuccessMsg(
      `User account for ${newUser.name} created successfully!`,
    );

    setTimeout(() => {
      setIsCreateUserModalOpen(false);
      setCreateUserSuccessMsg("");
      setUserFormData(DEFAULT_USER_FORM);
      setSelectedFacilitiesForNewUser([]);
    }, 700);
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
          <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleOpenCreateUserModal}
                className="btn-secondary py-2 px-3 text-xs shadow-sm flex items-center gap-1.5 shrink-0 hover:border-blue-300 hover:text-blue-700 cursor-pointer"
                title="Create New User Account"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>Create User</span>
              </button>
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
        {filteredFacilities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-slide-up-2">
            {filteredFacilities.map((facility) => {
              const isActive = facility.status === "Active";
              const isSelected = selectedFacilityId === facility.id;
              const isCurrentlyActiveInSession =
                currentSavedFacility?.id === facility.id;

              return (
                <PortalEntityCard
                  key={facility.id}
                  icon={getFacilityIcon(facility.type)}
                  code={facility.facilityCode}
                  badgeText={facility.type}
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
                  editRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}
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
              projectHasNoFacilities && isSuperAdminOrAdmin
                ? "No Facilities in Project"
                : "No Facilities Found"
            }
            description={
              searchQuery
                ? "No assigned facilities match your search query."
                : projectHasNoFacilities && activeProject
                  ? `The project "${activeProject.name}" currently contains no facilities. Create a facility to get started.`
                  : "No assigned facilities are currently linked to your user account."
            }
            actionText={
              searchQuery
                ? "Clear Search"
                : isSuperAdminOrAdmin
                  ? "Create Facility"
                  : null
            }
            onAction={
              searchQuery
                ? () => setSearchQuery("")
                : isSuperAdminOrAdmin
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
              <span>Create Facility</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin & Admin Edit Facility Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
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
                onChange={handleEditInputChange}
                className="input text-xs font-mono uppercase bg-gray-50/80"
              />
            </div>

            {/* Facility Type */}
            <div>
              <label
                htmlFor="edit-fac-type"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Facility Type <span className="text-red-500">*</span>
              </label>
              <select
                id="edit-fac-type"
                name="type"
                value={editFormData.type}
                onChange={handleEditInputChange}
                className="input text-xs font-medium"
              >
                {FACILITY_TYPE_OPTIONS.map((typeOpt) => (
                  <option key={typeOpt} value={typeOpt}>
                    {typeOpt}
                  </option>
                ))}
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
              />
              {editFormErrors.email && (
                <p className="text-[11px] text-red-500 mt-1">
                  {editFormErrors.email}
                </p>
              )}
            </div>

            {/* Contact Phone */}
            <div>
              <label
                htmlFor="edit-fac-phone"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Phone Number
              </label>
              <input
                id="edit-fac-phone"
                type="text"
                name="phone"
                value={editFormData.phone}
                onChange={handleEditInputChange}
                className="input text-xs"
              />
            </div>

            {/* Status */}
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
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
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
              onClick={handleCloseEditModal}
              className="btn-secondary text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin & Admin Delete Facility Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Facility"
        size="sm"
      >
        {facilityToDelete && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-red-900 text-sm">
                  Are you sure you want to delete this facility?
                </p>
                <p className="text-red-700">
                  This will permanently delete{" "}
                  <strong className="font-bold text-red-900">
                    {facilityToDelete.name}
                  </strong>{" "}
                  (
                  <span className="font-mono font-semibold">
                    {facilityToDelete.facilityCode}
                  </span>
                  ) from this network. If it is currently selected in your
                  active session, it will be unselected. This action cannot be
                  undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                className="btn-secondary text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFacility}
                className="btn-danger text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Facility</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

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

          {assignSuccessMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{assignSuccessMsg}</span>
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
              onClick={() => setIsAssignUserModalOpen(false)}
              className="btn-secondary text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Assignments</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin & Admin Create User Modal */}
      <Modal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        title="Create User Account"
        size="md"
      >
        <form onSubmit={handleCreateUserSubmit} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800">
            <UserPlus className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">
                Facility Staff Provisioning
              </p>
              <p className="mt-0.5 text-blue-700">
                Create a new user account and optionally assign them to
                healthcare facilities immediately.
              </p>
            </div>
          </div>

          {createUserSuccessMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{createUserSuccessMsg}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label
              htmlFor="user-fullname"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="user-fullname"
                name="name"
                type="text"
                value={userFormData.name}
                onChange={handleUserInputChange}
                placeholder="e.g. Dr. Jonathan Mendoza"
                className={`input text-xs pl-9 ${userFormErrors.name ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
                autoFocus
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {userFormErrors.name && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {userFormErrors.name}
              </p>
            )}
          </div>

          {/* Username & Email Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="user-username"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="user-username"
                  name="username"
                  type="text"
                  value={userFormData.username}
                  onChange={handleUserInputChange}
                  placeholder="jmendoza_pharma"
                  className={`input text-xs pl-7 font-mono ${userFormErrors.username ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
                />
                <span className="text-gray-400 font-mono text-xs absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  @
                </span>
              </div>
              {userFormErrors.username && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {userFormErrors.username}
                </p>
              )}
            </div>

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
                  name="email"
                  type="email"
                  value={userFormData.email}
                  onChange={handleUserInputChange}
                  placeholder="jmendoza@exaktmed.com"
                  className={`input text-xs pl-9 ${userFormErrors.email ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {userFormErrors.email && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {userFormErrors.email}
                </p>
              )}
            </div>
          </div>

          {/* Phone & Password Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                  name="phone"
                  type="text"
                  value={userFormData.phone}
                  onChange={handleUserInputChange}
                  placeholder="+63 917 000 0000"
                  className="input text-xs pl-9"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label
                htmlFor="user-password"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Initial Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="user-password"
                  name="password"
                  type="text"
                  value={userFormData.password}
                  onChange={handleUserInputChange}
                  placeholder="exaktpassword"
                  className={`input text-xs pl-9 ${userFormErrors.password ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {userFormErrors.password && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {userFormErrors.password}
                </p>
              )}
            </div>
          </div>

          {/* Role & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="user-role"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Assigned Role <span className="text-red-500">*</span>
              </label>
              <select
                id="user-role"
                name="role"
                value={userFormData.role}
                onChange={handleUserInputChange}
                className="input text-xs font-medium"
              >
                {availableRolesForCreation.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_DETAILS[role]?.label || role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="user-status"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Account Status
              </label>
              <select
                id="user-status"
                name="status"
                value={userFormData.status}
                onChange={handleUserInputChange}
                className="input text-xs"
              >
                <option value="Active">Active (Permitted to log in)</option>
                <option value="Inactive">Inactive (Suspended)</option>
              </select>
            </div>
          </div>

          {/* Assign Initial Facilities */}
          <SearchableChecklist
            label="Assign Facilities"
            selectedCount={selectedFacilitiesForNewUser.length}
            totalCount={facilityList.length}
            selectedIds={selectedFacilitiesForNewUser}
            onToggle={handleToggleFacilityForNewUser}
            items={facilityList}
            getItemBadge={(fac) => fac.facilityCode}
            maxHeight="max-h-36"
            helperText="The new user will be granted access to these healthcare branches upon logging in."
          />

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCreateUserModalOpen(false)}
              className="btn-secondary text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create User</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default SelectFacility;
