import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  FolderKanban,
  Building2,
  Sparkles,
  ArrowRight,
  LogOut,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Shield,
  Layers,
} from "lucide-react";

// Common Components
import Card from "../../components/common/card";
import SearchBar from "../../components/common/searchBar";

// Data & Hooks
import { projects as allProjects } from "../../data/projects";
import { facilities as allFacilities } from "../../data/facility";
import { ROLE_DETAILS } from "../../config/roles";
import useAuth from "../../hooks/useAuth";

function SelectProject() {
  const navigate = useNavigate();
  const {
    user,
    project: sessionProject,
    selectProject,
    logout,
    isAuthenticated,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If not authenticated, redirect to login
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/", { replace: true });
      return;
    }

    // Only Admin accounts use project selection; other roles go to facility selection
    if (user.role !== "Admin") {
      navigate("/select-facility", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Retrieve existing current project from storage if any
  const currentSavedProject = useMemo(() => {
    if (sessionProject?.id) return sessionProject;
    try {
      const projString = localStorage.getItem("currentProject");
      return projString ? JSON.parse(projString) : null;
    } catch {
      return null;
    }
  }, [sessionProject]);

  // Filter projects assigned to this Admin
  const userAssignedProjects = useMemo(() => {
    if (!user) return [];

    if (
      Array.isArray(user.assignedProjects) &&
      user.assignedProjects.length > 0
    ) {
      return allProjects.filter((p) => user.assignedProjects.includes(p.id));
    }

    // Fallback: If no assignedProjects specified, give access to all projects
    return allProjects;
  }, [user]);

  // Filtered projects based on search query (matches project name or child facility names)
  const filteredProjects = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return userAssignedProjects;

    return userAssignedProjects.filter((proj) => {
      const nameMatch = proj.name?.toLowerCase().includes(query);
      const codeMatch = (proj.projectCode || `PRJ-00${proj.id}`)
        .toLowerCase()
        .includes(query);

      // Also search child facility names
      const childFacilities = allFacilities.filter(
        (f) =>
          proj.facilityIds?.includes(f.id) || f.projectId === Number(proj.id),
      );
      const facilityMatch = childFacilities.some(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.facilityCode.toLowerCase().includes(query),
      );

      return nameMatch || codeMatch || facilityMatch;
    });
  }, [userAssignedProjects, searchQuery]);

  // Handle project selection
  const handleSelect = (project) => {
    setSelectedProjectId(project.id);
    setIsSubmitting(true);

    setTimeout(() => {
      selectProject(project, true);
    }, 350);
  };

  const roleInfo = user?.role ? ROLE_DETAILS[user.role] : null;

  if (!user || user.role !== "Admin") return null;

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Header Navigation */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              Exakt Med Inventory
            </h1>
            <p className="text-xs text-gray-500">
              Multi-Project Administrator Portal
            </p>
          </div>
        </div>

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-xl border border-gray-200 shadow-xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 text-xs font-bold">
              {user.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-900 leading-none">
                {user.name}
              </p>
              <span
                className={`inline-block mt-0.5 px-1.5 py-0.2 text-[10px] font-semibold rounded ${
                  roleInfo?.badgeColor ||
                  "bg-purple-50 text-purple-700 border border-purple-200"
                }`}
              >
                {roleInfo?.label || "Administrator"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="btn-secondary text-xs px-3 py-2 text-gray-600 hover:text-red-600 hover:border-red-200"
            title="Sign out of account"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto my-8 space-y-8 flex-1">
        {/* Hero Welcome Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Administrator Network Control</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Select Your Operating Project
          </h2>
          <p className="text-sm text-gray-500">
            Welcome back,{" "}
            <span className="font-semibold text-gray-800">{user.name}</span>.
            Please choose an assigned mother project network to manage its child
            clinics and hospital branches.
          </p>
        </div>

        {/* Search Bar Card */}
        <Card className="p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <SearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search projects by name or child clinic..."
              className="relative w-full sm:w-96"
            />

            {/* Total Projects Count */}
            <div className="text-xs font-medium text-gray-500 self-start sm:self-center">
              Showing{" "}
              <span className="font-bold text-gray-900">
                {filteredProjects.length}
              </span>{" "}
              of{" "}
              <span className="font-bold text-gray-900">
                {userAssignedProjects.length}
              </span>{" "}
              assigned projects
            </div>
          </div>
        </Card>

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
                <div
                  key={project.id}
                  onClick={() => !isSubmitting && handleSelect(project)}
                  className={`group relative bg-white rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between hover:border-purple-500 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer border-gray-200 ${
                    isSelected
                      ? "ring-2 ring-purple-600 border-purple-600 bg-purple-50/20"
                      : ""
                  }`}
                >
                  <div>
                    {/* Top Project Header Row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 border border-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-mono text-[11px] font-bold text-purple-700 uppercase bg-purple-50 border border-purple-100 px-2 py-0.5 rounded">
                            {project.projectCode || `PRJ-00${project.id}`}
                          </span>
                          <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                            Mother Network
                          </p>
                        </div>
                      </div>

                      {/* Session Badge */}
                      {isCurrentlyActiveInSession && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />
                          Current Active
                        </span>
                      )}
                    </div>

                    {/* Project Name */}
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                      {project.name}
                    </h3>

                    {/* Facility Count Summary */}
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50/60 border border-purple-100 px-2.5 py-1 rounded-lg w-fit">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>
                        {childFacilities.length} Child{" "}
                        {childFacilities.length === 1
                          ? "Facility"
                          : "Facilities"}
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
                  </div>

                  {/* Card Action Footer */}
                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400 group-hover:text-purple-600 transition-colors">
                      Select project & choose facility
                    </span>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      className="flex items-center gap-1 text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform"
                    >
                      {isSelected && isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Select</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              No matching projects found
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              We couldn&apos;t find any assigned projects matching &quot;
              {searchQuery}&quot;. Try adjusting your keywords.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="btn-secondary text-xs mt-4"
            >
              Clear Search Query
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
        <p>Exakt Med Inventory &copy; 2026-2027. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            Administrator Protected Session
          </span>
        </div>
      </footer>
    </div>
  );
}

export default SelectProject;
