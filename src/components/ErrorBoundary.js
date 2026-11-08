import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    try {
      console.error('[ErrorBoundary]', error, info);
    } catch {
      /* ignore */
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message =
      this.state.error?.message ||
      'Something went wrong. Please reopen the screen.';

    return (
      <View style={styles.root}>
        <Text style={styles.title}>Aurora Grand Hotel</Text>
        <Text style={styles.subtitle}>The app hit an unexpected error.</Text>
        <Text style={styles.message} numberOfLines={6}>
          {message}
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1220',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#CBD5E1' },
  message: {
    marginTop: 16,
    fontSize: 12,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4A5BCC',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});

