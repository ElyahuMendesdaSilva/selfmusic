import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import AuthShell from '../components/auth/AuthShell';
import FormField from '../components/auth/FormField';
import PrimaryButton from '../components/auth/PrimaryButton';
import ApiUrlSettingsModal from '../components/auth/ApiUrlSettingsModal';
import { useAuth } from '../context/AuthContext';
import { useApiConfig } from '../context/ApiConfigContext';
import { useTheme } from '../context/ThemeContext';
import { apiPing } from '../services/apiClient';
import { withAlpha } from '../theme/themes';

export default function LoginScreen({ onSwitchToRegister }) {
  const { signIn } = useAuth();
  const { apiUrl } = useApiConfig();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const handleSubmit = async () => {
    const nextErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Informe um e-mail válido.';
    }
    if (!password) {
      nextErrors.password = 'Informe sua senha.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error) {
      Alert.alert('Falha no login', error.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await apiPing();
    setTestResult(result);
    setTesting(false);
  };

  return (
    <AuthShell
      title="Bem-vindo de volta"
      subtitle="Entre para acessar sua biblioteca de músicas."
      onOpenApiSettings={() => setSettingsVisible(true)}
    >
      <FormField
        icon="mail-outline"
        label="E-mail"
        placeholder="voce@exemplo.com"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <FormField
        icon="lock-closed-outline"
        label="Senha"
        placeholder="Sua senha"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      <PrimaryButton title="Entrar" onPress={handleSubmit} loading={loading} />
      <View style={styles.connectionCard}>
        <Ionicons name="server-outline" size={18} color={withAlpha(colors.text, 0.6)} />
        <View style={styles.connectionInfo}>
          <Text style={styles.connectionLabel}>API</Text>
          <Text style={styles.connectionUrl} numberOfLines={1}>
            {apiUrl}
          </Text>
          {testResult ? (
            <Text style={[styles.connectionResult, testResult.connected && styles.connectionOk]}>
              {testResult.message}
            </Text>
          ) : null}
        </View>
        {testing ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={handleTestConnection}>
            <Text style={styles.connectionTest}>Testar</Text>
          </Pressable>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onSwitchToRegister}
        style={styles.switchContainer}
      >
        <Text style={styles.switchText}>
          Não tem conta? <Text style={styles.switchLink}>Criar conta</Text>
        </Text>
      </Pressable>
      <ApiUrlSettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </AuthShell>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  switchContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    fontSize: 14,
    color: withAlpha(colors.text, 0.6),
  },
  switchLink: {
    color: colors.accent,
    fontWeight: '700',
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: withAlpha(colors.text, 0.06),
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: withAlpha(colors.text, 0.7),
  },
  connectionUrl: {
    fontSize: 13,
    color: colors.text,
    marginTop: 1,
  },
  connectionResult: {
    fontSize: 12,
    color: '#ff9b9b',
    marginTop: 2,
  },
  connectionOk: {
    color: colors.accent,
  },
  connectionTest: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  });
}
