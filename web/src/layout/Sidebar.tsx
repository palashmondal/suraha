import { useState } from 'react';
import {
  Box,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { bnStrings as S } from '../i18n';

export const SIDEBAR_WIDTH = 264;

type Child = { key: string; label: string };
type Item = {
  key: string;
  label: string;
  icon: React.ReactNode;
  children?: Child[];
};

const items: Item[] = [
  { key: 'dashboard', label: S.nav.dashboard, icon: <GridViewRoundedIcon /> },
  {
    key: 'pregnancy',
    label: S.nav.pregnancy,
    icon: <FolderOutlinedIcon />,
    children: [
      { key: 'pregnancy.list', label: S.nav.list },
      { key: 'pregnancy.report', label: S.nav.report },
    ],
  },
  { key: 'birth', label: S.nav.birth, icon: <FolderOutlinedIcon /> },
  { key: 'appointment', label: S.nav.appointment, icon: <FolderOutlinedIcon /> },
  {
    key: 'complaint',
    label: S.nav.complaint,
    icon: <FolderOutlinedIcon />,
    children: [
      { key: 'complaint.all', label: S.nav.allList },
      { key: 'complaint.officers', label: S.nav.officerList },
    ],
  },
  { key: 'slider', label: S.nav.slider, icon: <SendOutlinedIcon /> },
];

const officerSection: Child[] = [
  { key: 'designation', label: S.nav.designation },
  { key: 'officers', label: S.nav.officerList },
];
const generalSection: Child[] = [
  { key: 'phones', label: S.nav.phones },
  { key: 'about', label: S.nav.aboutUpazila },
];

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <Box
      sx={{
        px: 3,
        pt: 2.5,
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
        {label}
      </Typography>
      {action}
    </Box>
  );
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const theme = useTheme();
  const [active, setActive] = useState('dashboard');
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Select a leaf item, then let the shell close the mobile drawer.
  const select = (key: string) => {
    setActive(key);
    onNavigate?.();
  };

  const activePill = theme.suraha.activePillBg;
  const activeText = theme.suraha.activePillText;

  const rowSx = (isActive: boolean) => ({
    mx: 1.5,
    my: 0.25,
    borderRadius: 7, // M3 large — full-height pill
    minHeight: 48,
    color: isActive ? activeText : 'text.primary',
    fontWeight: isActive ? 600 : 500,
    bgcolor: isActive ? activePill : 'transparent',
    '&:hover': { bgcolor: isActive ? activePill : theme.palette.action.hover },
    '& .MuiListItemIcon-root': { color: isActive ? activeText : 'text.secondary', minWidth: 38 },
  });

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        height: '100%',
        overflowY: 'auto',
        bgcolor: theme.suraha.sidebarBg,
      }}
    >
      {/* Brand header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2.5, py: 2 }}>
        <Box component="img" src="/logo.png" alt={S.appName} sx={{ width: 52, height: 52 }} />
        <Typography sx={{ fontSize: 27, fontWeight: 700 }}>{S.appName}</Typography>
      </Box>

      <List disablePadding>
        {items.map((item) => {
          const isActive = active === item.key;
          const isOpen = open[item.key];
          return (
            <Box key={item.key}>
              <ListItemButton
                sx={rowSx(isActive)}
                onClick={() => {
                  if (item.children) setOpen((o) => ({ ...o, [item.key]: !o[item.key] }));
                  else select(item.key);
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 15, fontWeight: 500 }}
                />
                {item.children ? (
                  isOpen ? (
                    <ExpandMoreRoundedIcon sx={{ color: 'text.secondary' }} />
                  ) : (
                    <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />
                  )
                ) : null}
              </ListItemButton>
              {item.children ? (
                <Collapse in={isOpen} unmountOnExit>
                  <List disablePadding>
                    {item.children.map((child) => {
                      const childActive = active === child.key;
                      return (
                        <ListItemButton
                          key={child.key}
                          sx={{ ...rowSx(childActive), pl: 6.5 }}
                          onClick={() => select(child.key)}
                        >
                          <ListItemText
                            primary={child.label}
                            primaryTypographyProps={{ fontSize: 14.5 }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Collapse>
              ) : null}
            </Box>
          );
        })}
      </List>

      {/* কর্মকর্তা section */}
      <SectionHeader label={S.nav.sectionOfficer} />
      <List disablePadding>
        {officerSection.map((c) => (
          <ListItemButton key={c.key} sx={rowSx(active === c.key)} onClick={() => select(c.key)}>
            <ListItemIcon>
              <CheckRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={c.label} primaryTypographyProps={{ fontSize: 14.5 }} />
          </ListItemButton>
        ))}
      </List>

      {/* সাধারণ তথ্য section (+ affordance) */}
      <SectionHeader
        label={S.nav.sectionGeneral}
        action={<AddRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />}
      />
      <List disablePadding sx={{ pb: 3 }}>
        {generalSection.map((c) => (
          <ListItemButton key={c.key} sx={rowSx(active === c.key)} onClick={() => select(c.key)}>
            <ListItemIcon>
              <CheckRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={c.label} primaryTypographyProps={{ fontSize: 14.5 }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
