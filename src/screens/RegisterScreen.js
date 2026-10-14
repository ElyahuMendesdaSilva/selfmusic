import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import AuthShell from '../components/auth/AuthShell';
import FormField from '../components/auth/FormField';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { withAlpha } from '../theme/themes';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ onSwitchToLogin }) {
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const nextErrors = {};

    if (username.trim().length < 3) {
      nextErrors.username = 'O usuário precisa ter pelo menos 3 caracteres.';
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Informe um e-mail válido.';
    }
    if (password.length < 8) {
      nextErrors.password = 'A senha precisa ter pelo menos 8 caracteres.';
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'As senhas não coincidem.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await signUp({ username: username.trim(), email: email.trim(), password });
    } catch (error) {
      Alert.alert('Falha no cadastro', error.message || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Cadastre-se para usar o app de música."
    >
      <FormField
        icon="person-outline"
        label="Usuário"
        placeholder="Escolha um usuário"
        value={username}
        onChangeText={setUsername}
        error={errors.username}
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
      />
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
        placeholder="Mínimo de 8 caracteres"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="next"
      />
      <FormField
        icon="lock-closed-outline"
        label="Confirmar senha"
        placeholder="Repita a senha"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      <PrimaryButton title="Criar conta" onPress={handleSubmit} loading={loading} />
      <Pressable
        accessibilityRole="button"
        onPress={onSwitchToLogin}
        style={styles.switchContainer}
      >
        <Text style={styles.switchText}>
          Já tem conta? <Text style={styles.switchLink}>Entrar</Text>
        </Text>
      </Pressable>
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
  });
}
