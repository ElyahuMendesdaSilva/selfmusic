import { Host, Icon, NavigationBar, NavigationBarItem, Text } from '@expo/ui/jetpack-compose';
import Home from '@expo/material-symbols/home.xml';
import Search from '@expo/material-symbols/search.xml';
import LibraryMusic from '@expo/material-symbols/library_music.xml';
import Settings from '@expo/material-symbols/settings.xml';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { key: 'inicio', label: 'Início', icon: Home },
  { key: 'buscar', label: 'Buscar', icon: Search },
  { key: 'biblioteca', label: 'Biblioteca', icon: LibraryMusic },
  { key: 'configuracoes', label: 'Conta', icon: Settings },
];

export default function BottomBar({ selected, onSelect }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  return (
    <Host matchContents={{ vertical: true }} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%' }} seedColor={colors.accent} colorScheme="dark">
      <NavigationBar containerColor={colors.surface} contentColor={colors.text} tonalElevation={3}>
        {TABS.map((tab) => <NavigationBarItem key={tab.key} selected={selected === tab.key} onClick={() => onSelect(tab.key)} alwaysShowLabel colors={{ selectedIconColor: colors.onAccent, selectedTextColor: colors.text, selectedIndicatorColor: colors.accent, unselectedIconColor: colors.muted, unselectedTextColor: colors.muted }}>
          <NavigationBarItem.Icon><Icon source={tab.icon} tint={selected === tab.key ? colors.onAccent : colors.muted} /></NavigationBarItem.Icon>
          <NavigationBarItem.Label><Text>{tab.label}</Text></NavigationBarItem.Label>
        </NavigationBarItem>)}
      </NavigationBar>
    </Host>
  );
}
