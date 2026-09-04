import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Collapse,
  Divider,
  IconButton,
  Tooltip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import InsertChartOutlinedRoundedIcon from '@mui/icons-material/InsertChartOutlinedRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PregnantWomanRoundedIcon from '@mui/icons-material/PregnantWomanRounded';
import ChildFriendlyOutlinedIcon from '@mui/icons-material/ChildFriendlyOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import { bnStrings as S } from '../i18n';
import { useAuth } from '../auth/AuthContext';

export const SIDEBAR_WIDTH = 264;
/** Collapsed rail: sized so the brand still reads, not just the icon pills. */
export const SIDEBAR_RAIL = 88;
const COLLAPSE_KEY = 'suraha.sidebar.collapsed';

type Child = { key: string; label: string; icon: React.ReactNode; route?: string; managerOnly?: boolean };
type Item = {
  key: string;
  label: string;
  icon: React.ReactNode;
  route?: string; // items with a real route navigate; others are M3 placeholders
  children?: Child[];
  managerOnly?: boolean; // only UNO / SEAL (officer & content management)
};

const dashboardItem: Item = { key: 'dashboard', label: S.nav.dashboard, icon: <GridViewRoundedIcon />, route: '/app' };

// নাগরিক সেবা — the modules a citizen's case actually moves through, in the order an upazila
// office works them.
const serviceItems: Item[] = [
  {
    key: 'pregnancy',
    label: S.nav.pregnancy,
    icon: <PregnantWomanRoundedIcon />,
    children: [
      { key: 'pregnancy.list', icon: <FormatListBulletedRoundedIcon fontSize="small" />, label: S.nav.list, route: '/app/pregnancy' },
      { key: 'birth', icon: <ChildFriendlyOutlinedIcon fontSize="small" />, label: S.nav.birth, route: '/app/birth' },
      { key: 'pregnancy.report', icon: <InsertChartOutlinedRoundedIcon fontSize="small" />, label: S.nav.report, route: '/app/reports' },
    ],
  },
  {
    key: 'appointment',
    label: S.nav.appointment,
    icon: <EventNoteOutlinedIcon />,
    children: [
      { key: 'appointment.all', icon: <FormatListBulletedRoundedIcon fontSize="small" />, label: S.nav.appointmentList, route: '/app/appointment' },
      { key: 'appointment.schedule', icon: <CalendarMonthOutlinedIcon fontSize="small" />, label: S.nav.appointmentSchedule, route: '/app/appointment-schedule', managerOnly: true },
    ],
  },
  {
    key: 'complaint',
    label: S.nav.complaint,
    icon: <ReportProblemOutlinedIcon />,
    children: [
      { key: 'complaint.all', icon: <FormatListBulletedRoundedIcon fontSize="small" />, label: S.nav.allList, route: '/app/complaint' },
      { key: 'complaint.hearings', icon: <GavelRoundedIcon fontSize="small" />, label: S.nav.hearingSchedule, route: '/app/hearings', managerOnly: true },
      { key: 'complaint.officers', icon: <BadgeOutlinedIcon fontSize="small" />, label: S.nav.officerList, route: '/app/investigators', managerOnly: true },
    ],
  },
  { key: 'humanitarian', label: S.nav.humanitarian, icon: <VolunteerActivismOutlinedIcon />, route: '/app/humanitarian' },
  { key: 'advice', label: S.nav.advice, icon: <ForumOutlinedIcon />, route: '/app/advice' },
];

// DC-only: reports live under প্রসূতি for everyone else, but a DC's whole job here is figures,
// so it gets a direct entry instead of a group it may not otherwise open.
const reportsItem: Item = {
  key: 'report',
  label: S.nav.report,
  icon: <InsertChartOutlinedRoundedIcon />,
  route: '/app/reports',
};

// ড্যাশবোর্ড পরিচালনা — who and what the dashboards are made of. The instance roster is
// SEAL-only, so it is added per role rather than declared here.
const managementSection: Child[] = [
  { key: 'users', icon: <GroupOutlinedIcon fontSize="small" />, label: S.nav.users, route: '/app/users' },
  { key: 'sms', icon: <SmsOutlinedIcon fontSize="small" />, label: S.nav.smsSettings, route: '/app/sms-settings' },
];
const instancesChild: Child = { key: 'instances', icon: <ApartmentRoundedIcon fontSize="small" />, label: S.nav.instances, route: '/app/instances' };
const districtsChild: Child = { key: 'districts', icon: <MapOutlinedIcon fontSize="small" />, label: S.nav.districts, route: '/app/districts' };
// সাধারণ তথ্য is the content area: the awareness slider belongs here with the phone list and the
// about text, not among the case-handling modules above.
const generalSection: Child[] = [
  { key: 'phones', icon: <LocalPhoneOutlinedIcon fontSize="small" />, label: S.nav.phones, route: '/app/general-info' },
  { key: 'about', icon: <InfoOutlinedIcon fontSize="small" />, label: S.nav.aboutUpazila, route: '/app/general-info' },
  { key: 'slider', icon: <CampaignOutlinedIcon fontSize="small" />, label: S.nav.slider, route: '/app/sliders' },
];

function SectionHeader({ label, action, collapsed }: { label: string; action?: React.ReactNode; collapsed?: boolean }) {
  // On the rail there is no room for a caption, so the grouping is carried by a rule instead.
  if (collapsed) return <Divider sx={{ mx: 2, my: 1.5 }} />;

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
  // An FWA works mothers and nothing else. A UP Sochib works mothers, the birth registrations
  // that follow a delivery, and any অভিযোগ the UNO has appointed them to investigate. Both keep
  // only the groups they can actually open — the routes already refuse the rest, so offering
  // more would only 403.
  const isFwa = user?.role === 'fwa';
  const isSochib = user?.role === 'up_sochib';
  const fieldOnly = isFwa || isSochib;

  // Folded state outlives navigation and reload; a wrapped read because storage can throw in a
  // private window and a sidebar is not worth a blank screen.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* not worth failing over */
      }
      return ! c;
    });
  };

  // The dashboard always leads; the DC gets its reports beside it.
  const topItems: Item[] = isDc ? [dashboardItem, reportsItem] : [dashboardItem];

  // SEAL manages the instances themselves, so that roster sits with the other management pages.
  const management: Child[] = user?.role === 'seal_admin'
    ? [instancesChild, districtsChild, ...managementSection]
    : managementSection;

  // A DC only reads figures, and an investigating officer only works their own complaints.
  const services: Item[] = (isDc ? [] : serviceItems)
    .filter((it) => ! it.managerOnly || isManager)
    .filter((it) => ! isInvestigator || it.key === 'complaint')
    .filter((it) => ! fieldOnly || it.key === 'pregnancy' || (isSochib && it.key === 'complaint'))
    .map((it) => (fieldOnly && it.children && it.key === 'pregnancy'
      ? {
          ...it,
          children: it.children.filter((c) => c.key === 'pregnancy.list' || (isSochib && c.key === 'birth')),
        }
      : it));


  const activePill = theme.suraha.activePillBg;
  const activeText = theme.suraha.activePillText;

  // Segment-exact: /appointment must not light up while on /appointment-schedule, but
  // /appointment/12 must.
  const isRouteActive = (route: string) =>
    route === '/app'
      ? location.pathname === '/app'
      : location.pathname === route || location.pathname.startsWith(route + '/');

  const itemActive = (item: Item) =>
    item.route ? isRouteActive(item.route) : active === item.key;

  // A group stands open whenever the page you are on lives inside it, until you fold it by hand.
  const groupOpen = (item: Item) =>
    open[item.key] ?? !! item.children?.some((c) => c.route && isRouteActive(c.route));

  const handleItemClick = (item: Item) => {
    if (item.route) navigate(item.route);
    else if (item.children) setOpen((o) => ({ ...o, [item.key]: ! groupOpen(item) }));
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

  const renderChild = (c: Child) => (
    <Tooltip key={c.key} title={collapsed ? c.label : ''} placement="right">
      <ListItemButton
        sx={{
          ...rowSx(c.route ? isRouteActive(c.route) : active === c.key),
          ...(collapsed && { justifyContent: 'center', mx: 1, px: 0 }),
        }}
        onClick={() => (c.route ? navigate(c.route) : setActive(c.key))}
      >
        <ListItemIcon sx={collapsed ? { minWidth: 0 } : { minWidth: 34 }}>{c.icon}</ListItemIcon>
        {! collapsed && <ListItemText primary={c.label} primaryTypographyProps={{ fontSize: 14.5 }} />}
      </ListItemButton>
    </Tooltip>
  );

  // One row shape for every list, so a section is just a different set of items.
  const renderItem = (item: Item) => {
    const isActive = itemActive(item);
    const isOpen = groupOpen(item);

    return (
      <Box key={item.key}>
        <Tooltip title={collapsed ? item.label : ''} placement="right">
          <ListItemButton
            sx={{ ...rowSx(isActive), ...(collapsed && { justifyContent: 'center', mx: 1, px: 0 }) }}
            onClick={() => {
              // A group cannot show its children on the rail, so opening one unfolds the sidebar.
              if (collapsed && item.children) setCollapsed(false);
              handleItemClick(item);
            }}
          >
            <ListItemIcon sx={collapsed ? { minWidth: 0 } : undefined}>{item.icon}</ListItemIcon>
            {! collapsed && (
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 15, fontWeight: 500 }} />
            )}
            {! collapsed && item.children ? (
              isOpen ? (
                <ExpandMoreRoundedIcon sx={{ color: 'text.secondary' }} />
              ) : (
                <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />
              )
            ) : null}
          </ListItemButton>
        </Tooltip>
        {item.children && ! collapsed ? (
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
      data-tour="sidebar"
      sx={{
        width: collapsed ? SIDEBAR_RAIL : SIDEBAR_WIDTH,
        transition: 'width 180ms ease',
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: theme.suraha.sidebarBg,
      }}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {/* Brand — logo and wordmark both stay when folded, stacked so they fit the rail. */}
      <Box
        onClick={() => navigate('/app')}
        sx={{
          display: 'flex',
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0.25 : 1.25,
          px: collapsed ? 0.5 : 2.5,
          py: 2,
          cursor: 'pointer',
          '&:hover .brand-word': { color: 'primary.main' },
        }}
      >
        <Box
          component="img"
          src="/logo.png"
          alt={S.appName}
          sx={{
            width: collapsed ? 50 : 52,
            height: collapsed ? 50 : 52,
            transition: 'width 180ms ease, height 180ms ease',
          }}
        />
        <Typography
          className="brand-word"
          noWrap
          sx={{
            flex: collapsed ? 'none' : 1,
            fontSize: collapsed ? 17 : 27,
            fontWeight: 700,
            lineHeight: 1.2,
            transition: 'color 120ms ease',
          }}
        >
          {S.appName}
        </Typography>
        {! collapsed && (
          <Tooltip title={S.nav.collapse} placement="right">
            <IconButton
              size="small"
              aria-label={S.nav.collapse}
              onClick={(e) => {
                e.stopPropagation();   // the brand row navigates; the chevron must not
                toggleCollapsed();
              }}
            >
              <ChevronLeftRoundedIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Folded: the only way back out, so it gets its own row. The wrapper does the centring —
          the scroll container is not a flex box, so alignSelf on the button would do nothing. */}
      {collapsed && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Tooltip title={S.nav.expand} placement="right">
            <IconButton onClick={toggleCollapsed} aria-label={S.nav.expand}>
              <ChevronRightRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <List disablePadding>{topItems.map(renderItem)}</List>

      {/* নাগরিক সেবা — the citizen-facing modules */}
      {services.length > 0 && (
        <>
          <SectionHeader label={S.nav.sectionServices} collapsed={collapsed} />
          <List disablePadding data-tour="services">{services.map(renderItem)}</List>
        </>
      )}

      {/* ড্যাশবোর্ড পরিচালনা — only officer-managers (UNO / SEAL) */}
      {(user?.role === 'uno' || user?.role === 'seal_admin') && (
        <>
          <SectionHeader label={S.nav.sectionOfficer} collapsed={collapsed} />
          <List disablePadding>
{management.map(renderChild)}
          </List>
        </>
      )}

      {/* সাধারণ তথ্য section — managed by UNO / SEAL */}
      {isManager && (
        <>
          <SectionHeader
            label={S.nav.sectionGeneral}
            collapsed={collapsed}
            action={<AddRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />}
          />
          <List disablePadding sx={{ pb: 3 }}>
{generalSection.map(renderChild)}
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
