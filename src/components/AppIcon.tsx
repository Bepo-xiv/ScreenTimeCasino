import React from 'react';
import { Image, Text } from 'react-native';

interface Props {
  icon: string;
  size: number;
}

/** Affiche l'icône réelle d'une app (URI `file://`), ou le texte tel quel si ce n'en est pas une. */
export function AppIcon({ icon, size }: Props) {
  if (icon.startsWith('file://')) {
    return <Image source={{ uri: icon }} style={{ width: size, height: size, borderRadius: size * 0.2 }} />;
  }
  return <Text style={{ fontSize: size * 0.9 }}>{icon}</Text>;
}
