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
} from "lucide-react";

import PortalHeader from "./components/portalHeader";
import PortalFooter from "./components/portalFooter";
import PortalHeroBanner from "./components/portalHeroBanner";
import PortalToolbar from "./components/portalToolbar";
import EmptyState from "./components/emptyState";

// Data & Hooks
import { facilities as allFacilities } from "../../data/facility";
import { ROLE_DETAILS, ROLES } from "../../config/roles";
import useAuth from "../../hooks/useAuth";

function SelectFacility() {
  const navigate = useNavigate();
  const { user, project, selectFacility, logout, isAuthenticated } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If not logged in, redirect back to login
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Retrieve existing current project from storage if any
  const currentSavedProject = useMemo(() => {
    if (project?.id) return project;
    try {
      const projString = localStorage.getItem("currentProject");
      return projString ? JSON.parse(projString) : null;
    } catch {
      return null;
    }
  }, [project]);

  // Retrieve existing current facility from storage if any
  const currentSavedFacility = useMemo(() => {
    try {
      const facString = localStorage.getItem("currentFacility");
      return facString ? JSON.parse(facString) : null;
    } catch {
      return null;
    }
  }, []);

  // Filter facilities assigned to the user
  const userAssignedFacilities = useMemo(() => {
    if (!user) return [];

    // Super Admins: access to all facilities, scoped by selected project if one is active
    if (user.role === "Super Admin" || user.role === ROLES.SUPER_ADMIN) {
      if (currentSavedProject) {
        return allFacilities.filter(
          (f) =>
            currentSavedProject.facilityIds?.includes(f.id) ||
            f.projectId === Number(currentSavedProject.id),
        );
      }
      return allFacilities;
    }

    // Admins: if a project is selected, show facilities in that project; otherwise all in their assigned projects
    if (user.role === "Admin" || user.role === ROLES.ADMIN) {
      if (currentSavedProject) {
        return allFacilities.filter(
          (f) =>
            currentSavedProject.facilityIds?.includes(f.id) ||
            f.projectId === Number(currentSavedProject.id),
        );
      }
      if (user.assignedProjects && user.assignedProjects.length > 0) {
        return allFacilities.filter((f) =>
          user.assignedProjects.includes(f.projectId),
        );
      }
      if (user.assignedFacilities && user.assignedFacilities.length > 0) {
        return allFacilities.filter((f) =>
          user.assignedFacilities.includes(f.id),
        );
      }
      return allFacilities;
    }

    // If user has an assignedFacilities list, treat it as the primary source of truth
    if (Array.isArray(user.assignedFacilities)) {
      return allFacilities.filter((facility) =>
        user.assignedFacilities.includes(facility.id),
      );
    }

    // Fallback: Filter by assignedUserIds on facility if user has no assignedFacilities defined
    return allFacilities.filter((facility) =>
      facility.assignedUserIds?.includes(user.id),
    );
  }, [user, currentSavedProject]);

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
          {(user.role === "Admin" ||
            user.role === "Super Admin" ||
            user.role === ROLES.ADMIN ||
            user.role === ROLES.SUPER_ADMIN) &&
            currentSavedProject && (
            <div className="pt-2 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold rounded-lg">
                <Layers className="w-3.5 h-3.5" />
                Mother Project:{" "}
                <strong className="font-bold">
                  {currentSavedProject.name}
                </strong>
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
        />

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
            title="No Facilities Found"
            description={
              searchQuery
                ? "No assigned facilities match your search query."
                : "No assigned facilities are currently linked to your user account."
            }
            actionText={searchQuery ? "Clear Search" : null}
            onAction={searchQuery ? () => setSearchQuery("") : null}
          />
        )}
      </main>

      {/* Footer */}
      <PortalFooter text="Exakt Med Multi-Facility Inventory Management System © 2026-2027" />
    </div>
  );
}

export default SelectFacility;
