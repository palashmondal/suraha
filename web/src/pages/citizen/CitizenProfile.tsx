import { Avatar, Box, Button, Card, Divider, List, ListItem, ListItemText, Typography, useTheme } from '@mui/material';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useNavigate } from 'react-router-dom';
import { bnStrings as S } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { bn } from '../../utils/bnNum';

export default function CitizenProfile() {
  const theme = useTheme();
  const nav = useNavigate();
  const { user, logout } = useAuth();

  const onLogout = () => {
    logout();
    nav('/citizen/login', { replace: true });
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {S.citizen.profile}
      </Typography>

      <Card elevation={0} sx={{ p: 2.5, mb: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: theme.palette.primary.main, fontSize: 22 }}>না</Avatar>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 17 }}>{user?.name}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{user?.designation}</Typography>
        </Box>
      </Card>

      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, mb: 2 }}>
        <List disablePadding>
          <ListItem>
            <ListItemText primary={S.auth.mobile} secondary={user?.mobile ? bn(user.mobile) : '—'} />
          </ListItem>
          <Divider component="li" />
          <ListItem>
            <ListItemText primary="উপজেলা" secondary={user?.upazila ?? '—'} />
          </ListItem>
        </List>
      </Card>

      <Button fullWidth variant="outlined" color="error" startIcon={<LogoutRoundedIcon />} onClick={onLogout}>
        {S.citizen.logout}
      </Button>
    </Box>
  );
}
