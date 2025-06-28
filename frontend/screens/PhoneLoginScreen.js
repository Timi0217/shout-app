import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../supabase';
import colors from '../constants/colors';
import { useAuth } from '../AuthContext';
import { createSession } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function PhoneLoginScreen({ navigation, route }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: enter phone, 2: enter OTP
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();

  // Improved phone number formatting for E.164
  const formatPhoneNumber = (input) => {
    const cleaned = input.replace(/\D/g, '');
    if (input.startsWith('+')) return input;
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    return `+${cleaned}`;
  };

  const sendOtp = async () => {
    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
      if (error) throw error;
      setStep(2);
      Alert.alert('Code sent', 'Check your phone for the verification code.');
    } catch (error) {
      Alert.alert('Failed to send OTP', error.message);
    }
    setLoading(false);
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phone);
      const { data, error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otp, type: 'sms' });
      if (error) throw error;
      setUser(data.user);
      
      // Check if there's an onLoginSuccess callback from route params
      const onLoginSuccess = route?.params?.onLoginSuccess;
      if (onLoginSuccess) {
        await onLoginSuccess(data.user);
      } else {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
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
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{step === 1 ? 'Sign in with phone number' : 'Enter verification code'}</Text>
      {step === 1 ? (
        <>
          <View style={{ height: 12 }} />
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            placeholderTextColor="#aaa"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.button, { opacity: phone.replace(/\D/g, '').length >= 10 ? 1 : 0.5 }]}
            onPress={sendOtp}
            disabled={loading || phone.replace(/\D/g, '').length < 10}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={{ height: 12 }} />
          <TextInput
            style={styles.input}
            placeholder="Enter code"
            placeholderTextColor="#aaa"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.button, { opacity: otp.length >= 4 ? 1 : 0.5 }]}
            onPress={verifyOtp}
            disabled={loading || otp.length < 4}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 24,
    paddingTop: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.yellow,
    marginBottom: 12,
    marginTop: 12,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    marginBottom: 16,
    backgroundColor: '#fafafa',
    color: '#222',
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: colors.black,
    fontWeight: 'bold',
    fontSize: 18,
  },
}); 