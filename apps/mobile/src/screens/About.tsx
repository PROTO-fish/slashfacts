import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BRAND } from '@slash/core';
import { usePalette } from '../theme/ThemeContext.js';
import { FONTS } from '../theme/fonts.js';
import { useBreakpoint } from '../theme/useBreakpoint.js';
import { Launch } from '../components/Launch.js';
import { Mark } from '../components/Mark.js';
import { BackIcon } from '../components/icons.js';
import app from '../../app.json';

/** One ruled line in a panel: what it is on the left, what tapping does on the right. */
function LinkRow({ label, action, url, ink }: { label: string; action: string; url: string; ink: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={[styles.row, { borderTopColor: ink }]}
    >
      <Text style={[styles.rowLabel, { color: ink, fontFamily: FONTS.black }]}>{label}</Text>
      <Text style={[styles.rowAction, { color: ink, fontFamily: FONTS.extraBold }]}>{action}</Text>
    </Pressable>
  );
}

/**
 * Who made the app, under which licence, and where its source lives: GPL-3.0's
 * "Appropriate Legal Notices" for an interactive program, plus the font's OFL credit.
 * Laid out like Stats (page title, ink panels, back button, empty footer tier) so the
 * launch button lands where it does on every other screen. The title is the PROTO/fish
 * mark with its cursor blinking.
 */
export function About({ onHome }: { onHome: () => void }) {
  const palette = usePalette();
  const { metrics } = useBreakpoint();
  const ink = palette.ink;
  const panel = [styles.panel, { borderColor: ink, borderWidth: metrics.border }];

  return (
    <View style={[styles.screen, { paddingHorizontal: metrics.padX }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.main}>
        <View accessible accessibilityRole="header" accessibilityLabel="About" style={styles.title}>
          <Mark height={34} color={ink} blink />
        </View>

        <View style={panel}>
          <Text style={[styles.panelTitle, { color: ink, fontFamily: FONTS.black }]}>
            {BRAND.fullName.toUpperCase()} {app.expo.version}
          </Text>
          <Text style={[styles.body, { color: ink, fontFamily: FONTS.extraBold }]}>
            Times tables 2–9. Made by {BRAND.publisher}.
          </Text>
          <LinkRow label="proto.fish" action="OPEN" url={BRAND.publisherUrl} ink={ink} />
          <LinkRow label={BRAND.contact} action="EMAIL" url={`mailto:${BRAND.contact}`} ink={ink} />
        </View>

        <View style={panel}>
          <Text style={[styles.panelTitle, { color: ink, fontFamily: FONTS.black }]}>FREE SOFTWARE</Text>
          <Text style={[styles.body, { color: ink, fontFamily: FONTS.extraBold }]}>
            GPL-3.0. You may use, study, share and change it. It comes with no warranty.
          </Text>
          <LinkRow label="Source code" action="GITHUB" url={BRAND.sourceUrl} ink={ink} />
          <LinkRow label="Privacy policy" action="READ" url={BRAND.privacyUrl} ink={ink} />
        </View>

        <View style={panel}>
          <Text style={[styles.panelTitle, { color: ink, fontFamily: FONTS.black }]}>TYPE</Text>
          <Text style={[styles.body, { color: ink, fontFamily: FONTS.extraBold }]}>
            Archivo by Omnibus-Type, SIL Open Font License 1.1.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Launch onPress={onHome} secondary accessibilityLabel="Home" icon={<BackIcon size={20} color={ink} />} />
      </View>

      <View style={{ height: metrics.footerTier }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 16, gap: 16 },
  scroll: { flex: 1 },
  main: { gap: 14, paddingBottom: 16 },
  // Same height as Stats' .page-title line, so the first panel starts at the same place.
  title: { height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  panel: { paddingVertical: 14, paddingHorizontal: 14 },
  panelTitle: { fontSize: 17, letterSpacing: -0.2, marginBottom: 8 },
  body: { fontSize: 13.5, lineHeight: 19, marginBottom: 10 },
  // Stats' ruled rows: 2px ink rule on top.
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, paddingVertical: 8 },
  rowLabel: { fontSize: 13.5, letterSpacing: 0.3, flexShrink: 1 },
  rowAction: { fontSize: 11.5, letterSpacing: 1.4, textDecorationLine: 'underline', marginLeft: 12 },
  actions: { alignItems: 'center' },
});
