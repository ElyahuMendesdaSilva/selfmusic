import { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/ThemeContext';
import { withAlpha } from '../../theme/themes';

export default function AuthShell({ title, subtitle, children, onOpenApiSettings }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <KeyboardAvoidingView
    style={styles.flex}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
    <ScrollView
    style={styles.flex}
    contentContainerStyle={styles.content}
    keyboardShouldPersistTaps="handled"
    bounces={false}
    >
    {onOpenApiSettings ? (
      <Pressable
      accessibilityRole="button"
      accessibilityLabel="Configurar URL da API"
      onPress={onOpenApiSettings}
      hitSlop={10}
      style={styles.settingsButton}
      >
      <Ionicons name="settings-outline" size={24} color={colors.text} />
      </Pressable>
    ) : null}
    <View style={styles.logo}>
    <Ionicons name="musical-notes" size={34} color={colors.text} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    <View style={styles.card}>{children}</View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 72,
      paddingBottom: 40,
    },
    settingsButton: {
      position: 'absolute',
      top: 24,
      right: 20,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: withAlpha(colors.accent, 0.18),
                           alignItems: 'center',
                           justifyContent: 'center',
                           alignSelf: 'center',
                           marginBottom: 20,
    },
    title: {
      fontSize: 30,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: withAlpha(colors.text, 0.6),
                           textAlign: 'center',
                           marginTop: 6,
                           marginBottom: 24,
    },
    card: {
      marginTop: 8,
      gap: 14,
    },
  });
}
