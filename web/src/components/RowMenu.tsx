import { useState } from 'react';
import { IconButton, ListItemIcon, Menu, MenuItem } from '@mui/material';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';

export interface RowAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}

// Trailing 3-dot (kebab) row menu used in every list table (concept_ui/Frame 1171277087.png).
export default function RowMenu({ actions }: { actions: RowAction[] }) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <MoreVertRoundedIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={(e: React.MouseEvent) => {
          e?.stopPropagation?.();
          setAnchor(null);
        }}
        slotProps={{ paper: { sx: { borderRadius: '12px', minWidth: 180 } } }}
      >
        {actions.map((a) => (
          <MenuItem
            key={a.key}
            onClick={(e) => {
              e.stopPropagation();
              setAnchor(null);
              a.onClick();
            }}
            sx={a.destructive ? { color: 'error.main' } : undefined}
          >
            {a.icon && (
              <ListItemIcon sx={a.destructive ? { color: 'error.main' } : undefined}>
                {a.icon}
              </ListItemIcon>
            )}
            {a.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
