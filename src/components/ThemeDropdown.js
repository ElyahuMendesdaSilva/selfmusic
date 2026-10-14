import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme } from '../context/ThemeContext';
import { withAlpha } from '../theme/themes';

export default function ThemeDropdown() {
  const { theme, themes, themeId, setTheme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tema atual: ${theme.name}`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <View style={styles.selectedTheme}>
          <ThemeSwatch colors={colors} styles={styles} />
          <View style={styles.selectedCopy}>
            <Text style={styles.selectedLabel}>Tema selecionado</Text>
            <Text style={styles.selectedName}>{theme.name}</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={withAlpha(colors.text, 0.72)}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.options}>
          {themes.map((item) => {
            const selected = item.id === themeId;

            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}${selected ? ', selecionado' : ''}`}
                accessibilityState={{ selected }}
                onPress={() => {
                  setTheme(item.id);
                  setExpanded(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.selectedOption,
                  pressed && styles.pressed,
                ]}
              >
                <ThemeSwatch colors={item.colors} styles={styles} />
                <Text style={styles.optionName}>{item.name}</Text>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function ThemeSwatch({ colors, styles }) {
  return (
    <View style={[styles.swatch, { backgroundColor: colors.primary }]}>
      <View style={[styles.swatchAccent, { backgroundColor: colors.accent }]} />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    trigger: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: withAlpha(colors.text, 0.045),
      borderWidth: 1,
      borderColor: withAlpha(colors.text, 0.09),
    },
    selectedTheme: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    selectedCopy: {
      gap: 2,
    },
    selectedLabel: {
      color: withAlpha(colors.text, 0.62),
      fontSize: 11,
      lineHeight: 15,
    },
    selectedName: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600',
    },
    swatch: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      padding: 4,
      borderWidth: 1,
      borderColor: withAlpha(colors.text, 0.14),
    },
    swatchAccent: {
      width: 13,
      height: 13,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: withAlpha('#FFFFFF', 0.58),
    },
    options: {
      padding: 5,
      borderRadius: 16,
      backgroundColor: withAlpha(colors.text, 0.035),
      borderWidth: 1,
      borderColor: withAlpha(colors.text, 0.08),
    },
    option: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    selectedOption: {
      backgroundColor: withAlpha(colors.accent, 0.12),
    },
    optionName: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
