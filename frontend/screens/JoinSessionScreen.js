import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Keyboard, TouchableWithoutFeedback, Platform, ScrollView } from 'react-native';
import colors from '../constants/colors';
import { joinSession } from '../utils/api';
import { useAuth } from '../AuthContext';
import { Ionicons } from '@expo/vector-icons';

const BUTTON_RADIUS = 18; // Match Create/Join Session buttons

export default function JoinSessionScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [sessionCode, setSessionCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoToSession = async () => {
    console.log('Go to Session clicked', sessionCode);
    Keyboard.dismiss();
    setLoading(true);
    setError('');
    try {
      // Use the API function instead of hardcoded URLs
      const updatedSession = await joinSession(sessionCode, user?.id);
      navigation.navigate('Session', { sessionid: updatedSession.session_code });
    } catch (err) {
      console.error('Join session error:', err);
      setError('Session not found');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerStyle: {
        backgroundColor: colors.background,
        shadowColor: 'transparent',
        elevation: 0,
      },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('CreateOrJoin');
            }
          }}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        user ? (
          <TouchableOpacity
            onPress={async () => { await logout(); }}
            style={styles.headerLogoutButton}
            activeOpacity={0.85}
          >
            <Text style={styles.headerLogoutButtonText}>Logout</Text>
          </TouchableOpacity>
        ) : null
      ),
    });
  }, [navigation, logout, user]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topSection}>
      <Text style={styles.title}>Join a Session</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter session code"
        placeholderTextColor={colors.gray}
        value={sessionCode}
        onChangeText={setSessionCode}
        autoCapitalize="characters"
          autoFocus={true}
          editable={true}
          onFocus={() => console.log('Session code input focused')}
      />
      <TouchableOpacity
        style={[styles.button, { opacity: sessionCode ? 1 : 0.5 }]}
        onPress={handleGoToSession}
        disabled={!sessionCode || loading}
      >
        {loading ? <ActivityIndicator color={colors.buttonText} /> : <Text style={styles.buttonText}>Go to Session</Text>}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 28,
  },
  topSection: {
    width: '100%',
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: colors.gray,
    borderRadius: 14,
    padding: 18,
    fontSize: 18,
    color: colors.text,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(245, 195, 44, 0.15)',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  buttonText: {
    color: colors.buttonText,
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 1,
  },
  error: {
    color: 'red',
    marginTop: 8,
  },
  logoutButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginLeft: 8,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  logoutButtonText: {
    color: colors.black,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // New standardized header styles
  headerButton: {
    marginLeft: 16,
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoutButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  headerLogoutButtonText: {
    color: colors.black,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.3,
  },
}); 