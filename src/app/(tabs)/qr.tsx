// Mi QR — el sistema Horno Rewards completo. El código de 6 letras ES la
// cuenta: sin contraseñas, sin correos. QR al frente, tarjeta de sellos 2×3
// con pop al ganar, billetera de premios QSTO y tu actividad reciente.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GhostButton, PrimaryButton } from '@/components/buttons';
import { WALLET_BADGE, WALLET_BADGE_RATIO } from '@/lib/wallet-badge';
import { TAB_BAR_CLEARANCE } from '@/components/floating-tab-bar';
import { TicketIcon } from '@/components/icons';
import { PunchCard } from '@/components/punch-card';
import { stampsCopy } from '@/components/stamps';
import {
  ApiError,
  getWalletHealth,
  normalizeCardCode,
  walletPassUrl,
  type CardHistoryEntry,
} from '@/lib/api';
import { relativeDate } from '@/lib/format';
import { useApp } from '@/lib/state';
import { getStore } from '@/lib/stores';
import { colors, fonts, radius, shadowCard, space, textSize, tracking } from '@/lib/theme';

const K_STAMPS_SEEN = 'hf.stampsSeen';
const K_REWARDS_SEEN = 'hf.rewardsSeen';

function viaCopy(via: CardHistoryEntry['via']): string {
  if (via === 'orden') return 'por orden en línea';
  if (via === 'caja') return 'sello en caja';
  return 'sello';
}

function JoinCard() {
  const { joinCard, recoverCard, name } = useApp();
  const [mode, setMode] = useState<'join' | 'recover'>('join');
  const [joinName, setJoinName] = useState(name);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const swapMode = (next: 'join' | 'recover') => {
    setMode(next);
    setError(null);
  };

  // Al recuperar con éxito el card deja de ser null y esta tarjeta se
  // desmonta sola — por eso no hay estado de "listo" que manejar aquí.
  const recover = async () => {
    setBusy(true);
    setError(null);
    try {
      await recoverCard(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos traer tu tarjeta. Intenta otra vez.');
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const trimmed = joinName.trim();
    if (!trimmed) {
      setError('Dinos tu nombre — con eso basta.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await joinCard(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo crear tu tarjeta. Intenta otra vez.');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'recover') {
    return (
      <View style={styles.joinCard}>
        <Text style={styles.joinKicker}>Horno Rewards</Text>
        <Text style={styles.joinTitle}>Recupera tu tarjeta</Text>
        <Text style={styles.joinBody}>
          Escribe los 6 caracteres que salen debajo de tu QR. Tus sellos siguen ahí: la cuenta es
          el código, no el teléfono.
        </Text>
        <TextInput
          value={code}
          onChangeText={(t) => {
            // Normalizamos mientras escribe: minúsculas a mayúsculas y fuera
            // espacios o guiones. Así lo que se ve es exactamente lo que se envía.
            setCode(normalizeCardCode(t).slice(0, 6));
            if (error) setError(null);
          }}
          placeholder="ABC234"
          placeholderTextColor={colors.inkFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={recover}
          accessibilityLabel="El código de 6 caracteres de tu tarjeta"
          style={[styles.joinInput, styles.codeInput]}
        />
        {error ? <Text style={styles.joinError}>{error}</Text> : null}
        <PrimaryButton
          label="Recuperar mi tarjeta"
          loadingLabel="Buscando tu tarjeta…"
          onPress={recover}
          loading={busy}
          disabled={code.length < 6}
          accessibilityLabel="Recuperar mi tarjeta con el código"
        />
        <GhostButton
          label="Mejor créame una nueva"
          onPress={() => swapMode('join')}
          disabled={busy}
          accessibilityLabel="Volver a crear una tarjeta nueva"
        />
      </View>
    );
  }

  return (
    <View style={styles.joinCard}>
      <Text style={styles.joinKicker}>Horno Rewards</Text>
      <Text style={styles.joinTitle}>6 sellos = un quesito gratis</Text>
      <Text style={styles.joinBody}>
        Nada de contraseñas ni correos. Tu tarjeta es un código de 6 letras — ese código es tu
        cuenta. Cada orden te poncha un sello.
      </Text>
      <TextInput
        value={joinName}
        onChangeText={(t) => {
          setJoinName(t);
          if (error) setError(null);
        }}
        placeholder="¿Cómo te llamas?"
        placeholderTextColor={colors.inkFaint}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="done"
        onSubmitEditing={join}
        accessibilityLabel="Tu nombre para la tarjeta"
        style={styles.joinInput}
      />
      {error ? <Text style={styles.joinError}>{error}</Text> : null}
      <PrimaryButton
        label="Únete gratis"
        loadingLabel="Creando tu tarjeta…"
        onPress={join}
        loading={busy}
        accessibilityLabel="Únete gratis a Horno Rewards"
      />
      <GhostButton
        label="Ya tengo tarjeta"
        onPress={() => swapMode('recover')}
        disabled={busy}
        accessibilityLabel="Ya tengo tarjeta, recuperarla con mi código"
      />
    </View>
  );
}

export default function QrScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { card, refreshCard } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  /** desde qué sello animar el pop (lo último visto); null = quieto */
  const [popFrom, setPopFrom] = useState<number | null>(null);
  /** códigos QSTO que acaban de aparecer — estado de celebración */
  const [freshRewards, setFreshRewards] = useState<string[]>([]);
  /**
   * Apple Wallet: el botón solo existe en iOS y solo si el servidor confirma
   * que puede firmar pases — el mismo interruptor que usa tarjeta.html en el
   * sitio. Se pregunta una vez por montaje; si falla, se queda escondido.
   */
  const [walletReady, setWalletReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshCard();
    }, [refreshCard]),
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    getWalletHealth().then((ok) => {
      if (alive) setWalletReady(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  // El pase es la MISMA tarjeta en otro formato: la URL devuelve el .pkpass
  // firmado y la hoja de Safari (in-app) se lo entrega a Wallet, que muestra
  // su propio "Añadir". Si la hoja no está disponible, Safari de verdad.
  const addToWallet = useCallback(async () => {
    if (!card) return;
    const url = walletPassUrl(card.code);
    Haptics.selectionAsync().catch(() => {});
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url).catch(() => {});
    }
  }, [card]);

  // Compara la tarjeta con lo último visto (AsyncStorage) para disparar
  // el pop de sellos y la celebración de premios nuevos.
  useEffect(() => {
    if (!card) return;
    let alive = true;
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([K_STAMPS_SEEN, K_REWARDS_SEEN]);
        if (!alive) return;
        const rawStamps = entries[0][1];
        const rawRewards = entries[1][1];
        const seenStamps = rawStamps != null ? parseInt(rawStamps, 10) : null;
        let seenRewards: string[] = [];
        try {
          seenRewards = rawRewards ? (JSON.parse(rawRewards) as string[]) : [];
        } catch {
          seenRewards = [];
        }

        if (seenStamps != null && Number.isFinite(seenStamps) && card.stamps > seenStamps) {
          setPopFrom(seenStamps);
        }
        if (rawRewards != null) {
          const fresh = card.rewards.filter((c) => !seenRewards.includes(c));
          if (fresh.length > 0) {
            setFreshRewards(fresh);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
        }
        await AsyncStorage.multiSet([
          [K_STAMPS_SEEN, String(card.stamps)],
          [K_REWARDS_SEEN, JSON.stringify(card.rewards)],
        ]);
      } catch {
        // sin drama: la tarjeta se muestra igual, solo sin animación
      }
    })();
    return () => {
      alive = false;
    };
  }, [card, card?.stamps, card?.rewards]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshCard();
    setRefreshing(false);
  }, [refreshCard]);

  const qrSize = Math.min(width - space.lg * 2 - space.xl * 2, 224);
  const cardFull = card != null && card.stamps >= card.goal;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.lg,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + space.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          card ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.verde} />
          ) : undefined
        }
      >
        <Text style={styles.screenTitle}>Mi QR</Text>

        {card ? (
          <>
            {/* ——— El QR, al frente y al centro ——— */}
            <View style={styles.qrCard}>
              <Text style={styles.cardName}>{card.name}</Text>
              <View
                style={styles.qrWrap}
                accessibilityLabel={`Código QR de tu tarjeta, código ${card.code.split('').join(' ')}`}
              >
                <QRCode
                  value={card.code}
                  size={qrSize}
                  color={colors.ink}
                  backgroundColor={colors.marfil}
                  quietZone={8}
                />
              </View>
              <Text style={styles.code} accessibilityLabel={`Código ${card.code.split('').join(' ')}`}>
                {card.code}
              </Text>
              <Text style={styles.showHint}>Enséñalo en caja pa’ tu sello</Text>
              {walletReady ? (
                WALLET_BADGE ? (
                  /* Badge oficial de Apple. Se respeta su proporción y el alto
                     mínimo de 30 pt; el color y el dibujo no se tocan. */
                  <Pressable
                    onPress={addToWallet}
                    accessibilityRole="button"
                    accessibilityLabel="Añadir tu tarjeta Horno Rewards a Apple Wallet"
                    style={({ pressed }) => [styles.walletBadgeBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Image
                      source={WALLET_BADGE}
                      style={styles.walletBadge}
                      contentFit="contain"
                      accessibilityLabel="Añadir a Apple Wallet"
                    />
                  </Pressable>
                ) : (
                  /* Sin el artwork de Apple todavía: botón de texto honesto,
                     que NO imita el badge. Ver src/lib/wallet-badge.ts. */
                  <GhostButton
                    label="Añadir a Apple Wallet"
                    onPress={addToWallet}
                    accessibilityLabel="Añadir tu tarjeta Horno Rewards a Apple Wallet"
                    style={styles.walletBtn}
                  />
                )
              ) : null}
            </View>

            {/* ——— Tarjeta de sellos 2×3 ——— */}
            <View style={styles.punchBlock}>
              <Text style={styles.blockTitle}>Tus sellos</Text>
              <PunchCard stamps={card.stamps} goal={card.goal} popFrom={popFrom} />
              {cardFull ? (
                <View style={styles.fullBanner}>
                  <Text style={styles.fullBannerTitle}>¡Tarjeta llena!</Text>
                  <Text style={styles.fullBannerBody}>
                    Tu quesito gratis viene en camino — mira tus premios aquí abajo.
                  </Text>
                </View>
              ) : (
                <Text style={styles.progressCopy}>{stampsCopy(card.stamps, card.goal)}</Text>
              )}
            </View>

            {/* ——— Billetera de premios ——— */}
            {card.rewards.length > 0 ? (
              <View style={styles.rewardsBlock}>
                <Text style={styles.blockTitle}>Premios pa’ canjear</Text>
                {card.rewards.map((code) => {
                  const isNew = freshRewards.includes(code);
                  return (
                    <View
                      key={code}
                      style={[styles.rewardCard, isNew && styles.rewardCardNew]}
                      accessibilityLabel={`Quesito gratis, código ${code}. Muéstralo en caja para canjearlo${isNew ? '. Premio nuevo' : ''}`}
                    >
                      {isNew ? (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>¡NUEVO!</Text>
                        </View>
                      ) : null}
                      <View style={styles.rewardTop}>
                        <TicketIcon size={22} color={colors.naranjaInk} />
                        <Text style={styles.rewardName}>Quesito gratis</Text>
                      </View>
                      <Text style={styles.rewardCode}>{code}</Text>
                      <Text style={styles.rewardHow}>
                        Muéstralo en caja para canjear tu quesito gratis
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {card.totalRedeemed > 0 ? (
              <Text style={styles.redeemed}>
                Ya te has ganado {card.totalRedeemed}{' '}
                {card.totalRedeemed === 1 ? 'quesito' : 'quesitos'}. Se dice fácil.
              </Text>
            ) : null}

            {/* ——— Actividad ——— */}
            {card.history && card.history.length > 0 ? (
              <View style={styles.activityBlock}>
                <Text style={styles.blockTitle}>Tu actividad</Text>
                {card.history.slice(0, 10).map((entry, i) => (
                  <View key={`${entry.ts}-${i}`} style={styles.activityRow}>
                    <View style={styles.activityDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityMain}>
                        {getStore(entry.store).short} · {viaCopy(entry.via)}
                      </Text>
                    </View>
                    <Text style={styles.activityDate}>{relativeDate(entry.ts)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <JoinCard />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.marfil,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
  },
  screenTitle: {
    fontFamily: fonts.display,
    fontSize: textSize.display,
    color: colors.ink,
    marginBottom: space.lg,
  },
  qrCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.xl,
    padding: space.xl,
    alignItems: 'center',
    ...shadowCard,
  },
  cardName: {
    fontFamily: fonts.displayItalic,
    fontSize: textSize.h4,
    color: colors.inkSoft,
    marginBottom: space.lg,
  },
  qrWrap: {
    backgroundColor: colors.marfil,
    borderRadius: radius.lg,
    padding: space.md,
  },
  code: {
    marginTop: space.lg,
    fontFamily: fonts.display,
    fontSize: 40,
    letterSpacing: 10,
    color: colors.ink,
  },
  showHint: {
    marginTop: 4,
    fontFamily: fonts.ui,
    fontSize: textSize.small,
    color: colors.inkSoft,
  },
  // Dentro de qrCard (alignItems center) el slab se encogería al texto;
  // stretch lo deja a todo lo ancho, como los botones del resto de la pantalla.
  walletBadgeBtn: {
    alignSelf: 'center',
    marginTop: space.md,
    // 10% de aire alrededor, como pide la guía del badge
    padding: 5,
  },
  walletBadge: {
    height: 44,          // por encima del mínimo de 30 pt
    width: 44 * WALLET_BADGE_RATIO,
  },
  walletBtn: {
    marginTop: space.lg,
    alignSelf: 'stretch',
  },
  punchBlock: {
    marginTop: space.xl,
    gap: space.lg,
  },
  blockTitle: {
    fontFamily: fonts.display,
    fontSize: textSize.h2Lg,
    color: colors.ink,
  },
  progressCopy: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.bodyLg,
    color: colors.verdeInk,
    textAlign: 'center',
  },
  // Banner "tarjeta llena": superficie menta, texto INK (regla 2).
  fullBanner: {
    backgroundColor: colors.menta,
    borderRadius: radius.btnLg,
    padding: space.lg,
    alignItems: 'center',
    gap: 3,
  },
  fullBannerTitle: {
    fontFamily: fonts.display,
    fontSize: textSize.h2Lg,
    color: colors.ink,
  },
  fullBannerBody: {
    fontFamily: fonts.uiMedium,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.ink,
    opacity: 0.78,
    textAlign: 'center',
  },
  rewardsBlock: {
    marginTop: space.xl,
    gap: space.md,
  },
  rewardCard: {
    backgroundColor: colors.naranjaSuave,
    borderRadius: radius.btnLg,
    padding: space.lg,
    gap: 6,
  },
  rewardCardNew: {
    backgroundColor: colors.naranja,
  },
  newBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 2,
  },
  newBadgeText: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.tiny,
    letterSpacing: 1,
    color: colors.marfil,
  },
  rewardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  rewardName: {
    fontFamily: fonts.uiBold,
    fontSize: textSize.bodyLg,
    color: colors.ink,
  },
  rewardCode: {
    fontFamily: fonts.display,
    fontSize: textSize.display,
    letterSpacing: 3,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  rewardHow: {
    fontFamily: fonts.ui,
    fontSize: textSize.small,
    lineHeight: 19,
    color: colors.ink,
  },
  redeemed: {
    marginTop: space.lg,
    fontFamily: fonts.displayItalic,
    fontSize: textSize.body,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  activityBlock: {
    marginTop: space.xl,
    gap: space.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.paper,
    borderRadius: radius.btn,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.verde,
  },
  activityMain: {
    fontFamily: fonts.uiMedium,
    fontSize: textSize.body,
    color: colors.ink,
  },
  activityDate: {
    fontFamily: fonts.ui,
    fontSize: textSize.caption,
    color: colors.inkFaint,
  },
  joinCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.md,
    ...shadowCard,
  },
  joinKicker: {
    fontFamily: fonts.uiSemi,
    fontSize: textSize.tiny,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
    color: colors.verdeInk,
  },
  joinTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
    color: colors.ink,
  },
  joinBody: {
    fontFamily: fonts.ui,
    fontSize: textSize.body,
    lineHeight: 21,
    color: colors.inkSoft,
  },
  joinInput: {
    backgroundColor: colors.marfil,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    fontFamily: fonts.uiMedium,
    fontSize: textSize.lead,
    color: colors.ink,
  },
  joinError: {
    fontFamily: fonts.uiMedium,
    fontSize: textSize.small,
    color: colors.danger,
  },
  // El código se escribe como se muestra en la tarjeta: espaciado y centrado.
  codeInput: {
    fontFamily: fonts.display,
    fontSize: textSize.h2Lg,
    letterSpacing: 6,
    textAlign: 'center',
  },
});
