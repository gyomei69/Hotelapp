import React from 'react';
import {
  StyleSheet, Text, View, Image, useWindowDimensions, StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthButton from '../components/AuthButton';

export default function WelcomeScreen({ navigation }) {
  const { height } = useWindowDimensions();
  const isCompact = height < 760;
  const imageHeight = Math.max(280, Math.min(430, height * 0.5));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >

      {/* ─── Hotel Image (top ~55%) ─── */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <Image
          source={require('../../assets/hotel-welcome.png')}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      {/* ─── Bottom Card ─── */}
      <View style={[styles.card, { marginTop: isCompact ? -18 : -30, paddingHorizontal: isCompact ? 22 : 36, paddingTop: isCompact ? 24 : 40 }]}>
        <Text style={styles.title}>AURORA GRAND HOTEL</Text>
        <Text style={styles.subtitle}>
          Find your next space, feel at home{'\n'}Where comfort meets convenience
        </Text>

        <View style={styles.buttonsContainer}>
          <AuthButton
            title="Sign in"
            variant="primary"
            onPress={() => navigation.navigate('Login')}
          />
          <View style={{ height: isCompact ? 10 : 14 }} />
          <AuthButton
            title="Sign Up"
            variant="outline"
            onPress={() => navigation.navigate('Signup')}
          />
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -30,
    paddingHorizontal: 36,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2036',
    letterSpacing: 3,
    marginBottom: 14,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 280,
  },
});
