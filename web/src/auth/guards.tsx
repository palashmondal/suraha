import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { homePathFor, isCitizen, isOfficer, type Role } from './roles';

// Route guards mirror server-side RBAC (SURAHA_BUILD_PROMPT §3) so users only reach the area their
// role owns; the API remains authoritative for every action.

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <>{children}</>;
}

// Officer/DC/SEAL area — citizens are redirected to their own area, and vice versa.
export function RequireOfficer({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isOfficer(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}

export function RequireCitizen({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/citizen/login" replace />;
  if (!isCitizen(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}

// Fine-grained gate for specific roles (e.g. only UNO may author notices).
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}
