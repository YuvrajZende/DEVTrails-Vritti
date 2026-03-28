import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
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

import { Feather } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet } from 'react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { t } = useTranslation();
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Icon mapping
          let iconName: any = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'MyWeek') iconName = 'bar-chart-2';
          else if (route.name === 'Renew') iconName = 'refresh-cw';
          else if (route.name === 'History') iconName = 'clock';
          else if (route.name === 'Help') iconName = 'help-circle';

          // Label mapping
          let label = options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={[
                styles.tabItem,
                isFocused && styles.tabItemFocused
              ]}
              activeOpacity={0.8}
            >
              <Feather 
                name={iconName} 
                size={22} 
                color={isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'} 
              />
              {isFocused && (
                <Text style={styles.tabLabelFocused}>{label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function CoreTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('home') || 'Home' }} />
      <Tab.Screen name="MyWeek" component={MyWeekScreen} options={{ tabBarLabel: t('my_week') || 'Stats' }} />
      <Tab.Screen name="Renew" component={RenewScreen} options={{ tabBarLabel: t('policy') || 'Renew' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: t('history') || 'History' }} />
      <Tab.Screen name="Help" component={HelpScreen} options={{ tabBarLabel: t('help') || 'Help' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    zIndex: 50,
  },
  tabBarInner: {
    height: 76,
    backgroundColor: '#000000',
    borderRadius: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  tabItem: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  tabItemFocused: {
    flex: 0,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  tabLabelFocused: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#111827" />
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
