import { useCallback, useEffect, useState } from 'react';
import { Column, Host, ListItem, Switch, Text, TextButton } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { getUserPlaylistsEnabled, listSettings, setRegistrationEnabled, setUserPlaylistsEnabled } from '../services/adminService';
import { useTheme } from '../context/ThemeContext';

export default function AdminSettings() {
  const { theme } = useTheme();
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [all, playlists] = await Promise.all([listSettings(), getUserPlaylistsEnabled()]);
      const values = Object.fromEntries((all || []).map((item) => [item.key, item.value === 'true']));
      values.allow_user_playlists = playlists.value === 'true';
      setSettings(values);
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar as configurações.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (key, value) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (key === 'allow_user_registration') await setRegistrationEnabled(value);
      else await setUserPlaylistsEnabled(value);
      setSettings((current) => ({ ...current, [key]: value }));
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível salvar a configuração.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }} seedColor={theme.colors.accent} colorScheme="dark">
      <Column modifiers={[fillMaxWidth()]}>
        <Text style={{ typography: 'titleMedium' }}>Administração</Text>
        {!settings ? (
          <Text>{error ? 'As configurações não puderam ser carregadas.' : 'Carregando…'}</Text>
        ) : (
          <>
            <SettingRow label="Novos cadastros" description="Permitir que novas pessoas criem uma conta" value={!!settings.allow_user_registration} disabled={busy} onChange={(value) => update('allow_user_registration', value)} />
            <SettingRow label="Playlists pessoais" description="Permitir que usuários criem playlists" value={!!settings.allow_user_playlists} disabled={busy} onChange={(value) => update('allow_user_playlists', value)} />
          </>
        )}
        {error ? <Column modifiers={[fillMaxWidth()]}><Text>{error}</Text><TextButton onClick={load} enabled={!busy}><Text>Tentar novamente</Text></TextButton></Column> : null}
      </Column>
    </Host>
  );
}

function SettingRow({ label, description, value, disabled, onChange }) {
  return (
    <ListItem>
      <ListItem.HeadlineContent><Text>{label}</Text></ListItem.HeadlineContent>
      <ListItem.SupportingContent><Text>{description}</Text></ListItem.SupportingContent>
      <ListItem.TrailingContent><Switch value={value} enabled={!disabled} onCheckedChange={onChange} /></ListItem.TrailingContent>
    </ListItem>
  );
}
