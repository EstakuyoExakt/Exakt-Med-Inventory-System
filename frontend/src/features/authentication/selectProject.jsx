import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  FolderKanban,
  Building2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Shield,
  Layers,
  Plus,
  FolderPlus,
  AlertCircle,
  UserPlus,
  Users,
  Check,
  Mail,
  Phone,
  Lock,
  User,
  Pencil,
  Trash2,
} from "lucide-react";

// Common Components
import Modal from "../../components/common/modal";
import RoleGuard from "../../components/guard/roleGuard";
import PortalHeader from "./components/portalHeader";
import PortalFooter from "./components/portalFooter";
import PortalHeroBanner from "./components/portalHeroBanner";
import PortalToolbar from "./components/portalToolbar";
import EmptyState from "./components/emptyState";
import SearchableChecklist from "./components/searchableChecklist";
import PortalEntityCard from "./components/portalEntityCard";

// Data & Hooks
import { projects as allProjects } from "../../data/projects";
import { facilities as allFacilities } from "../../data/facility";
import { users as initialUsers } from "../../data/user";
import { ROLE_DETAILS, ROLES } from "../../config/roles";
import useAuth from "../../hooks/useAuth";
import useRole from "../../hooks/useRole";
import {
  getAllAdminAccounts,
  getAdminsForProject,
  getUserAssignedProjects,
  filterProjectsByQuery,
  validateAdminAccountForm,
} from "../../utils/helpers";
import { DEFAULT_ADMIN_FORM } from "../../utils/constants";

function SelectProject() {
  const navigate = useNavigate();
  const {
    user,
    project: sessionProject,
    selectProject,
    setProject,
    logout,
    isAuthenticated,
  } = useAuth();
  const { isSuperAdmin, isAdmin, roleDetails } = useRole();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Projects list state initialized from mock data
  const [projectList, setProjectList] = useState(allProjects);

  // User list state for managing admin assignments
  const [userList, setUserList] = useState(initialUsers);

  // Modal & Form state for creating a new project
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedFacilitiesForNewProject, setSelectedFacilitiesForNewProject] =
    useState([]);
  const [facilitySearchTerm, setFacilitySearchTerm] = useState("");
  const [formError, setFormError] = useState("");

  // Modal & Form state for editing an existing project
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editSelectedFacilities, setEditSelectedFacilities] = useState([]);
  const [editFacilitySearchTerm, setEditFacilitySearchTerm] = useState("");
  const [editFormError, setEditFormError] = useState("");

  // Modal & state for deleting a project
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  // Modal & Form state for assigning admins to a project
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedProjectIdForAssignment, setSelectedProjectIdForAssignment] =
    useState(null);
  const [selectedAdminIds, setSelectedAdminIds] = useState([]);
  const [adminSearchTerm, setAdminSearchTerm] = useState("");
  const [assignSuccessMsg, setAssignSuccessMsg] = useState("");

  // Modal & Form state for creating a new administrator
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [adminFormData, setAdminFormData] = useState(DEFAULT_ADMIN_FORM);
  const [selectedProjectsForNewAdmin, setSelectedProjectsForNewAdmin] =
    useState([]);
  const [adminFormErrors, setAdminFormErrors] = useState({});
  const [createAdminSuccessMsg, setCreateAdminSuccessMsg] = useState("");

  // If not authenticated, redirect to login
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/", { replace: true });
      return;
    }

    // Only Admin and Super Admin accounts use project selection; other roles go to facility selection
    if (!isAdmin) {
      navigate("/select-facility", { replace: true });
    }
  }, [isAuthenticated, user, isAdmin, navigate]);

  // Retrieve existing current project from auth session
  const currentSavedProject = sessionProject;

  // Filter projects assigned to this User
  const userAssignedProjects = useMemo(() => {
    return getUserAssignedProjects(user, projectList, userList);
  }, [user, userList, projectList]);

  // Filtered projects based on search query (matches project name or child facility names)
  const filteredProjects = useMemo(() => {
    return filterProjectsByQuery(
      userAssignedProjects,
      searchQuery,
      allFacilities,
    );
  }, [userAssignedProjects, searchQuery]);

  // Handle project selection
  const handleSelect = (project) => {
    setSelectedProjectId(project.id);
    setIsSubmitting(true);

    setTimeout(() => {
      selectProject(project, true);
    }, 350);
  };

  // Modal Open Handler
  const handleOpenAddModal = () => {
    setNewProjectName("");
    setSelectedFacilitiesForNewProject([]);
    setFacilitySearchTerm("");
    setFormError("");
    setIsAddModalOpen(true);
  };

  // Facility checkbox toggle
  const handleToggleFacility = (facilityId) => {
    setSelectedFacilitiesForNewProject((prev) =>
      prev.includes(facilityId)
        ? prev.filter((id) => id !== facilityId)
        : [...prev, facilityId],
    );
  };

  // Form Submit Handler for Creating a Project
  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setFormError("Project name is required.");
      return;
    }

    if (trimmed.length < 3) {
      setFormError("Project name must be at least 3 characters long.");
      return;
    }

    const nameExists = projectList.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (nameExists) {
      setFormError("A project with this name already exists.");
      return;
    }

    const newProject = {
      id: Date.now(),
      name: trimmed,
      facilityIds: selectedFacilitiesForNewProject,
    };

    setProjectList((prev) => [newProject, ...prev]);

    setIsAddModalOpen(false);
    setNewProjectName("");
    setSelectedFacilitiesForNewProject([]);
    setFormError("");
  };

  // Open Edit Modal
  const handleOpenEditModal = (project) => {
    if (!isSuperAdmin) return;
    setEditingProject(project);
    setEditProjectName(project.name || "");
    setEditSelectedFacilities(project.facilityIds || []);
    setEditFacilitySearchTerm("");
    setEditFormError("");
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProject(null);
    setEditProjectName("");
    setEditSelectedFacilities([]);
    setEditFacilitySearchTerm("");
    setEditFormError("");
  };

  const handleToggleEditFacility = (facilityId) => {
    setEditSelectedFacilities((prev) =>
      prev.includes(facilityId)
        ? prev.filter((id) => id !== facilityId)
        : [...prev, facilityId],
    );
  };

  const handleUpdateProject = (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!editingProject) return;

    const trimmed = editProjectName.trim();
    if (!trimmed) {
      setEditFormError("Project name is required.");
      return;
    }

    if (trimmed.length < 3) {
      setEditFormError("Project name must be at least 3 characters long.");
      return;
    }

    const nameExists = projectList.some(
      (p) =>
        p.id !== editingProject.id &&
        p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (nameExists) {
      setEditFormError("Another project with this name already exists.");
      return;
    }

    setProjectList((prev) =>
      prev.map((p) =>
        p.id === editingProject.id
          ? {
              ...p,
              name: trimmed,
              facilityIds: editSelectedFacilities,
            }
          : p,
      ),
    );

    // Sync active project if currently active
    if (sessionProject?.id === editingProject.id) {
      setProject({
        ...sessionProject,
        name: trimmed,
        facilityIds: editSelectedFacilities,
      });
    }

    handleCloseEditModal();
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (project) => {
    if (!isSuperAdmin) return;
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setProjectToDelete(null);
  };

  const handleConfirmDeleteProject = () => {
    if (!isSuperAdmin) return;
    if (!projectToDelete) return;

    const targetId = projectToDelete.id;

    // Remove from projectList
    setProjectList((prev) => prev.filter((p) => p.id !== targetId));

    // Remove from users' assigned projects
    setUserList((prevUsers) =>
      prevUsers.map((u) => {
        if (
          Array.isArray(u.assignedProjects) &&
          u.assignedProjects.includes(targetId)
        ) {
          return {
            ...u,
            assignedProjects: u.assignedProjects.filter(
              (id) => id !== targetId,
            ),
          };
        }
        return u;
      }),
    );

    // Clean up active project if it was deleted
    if (selectedProjectId === targetId) {
      setSelectedProjectId(null);
    }
    if (sessionProject?.id === targetId) {
      setProject(null);
    }

    handleCloseDeleteModal();
  };

  // Helper: All Administrator accounts
  const allAdminAccounts = useMemo(() => {
    return getAllAdminAccounts(userList);
  }, [userList]);

  // Helper: Get admins assigned to a specific project
  const getAdmins = (projectId) => getAdminsForProject(projectId, userList);

  // Modal Open Handler for Assigning Admins
  const handleOpenAssignModal = (project) => {
    const targetProject = project || projectList[0];
    if (!targetProject) return;

    setSelectedProjectIdForAssignment(targetProject.id);

    const currentlyAssignedAdminIds = getAdmins(targetProject.id).map(
      (u) => u.id,
    );

    setSelectedAdminIds(currentlyAssignedAdminIds);
    setAdminSearchTerm("");
    setAssignSuccessMsg("");
    setIsAssignModalOpen(true);
  };

  // Project dropdown change in Assign Modal
  const handleProjectChangeInModal = (projectId) => {
    const pid = Number(projectId);
    setSelectedProjectIdForAssignment(pid);

    const currentlyAssignedAdminIds = getAdmins(pid).map((u) => u.id);

    setSelectedAdminIds(currentlyAssignedAdminIds);
    setAssignSuccessMsg("");
  };

  // Toggle admin selection in Assign Modal
  const handleToggleAdmin = (adminId) => {
    setSelectedAdminIds((prev) =>
      prev.includes(adminId)
        ? prev.filter((id) => id !== adminId)
        : [...prev, adminId],
    );
  };

  // Save Admin Assignments
  const handleSaveAssignments = (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!selectedProjectIdForAssignment) return;

    setUserList((prevUsers) =>
      prevUsers.map((u) => {
        if (u.role !== "Admin" && u.role !== ROLES.ADMIN) return u;

        const shouldBeAssigned = selectedAdminIds.includes(u.id);
        const currentProjects = Array.isArray(u.assignedProjects)
          ? u.assignedProjects
          : [];

        if (
          shouldBeAssigned &&
          !currentProjects.includes(selectedProjectIdForAssignment)
        ) {
          return {
            ...u,
            assignedProjects: [
              ...currentProjects,
              selectedProjectIdForAssignment,
            ],
          };
        } else if (
          !shouldBeAssigned &&
          currentProjects.includes(selectedProjectIdForAssignment)
        ) {
          return {
            ...u,
            assignedProjects: currentProjects.filter(
              (pid) => pid !== selectedProjectIdForAssignment,
            ),
          };
        }
        return u;
      }),
    );

    const targetProject = projectList.find(
      (p) => p.id === selectedProjectIdForAssignment,
    );
    setAssignSuccessMsg(
      `Updated administrator assignments for ${targetProject?.name || "project"}!`,
    );

    setTimeout(() => {
      setIsAssignModalOpen(false);
      setAssignSuccessMsg("");
    }, 700);
  };

  // --- Create Admin Form Handlers ---
  const handleOpenCreateAdminModal = () => {
    setAdminFormData(DEFAULT_ADMIN_FORM);
    setSelectedProjectsForNewAdmin([]);
    setAdminFormErrors({});
    setCreateAdminSuccessMsg("");
    setIsCreateAdminModalOpen(true);
  };

  const handleAdminInputChange = (e) => {
    const { name, value } = e.target;
    setAdminFormData((prev) => ({ ...prev, [name]: value }));
    if (adminFormErrors[name]) {
      setAdminFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleToggleProjectForNewAdmin = (projectId) => {
    setSelectedProjectsForNewAdmin((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  const handleCreateAdminSubmit = (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    const errors = validateAdminAccountForm(adminFormData, userList);
    setAdminFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const newAdmin = {
      id: Date.now(),
      name: adminFormData.name.trim(),
      username: adminFormData.username.trim(),
      email: adminFormData.email.trim(),
      phone: adminFormData.phone.trim() || "+63 900 000 0000",
      role: ROLES.ADMIN,
      status: adminFormData.status || "Active",
      password: adminFormData.password || "exaktpassword",
      assignedProjects: selectedProjectsForNewAdmin,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setUserList((prev) => [newAdmin, ...prev]);
    setCreateAdminSuccessMsg(
      `Administrator account for ${newAdmin.name} created successfully!`,
    );

    setTimeout(() => {
      setIsCreateAdminModalOpen(false);
      setCreateAdminSuccessMsg("");
      setAdminFormData(DEFAULT_ADMIN_FORM);
      setSelectedProjectsForNewAdmin([]);
    }, 700);
  };

  if (!user || !isAdmin) return null;

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Header Navigation */}
      <PortalHeader
        user={user}
        roleInfo={roleDetails}
        subtitle="Multi-Project Administrator Portal"
        onLogout={logout}
        badgeTheme="purple"
      />

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto my-8 space-y-8 flex-1">
        {/* Hero Welcome Banner */}
        <PortalHeroBanner
          badgeText="Administrator Network Control"
          badgeIcon={Sparkles}
          badgeTheme="purple"
          title="Select Your Operating Project"
          description={`Welcome back, ${user.name || user.username}. Please choose an assigned mother project network to manage its child clinics and hospital branches.`}
        />

        {/* Search Bar Toolbar */}
        <PortalToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery("")}
          placeholder="Search projects by name or child clinic..."
          showingCount={filteredProjects.length}
          totalCount={userAssignedProjects.length}
          itemLabel="projects"
        >
          {/* Super Admin Action Buttons using RoleGuard */}
          <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]}>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleOpenCreateAdminModal}
                className="btn-secondary py-2 px-3 text-xs shadow-sm flex items-center gap-1.5 shrink-0 hover:border-purple-300 hover:text-purple-700 cursor-pointer"
                title="Create New Administrator Account"
              >
                <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                <span>Create Admin</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleOpenAssignModal(filteredProjects[0] || projectList[0])
                }
                className="btn-secondary py-2 px-3 text-xs shadow-sm flex items-center gap-1.5 shrink-0 hover:border-purple-300 hover:text-purple-700 cursor-pointer"
                title="Assign Administrators to Projects"
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Assign Admins</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn-primary py-2 px-3.5 text-xs shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Create New Project"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
            </div>
          </RoleGuard>
        </PortalToolbar>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => {
              const isSelected = selectedProjectId === project.id;
              const isCurrentlyActiveInSession =
                currentSavedProject?.id === project.id;

              // Find child facilities linked to this project
              const childFacilities = allFacilities.filter(
                (f) =>
                  project.facilityIds?.includes(f.id) ||
                  f.projectId === Number(project.id),
              );

              return (
                <PortalEntityCard
                  key={project.id}
                  icon={<Layers className="w-5 h-5" />}
                  code={project.projectCode || `PRJ-00${project.id}`}
                  badgeText="Mother Network"
                  title={project.name}
                  themeColor="purple"
                  isActiveSession={isCurrentlyActiveInSession}
                  sessionBadgeLabel="Current Active"
                  isSelected={isSelected}
                  isSubmitting={isSubmitting}
                  onSelect={() => handleSelect(project)}
                  onEdit={() => handleOpenEditModal(project)}
                  onDelete={() => handleOpenDeleteModal(project)}
                  editRoles={[ROLES.SUPER_ADMIN]}
                  editTitle="Edit Project"
                  deleteTitle="Delete Project"
                  assignedLabel="Assigned Admins"
                  assignedItems={getAdmins(project.id)}
                  assignedIconType="shield"
                  assignRoles={[ROLES.SUPER_ADMIN]}
                  onAssign={() => handleOpenAssignModal(project)}
                  emptyAssignedText="No admin assigned yet"
                  footerVariant="compact"
                  footerLabel="Select project & choose facility"
                  selectButtonText="Select"
                >
                  {/* Facility Count Summary */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50/60 border border-purple-100 px-2.5 py-1 rounded-lg w-fit">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>
                      {childFacilities.length} Child{" "}
                      {childFacilities.length === 1 ? "Facility" : "Facilities"}
                    </span>
                  </div>

                  {/* Child Facilities Preview List */}
                  <div className="mt-3.5 pt-3 border-t border-gray-100 space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Assigned Child Branches
                    </p>
                    {childFacilities.length > 0 ? (
                      <div className="space-y-1">
                        {childFacilities.slice(0, 3).map((facility) => (
                          <div
                            key={facility.id}
                            className="flex items-center justify-between text-xs text-gray-600 bg-gray-50/80 px-2 py-1 rounded border border-gray-100"
                          >
                            <span className="truncate max-w-50 font-medium text-gray-700">
                              {facility.name}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {facility.facilityCode}
                            </span>
                          </div>
                        ))}
                        {childFacilities.length > 3 && (
                          <p className="text-[10px] text-gray-400 font-medium pl-1">
                            +{childFacilities.length - 3} more branches
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No facilities assigned yet
                      </p>
                    )}
                  </div>
                </PortalEntityCard>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Layers}
            title="No matching projects found"
            description={`We couldn't find any assigned projects matching "${searchQuery}". Try adjusting your keywords.`}
            actionText="Clear Search Query"
            onAction={() => setSearchQuery("")}
          />
        )}
      </main>

      {/* Footer */}
      <PortalFooter
        text="Exakt Med Inventory © 2026-2027. All rights reserved."
        rightContent={
          <span className="inline-flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            Administrator Protected Session
          </span>
        }
      />

      {/* Super Admin Create Project Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Mother Project"
        size="md"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-800">
            <FolderPlus className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-900">
                Super Administrator Authority
              </p>
              <p className="mt-0.5 text-purple-700">
                Create a new overarching mother project network and assign child
                healthcare facilities.
              </p>
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label
              htmlFor="projectName"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
            >
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              id="projectName"
              type="text"
              value={newProjectName}
              onChange={(e) => {
                setNewProjectName(e.target.value);
                if (formError) setFormError("");
              }}
              placeholder="e.g. Pasig Regional Medical Network"
              className="input text-xs"
              autoFocus
            />
          </div>

          {/* Assign Facilities */}
          <SearchableChecklist
            label="Assign Child Facilities"
            selectedIds={selectedFacilitiesForNewProject}
            onToggle={handleToggleFacility}
            onDeselectAll={() => setSelectedFacilitiesForNewProject([])}
            searchTerm={facilitySearchTerm}
            onSearchChange={setFacilitySearchTerm}
            placeholder="Filter facilities by name or code..."
            items={allFacilities.filter((f) => {
              if (!facilitySearchTerm.trim()) return true;
              const term = facilitySearchTerm.toLowerCase();
              return (
                f.name.toLowerCase().includes(term) ||
                f.facilityCode.toLowerCase().includes(term) ||
                f.type.toLowerCase().includes(term)
              );
            })}
            getItemBadge={(fac) => fac.facilityCode}
            helperText="Linked clinics and branches will be accessible under this mother project."
          />

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin Assign Admins Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Administrators to Project"
        size="md"
      >
        <form onSubmit={handleSaveAssignments} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-800">
            <UserPlus className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-900">
                Administrator Access Delegation
              </p>
              <p className="mt-0.5 text-purple-700">
                Grant or revoke administrator access to mother project networks.
                Assigned administrators will be able to manage all clinics
                within this project.
              </p>
            </div>
          </div>

          {assignSuccessMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{assignSuccessMsg}</span>
            </div>
          )}

          {/* Select Target Project Dropdown */}
          <div>
            <label
              htmlFor="targetProject"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
            >
              Target Mother Project
            </label>
            <select
              id="targetProject"
              value={selectedProjectIdForAssignment || ""}
              onChange={(e) => handleProjectChangeInModal(e.target.value)}
              className="input text-xs font-medium"
            >
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({getAdmins(p.id).length} Admins)
                </option>
              ))}
            </select>
          </div>

          {/* Administrators List */}
          <SearchableChecklist
            label="Select Administrators"
            selectedCount={selectedAdminIds.length}
            totalCount={allAdminAccounts.length}
            selectedIds={selectedAdminIds}
            onToggle={handleToggleAdmin}
            onSelectAll={() =>
              setSelectedAdminIds(allAdminAccounts.map((a) => a.id))
            }
            onDeselectAll={() => setSelectedAdminIds([])}
            searchTerm={adminSearchTerm}
            onSearchChange={setAdminSearchTerm}
            placeholder="Search administrators by name or username..."
            items={allAdminAccounts.filter((adm) => {
              if (!adminSearchTerm.trim()) return true;
              const term = adminSearchTerm.toLowerCase();
              return (
                adm.name.toLowerCase().includes(term) ||
                adm.username.toLowerCase().includes(term) ||
                adm.email.toLowerCase().includes(term)
              );
            })}
            maxHeight="max-h-56"
            helperText="Checked administrators will have access to manage this mother project upon logging in."
            renderItem={(adm, isChecked, toggleFn) => {
              const assignedCount = Array.isArray(adm.assignedProjects)
                ? adm.assignedProjects.length
                : 0;

              return (
                <label
                  key={adm.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? "bg-purple-50/90 text-purple-950 border border-purple-200/90 shadow-2xs"
                      : "hover:bg-white text-gray-700 bg-white/70 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={toggleFn}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-bold text-xs shrink-0">
                      {adm.name.charAt(0)}
                    </div>
                    <div className="truncate text-left">
                      <p className="font-semibold text-gray-900 truncate">
                        {adm.name}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        @{adm.username} &bull; {adm.email}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right ml-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                      <Layers className="w-2.5 h-2.5" />
                      {assignedCount}{" "}
                      {assignedCount === 1 ? "project" : "projects"}
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
              onClick={() => setIsAssignModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              <Check className="w-3.5 h-3.5" />
              <span>Save Assignments</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin Create Admin Modal */}
      <Modal
        isOpen={isCreateAdminModalOpen}
        onClose={() => setIsCreateAdminModalOpen(false)}
        title="Create Administrator Account"
        size="md"
      >
        <form onSubmit={handleCreateAdminSubmit} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-800">
            <Shield className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-900">
                Super Administrator Provisioning
              </p>
              <p className="mt-0.5 text-purple-700">
                Create a new Administrator account and optionally assign them to
                mother projects immediately.
              </p>
            </div>
          </div>

          {createAdminSuccessMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{createAdminSuccessMsg}</span>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label
              htmlFor="admin-name"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="admin-name"
                name="name"
                type="text"
                value={adminFormData.name}
                onChange={handleAdminInputChange}
                placeholder="e.g. Lucas Montemayor"
                className={`input text-xs pl-9 ${adminFormErrors.name ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
                autoFocus
              />
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {adminFormErrors.name && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {adminFormErrors.name}
              </p>
            )}
          </div>

          {/* Username & Email Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-username"
                  name="username"
                  type="text"
                  value={adminFormData.username}
                  onChange={handleAdminInputChange}
                  placeholder="lmontemayor_admin"
                  className={`input text-xs pl-7 font-mono ${adminFormErrors.username ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
                />
                <span className="text-gray-400 font-mono text-xs absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  @
                </span>
              </div>
              {adminFormErrors.username && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {adminFormErrors.username}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  value={adminFormData.email}
                  onChange={handleAdminInputChange}
                  placeholder="lucas@exaktmed.com"
                  className={`input text-xs pl-9 ${adminFormErrors.email ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {adminFormErrors.email && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {adminFormErrors.email}
                </p>
              )}
            </div>
          </div>

          {/* Phone & Password Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="admin-phone"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Phone Number
              </label>
              <div className="relative">
                <input
                  id="admin-phone"
                  name="phone"
                  type="text"
                  value={adminFormData.phone}
                  onChange={handleAdminInputChange}
                  placeholder="+63 917 000 0000"
                  className="input text-xs pl-9"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Initial Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  name="password"
                  type="text"
                  value={adminFormData.password}
                  onChange={handleAdminInputChange}
                  placeholder="exaktpassword"
                  className={`input text-xs pl-9 ${adminFormErrors.password ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {adminFormErrors.password && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {adminFormErrors.password}
                </p>
              )}
            </div>
          </div>

          {/* Account Status */}
          <div>
            <label
              htmlFor="admin-status"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
            >
              Account Status
            </label>
            <select
              id="admin-status"
              name="status"
              value={adminFormData.status}
              onChange={handleAdminInputChange}
              className="input text-xs"
            >
              <option value="Active">Active (Permitted to log in)</option>
              <option value="Inactive">Inactive (Suspended)</option>
            </select>
          </div>

          {/* Assign Initial Mother Projects */}
          <SearchableChecklist
            label="Assign Mother Projects"
            selectedCount={selectedProjectsForNewAdmin.length}
            totalCount={projectList.length}
            selectedIds={selectedProjectsForNewAdmin}
            onToggle={handleToggleProjectForNewAdmin}
            items={projectList}
            getItemBadge={(proj) => proj.projectCode || `PRJ-00${proj.id}`}
            maxHeight="max-h-36"
            helperText="The new administrator will be able to select and manage these projects upon login."
          />

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCreateAdminModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Administrator</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin Edit Project Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title={`Edit Project - ${editingProject?.name || ""}`}
        size="md"
      >
        <form onSubmit={handleUpdateProject} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-800">
            <Layers className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-900">
                Super Administrator Authority
              </p>
              <p className="mt-0.5 text-purple-700">
                Modify project network details and update assigned child
                healthcare facilities.
              </p>
            </div>
          </div>

          {editFormError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{editFormError}</span>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label
              htmlFor="editProjectName"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
            >
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              id="editProjectName"
              type="text"
              value={editProjectName}
              onChange={(e) => {
                setEditProjectName(e.target.value);
                if (editFormError) setEditFormError("");
              }}
              placeholder="e.g. Pasig Regional Medical Network"
              className="input text-xs"
              autoFocus
            />
          </div>

          {/* Assign Facilities */}
          <SearchableChecklist
            label="Assign Child Facilities"
            selectedIds={editSelectedFacilities}
            onToggle={handleToggleEditFacility}
            onSelectAll={() =>
              setEditSelectedFacilities(allFacilities.map((f) => f.id))
            }
            onDeselectAll={() => setEditSelectedFacilities([])}
            searchTerm={editFacilitySearchTerm}
            onSearchChange={setEditFacilitySearchTerm}
            placeholder="Filter facilities by name or code..."
            items={allFacilities.filter((f) => {
              if (!editFacilitySearchTerm.trim()) return true;
              const term = editFacilitySearchTerm.toLowerCase();
              return (
                f.name.toLowerCase().includes(term) ||
                f.facilityCode.toLowerCase().includes(term) ||
                f.type.toLowerCase().includes(term)
              );
            })}
            getItemBadge={(fac) => fac.facilityCode}
            helperText="Linked clinics and branches will be accessible under this mother project."
          />

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCloseEditModal}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin Delete Project Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Project"
        size="sm"
      >
        {projectToDelete && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-red-900 text-sm">
                  Are you sure you want to delete this project?
                </p>
                <p className="text-red-700">
                  This will permanently remove the record for{" "}
                  <span className="font-bold">{projectToDelete.name}</span> (
                  <span className="font-mono font-semibold">
                    {projectToDelete.projectCode ||
                      `PRJ-00${projectToDelete.id}`}
                  </span>
                  ). Associated administrators will be unassigned. This action
                  cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProject}
                className="btn-danger text-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Project</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SelectProject;
