import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useTheme } from '../context/ThemeContext';
import { useApiConfig } from '../context/ApiConfigContext';
import { withAlpha } from '../theme/themes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const updatesAvailable = Updates.isEnabled && !__DEV__;

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

export default function UpdatesScreen({ onClose }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { apiUrl } = useApiConfig();
  const [busy, setBusy] = useState(false);
  const [readyToReload, setReadyToReload] = useState(false);
  const [status, setStatus] = useState('');
  const [lastCheck, setLastCheck] = useState(null);

  const checkForUpdates = async () => {
    if (busy || !updatesAvailable) return;
    setBusy(true);
    setStatus('Verificando atualizações…');
    setReadyToReload(false);
    try {
      const check = await Updates.checkForUpdateAsync();
      setLastCheck(new Date());
      if (!check.isAvailable) {
        setStatus('O aplicativo já está atualizado.');
        return;
      }
      setStatus('Baixando atualização…');
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew || result.isRollBackToEmbedded) {
        setReadyToReload(true);
        setStatus('Atualização baixada. Reinicie o app para aplicá-la.');
      } else {
        setStatus('Não há uma atualização nova para instalar.');
      }
    } catch (error) {
      setStatus(error?.message || 'Não foi possível verificar atualizações.');
    } finally {
      setBusy(false);
    }
  };

  const reloadWithUpdate = async () => {
    if (!readyToReload || busy) return;
    setBusy(true);
    try {
      await Updates.reloadAsync();
    } catch (error) {
      setStatus(error?.message || 'Não foi possível reiniciar o aplicativo.');
      setBusy(false);
    }
  };

  const origin = Updates.isEmbeddedLaunch ? 'Instalada no app' : Updates.updateId ? 'Atualização OTA' : '—';
  const expoConfig = Constants.expoConfig;

  return (
    <View style={[styles.root, { paddingTop: 8 + insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Atualizações</Text>
          <Text style={styles.subtitle}>Versão e informações do aplicativo</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Versão instalada</Text>
        <View style={styles.card}>
          <InfoRow styles={styles} label="Versão do app" value={expoConfig?.version || '—'} />
          <InfoRow styles={styles} label="Canal" value={Updates.channel || '—'} />
          <InfoRow styles={styles} label="Runtime" value={Updates.runtimeVersion || '—'} />
          <InfoRow styles={styles} label="Origem" value={origin} last />
        </View>

        <Text style={styles.sectionTitle}>Atualização em uso</Text>
        <View style={styles.card}>
          <InfoRow styles={styles} label="ID da atualização" value={Updates.updateId || 'Nenhuma (versão embutida)'} />
          <InfoRow styles={styles} label="Publicada em" value={formatDate(Updates.createdAt)} />
          <InfoRow styles={styles} label="Inicialização de emergência" value={Updates.isEmergencyLaunch ? 'Sim' : 'Não'} />
          {Updates.isEmergencyLaunch && Updates.emergencyLaunchReason ? (
            <InfoRow styles={styles} label="Motivo" value={String(Updates.emergencyLaunchReason)} />
          ) : null}
          <InfoRow styles={styles} label="Última verificação" value={lastCheck ? formatDate(lastCheck) : 'Nesta sessão: nenhuma'} last />
        </View>

        <Text style={styles.sectionTitle}>Aplicativo</Text>
        <View style={styles.card}>
          <InfoRow styles={styles} label="Nome" value={expoConfig?.name || '—'} />
          <InfoRow styles={styles} label="Pacote" value={expoConfig?.android?.package || '—'} />
          <InfoRow styles={styles} label="Expo SDK" value={expoConfig?.sdkVersion || '—'} />
          <InfoRow styles={styles} label="Plataforma" value={`${Platform.OS} ${Platform.Version}`} />
          <InfoRow styles={styles} label="Ambiente" value={__DEV__ ? 'Desenvolvimento' : 'Produção'} />
          <InfoRow styles={styles} label="API conectada" value={apiUrl || '—'} last />
        </View>

        {!updatesAvailable ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={22} color={colors.accent} />
            <Text style={styles.noticeText}>
              A busca de atualizações funciona em builds instaladas com expo-updates. Não está disponível no Expo Go nem durante o desenvolvimento. Instale uma nova build EAS para ativar esse recurso.
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Atualizações do aplicativo</Text>
        <View style={styles.card}>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={checkForUpdates}
              disabled={!updatesAvailable || readyToReload || busy}
              style={({ pressed }) => [
                styles.button,
                (!updatesAvailable || readyToReload) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {busy && !readyToReload ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={18} color={colors.onAccent} />
                  <Text style={styles.buttonText}>Verificar atualizações</Text>
                </>
              )}
            </Pressable>
            {readyToReload ? (
              <Pressable
                accessibilityRole="button"
                onPress={reloadWithUpdate}
                disabled={busy}
                style={({ pressed }) => [styles.button, styles.tonalButton, pressed && styles.pressed]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <>
                    <Ionicons name="reload-outline" size={18} color={colors.accent} />
                    <Text style={[styles.buttonText, styles.tonalButtonText]}>Reiniciar para atualizar</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
          {!!status && (
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              {status}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ styles, label, value, last }) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    root: { position: 'absolute', inset: 0, zIndex: 30, backgroundColor: colors.primary },
    header: {
      minHeight: 64,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
    },
    backButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    title: { fontSize: 22, lineHeight: 28, fontWeight: '600', color: colors.text, letterSpacing: 0 },
    subtitle: { fontSize: 14, lineHeight: 20, color: withAlpha(colors.text, 0.68), marginTop: 2 },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48, gap: 8 },
    sectionTitle: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
      color: colors.text,
      letterSpacing: 0.1,
      marginTop: 16,
      marginBottom: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: withAlpha(colors.text, 0.08),
      elevation: 1,
    },
    infoRow: {
      minHeight: 64,
      justifyContent: 'center',
      gap: 3,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: withAlpha(colors.text, 0.14),
    },
    infoRowLast: { borderBottomWidth: 0 },
    label: { color: withAlpha(colors.text, 0.68), fontSize: 12, lineHeight: 16, fontWeight: '500' },
    value: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '500' },
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: withAlpha(colors.accent, 0.12),
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, 0.2),
      marginTop: 12,
    },
    noticeText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
    actions: { padding: 16, gap: 12 },
    button: {
      minHeight: 48,
      paddingHorizontal: 20,
      borderRadius: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.accent,
    },
    tonalButton: {
      backgroundColor: withAlpha(colors.accent, 0.16),
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, 0.3),
    },
    buttonText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.onAccent },
    tonalButtonText: { color: colors.accent },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.7 },
    status: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
  });
}
