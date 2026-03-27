import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import './src/i18n'; // Initialize i18n
import { initI18n } from './src/i18n';

// Screens
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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function CoreTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1E293B', borderTopColor: '#334155', paddingBottom: 5 },
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('home') || 'Home', tabBarIcon: () => <></> }} />
      <Tab.Screen name="MyWeek" component={MyWeekScreen} options={{ tabBarLabel: t('my_week') || 'My Week', tabBarIcon: () => <></> }} />
      <Tab.Screen name="Renew" component={RenewScreen} options={{ tabBarLabel: t('policy') || 'Policy', tabBarIcon: () => <></> }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: t('history') || 'History', tabBarIcon: () => <></> }} />
      <Tab.Screen name="Help" component={HelpScreen} options={{ tabBarLabel: t('help') || 'Help', tabBarIcon: () => <></> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('LanguageSelect');

  useEffect(() => {
    async function prepare() {
      try {
        await initI18n();
        const onboarded = await AsyncStorage.getItem('@vritti_onboarded');
        if (onboarded === 'true') {
          setInitialRoute('CoreTabs');
        }
      } catch (e) {
        // Fallback to onboarding
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0A1628' }}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        {/* Onboarding Flow */}
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
              onComplete={() => {
                AsyncStorage.setItem('@vritti_onboarded', 'true');
                props.navigation.reset({ index: 0, routes: [{ name: 'CoreTabs' }] });
              }}
            />
          )}
        </Stack.Screen>

        {/* Main App */}
        <Stack.Screen name="CoreTabs" component={CoreTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
