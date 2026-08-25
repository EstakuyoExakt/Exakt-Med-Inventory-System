function RoleGuard({ allowedRoles = [], children, fallback = null }) {
  const userString = localStorage.getItem("currentUser");
  const user = userString ? JSON.parse(userString) : null;

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback;
  }

  return <>{children}</>;
}

export default RoleGuard;
