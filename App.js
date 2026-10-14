import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import BottomBar from './src/components/bottomBar';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import AccountScreen from './src/screens/AccountScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { PlayerProvider } from './src/context/PlayerContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { DataCacheProvider } from './src/context/DataCacheContext';
import { ApiConfigProvider } from './src/context/ApiConfigContext';
import { CapabilitiesProvider } from './src/context/CapabilitiesContext';
import NowPlayingBar from './src/components/NowPlayingBar';
import PlayerScreen from './src/screens/PlayerScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import UpdatesScreen from './src/screens/UpdatesScreen';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

function AppContent() {
  const { status } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState('inicio');
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playlistId, setPlaylistId] = useState(null);
  const [updatesVisible, setUpdatesVisible] = useState(false);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (playerVisible) { setPlayerVisible(false); return true; }
      if (updatesVisible) { setUpdatesVisible(false); return true; }
      if (playlistId) { setPlaylistId(null); return true; }
      if (activeTab !== 'inicio') { setActiveTab('inicio'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [activeTab, playerVisible, playlistId, updatesVisible]);

  if (status === 'loading') {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.primary, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <StatusBar style="light" />
      </View>
    );
  }

  if (status === 'signedOut') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.primary, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {authMode === 'register' ? (
        <RegisterScreen onSwitchToLogin={() => setAuthMode('login')} />
      ) : (
        <LoginScreen onSwitchToRegister={() => setAuthMode('register')} />
      )}
      <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
    <View style={[styles.tabContent, { paddingTop: insets.top }]}>
    <View style={[styles.tabScreen, activeTab !== 'inicio' && styles.hiddenTab]}><HomeScreen /></View>
    <View style={[styles.tabScreen, activeTab !== 'buscar' && styles.hiddenTab]}><SearchScreen /></View>
    <View style={[styles.tabScreen, activeTab !== 'biblioteca' && styles.hiddenTab]}><LibraryScreen onOpenPlaylist={setPlaylistId} /></View>
    <View style={[styles.tabScreen, activeTab !== 'configuracoes' && styles.hiddenTab]}><AccountScreen onOpenUpdates={() => setUpdatesVisible(true)} /></View>
    </View>
    <BottomBar selected={activeTab} onSelect={setActiveTab} />
    {playlistId ? <PlaylistScreen playlistId={playlistId} onClose={() => setPlaylistId(null)} /> : null}
    {!playerVisible ? <NowPlayingBar onOpenPlayer={() => setPlayerVisible(true)} /> : null}
    {updatesVisible ? <UpdatesScreen onClose={() => setUpdatesVisible(false)} /> : null}
    {playerVisible ? <PlayerScreen onClose={() => setPlayerVisible(false)} /> : null}
    <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <ApiConfigProvider>
    <AuthProvider>
    <CapabilitiesProvider>
    <DataCacheProvider>
    <PlayerProvider>
    <SafeAreaProvider initialMetrics={initialWindowMetrics}><AppContent /></SafeAreaProvider>
    </PlayerProvider>
    </DataCacheProvider>
    </CapabilitiesProvider>
    </AuthProvider>
    </ApiConfigProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  tabScreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hiddenTab: { display: 'none' },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
