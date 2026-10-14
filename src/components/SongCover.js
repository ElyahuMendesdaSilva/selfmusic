import { memo, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { withAlpha } from '../theme/themes';

/** A thumbnail has a fixed, small layout. Keeping its source stable lets the
 * native image cache be reused when a virtualized row comes back on screen. */
function SongCover({ uri, size = 48, radius = 8, color, iconSize = 20, style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const source = useMemo(
    () => (uri && !failed ? { uri, cache: 'force-cache' } : null),
    [uri, failed]
  );

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: radius, backgroundColor: withAlpha(color, 0.1) }, style]}>
      {source ? (
        <Image source={source} style={styles.image} resizeMode="cover" onError={() => setFailed(true)} />
      ) : (
        <Ionicons name="musical-note" size={iconSize} color={color} />
      )}
    </View>
  );
}

export default memo(SongCover);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
