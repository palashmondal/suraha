import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { bnStrings as S } from '../i18n';
import { useAuth } from '../auth/AuthContext';

export const SIDEBAR_WIDTH = 264;

type Child = { key: string; label: string; route?: string };
type Item = {
  key: string;
  label: string;
  icon: React.ReactNode;
  route?: string; // items with a real route navigate; others are M3 placeholders
  children?: Child[];
  managerOnly?: boolean; // only UNO / SEAL (officer & content management)
};

const baseItems: Item[] = [
  { key: 'dashboard', label: S.nav.dashboard, icon: <GridViewRoundedIcon />, route: '/' },
  {
    key: 'pregnancy',
    label: S.nav.pregnancy,
    icon: <FolderOutlinedIcon />,
    children: [
      { key: 'pregnancy.list', label: S.nav.list, route: '/pregnancy' },
      { key: 'pregnancy.report', label: S.nav.report, route: '/reports' },
    ],
  },
  { key: 'birth', label: S.nav.birth, icon: <FolderOutlinedIcon />, route: '/birth' },
  { key: 'appointment', label: S.nav.appointment, icon: <FolderOutlinedIcon />, route: '/appointment' },
  {
    key: 'complaint',
    label: S.nav.complaint,
    icon: <FolderOutlinedIcon />,
    children: [
      { key: 'complaint.all', label: S.nav.allList, route: '/complaint' },
      { key: 'complaint.officers', label: S.nav.officerList },
    ],
  },
  { key: 'reports', label: S.nav.report, icon: <InsightsRoundedIcon />, route: '/reports' },
  { key: 'slider', label: S.nav.slider, icon: <SendOutlinedIcon />, route: '/sliders', managerOnly: true },
];

// SEAL-only: manage Suraha instances (upazilas / subdomains).
const instancesItem: Item = {
  key: 'instances',
  label: S.nav.instances,
  icon: <ApartmentRoundedIcon />,
  route: '/instances',
};

const officerSection: Child[] = [
  { key: 'officers', label: S.nav.officerList, route: '/officers' },
];
const generalSection: Child[] = [
  { key: 'phones', label: S.nav.phones, route: '/general-info' },
  { key: 'about', label: S.nav.aboutUpazila, route: '/general-info' },
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

export default function Sidebar() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Placeholder (not-yet-routed) items use local selection; routed items derive active from URL.
  const [active, setActive] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const isManager = user?.role === 'uno' || user?.role === 'seal_admin';

  // Insert the SEAL-only instances item right after the dashboard; drop manager-only items
  // (e.g. slider management) for roles that can't manage content.
  const items: Item[] = (
    user?.role === 'seal_admin'
      ? [baseItems[0], instancesItem, ...baseItems.slice(1)]
      : baseItems
  ).filter((it) => ! it.managerOnly || isManager);

  const activePill = theme.suraha.activePillBg;
  const activeText = theme.suraha.activePillText;

  const isRouteActive = (route: string) =>
    route === '/' ? location.pathname === '/' : location.pathname.startsWith(route);

  const itemActive = (item: Item) =>
    item.route ? isRouteActive(item.route) : active === item.key;

  const handleItemClick = (item: Item) => {
    if (item.route) navigate(item.route);
    else if (item.children) setOpen((o) => ({ ...o, [item.key]: !o[item.key] }));
    else setActive(item.key);
  };

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
      {/* Brand header — links back to the dashboard */}
      <Box
        onClick={() => navigate('/')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 2.5,
          py: 2,
          cursor: 'pointer',
          '&:hover .brand-word': { color: 'primary.main' },
        }}
      >
        <Box component="img" src="/logo.png" alt={S.appName} sx={{ width: 52, height: 52 }} />
        <Typography className="brand-word" sx={{ fontSize: 27, fontWeight: 700, transition: 'color 120ms ease' }}>
          {S.appName}
        </Typography>
      </Box>

      <List disablePadding>
        {items.map((item) => {
          const isActive = itemActive(item);
          const isOpen = open[item.key];
          return (
            <Box key={item.key}>
              <ListItemButton sx={rowSx(isActive)} onClick={() => handleItemClick(item)}>
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
                      const childActive = child.route
                        ? isRouteActive(child.route)
                        : active === child.key;
                      return (
                        <ListItemButton
                          key={child.key}
                          sx={{ ...rowSx(childActive), pl: 6.5 }}
                          onClick={() => (child.route ? navigate(child.route) : setActive(child.key))}
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

      {/* কর্মকর্তা section — only officer-managers (UNO / SEAL) */}
      {(user?.role === 'uno' || user?.role === 'seal_admin') && (
        <>
          <SectionHeader label={S.nav.sectionOfficer} />
          <List disablePadding>
            {officerSection.map((c) => (
              <ListItemButton
                key={c.key}
                sx={rowSx(c.route ? isRouteActive(c.route) : active === c.key)}
                onClick={() => (c.route ? navigate(c.route) : setActive(c.key))}
              >
                <ListItemIcon>
                  <CheckRoundedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={c.label} primaryTypographyProps={{ fontSize: 14.5 }} />
              </ListItemButton>
            ))}
          </List>
        </>
      )}

      {/* সাধারণ তথ্য section — managed by UNO / SEAL */}
      {isManager && (
        <>
          <SectionHeader
            label={S.nav.sectionGeneral}
            action={<AddRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />}
          />
          <List disablePadding sx={{ pb: 3 }}>
            {generalSection.map((c) => (
              <ListItemButton
                key={c.key}
                sx={rowSx(c.route ? isRouteActive(c.route) : active === c.key)}
                onClick={() => (c.route ? navigate(c.route) : setActive(c.key))}
              >
                <ListItemIcon>
                  <CheckRoundedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={c.label} primaryTypographyProps={{ fontSize: 14.5 }} />
              </ListItemButton>
            ))}
          </List>
        </>
      )}
    </Box>
  );
}
