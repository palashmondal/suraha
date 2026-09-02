import { useEffect, useState } from 'react';
import { Alert, FormControlLabel, Switch } from '@mui/material';
import { bnStrings as S } from '../../i18n';
import AppDialog from '../../components/AppDialog';
import { FormField, SelectField, type Option } from '../../components/form/FormFields';
import { api, ApiError } from '../../api/client';
import { createOfficer, type AssignableRole } from '../../api/officers';

// Shared account-creation form. Used by both the officer roster and the full user directory, so
// there is one place that knows the field set, the role list and how a tenant is chosen.
export default function CreateOfficerDialog({
  open, roles, needsTenant, selectedUpazilaId, onClose, onCreated,
}: {
  open: boolean;
  roles: AssignableRole[];
  needsTenant: boolean;
  selectedUpazilaId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [f, setF] = useState<Record<string, string>>({});
  const [unions, setUnions] = useState<Option[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(true);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  // Where an officer works is part of the role: a UP Sochib serves one union, an FWA one ward
  // within it. The API enforces this too — these fields only appear when they apply.
  const needsUnion = f.role === 'fwa' || f.role === 'up_sochib';
  const needsWard = f.role === 'fwa';

  useEffect(() => {
    if (!open) return;
    setF({});
    setErr(null);
    setActive(true);
    api<{ unions: { id: number; name_bn: string }[] }>('/registry/unions')
      .then((r) => setUnions(r.unions.map((u) => ({ value: String(u.id), label: u.name_bn }))))
      .catch(() => setUnions([]));
  }, [open]);

  const missingTenant = needsTenant && !selectedUpazilaId;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await createOfficer({
        name: f.name,
        username: f.username,
        password: f.password,
        role: f.role,
        designation: f.designation,
        phone: f.phone,
        email: f.email,
        is_active: active,
        ward_no: f.ward_no ? Number(f.ward_no) : undefined,
        union_id: f.union_id ? Number(f.union_id) : undefined,
        // UNO's tenant is forced server-side; SEAL provisions into the selected upazila.
        ...(needsTenant && selectedUpazilaId ? { tenant_id: selectedUpazilaId } : {}),
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : S.auth.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppDialog open={open} title={S.officers.createTitle} onClose={onClose} onSubmit={submit} submitLabel={S.officers.create} submitting={busy || missingTenant}>
      {missingTenant && <Alert severity="warning">{S.officers.noTenant}</Alert>}
      {err && <Alert severity="error">{err}</Alert>}
      <FormField label={S.officers.fName} value={f.name ?? ''} onChange={set('name')} />
      <FormField label={S.officers.fUsername} value={f.username ?? ''} onChange={set('username')} />
      <FormField label={S.officers.fPassword} value={f.password ?? ''} onChange={set('password')} type="password" />
      <SelectField label={S.officers.fRole} value={f.role ?? ''} onChange={set('role')} options={roles.map((r) => ({ value: r.value, label: r.label }))} placeholder="নির্বাচন করুন" />
      <FormField label={S.officers.fDesignation} value={f.designation ?? ''} onChange={set('designation')} />
      <FormField label={S.officers.fMobile} value={f.phone ?? ''} onChange={set('phone')} placeholder="01XXXXXXXXX" />
      <FormField label={S.officers.fEmail} value={f.email ?? ''} onChange={set('email')} type="email" />
      {needsUnion && (
        <SelectField label={S.officers.fUnion} value={f.union_id ?? ''} onChange={set('union_id')} options={unions} placeholder="নির্বাচন করুন" />
      )}
      {needsWard && (
        <FormField label={S.officers.fWard} value={f.ward_no ?? ''} onChange={set('ward_no')} type="number" />
      )}
      <FormControlLabel
        control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
        label={active ? S.officers.active : S.officers.inactive}
      />
    </AppDialog>
  );
}
