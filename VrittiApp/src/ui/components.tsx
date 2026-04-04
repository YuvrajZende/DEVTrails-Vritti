import React, { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardVariants, colors, backgroundDots, shadows } from './theme';

type CardVariant = keyof typeof cardVariants;

type AppScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function AppScreen({ children, scroll = true, style, contentContainerStyle }: AppScreenProps) {
  const content = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={['top']}>
      <BackgroundDecor />
      {content}
    </SafeAreaView>
  );
}

export function BackgroundDecor() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      {backgroundDots.map((dot, index) => (
        <View key={index} style={[styles.dot, dot]} />
      ))}
    </View>
  );
}

type AppCardProps = {
  children: ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
};

export function AppCard({ children, variant = 'white', style }: AppCardProps) {
  return <View style={[styles.card, cardVariants[variant], style]}>{children}</View>;
}

type PrimaryButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'black' | 'amber' | 'white';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  disabled,
  variant = 'black',
  style,
}: PrimaryButtonProps) {
  const variantStyles = buttonVariants[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variantStyles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
    >
      <Text style={[styles.buttonText, variantStyles.text]}>{title}</Text>
    </Pressable>
  );
}

type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

type HeaderActionProps = {
  icon: ReactNode;
  onPress?: () => void;
  wide?: boolean;
  label?: string;
};

export function HeaderAction({ icon, onPress, wide, label }: HeaderActionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.headerAction, wide && styles.headerActionWide, pressed && styles.buttonPressed]}
    >
      {icon}
      {label ? <Text style={styles.headerActionLabel}>{label}</Text> : null}
    </Pressable>
  );
}

type InputFieldProps = TextInputProps & {
  label?: string;
  prefix?: string;
  suffix?: ReactNode;
  helper?: string;
  error?: string;
};

export function InputField({ label, prefix, suffix, helper, error, style, ...props }: InputFieldProps) {
  return (
    <View style={styles.inputBlock}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
        {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.softText}
          style={[styles.input, style as StyleProp<TextStyle>]}
          {...props}
        />
        {suffix}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : helper ? <Text style={styles.helperText}>{helper}</Text> : null}
    </View>
  );
}

type TabIconName = keyof typeof Feather.glyphMap;

const tabConfig: Record<string, { label: string; icon: TabIconName }> = {
  Home: { label: 'Home', icon: 'home' },
  MyWeek: { label: 'Stats', icon: 'bar-chart-2' },
  Renew: { label: 'Renew', icon: 'refresh-cw' },
  History: { label: 'History', icon: 'clock' },
  Help: { label: 'Help', icon: 'help-circle' },
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.tabOuter}>
      <View style={[styles.tabBar, { marginBottom: Math.max(insets.bottom, 10) + 8 }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const config = tabConfig[route.name] || { label: route.name, icon: 'circle' as TabIconName };

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

          const accessibilityLabel = options.tabBarAccessibilityLabel;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={accessibilityLabel}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabButton,
                isFocused && styles.tabButtonActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Feather
                name={config.icon}
                size={20}
                color={isFocused ? colors.white : 'rgba(255,255,255,0.45)'}
              />
              {isFocused ? <Text style={styles.tabLabel}>{config.label}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ScreenHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.headingBlock}>
      <Text style={styles.headingTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headingSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function IconTile({
  family = 'feather',
  name,
  color = colors.text,
  backgroundColor = colors.white,
}: {
  family?: 'feather' | 'ionicons' | 'material';
  name: string;
  color?: string;
  backgroundColor?: string;
}) {
  let icon: ReactNode = null;

  if (family === 'ionicons') {
    icon = <Ionicons name={name as keyof typeof Ionicons.glyphMap} size={22} color={color} />;
  } else if (family === 'material') {
    icon = (
      <MaterialCommunityIcons
        name={name as keyof typeof MaterialCommunityIcons.glyphMap}
        size={22}
        color={color}
      />
    );
  } else {
    icon = <Feather name={name as keyof typeof Feather.glyphMap} size={22} color={color} />;
  }

  return <View style={[styles.iconTile, { backgroundColor }]}>{icon}</View>;
}

const buttonVariants = {
  black: {
    button: { backgroundColor: colors.black, borderColor: colors.black },
    text: { color: colors.white },
  },
  amber: {
    button: { backgroundColor: colors.amber, borderColor: colors.amber },
    text: { color: colors.white },
  },
  white: {
    button: { backgroundColor: colors.white, borderColor: colors.border },
    text: { color: colors.text },
  },
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.page,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  blobTop: {
    position: 'absolute',
    top: -40,
    right: -10,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
  },
  blobBottom: {
    position: 'absolute',
    bottom: 30,
    left: -50,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(17, 24, 39, 0.10)',
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    ...shadows.card,
  },
  button: {
    minHeight: 58,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.chip,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.chipText,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chipTextActive: {
    color: colors.white,
  },
  headerAction: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadows.card,
  },
  headerActionWide: {
    paddingHorizontal: 16,
  },
  headerActionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  inputBlock: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 8,
  },
  inputWrap: {
    minHeight: 64,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.card,
  },
  inputWrapError: {
    borderColor: 'rgba(220, 38, 38, 0.35)',
  },
  inputPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    paddingVertical: 18,
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.softText,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.danger,
  },
  tabOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '92%',
    backgroundColor: colors.black,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 10,
    ...shadows.floating,
  },
  tabButton: {
    minHeight: 54,
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tabButtonActive: {
    flexGrow: 0,
    paddingHorizontal: 18,
    backgroundColor: colors.amber,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  headingBlock: {
    marginBottom: 18,
  },
  headingTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.8,
  },
  headingSubtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    fontWeight: '600',
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});

