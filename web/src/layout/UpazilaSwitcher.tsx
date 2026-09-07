import { Box, Menu, MenuItem, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { bnStrings as S } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import { useSelectedTenant } from '../tenant/SelectedTenantContext';
import { useHostContext } from '../tenant/host';
import { api } from '../api/client';
import type { SwitchableUpazila } from '../api/registry';

/**
 * Upazila switcher — the left end of the top bar.
 *
 * It makes sense wherever a cross-tenant user has no fixed tenant: SEAL on the central host,
 * the DC on its district host. Both pick an upazila via the X-Upazila header. On a upazila
 * subdomain the tenant is pinned by the URL, so NO ONE sees the switcher — this renders null.
 */
export default function UpazilaSwitcher() {
  const { user } = useAuth();
  const { selectedUpazilaId, selectedUpazilaLabel, setSelectedUpazila } = useSelectedTenant();
  const host = useHostContext();

  const isAggregateHost = host?.kind === 'central' || host?.kind === 'district';
  const canSwitch = user ? user.scope !== 'tenant' && isAggregateHost : false;

  // Real list from the registry (SEAL: all, DC: own district, §4). Cross-tenant roles default to
  // the aggregate view ("সকল উপজেলা") until they pick one. The displayed label comes from the
  // persisted selection so it survives per-navigation remounts (no flash back to the default).
  const [upazilas, setUpazilas] = useState<SwitchableUpazila[]>([]);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);

  const label = (u: SwitchableUpazila) => `${u.name_bn}${u.district ? `, ${u.district}` : ''}`;

  // Once the list is in, the label is derived from it, so a rename — or a change to the format
  // above — corrects itself instead of showing whatever was persisted at selection time.
  const selected = upazilas.find((u) => u.id === selectedUpazilaId);
  const current = selected ? label(selected) : selectedUpazilaLabel ?? S.common.allUpazilas;

  useEffect(() => {
    if (! canSwitch) return;
    api<{ upazilas: SwitchableUpazila[] }>('/registry/switchable-upazilas')
      .then((r) => setUpazilas(r.upazilas))
      .catch(() => setUpazilas([]));
  }, [canSwitch]);

  if (! canSwitch) return null;

  const choose = (u: SwitchableUpazila | null) => {
    // Persist id (X-Upazila) + label so both data scope and the switcher label survive
    // navigation; null clears the header → the API returns the cross-tenant aggregate.
    setSelectedUpazila(u ? u.id : null, u ? label(u) : undefined);
    setAnchor(null);
  };

  // One row shape for the aggregate entry and every upazila, so "selected" reads the same way.
  // One line of text: a long label ellipsises rather than growing the row.
  const row = (key: string, text: string, selected: boolean, onClick: () => void) => (
    <MenuItem key={key} selected={selected} onClick={onClick} sx={{ px: 2, py: 1.25, minHeight: 48, gap: 1 }}>
      <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: selected ? 700 : 500 }}>
        {text}
      </Typography>
      {selected && <CheckRoundedIcon sx={{ flexShrink: 0, fontSize: 18, color: 'primary.main' }} />}
    </MenuItem>
  );

  return (
    <>
      <Box
        data-tour="search"
        role="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1.25,
          maxWidth: '100%',
          pl: 0.75,
          pr: 1.5,
          py: 0.75,
          borderRadius: 999,
          cursor: 'pointer',
          bgcolor: open ? 'action.selected' : 'transparent',
          transition: 'background-color 120ms ease',
          '&:hover': { bgcolor: 'action.hover' },
          '&:hover .sw-name': { color: 'primary.main' },
        }}
      >
        {/* The upazila office, not a map pin — the switcher changes whose desk you are looking
            at. The disc is gradient-filled so it reads as a badge, not another toolbar icon. */}
        <Box
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.contrastText',
            background: (t) => `linear-gradient(135deg, ${t.palette.primary.light}, ${t.palette.primary.dark})`,
            boxShadow: (t) => `0 2px 6px ${t.palette.action.disabled}`,
          }}
        >
          <AccountBalanceRoundedIcon sx={{ fontSize: 19 }} />
        </Box>
        <Typography
          className="sw-name"
          noWrap
          sx={{ minWidth: 0, fontSize: 15.5, fontWeight: 700, transition: 'color 120ms ease' }}
        >
          {current}
        </Typography>
        <KeyboardArrowDownRoundedIcon
          sx={{
            flexShrink: 0,
            color: 'text.secondary',
            transition: 'transform 150ms ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </Box>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            elevation: 4,
            // Inline width so the menu is exactly as wide as the trigger — content can never
            // stretch it, and a long label ellipsises inside instead.
            style: { width: anchor?.offsetWidth, boxSizing: 'border-box' },
            sx: { maxHeight: 420, borderRadius: '16px', mt: 0.5, py: 0.5 },
          },
        }}
      >
        {row('__all', S.common.allUpazilas, ! selectedUpazilaId, () => choose(null))}
        {upazilas.map((u) => row(u.id, label(u), u.id === selectedUpazilaId, () => choose(u)))}
      </Menu>
    </>
  );
}
