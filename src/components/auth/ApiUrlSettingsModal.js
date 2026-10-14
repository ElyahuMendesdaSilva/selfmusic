import { useMemo, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApiConfig } from '../../context/ApiConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { withAlpha } from '../../theme/themes';

export default function ApiUrlSettingsModal({ visible, onClose }) {
  const { apiUrl, saveApiUrl } = useApiConfig();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [value, setValue] = useState(apiUrl);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setValue(apiUrl);
  }, [visible, apiUrl]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveApiUrl(value);
      onClose();
    } catch (error) {
      Alert.alert('URL inválida', error.message || 'Informe uma URL válida.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>URL da API</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://exemplo.com/api"
            placeholderTextColor={withAlpha(colors.text, 0.45)}
            style={styles.input}
            editable={!saving}
            selectTextOnFocus
          />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} disabled={saving} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={handleSave} disabled={saving} style={styles.save}>
              <Text style={styles.saveText}>{saving ? 'Salvando…' : 'Salvar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.58)', justifyContent: 'center', padding: 24 },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 16 },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    input: { borderWidth: 1, borderColor: withAlpha(colors.text, 0.2), color: colors.text, borderRadius: 10, paddingHorizontal: 12, height: 48, fontSize: 14 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    cancel: { paddingHorizontal: 16, height: 42, justifyContent: 'center' },
    cancelText: { color: colors.text, fontWeight: '600' },
    save: { backgroundColor: colors.accent, paddingHorizontal: 18, height: 42, justifyContent: 'center', borderRadius: 21 },
    saveText: { color: colors.onAccent, fontWeight: '700' },
  });
}
