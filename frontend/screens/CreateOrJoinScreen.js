import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, Image, Linking } from 'react-native';
import colors from '../constants/colors';
import { useAuth } from '../AuthContext';
import { createSession } from '../utils/api';

const { height } = Dimensions.get('window');
const BUTTON_RADIUS = 18; // Use the same as Create/Join Session buttons

export default function CreateOrJoinScreen({ navigation }) {
  const { logout, user } = useAuth();

  const handleCreateSession = async () => {
    if (!user) {
      navigation.navigate('PhoneLogin', {
        onLoginSuccess: async (newUser) => {
          const result = await createSession({ dj_id: newUser.id, status: 'live' });
          navigation.reset({
            index: 0,
            routes: [
              { name: 'Session', params: { sessionid: result.session.session_code } },
            ],
          });
        },
      });
      return;
    }
    const result = await createSession({ dj_id: user.id, status: 'live' });
    navigation.reset({
      index: 0,
      routes: [
        { name: 'Session', params: { sessionid: result.session.session_code } },
      ],
    });
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);
  return (
    <View style={styles.container}>
      {/* Logout button at top right, only if logged in */}
      {user && (
        <TouchableOpacity
          onPress={async () => { await logout(); }}
          style={styles.logoutButton}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutButtonText}>LOGOUT</Text>
        </TouchableOpacity>
      )}
      {/* Reduced top spacer for more space below */}
      <View style={{ height: height * 0.10 }} />
      {/* Extra space between logout and SHOUT */}
      <View style={{ height: 10 }} />
      {/* Logo/Branding */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
        <Text style={styles.logo}>SHOUT</Text>
        <Image source={require('../assets/logo.png')} style={{ width: 38, height: 38, marginLeft: 10, resizeMode: 'contain' }} />
      </View>
      {/* Tagline Card with extra margin below */}
      <View style={styles.taglineCard}>
        <Text style={styles.taglineMain}>Control the vibe</Text>
        <Text style={styles.taglineSub}>Request and vote on songs</Text>
      </View>
      {/* Spacer to push buttons to the bottom */}
      <View style={{ flex: 1 }} />
      {/* Buttons near the bottom with buffer above footer */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.button} onPress={handleCreateSession}>
          <Text style={styles.buttonText}>CREATE SESSION</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { marginTop: 28 }]} onPress={() => navigation.navigate('JoinSession')}>
          <Text style={styles.buttonText}>JOIN SESSION</Text>
        </TouchableOpacity>
      </View>
      {/* Footer tag at the bottom */}
      <View style={styles.footerTagContainer}>
        <TouchableOpacity onPress={() => Linking.openURL('https://www.instagram.com/timilehyinn/')} activeOpacity={0.7}>
          <Text style={styles.footerTag}>made with love by tmi 💛</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  logo: {
    fontSize: 38,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
    marginTop: 0,
    marginBottom: 0,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  taglineCard: {
    backgroundColor: colors.black,
    borderRadius: 14,
    paddingVertical: 28,
    paddingHorizontal: 32,
    marginBottom: 0,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#222',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  taglineMain: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 26,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  taglineSub: {
    color: '#D1D1D1',
    fontWeight: '500',
    fontSize: 17,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: BUTTON_RADIUS,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: colors.black,
    fontWeight: '900',
    fontSize: 21,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  logoutButton: {
    position: 'absolute',
    top: 18,
    right: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 18,
    zIndex: 10,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: colors.black,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  footerTagContainer: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerTag: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    opacity: 0.95,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 120, // larger buffer above the footer
  },
}); 