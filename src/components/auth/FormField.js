import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/ThemeContext';
import { withAlpha } from '../../theme/themes';

export default function FormField({ icon, label, error, secureTextEntry, ...inputProps }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error && styles.inputRowError]}>
        {icon ? (
          <Ionicons name={icon} size={18} color={withAlpha(colors.text, 0.55)} />
        ) : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={withAlpha(colors.text, 0.4)}
          autoCapitalize="none"
          autoCorrect={false}
          {...inputProps}
          secureTextEntry={hidden}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
            hitSlop={8}
            onPress={() => setHidden((value) => !value)}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={withAlpha(colors.text, 0.55)}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: withAlpha(colors.text, 0.85),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: withAlpha(colors.text, 0.08),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputRowError: {
    borderColor: '#ff6b6b',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: colors.text,
  },
  error: {
    fontSize: 12,
    color: '#ff9b9b',
  },
  });
}
