import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { casino } from '../theme/casinoTheme';

interface Props {
  /** URI `file://` de l'icône réelle, si disponible. */
  icon?: string;
  /** Utilisé pour la première lettre du monogramme si aucune icône n'est disponible. */
  label?: string;
  size: number;
}

/** Icône réelle de l'app (URI `file://`), ou un monogramme doré si elle n'est pas disponible. */
export function AppIcon({ icon, label, size }: Props) {
  if (icon?.startsWith('file://')) {
    return (
      <Image source={{ uri: icon }} style={{ width: size, height: size, borderRadius: size * 0.22 }} />
    );
  }

  const initial = label?.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[
        styles.monogram,
        { width: size, height: size, borderRadius: size * 0.22, borderColor: casino.gold },
      ]}>
      <Text style={[styles.monogramText, { color: casino.gold, fontSize: size * 0.48 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  monogram: {
    backgroundColor: casino.surfaceAlt,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontWeight: '800',
  },
});
