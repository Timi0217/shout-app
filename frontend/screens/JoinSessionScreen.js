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
      const code = sessionCode.trim().toUpperCase();
      await joinSession(code, user?.id);
      navigation.navigate('Session', { session_code: code });
    } catch (err) {
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
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('CreateOrJoin');
            }
          }}
          style={{ marginLeft: 16 }}
        >
          <Ionicons name="arrow-back" size={28} color="#222" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        user ? (
          <TouchableOpacity
            onPress={async () => { await logout(); }}
            style={styles.logoutButton}
            activeOpacity={0.85}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
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
    padding: 24,
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
    borderRadius: 10,
    padding: 16,
    fontSize: 18,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
}); 