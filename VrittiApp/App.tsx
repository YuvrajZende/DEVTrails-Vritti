import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/i18n';
import { initI18n } from './src/i18n';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import VerifyOTPScreen from './src/screens/VerifyOTPScreen';
import LanguageSelectScreen from './src/screens/LanguageSelectScreen';
import LocationPermissionScreen from './src/screens/LocationPermissionScreen';
import PhoneEntryScreen from './src/screens/PhoneEntryScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import PlatformSelectScreen from './src/screens/PlatformSelectScreen';
import PartnerIDScreen from './src/screens/PartnerIDScreen';
import PremiumQuoteScreen from './src/screens/PremiumQuoteScreen';
import HomeScreen from './src/screens/HomeScreen';
import MyWeekScreen from './src/screens/MyWeekScreen';
import RenewScreen from './src/screens/RenewScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import HelpScreen from './src/screens/HelpScreen';
import { FloatingTabBar } from './src/ui/components';
import { colors } from './src/ui/theme';
import { isAuthenticated } from './src/services/api';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function CoreTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyWeek" component={MyWeekScreen} />
      <Tab.Screen name="Renew" component={RenewScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Help" component={HelpScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Login');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await initI18n();

        const authenticated = await isAuthenticated();
        if (authenticated) {
          const onboarded = await AsyncStorage.getItem('@vritti_onboarded');
          setInitialRoute(onboarded === 'true' ? 'CoreTabs' : 'LanguageSelect');
        } else {
          setInitialRoute('Login');
        }
      } catch (e: any) {
        setError(e.message || 'Failed to initialize app');
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  if (error) {
    return (
      <View style={styles.centered}>
        <View style={styles.messageCard}>
          <Text style={styles.messageEyebrow}>Startup error</Text>
          <Text style={styles.messageTitle}>The app could not initialize.</Text>
          <Text style={styles.messageBody}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <View style={styles.messageCard}>
          <ActivityIndicator size="large" color={colors.black} />
          <Text style={[styles.messageTitle, styles.loadingTitle]}>Loading Vritti</Text>
          <Text style={styles.messageBody}>Preparing language, auth, and policy state.</Text>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
            <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
            <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
            <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            <Stack.Screen name="PlatformSelect" component={PlatformSelectScreen} />
            <Stack.Screen name="PartnerID" component={PartnerIDScreen} />
            <Stack.Screen name="PremiumQuote">
              {(props) => (
                <PremiumQuoteScreen
                  {...props}
                  onComplete={async () => {
                    await AsyncStorage.setItem('@vritti_onboarded', 'true');
                    props.navigation.reset({ index: 0, routes: [{ name: 'CoreTabs' }] });
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="CoreTabs" component={CoreTabs} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.page,
  },
  messageCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 30,
    padding: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.08)',
    alignItems: 'center',
  },
  messageEyebrow: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: colors.danger,
    fontWeight: '800',
    marginBottom: 10,
  },
  messageTitle: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.text,
    fontWeight: '900',
    textAlign: 'center',
  },
  loadingTitle: {
    marginTop: 16,
  },
  messageBody: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
});

