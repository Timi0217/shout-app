import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import colors from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => (
        navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 16 }}>
            <Ionicons name="arrow-back" size={28} color="#222" />
          </TouchableOpacity>
        ) : null
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Brand/Logo */}
      <Text style={styles.logo}>SHOUT</Text>
      {/* Headline & Subheadline Block */}
      <View style={styles.textBlock}>
        <Text style={styles.headline}>Request your songs, control the vibe.</Text>
        <Text style={styles.subheadline}>
          Join live DJ sessions at parties and clubs, or vote on the hottest Afrobeats battles with your community.
        </Text>
      </View>
      {/* Placeholder for phone number login flow */}
      <View style={styles.placeholder}><Text style={styles.placeholderText}>[Phone number login coming soon]</Text></View>
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By signing in, you agree to SHOUT's{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://your-terms-url.com')}>Terms</Text>
          {' '}and{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://your-privacy-url.com')}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 0,
  },
  logo: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 18,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  textBlock: {
    width: '100%',
    maxWidth: 370,
    alignItems: 'center',
    marginBottom: 48,
  },
  headline: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 17,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
    maxWidth: 340,
    opacity: 0.85,
  },
  placeholder: {
    marginVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  placeholderText: {
    color: colors.text,
    opacity: 0.5,
    fontSize: 16,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerText: {
    color: '#B8A04B',
    opacity: 0.85,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '400',
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
}); 