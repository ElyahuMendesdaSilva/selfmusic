import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useAuth } from '../context/AuthContext';
import { useApiConfig } from '../context/ApiConfigContext';
import { useTheme } from '../context/ThemeContext';
import ThemeDropdown from '../components/ThemeDropdown';
import AdminSettings from '../components/AdminSettings';
import { withAlpha } from '../theme/themes';

export default function AccountScreen({ onOpenUpdates }) {
  const { user, signOut } = useAuth();
  const { apiUrl } = useApiConfig();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setLoading(false);
    }
  };

  const username = user?.username || 'Conta';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.title}>Configurações</Text>
        <Text style={styles.subtitle}>Sua conta e preferências do aplicativo</Text>
      </View>

      <View style={styles.accountCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{username.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName} numberOfLines={1}>{username}</Text>
          {user?.email ? <Text style={styles.accountEmail} numberOfLines={1}>{user.email}</Text> : null}
          {user?.role === 'admin' ? (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Administrador</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.settingsPanel}>
        <SectionTitle title="Preferências" styles={styles} />
        <View style={styles.preferenceHeading}>
          <View style={styles.iconContainer}>
            <Ionicons name="color-palette-outline" size={20} color={colors.accent} />
          </View>
          <View style={styles.preferenceCopy}>
            <Text style={styles.rowTitle}>Aparência</Text>
            <Text style={styles.rowDescription}>Escolha as cores do aplicativo</Text>
          </View>
        </View>
        <View style={styles.themePicker}>
          <ThemeDropdown />
        </View>

        <SectionTitle title="Conexão" styles={styles} />
        <View style={styles.infoRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="server-outline" size={20} color={colors.accent} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Servidor conectado</Text>
            <Text style={styles.rowDescription} numberOfLines={2}>{apiUrl}</Text>
          </View>
          <View style={styles.statusDot} />
        </View>

        <SectionTitle title="Aplicativo" styles={styles} />
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpenUpdates?.()}
          style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-download-outline" size={20} color={colors.accent} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Atualizações</Text>
            <Text style={styles.rowDescription}>Versão e informações do aplicativo</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={withAlpha(colors.text, 0.62)} />
        </Pressable>

        {user?.role === 'admin' ? (
          <View style={styles.nativeSection}>
            <AdminSettings />
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: loading }}
        onPress={handleSignOut}
        disabled={loading}
        style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed, loading && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons name="log-out-outline" size={20} color={colors.accent} />
        )}
        <Text style={styles.signOutText}>{loading ? 'Saindo…' : 'Sair da conta'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function SectionTitle({ title, styles }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 152,
      gap: 14,
    },
    settingsPanel: {
      padding: 16,
      borderRadius: 24,
      backgroundColor: withAlpha(colors.text, 0.065),
      borderWidth: 1,
      borderColor: withAlpha(colors.text, 0.045),
    },
    pageHeader: {
      marginBottom: 8,
      gap: 5,
    },
    title: {
      color: colors.text,
      fontSize: 30,
      lineHeight: 38,
      fontWeight: '700',
      letterSpacing: 0,
    },
    subtitle: {
      color: withAlpha(colors.text, 0.68),
      fontSize: 14,
      lineHeight: 20,
    },
    accountCard: {
      minHeight: 92,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 16,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: withAlpha(colors.text, 0.12),
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    avatarText: {
      color: colors.onAccent,
      fontSize: 22,
      fontWeight: '700',
    },
    accountInfo: {
      flex: 1,
      gap: 3,
    },
    accountName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
    accountEmail: {
      color: withAlpha(colors.text, 0.68),
      fontSize: 13,
    },
    roleBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 9,
      paddingVertical: 3,
      marginTop: 4,
      borderRadius: 8,
      backgroundColor: withAlpha(colors.accent, 0.18),
    },
    roleText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '600',
    },
    sectionTitle: {
      color: colors.accent,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      letterSpacing: 0.3,
      paddingHorizontal: 0,
    },
    preferenceHeading: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 0,
    },
    preferenceCopy: {
      flex: 1,
      gap: 4,
    },
    iconContainer: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: withAlpha(colors.accent, 0.12),
    },
    rowCopy: {
      flex: 1,
      gap: 4,
    },
    rowTitle: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '500',
    },
    rowDescription: {
      color: withAlpha(colors.text, 0.66),
      fontSize: 13,
      lineHeight: 18,
    },
    themePicker: {
      paddingHorizontal: 0,
      paddingTop: 4,
      paddingBottom: 14,
    },
    infoRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 0,
      paddingVertical: 12,
    },
    statusDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      marginLeft: 4,
      backgroundColor: colors.accent,
    },
    actionRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 0,
      paddingVertical: 12,
    },
    pressed: {
      opacity: 0.72,
    },
    nativeSection: {
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: withAlpha(colors.text, 0.12),
      overflow: 'hidden',
    },
    signOutButton: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 0,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, 0.5),
      backgroundColor: withAlpha(colors.accent, 0.07),
    },
    signOutText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '600',
    },
    disabled: {
      opacity: 0.6,
    },
  });
}
