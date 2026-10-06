import { ROLES } from "../config/roles";

/**
 * Filters the list of projects accessible to a user.
 * - SuperAdmin has universal access to all projects.
 * - Admin has access to projects assigned in their assignedProjects list.
 *
 * @param {Object} user - The user object
 * @param {Array} projectList - List of all projects
 * @param {Array} userList - Optional list of active users to retrieve updated assignedProjects
 * @returns {Array} List of allowed project objects
 */
export const getUserAssignedProjects = (
  user,
  projectList = [],
  userList = [],
) => {
  if (!user) return [];

  // Super Admin has access to all projects even if not explicitly assigned
  const isSuperAdmin =
    user.role === "Super Admin" || user.role === ROLES.SUPER_ADMIN;
  if (isSuperAdmin) {
    return projectList;
  }

  const currentActiveUser = userList.find((u) => u.id === user.id) || user;

  if (
    Array.isArray(currentActiveUser.assignedProjects) &&
    currentActiveUser.assignedProjects.length > 0
  ) {
    return projectList.filter(
      (p) =>
        currentActiveUser.assignedProjects.includes(p.id) ||
        currentActiveUser.assignedProjects.includes(Number(p.id)),
    );
  }

  // Fallback: If no assignedProjects specified, give access to all projects
  return projectList;
};

/**
 * Filters projects matching a search query by project name, project code, or child facilities.
 *
 * @param {Array} projects - List of project objects
 * @param {string} query - Search term
 * @param {Array} facilityList - Optional fallback facility list
 * @returns {Array} Filtered projects
 */
export const filterProjectsByQuery = (
  projects = [],
  query = "",
  facilityList = [],
) => {
  const normalizedQuery = (query || "").toLowerCase().trim();
  if (!normalizedQuery) return projects;

  return projects.filter((proj) => {
    const nameMatch = proj.name?.toLowerCase().includes(normalizedQuery);
    const codeMatch = (proj.projectCode || `PRJ-00${proj.id}`)
      .toLowerCase()
      .includes(normalizedQuery);

    const childFacilities = Array.isArray(proj.facilities)
      ? proj.facilities
      : facilityList.filter(
          (f) =>
            proj.facilityIds?.includes(f.id) || f.projectId === Number(proj.id),
        );

    const facilityMatch = childFacilities.some(
      (f) =>
        f.name?.toLowerCase().includes(normalizedQuery) ||
        f.facilityCode?.toLowerCase().includes(normalizedQuery),
    );

    return nameMatch || codeMatch || facilityMatch;
  });
};

export default {
  getUserAssignedProjects,
  filterProjectsByQuery,
};
