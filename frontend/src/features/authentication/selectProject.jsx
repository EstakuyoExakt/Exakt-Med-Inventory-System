import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Sparkles,
  Shield,
  Layers,
  Plus,
  FolderPlus,
  AlertCircle,
  Check,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";

// Common Components
import Modal from "../../components/common/modal";
import RoleGuard from "../../components/guard/roleGuard";
import PortalHeader from "./components/portalHeader";
import PortalFooter from "./components/portalFooter";
import PortalHeroBanner from "./components/portalHeroBanner";
import PortalToolbar from "./components/portalToolbar";
import EmptyState from "./components/emptyState";
import PortalEntityCard from "./components/portalEntityCard";

// Services, Data & Hooks
import projectService from "../../services/project";
import { ROLES } from "../../config/roles";
import useAuth from "../../hooks/useAuth";
import useRole from "../../hooks/useRole";
import {
  getUserAssignedProjects,
  filterProjectsByQuery,
} from "../../utils/helpers";

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

  // Projects list state loaded from backend API
  const [projectList, setProjectList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Modal & Form state for creating a new project
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [formError, setFormError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Modal & Form state for editing an existing project
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editFormError, setEditFormError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal & state for deleting a project
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Fetch projects from backend API
  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError("");
      const data = await projectService.getAllProjects();
      setProjectList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to load projects from server.";
      setFetchError(
        typeof errMsg === "string" ? errMsg : "Failed to load projects.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchProjects();
    }
  }, [isAuthenticated, isAdmin, fetchProjects]);

  // Retrieve existing current project from auth session
  const currentSavedProject = sessionProject;

  // Filter projects assigned to this User
  const userAssignedProjects = useMemo(() => {
    return getUserAssignedProjects(user, projectList);
  }, [user, projectList]);

  // Filtered projects based on search query (matches project name or child facility names)
  const filteredProjects = useMemo(() => {
    return filterProjectsByQuery(userAssignedProjects, searchQuery);
  }, [userAssignedProjects, searchQuery]);

  // Handle project selection
  const handleSelect = (project) => {
    setSelectedProjectId(project.id);
    setIsSubmitting(true);

    setTimeout(() => {
      selectProject(project, true);
    }, 350);
  };

  // --- Create Project Handlers ---
  const handleOpenAddModal = () => {
    setNewProjectName("");
    setFormError("");
    setIsAddModalOpen(true);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    const trimmed = newProjectName.trim();
    if (!trimmed) {
      setFormError("Project name is required.");
      return;
    }

    if (trimmed.length < 2) {
      setFormError("Project name must be at least 2 characters long.");
      return;
    }

    const nameExists = projectList.some(
      (p) => p.name?.toLowerCase() === trimmed.toLowerCase(),
    );
    if (nameExists) {
      setFormError("A project with this name already exists.");
      return;
    }

    try {
      setIsCreating(true);
      setFormError("");
      const createdProject = await projectService.createProject({
        name: trimmed,
      });

      setProjectList((prev) => [
        { ...createdProject, facilities: createdProject.facilities || [] },
        ...prev,
      ]);

      setIsAddModalOpen(false);
      setNewProjectName("");
      setFormError("");
    } catch (err) {
      console.error("Error creating project:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create project. Please try again.";
      setFormError(
        typeof errMsg === "string" ? errMsg : "Failed to create project.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  // --- Edit Project Handlers ---
  const handleOpenEditModal = (project) => {
    if (!isSuperAdmin) return;
    setEditingProject(project);
    setEditProjectName(project.name || "");
    setEditFormError("");
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProject(null);
    setEditProjectName("");
    setEditFormError("");
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!editingProject) return;

    const trimmed = editProjectName.trim();
    if (!trimmed) {
      setEditFormError("Project name is required.");
      return;
    }

    if (trimmed.length < 2) {
      setEditFormError("Project name must be at least 2 characters long.");
      return;
    }

    const nameExists = projectList.some(
      (p) =>
        p.id !== editingProject.id &&
        p.name?.toLowerCase() === trimmed.toLowerCase(),
    );
    if (nameExists) {
      setEditFormError("Another project with this name already exists.");
      return;
    }

    try {
      setIsUpdating(true);
      setEditFormError("");
      const updatedProject = await projectService.updateProject(
        editingProject.id,
        {
          name: trimmed,
        },
      );

      setProjectList((prev) =>
        prev.map((p) =>
          p.id === editingProject.id
            ? {
                ...p,
                ...updatedProject,
                facilities: updatedProject.facilities || p.facilities || [],
              }
            : p,
        ),
      );

      // Sync active project if currently active
      if (sessionProject?.id === editingProject.id) {
        setProject({
          ...sessionProject,
          ...updatedProject,
          facilities:
            updatedProject.facilities || editingProject.facilities || [],
        });
      }

      handleCloseEditModal();
    } catch (err) {
      console.error("Error updating project:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to update project. Please try again.";
      setEditFormError(
        typeof errMsg === "string" ? errMsg : "Failed to update project.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Delete Project Handlers ---
  const handleOpenDeleteModal = (project) => {
    if (!isSuperAdmin) return;
    setProjectToDelete(project);
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setProjectToDelete(null);
    setDeleteError("");
  };

  const handleConfirmDeleteProject = async () => {
    if (!isSuperAdmin) return;
    if (!projectToDelete) return;

    const targetId = projectToDelete.id;

    try {
      setIsDeleting(true);
      setDeleteError("");
      await projectService.deleteProject(targetId);

      // Remove from projectList
      setProjectList((prev) => prev.filter((p) => p.id !== targetId));

      // Clean up active project if it was deleted
      if (selectedProjectId === targetId) {
        setSelectedProjectId(null);
      }
      if (sessionProject?.id === targetId) {
        setProject(null);
      }

      handleCloseDeleteModal();
    } catch (err) {
      console.error("Error deleting project:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to delete project. Please try again.";
      setDeleteError(
        typeof errMsg === "string" ? errMsg : "Failed to delete project.",
      );
    } finally {
      setIsDeleting(false);
    }
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
            <p className="text-sm font-medium">Loading projects from server...</p>
          </div>
        ) : fetchError ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <div>
              <p className="font-semibold text-red-900">Unable to load projects</p>
              <p className="text-xs text-red-700 mt-1">{fetchError}</p>
            </div>
            <button
              type="button"
              onClick={fetchProjects}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-white border border-purple-200 rounded-lg shadow-2xs hover:bg-purple-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => {
              const isSelected = selectedProjectId === project.id;
              const isCurrentlyActiveInSession =
                currentSavedProject?.id === project.id;

              // Child facilities linked to this project directly from backend API
              const childFacilities = Array.isArray(project.facilities)
                ? project.facilities
                : [];

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
                  showAssigned={false}
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
                              {facility.facilityCode || `FAC-00${facility.id}`}
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
            description={
              searchQuery
                ? `We couldn't find any assigned projects matching "${searchQuery}". Try adjusting your keywords.`
                : "No projects are currently available. Create one to get started."
            }
            actionText={searchQuery ? "Clear Search Query" : undefined}
            onAction={searchQuery ? () => setSearchQuery("") : undefined}
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
        onClose={() => !isCreating && setIsAddModalOpen(false)}
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
                Create a new overarching mother project network. Child facilities
                can be assigned under this project.
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
              disabled={isCreating}
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={isCreating}
              onClick={() => setIsAddModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {isCreating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{isCreating ? "Creating..." : "Create Project"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin Edit Project Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isUpdating && handleCloseEditModal()}
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
                Modify project network details.
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
              disabled={isUpdating}
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleCloseEditModal}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{isUpdating ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Super Admin Delete Project Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && handleCloseDeleteModal()}
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
                  ). This action cannot be undone.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleCloseDeleteModal}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteProject}
                className="btn-danger text-xs flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? "Deleting..." : "Delete Project"}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SelectProject;
