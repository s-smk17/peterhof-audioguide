import React, { useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { useScrollContentStyle } from '../components/layout';
import { Glass, Segmented, Toggle, TopBar } from '../components/ui';
import type { DemoControls, DemoSpeed } from '../location/useDemoRide';
import type { RouteTrackingState } from '../location/useRouteTracking';
import {
  TRIGGER_DISTANCE,
  useSettings,
  type PlaybackRate,
  type TriggerTiming,
} from '../settings';
import { makeStyles, useTheme, type ThemePreference } from '../theme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Glass style={styles.card}>{children}</Glass>
    </View>
  );
}

function Row({
  title,
  description,
  right,
  onPress,
  last,
}: {
  title: string;
  description?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const styles = useStyles();
  const content = (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description && <Text style={styles.rowDescription}>{description}</Text>}
      </View>
      {right}
    </View>
  );

  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

/** Строка с переключателем-сегментами под заголовком */
function Block({
  title,
  description,
  children,
  last,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  last?: boolean;
}) {
  const styles = useStyles();

  return (
    <View style={[styles.block, !last && styles.rowDivider]}>
      <Text style={styles.rowTitle}>{title}</Text>
      {description && <Text style={styles.rowDescription}>{description}</Text>}
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

// В браузере нет фоновой геолокации и системных настроек приложения
const IS_WEB = Platform.OS === 'web';

const GPS_MODE: Record<
  RouteTrackingState['mode'],
  { value: string; description: string; ok: boolean }
> = {
  background: {
    value: 'В фоне',
    description: 'Работает и с выключенным экраном',
    ok: true,
  },
  foreground: {
    value: 'Пока открыто',
    description: IS_WEB
      ? 'В браузере гид работает, пока вкладка открыта и экран включён'
      : 'Разрешите геолокацию «Всегда», чтобы гид работал, когда телефон в кармане',
    ok: true,
  },
  starting: { value: '…', description: 'Запускаем GPS', ok: true },
  demo: {
    value: 'Демо',
    description: 'Идёт демо-поездка — настоящий GPS выключен',
    ok: true,
  },
  denied: {
    value: 'Нет доступа',
    description: IS_WEB
      ? 'Разрешите доступ к геолокации для этого сайта в настройках браузера'
      : 'Разрешите доступ к геолокации в настройках телефона',
    ok: false,
  },
  disabled: {
    value: 'Выключен',
    description: IS_WEB
      ? 'Включите геолокацию на телефоне; сайт должен быть открыт по HTTPS'
      : 'Включите геолокацию в настройках телефона',
    ok: false,
  },
};

export default function SettingsScreen({
  tracking,
  demo,
  onResetProgress,
}: {
  tracking: RouteTrackingState;
  demo: DemoControls;
  onResetProgress: () => void;
}) {
  const colors = useTheme();
  const styles = useStyles();
  const contentStyle = useScrollContentStyle();
  const { settings, update } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);

  const gps = GPS_MODE[tracking.mode];
  const accuracy =
    tracking.accuracy != null ? ` · точность ±${Math.round(tracking.accuracy)} м` : '';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentStyle}
    >
      <TopBar title="Ещё" subtitle="Настройки аудиогида" />

      <Section title="Оформление">
        <Block title="Тема" last>
          <Segmented<ThemePreference>
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'system', label: 'Как в системе' },
              { value: 'light', label: 'Светлая' },
              { value: 'dark', label: 'Тёмная' },
            ]}
          />
        </Block>
      </Section>

      <Section title="Аудиогид">
        <Row
          title="Автозапуск у остановок"
          description="Рассказ начнётся сам, когда вы подъедете к точке"
          right={
            <Toggle
              value={settings.autoPlay}
              onChange={(autoPlay) => update({ autoPlay })}
            />
          }
        />
        <Row
          title="Голосовые подсказки"
          description="Сообщать, когда вы сошли с маршрута и вернулись на него"
          right={
            <Toggle
              value={settings.routeAnnouncements}
              onChange={(routeAnnouncements) => update({ routeAnnouncements })}
            />
          }
        />
        <Block title="Скорость речи" last>
          <Segmented<PlaybackRate>
            value={settings.playbackRate}
            onChange={(playbackRate) => update({ playbackRate })}
            options={[
              { value: 1, label: '1×' },
              { value: 1.25, label: '1,25×' },
              { value: 1.5, label: '1,5×' },
              { value: 2, label: '2×' },
            ]}
          />
        </Block>
      </Section>

      <Section title="Геолокация">
        <Row
          title="GPS"
          description={gps.description + accuracy}
          right={
            <Text
              style={[
                styles.value,
                { color: gps.ok ? colors.success : colors.danger },
              ]}
            >
              {gps.value}
            </Text>
          }
        />
        <Block
          title="Когда начинать рассказ"
          description={`За ${TRIGGER_DISTANCE[settings.triggerTiming]} м до остановки`}
          last={IS_WEB}
        >
          <Segmented<TriggerTiming>
            value={settings.triggerTiming}
            onChange={(triggerTiming) => update({ triggerTiming })}
            options={[
              { value: 'early', label: 'Заранее' },
              { value: 'normal', label: 'Обычно' },
              { value: 'late', label: 'У остановки' },
            ]}
          />
        </Block>
        {!IS_WEB && (
          <Row
            title="Настройки геолокации телефона"
            description="Точность, доступ «Всегда»"
            right={<Text style={styles.chevron}>›</Text>}
            onPress={() => Linking.openSettings()}
            last
          />
        )}
      </Section>

      <Section title="Демо-поездка">
        <Row
          title="Прокатиться без автобуса"
          description="Точка сама едет по маршруту: рассказы, карта и подсказки работают как в настоящей поездке"
          right={<Toggle value={demo.enabled} onChange={demo.setEnabled} />}
        />
        <Block title="Скорость" description="×1 — как автобус, 30 км/ч" last>
          <Segmented<DemoSpeed>
            value={demo.speed}
            onChange={demo.setSpeed}
            options={[
              { value: 1, label: '×1' },
              { value: 5, label: '×5' },
              { value: 20, label: '×20' },
            ]}
          />
        </Block>
      </Section>

      <Section title="Данные">
        {confirmReset ? (
          <View style={styles.confirm}>
            <Text style={styles.rowTitle}>Сбросить весь прогресс?</Text>
            <Text style={styles.rowDescription}>
              Отметки о пройденных точках удалятся
            </Text>

            <View style={styles.confirmButtons}>
              <Pressable
                style={[styles.confirmButton, styles.confirmCancel]}
                onPress={() => setConfirmReset(false)}
              >
                <Text style={styles.confirmCancelText}>Отмена</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, { backgroundColor: colors.danger }]}
                onPress={() => {
                  onResetProgress();
                  setConfirmReset(false);
                }}
              >
                <Text style={styles.confirmDangerText}>Сбросить</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Row
            title="Сбросить прогресс"
            description="Начать маршрут заново"
            right={<Text style={[styles.chevron, { color: colors.danger }]}>›</Text>}
            onPress={() => setConfirmReset(true)}
            last
          />
        )}
      </Section>

      <Section title="О приложении">
        <Row
          title="Версия"
          right={
            <Text style={styles.valueMuted}>
              {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          }
        />
        <Row
          title="Карта и маршрут"
          description="© участники OpenStreetMap, OpenFreeMap"
          right={<Text style={styles.chevron}>›</Text>}
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
        />
        <Row
          title="Фотографии"
          description="Wikimedia Commons, авторы указаны у каждой точки"
          right={<Text style={styles.chevron}>›</Text>}
          onPress={() => Linking.openURL('https://commons.wikimedia.org')}
          last
        />
      </Section>

      <Text style={styles.footer}>PETERHOF AUDIO · МАРШРУТ 343Э</Text>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    color: c.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },

  card: {
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  row: {
    minHeight: 64,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  block: {
    paddingVertical: 14,
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },

  rowTitle: {
    color: c.text,
    fontSize: 15,
    fontWeight: '600',
  },

  rowDescription: {
    color: c.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },

  value: {
    fontSize: 13,
    fontWeight: '800',
  },

  valueMuted: {
    color: c.muted,
    fontSize: 14,
    fontWeight: '600',
  },

  chevron: {
    color: c.faint,
    fontSize: 24,
    fontWeight: '400',
  },

  confirm: {
    paddingVertical: 14,
  },

  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  confirmButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmCancel: {
    backgroundColor: c.fill,
  },

  confirmCancelText: {
    color: c.text,
    fontWeight: '700',
  },

  confirmDangerText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  footer: {
    textAlign: 'center',
    color: c.faint,
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: 6,
  },
}));
