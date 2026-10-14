import { Button, FilledTonalButton, Host, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme } from '../../context/ThemeContext';

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const ButtonComponent = variant === 'secondary' ? FilledTonalButton : Button;
  const isDisabled = disabled || loading;

  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }} seedColor={colors.accent} colorScheme="dark">
      <ButtonComponent onClick={onPress} enabled={!isDisabled} modifiers={[fillMaxWidth()]}><Text>{loading ? 'Aguarde…' : title}</Text></ButtonComponent>
    </Host>
  );
}
