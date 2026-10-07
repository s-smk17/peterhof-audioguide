import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { routePoints } from "../data/route";

type Language = "ru" | "en";

type Props = {
  language?: Language;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CARD_WIDTH = SCREEN_WIDTH - 36;
const HERO_HEIGHT = 270;

export default function RouteScreen({
  language = "ru",
}: Props) {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === "dark";

  const colors = isDark ? darkColors : lightColors;

  const [selectedId, setSelectedId] = useState(
    routePoints[0]?.id ?? ""
  );

  const [visited, setVisited] = useState<string[]>([]);

  const selectedPoint = useMemo(
    () =>
      routePoints.find(
        (point) => point.id === selectedId
      ) ?? routePoints[0],
    [selectedId]
  );

  const visitedCount = visited.length;

  const progress =
    routePoints.length > 0
      ? visitedCount / routePoints.length
      : 0;

  const text = (ru: string, en: string) =>
    language === "ru" ? ru : en;

  const selectPoint = (id: string) => {
    setSelectedId(id);

    if (!visited.includes(id)) {
      setVisited((current) => [...current, id]);
    }
  };

  if (!selectedPoint) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text
          style={[
            styles.emptyText,
            { color: colors.text },
          ]}
        >
          {text(
            "Маршрут пока пуст",
            "The route is empty"
          )}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <FlatList
        data={routePoints}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <RouteHeader
            colors={colors}
            isDark={isDark}
            language={language}
            text={text}
            selectedPoint={selectedPoint}
            visitedCount={visitedCount}
            progress={progress}
          />
        }
        renderItem={({ item, index }) => (
          <RoutePointCard
            point={item}
            index={index}
            selected={item.id === selectedPoint.id}
            visited={visited.includes(item.id)}
            colors={colors}
            isDark={isDark}
            language={language}
            text={text}
            onPress={() => selectPoint(item.id)}
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text
              style={[
                styles.footerText,
                { color: colors.tertiary },
              ]}
            >
              PETERHOF AUDIO GUIDE
            </Text>
          </View>
        }
      />
    </View>
  );
}

/* =========================================================
   HEADER
   ========================================================= */

function RouteHeader({
  colors,
  isDark,
  language,
  text,
  selectedPoint,
  visitedCount,
  progress,
}: any) {
  const heroGradient = isDark
    ? ([
        "transparent",
        "rgba(0,0,0,0.22)",
        "rgba(0,0,0,0.94)",
      ] as const)
    : ([
        "transparent",
        "rgba(0,0,0,0.10)",
        "rgba(0,0,0,0.82)",
      ] as const);

  return (
    <View>
      <View style={styles.topHeader}>
        <View style={styles.headerTextBlock}>
          <Text
            style={[
              styles.brand,
              { color: colors.accent },
            ]}
          >
            PETERHOF
          </Text>

          <Text
            style={[
              styles.title,
              { color: colors.text },
            ]}
          >
            {text("Маршрут", "Route")}
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: colors.secondary },
            ]}
          >
            {text(
              "29 точек · от Ломоносова до Петергофа",
              "29 points · from Lomonosov to Peterhof"
            )}
          </Text>
        </View>

        <View
          style={[
            styles.progressCircle,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.progressNumber,
              { color: colors.text },
            ]}
          >
            {visitedCount}
          </Text>

          <Text
            style={[
              styles.progressTotal,
              { color: colors.tertiary },
            ]}
          >
            /29
          </Text>
        </View>
      </View>

      {/* HERO */}

      <View
        style={[
          styles.hero,
          { backgroundColor: colors.solidCard },
        ]}
      >
        <Image
          source={selectedPoint.image}
          style={styles.heroImage}
          contentFit="cover"
          transition={350}
        />

        <LinearGradient
          colors={heroGradient}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.heroContent}>
          <View style={styles.heroTopRow}>
            <View style={styles.pointBadge}>
              <Text style={styles.pointBadgeText}>
                {text(
                  `ТОЧКА ${selectedPoint.order}`,
                  `POINT ${selectedPoint.order}`
                )}
              </Text>
            </View>

            <View style={styles.availableBadge}>
              <View style={styles.availableDot} />

              <Text style={styles.availableText}>
                {text("ДОСТУПНО", "AVAILABLE")}
              </Text>
            </View>
          </View>

          <View>
            <Text style={styles.heroTitle}>
              {language === "ru"
                ? selectedPoint.name
                : selectedPoint.nameEn}
            </Text>

            <Text style={styles.heroDescription}>
              {language === "ru"
                ? selectedPoint.description
                : selectedPoint.descriptionEn}
            </Text>
          </View>
        </View>
      </View>

      {/* PROGRESS */}

      <View
        style={[
          styles.progressCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.progressHeader}>
          <View>
            <Text
              style={[
                styles.progressEyebrow,
                { color: colors.tertiary },
              ]}
            >
              {text(
                "ИССЛЕДОВАНО",
                "EXPLORED"
              )}
            </Text>

            <Text
              style={[
                styles.progressTitle,
                { color: colors.text },
              ]}
            >
              {visitedCount} / {routePoints.length}
            </Text>
          </View>

          <Text
            style={[
              styles.progressPercent,
              { color: colors.accent },
            ]}
          >
            {Math.round(progress * 100)}%
          </Text>
        </View>

        <View
          style={[
            styles.progressTrack,
            { backgroundColor: colors.muted },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.accent,
                width: `${Math.max(
                  progress * 100,
                  visitedCount > 0 ? 1 : 0
                )}%`,
              },
            ]}
          />
        </View>

        <Text
          style={[
            styles.progressHint,
            { color: colors.secondary },
          ]}
        >
          {text(
            "Выбирай любую точку — все точки маршрута открыты.",
            "Choose any point — every route point is available."
          )}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text
            style={[
              styles.sectionEyebrow,
              { color: colors.tertiary },
            ]}
          >
            {text(
              "ПУТЕШЕСТВИЕ",
              "JOURNEY"
            )}
          </Text>

          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text },
            ]}
          >
            {text(
              "Все точки маршрута",
              "All route points"
            )}
          </Text>
        </View>

        <Text
          style={[
            styles.sectionCount,
            { color: colors.secondary },
          ]}
        >
          29
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   ROUTE CARD
   ========================================================= */

function RoutePointCard({
  point,
  index,
  selected,
  visited,
  colors,
  isDark,
  language,
  text,
  onPress,
}: any) {
  const cardGradient = selected
    ? isDark
      ? ([
          "rgba(114,167,255,0.18)",
          "rgba(114,167,255,0.03)",
          "transparent",
        ] as const)
      : ([
          "rgba(38,116,255,0.11)",
          "rgba(38,116,255,0.02)",
          "transparent",
        ] as const)
    : ([
        "transparent",
        "transparent",
        "transparent",
      ] as const);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.routeCard,
        {
          backgroundColor: colors.solidCard,
          borderColor: selected
            ? colors.accent
            : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={cardGradient}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.cardImageContainer}>
        <Image
          source={point.image}
          style={styles.cardImage}
          contentFit="cover"
          transition={250}
        />

        <LinearGradient
          colors={[
            "transparent",
            "rgba(0,0,0,0.08)",
          ]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.cardNumber}>
          <Text style={styles.cardNumberText}>
            {String(index + 1).padStart(2, "0")}
          </Text>
        </View>

        {visited && (
          <View style={styles.visitedBadge}>
            <Text style={styles.visitedBadgeText}>
              ✓
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTopLine}>
          <Text
            style={[
              styles.cardEyebrow,
              { color: colors.accent },
            ]}
          >
            {text(
              `ТОЧКА ${index + 1}`,
              `POINT ${index + 1}`
            )}
          </Text>

          {selected && (
            <View
              style={[
                styles.selectedIndicator,
                {
                  backgroundColor:
                    colors.accentSoft,
                },
              ]}
            >
              <View
                style={[
                  styles.selectedIndicatorDot,
                  { backgroundColor: colors.accent },
                ]}
              />
              <Text
                style={[
                  styles.selectedIndicatorText,
                  { color: colors.accent },
                ]}
              >
                {text("ВЫБРАНО", "SELECTED")}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.cardTitle,
            { color: colors.text },
          ]}
        >
          {language === "ru"
            ? point.name
            : point.nameEn}
        </Text>

        <Text
          numberOfLines={2}
          style={[
            styles.cardDescription,
            { color: colors.secondary },
          ]}
        >
          {language === "ru"
            ? point.description
            : point.descriptionEn}
        </Text>

        <View
          style={[
            styles.cardBottom,
            {
              borderTopColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.cardStatus,
              { color: colors.tertiary },
            ]}
          >
            {visited
              ? text("ПОСЕЩЕНО", "VISITED")
              : text("ДОСТУПНО", "AVAILABLE")}
          </Text>

          <View style={styles.cardArrowContainer}>
            <Text
              style={[
                styles.cardArrow,
                { color: colors.text },
              ]}
            >
              →
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/* =========================================================
   COLORS
   ========================================================= */

const lightColors = {
  background: "#F2F2F5",
  card: "rgba(255,255,255,0.78)",
  solidCard: "#FFFFFF",
  text: "#111114",
  secondary: "#707177",
  tertiary: "#9A9BA1",
  accent: "#2674FF",
  accentSoft: "rgba(38,116,255,0.10)",
  muted: "#E7E7EC",
  border: "rgba(0,0,0,0.075)",
};

const darkColors = {
  background: "#090A0D",
  card: "rgba(25,27,32,0.82)",
  solidCard: "#181A1F",
  text: "#F5F5F7",
  secondary: "#A3A5AC",
  tertiary: "#686A72",
  accent: "#72A7FF",
  accentSoft: "rgba(114,167,255,0.12)",
  muted: "#25272D",
  border: "rgba(255,255,255,0.08)",
};

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },

  listContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 35,
  },

  /* ---------- HEADER ---------- */

  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  headerTextBlock: {
    flex: 1,
    paddingRight: 15,
  },

  brand: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 5,
  },

  title: {
    fontSize: 35,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -1.4,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },

  progressCircle: {
    width: 57,
    height: 57,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 3,
  },

  progressNumber: {
    fontSize: 17,
    fontWeight: "800",
  },

  progressTotal: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 5,
  },

  /* ---------- HERO ---------- */

  hero: {
    width: CARD_WIDTH,
    height: HERO_HEIGHT,
    borderRadius: 29,
    overflow: "hidden",
    position: "relative",
    marginBottom: 13,
  },

  heroImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },

  heroContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 19,
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pointBadge: {
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
  },

  pointBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
  },

  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 6,
  },

  availableText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 31,
    lineHeight: 35,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 6,
  },

  heroDescription: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 17,
    maxWidth: "92%",
  },

  /* ---------- PROGRESS CARD ---------- */

  progressCard: {
    borderRadius: 23,
    borderWidth: 1,
    padding: 17,
    marginBottom: 26,
    overflow: "hidden",
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 13,
  },

  progressEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  progressTitle: {
    fontSize: 23,
    fontWeight: "800",
  },

  progressPercent: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },

  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 11,
  },

  progressFill: {
    height: "100%",
    borderRadius: 6,
  },

  progressHint: {
    fontSize: 10,
    lineHeight: 15,
  },

  /* ---------- SECTION ---------- */

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 13,
  },

  sectionEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: 5,
  },

  sectionTitle: {
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  sectionCount: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },

  /* ---------- ROUTE CARD ---------- */

  routeCard: {
    width: CARD_WIDTH,
    borderRadius: 27,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    position: "relative",
  },

  cardImageContainer: {
    width: "100%",
    height: 175,
    position: "relative",
    overflow: "hidden",
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },

  cardNumber: {
    position: "absolute",
    top: 14,
    left: 14,
    minWidth: 39,
    height: 31,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.50)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardNumberText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  visitedBadge: {
    position: "absolute",
    right: 14,
    top: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },

  visitedBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  cardContent: {
    padding: 17,
  },

  cardTopLine: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  cardEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  selectedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 9,
  },

  selectedIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 5,
  },

  selectedIndicatorText: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  cardTitle: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 6,
  },

  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
    minHeight: 36,
  },

  cardBottom: {
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardStatus: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  cardArrowContainer: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  cardArrow: {
    fontSize: 18,
    fontWeight: "700",
  },

  /* ---------- FOOTER ---------- */

  footer: {
    alignItems: "center",
    paddingTop: 17,
    paddingBottom: 10,
  },

  footerText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  /* ---------- PRESS ---------- */

  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }],
  },
});