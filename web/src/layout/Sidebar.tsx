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
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import InsertChartOutlinedRoundedIcon from '@mui/icons-material/InsertChartOutlinedRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { bnStrings as S } from '../i18n';
import { useAuth } from '../auth/AuthContext';

export const SIDEBAR_WIDTH = 264;

type Child = { key: string; label: string; route?: string; managerOnly?: boolean };
type Item = {
  key: string;
  label: string;
  icon: React.ReactNode;
  route?: string; // items with a real route navigate; others are M3 placeholders
  children?: Child[];
  managerOnly?: boolean; // only UNO / SEAL (officer & content management)
};

const dashboardItem: Item = { key: 'dashboard', label: S.nav.dashboard, icon: <GridViewRoundedIcon />, route: '/' };

// নাগরিক সেবা — the modules a citizen's case actually moves through, in the order an upazila
// office works them.
const serviceItems: Item[] = [
  {
    key: 'pregnancy',
    label: S.nav.pregnancy,
    icon: <FolderOutlinedIcon />,
    children: [
      { key: 'pregnancy.list', label: S.nav.list, route: '/pregnancy' },
      { key: 'birth', label: S.nav.birth, route: '/birth' },
      { key: 'pregnancy.report', label: S.nav.report, route: '/reports' },
    ],
  },
  {
    key: 'appointment',
    label: S.nav.appointment,
    icon: <FolderOutlinedIcon />,
    children: [
      { key: 'appointment.all', label: S.nav.appointmentList, route: '/appointment' },
      { key: 'appointment.schedule', label: S.nav.appointmentSchedule, route: '/appointment-schedule', managerOnly: true },
    ],
  },
  {
    key: 'complaint',
    label: S.nav.complaint,
    icon: <FolderOutlinedIcon />,
    children: [
      { key: 'complaint.all', label: S.nav.allList, route: '/complaint' },
      { key: 'complaint.hearings', label: S.nav.hearingSchedule, route: '/hearings', managerOnly: true },
      { key: 'complaint.officers', label: S.nav.officerList, route: '/investigators', managerOnly: true },
    ],
  },
  { key: 'humanitarian', label: S.nav.humanitarian, icon: <VolunteerActivismOutlinedIcon />, route: '/humanitarian' },
  { key: 'advice', label: S.nav.advice, icon: <ForumOutlinedIcon />, route: '/advice' },
];

// DC-only: reports live under প্রসূতি for everyone else, but a DC's whole job here is figures,
// so it gets a direct entry instead of a group it may not otherwise open.
const reportsItem: Item = {
  key: 'report',
  label: S.nav.report,
  icon: <InsertChartOutlinedRoundedIcon />,
  route: '/reports',
};

// ড্যাশবোর্ড পরিচালনা — who and what the dashboards are made of. The instance roster is
// SEAL-only, so it is added per role rather than declared here.
const managementSection: Child[] = [
  { key: 'users', label: S.nav.users, route: '/users' },
];
const instancesChild: Child = { key: 'instances', label: S.nav.instances, route: '/instances' };
// সাধারণ তথ্য is the content area: the awareness slider belongs here with the phone list and the
// about text, not among the case-handling modules above.
const generalSection: Child[] = [
  { key: 'phones', label: S.nav.phones, route: '/general-info' },
  { key: 'about', label: S.nav.aboutUpazila, route: '/general-info' },
  { key: 'slider', label: S.nav.slider, route: '/sliders' },
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
  // An investigating officer only works on complaints assigned to their desk — no prosuti/birth,
  // no appointments, no management sections.
  const isInvestigator = user?.role === 'investigating_officer';
  // The DC is read-only (DenyReadOnlyWrites enforces it server-side): dashboard and reports only,
  // so the nav never offers a page whose actions would be refused.
  const isDc = user?.role === 'dc';

  // The dashboard always leads; the DC gets its reports beside it.
  const topItems: Item[] = isDc ? [dashboardItem, reportsItem] : [dashboardItem];

  // SEAL manages the instances themselves, so that roster sits with the other management pages.
  const management: Child[] = user?.role === 'seal_admin'
    ? [instancesChild, ...managementSection]
    : managementSection;

  // A DC only reads figures, and an investigating officer only works their own complaints.
  const services: Item[] = (isDc ? [] : serviceItems)
    .filter((it) => ! it.managerOnly || isManager)
    .filter((it) => ! isInvestigator || it.key === 'complaint');

  // One row shape for every list, so a section is just a different set of items.

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

  // One row shape for every list, so a section is just a different set of items.
  const renderItem = (item: Item) => {
    const isActive = itemActive(item);
    const isOpen = open[item.key];

    return (
      <Box key={item.key}>
        <ListItemButton sx={rowSx(isActive)} onClick={() => handleItemClick(item)}>
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 15, fontWeight: 500 }} />
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
              {item.children.filter((c) => ! c.managerOnly || isManager).map((child) => {
                const childActive = child.route ? isRouteActive(child.route) : active === child.key;

                return (
                  <ListItemButton
                    key={child.key}
                    sx={{ ...rowSx(childActive), pl: 6.5 }}
                    onClick={() => (child.route ? navigate(child.route) : setActive(child.key))}
                  >
                    <ListItemText primary={child.label} primaryTypographyProps={{ fontSize: 14.5 }} />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        ) : null}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: theme.suraha.sidebarBg,
      }}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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

      <List disablePadding>{topItems.map(renderItem)}</List>

      {/* নাগরিক সেবা — the citizen-facing modules */}
      {services.length > 0 && (
        <>
          <SectionHeader label={S.nav.sectionServices} />
          <List disablePadding>{services.map(renderItem)}</List>
        </>
      )}

      {/* ড্যাশবোর্ড পরিচালনা — only officer-managers (UNO / SEAL) */}
      {(user?.role === 'uno' || user?.role === 'seal_admin') && (
        <>
          <SectionHeader label={S.nav.sectionOfficer} />
          <List disablePadding>
            {management.map((c) => (
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

      {/* Bottom brand footer */}
      <Box
        sx={{
          px: 2.5,
          py: 1.25,
          textAlign: 'center',
          color: 'text.secondary',
          fontSize: 10.5,
          lineHeight: 1.5,
        }}
      >
        {S.footer.copyright}
      </Box>
    </Box>
  );
}
