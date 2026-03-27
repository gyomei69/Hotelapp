import React from 'react';
import {
  StyleSheet, Text, View, Image, SafeAreaView, Dimensions, StatusBar,
} from 'react-native';
import AuthButton from '../components/AuthButton';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── Hotel Image (top ~55%) ─── */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/hotel-welcome.png')}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      {/* ─── Bottom Card ─── */}
      <View style={styles.card}>
        <Text style={styles.title}>FRANCIS HOTEL</Text>
        <Text style={styles.subtitle}>
          Find your next space, feel at home{'\n'}Where comfort meets convenience
        </Text>

        <View style={styles.buttonsContainer}>
          <AuthButton
            title="Login"
            variant="primary"
            onPress={() => navigation.navigate('Login')}
          />
          <View style={{ height: 14 }} />
          <AuthButton
            title="Sign Up"
            variant="outline"
            onPress={() => navigation.navigate('Signup')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    height: height * 0.52,
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2036',
    letterSpacing: 3,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 280,
  },
});
