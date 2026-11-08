import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthButton from '../components/AuthButton';

export default function WelcomeScreen({ navigation }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = height < 760;
  // Fit everything on ONE screen (no scroll) by sizing hero responsibly.
  const imageHeight = Math.max(260, Math.min(520, height * (isCompact ? 0.46 : 0.56)));
  // Keep the hero fully covered without awkward cropping.
  const heroScale = Math.max(1.04, Math.min(1.12, 1.02 + height / 5200));
  // Nudge down a bit so the logo doesn't sit under the camera/notch.
  const heroTranslateY = Math.round(
    Math.max(14, Math.min(74, height * 0.045 + insets.top * 0.6))
  );
  const cardBottomPad = Math.max(10, insets.bottom + 6);

  return (
    // Exclude top edge so the hero image can fill it.
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.page}>
        {/* ─── Hotel Image (top) ─── */}
        <View
          style={[
            styles.imageContainer,
            {
              // Pull image up to cover the safe-area gap, and add that space back into its height.
              marginTop: -insets.top,
              paddingTop: insets.top,
              height: imageHeight + insets.top,
            },
          ]}
        >
          <Image
            source={require('../../assets/homepage.png')}
            style={[
              styles.image,
              {
                transform: [{ scale: heroScale }, { translateY: heroTranslateY }],
              },
            ]}
            resizeMode="cover"
          />
        {/* Single smooth tint (one shade) */}
        <View pointerEvents="none" style={styles.heroTint} />
        </View>

        {/* ─── Bottom Card ─── */}
        <View
          style={[
            styles.card,
            {
              marginTop: isCompact ? -18 : -30,
              paddingHorizontal: isCompact ? 20 : 32,
              paddingTop: isCompact ? 18 : 28,
              paddingBottom: cardBottomPad,
            },
          ]}
        >
          <Text style={[styles.title, isCompact && styles.titleCompact]}>AURORA GRAND HOTEL</Text>
          <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
            Find your next space, feel at home{'\n'}Where comfort meets convenience
          </Text>

          <View style={styles.buttonsContainer}>
            <AuthButton
              title="Sign in"
              variant="primary"
              onPress={() => navigation.navigate('Login')}
            />
            <View style={{ height: isCompact ? 8 : 12 }} />
            <AuthButton
              title="Sign Up"
              variant="outline"
              style={styles.signUpButtonWhite}
              onPress={() => navigation.navigate('Signup')}
            />

            {/* Social icons (aesthetic only) */}
            <View style={[styles.socialRow, isCompact && styles.socialRowCompact]}>
              <View style={[styles.socialIconPill, isCompact && styles.socialIconPillCompact]}>
                <Ionicons name="logo-facebook" size={isCompact ? 16 : 18} color="#1B2036" />
              </View>
              <View style={[styles.socialIconPill, isCompact && styles.socialIconPillCompact]}>
                <Ionicons name="logo-instagram" size={isCompact ? 16 : 18} color="#1B2036" />
              </View>
              <View style={[styles.socialIconPill, isCompact && styles.socialIconPillCompact]}>
                <Ionicons name="logo-youtube" size={isCompact ? 16 : 18} color="#1B2036" />
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#0B1220',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heroTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -30,
    paddingHorizontal: 36,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2036',
    letterSpacing: 2.4,
    marginBottom: 14,
    textAlign: 'center',
    alignSelf: 'stretch',
    fontFamily: 'Cinzel_700Bold',
  },
  titleCompact: {
    fontSize: 24,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 280,
  },
  signUpButtonWhite: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1B2036',
  },
  socialRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  socialRowCompact: {
    marginTop: 8,
    gap: 10,
  },
  socialIconPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconPillCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
