import useRole from "../../hooks/useRole";

function RoleGuard({ allowedRoles = [], children, fallback = null }) {
  const { hasRole } = useRole();

  if (!hasRole(allowedRoles)) {
    return fallback;
  }

  return <>{children}</>;
}

export default RoleGuard;
