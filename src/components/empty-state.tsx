// Estados vacíos / de error / de carga con palabras — nunca un spinner solo.

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/components/buttons';
import { colors, fonts, space, textSize } from '@/lib/theme';

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <GhostButton label={actionLabel} onPress={onAction} style={{ marginTop: space.lg }} />
      ) : null}
    </View>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.wrap} accessibilityLabel={label} accessibilityRole="progressbar">
      <ActivityIndicator color={colors.verde} />
      <Text style={[styles.body, { marginTop: space.md }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Ay, algo falló</Text>
      <Text style={styles.body}>{message}</Text>
      {onRetry ? (
        <GhostButton label="Volver a intentar" onPress={onRetry} style={{ marginTop: space.lg }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: textSize.h2,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  body: {
    fontFamily: fonts.ui,
    fontSize: textSize.body,
    lineHeight: 21,
    color: colors.inkSoft,
    textAlign: 'center',
  },
});
