import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import colors from './constants/colors';
import { AuthProvider } from './AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LoginScreen from './screens/LoginScreen';
import CreateOrJoinScreen from './screens/CreateOrJoinScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import JoinSessionScreen from './screens/JoinSessionScreen';
import SessionScreen from './screens/SessionScreen';
import DJDashboardScreen from './screens/DJDashboardScreen';
import SongRequestScreen from './screens/SongRequestScreen';
import PhoneLoginScreen from './screens/PhoneLoginScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['https://joinshout.fyi', 'http://localhost:19006'],
  config: {
    screens: {
      CreateOrJoin: '',
      Session: 'sessions/:session_code',
      PhoneLogin: 'login',
    },
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NavigationContainer linking={linking}>
          <Stack.Navigator
            initialRouteName="CreateOrJoin"
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTitleStyle: { color: colors.text, fontWeight: '700', fontSize: 20 },
              headerTintColor: colors.text,
            }}
          >
            <Stack.Screen name="CreateOrJoin" component={CreateOrJoinScreen} options={{ title: 'SHOUT' }} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ title: 'Welcome' }} />
            <Stack.Screen name="JoinSession" component={JoinSessionScreen} options={{ title: 'Join Session' }} />
            <Stack.Screen name="Session" component={SessionScreen} options={{ title: 'Session' }} />
            <Stack.Screen name="DJDashboard" component={DJDashboardScreen} options={{ title: 'DJ Dashboard' }} />
            <Stack.Screen name="SongRequest" component={SongRequestScreen} options={{ title: 'Song Request' }} />
            <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} options={{ title: 'Login' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
