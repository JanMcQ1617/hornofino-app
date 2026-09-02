// Fila de sellos estilo tarjeta ponchada: 6 sellos = quesito gratis.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StampEmptyIcon, StampFullIcon } from '@/components/icons';
import { colors, fonts, space, textSize } from '@/lib/theme';

export function StampRow({
  stamps,
  goal,
  size = 32,
}: {
  stamps: number;
  goal: number;
  size?: number;
}) {
  const total = Math.max(goal, 1);
  const filled = Math.max(0, Math.min(stamps, total));
  return (
    <View
      style={styles.row}
      accessibilityRole="image"
      accessibilityLabel={`${filled} de ${total} sellos hacia tu quesito gratis`}
    >
      {Array.from({ length: total }, (_, i) =>
        i < filled ? (
          <StampFullIcon key={i} size={size} />
        ) : (
          <StampEmptyIcon key={i} size={size} />
        ),
      )}
    </View>
  );
}

export function stampsCopy(stamps: number, goal: number): string {
  const left = Math.max(0, goal - stamps);
  if (left === 0) return '¡Tarjeta llena! Tu quesito te espera.';
  if (left === 1) return 'Te falta 1 pa’l quesito';
  return `Te faltan ${left} pa’l quesito`;
}

export function StampsSummary({ stamps, goal }: { stamps: number; goal: number }) {
  return (
    <View style={{ gap: space.sm }}>
      <StampRow stamps={stamps} goal={goal} />
      <Text style={styles.copy}>{stampsCopy(stamps, goal)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  copy: {
    fontFamily: fonts.uiMedium,
    fontSize: textSize.small,
    color: colors.verdeInk,
  },
});
