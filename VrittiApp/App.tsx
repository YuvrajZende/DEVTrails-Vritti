import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import i18next, { initI18n } from './src/i18n';

// Onboarding Screens
import LanguageSelectScreen from './src/screens/LanguageSelectScreen';
import PhoneEntryScreen from './src/screens/PhoneEntryScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import PlatformSelectScreen from './src/screens/PlatformSelectScreen';
import PartnerIDScreen from './src/screens/PartnerIDScreen';
import LocationPermissionScreen from './src/screens/LocationPermissionScreen';
import PremiumQuoteScreen from './src/screens/PremiumQuoteScreen';

// Core Screens
import HomeScreen from './src/screens/HomeScreen';
import MyWeekScreen from './src/screens/MyWeekScreen';
import RenewScreen from './src/screens/RenewScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import HelpScreen from './src/screens/HelpScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

function TabLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '600', color }}>
      {i18next.t(label)}
    </Text>
  );
}

function CoreTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopColor: '#334155',
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="home" color={color} />,
          tabBarIcon: () => <TabIcon emoji="🏠" />,
        }}
      />
      <Tab.Screen
        name="MyWeekTab"
        component={MyWeekScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="my_week" color={color} />,
          tabBarIcon: () => <TabIcon emoji="📊" />,
        }}
      />
      <Tab.Screen
        name="RenewTab"
        component={RenewScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="renew" color={color} />,
          tabBarIcon: () => <TabIcon emoji="🔄" />,
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="history" color={color} />,
          tabBarIcon: () => <TabIcon emoji="💰" />,
        }}
      />
      <Tab.Screen
        name="HelpTab"
        component={HelpScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="help" color={color} />,
          tabBarIcon: () => <TabIcon emoji="🎧" />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize i18n
        await initI18n().catch(err => console.warn('i18n init failed:', err));

        // Check onboarding status
        const val = await AsyncStorage.getItem('@vritti_onboarded');
        setOnboarded(val === 'true');
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleOnboardingComplete = () => {
    setOnboarded(true);
    AsyncStorage.setItem('@vritti_onboarded', 'true');
  };

  if (loading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashEmoji}>🛡️</Text>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={{ color: '#94A3B8', marginTop: 10 }}>Loading Vritti...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18next}>
          <NavigationContainer>
            {onboarded ? (
              <CoreTabs />
            ) : (
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  cardStyle: { backgroundColor: '#0A1628' },
                }}
              >
                <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
                <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
                <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
                <Stack.Screen name="PlatformSelect" component={PlatformSelectScreen} />
                <Stack.Screen name="PartnerID" component={PartnerIDScreen} />
                <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
                <Stack.Screen name="PremiumQuote">
                  {(props) => (
                    <PremiumQuoteScreen
                      {...props}
                      onComplete={handleOnboardingComplete}
                    />
                  )}
                </Stack.Screen>
              </Stack.Navigator>
            )}
          </NavigationContainer>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0A1628',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashEmoji: {
    fontSize: 80,
    marginBottom: 20
  },
});
