import { Platform } from 'react-native';

export const colors = {
  page: '#F8F7F2',
  text: '#111827',
  muted: '#6B7280',
  softText: '#9CA3AF',
  border: 'rgba(17, 24, 39, 0.08)',
  black: '#111111',
  white: '#FFFFFF',
  amber: '#F59E0B',
  blue: '#DBEAFE',
  teal: '#D1FAE5',
  pink: '#FCE7F3',
  cream: '#FEF3C7',
  success: '#1D9E75',
  warning: '#D97706',
  danger: '#DC2626',
  chip: '#F3F4F6',
  chipText: '#4B5563',
};

export const cardVariants = {
  white: { backgroundColor: colors.white, borderColor: colors.border },
  blue: { backgroundColor: '#E0E7FF', borderColor: 'rgba(99, 102, 241, 0.18)' },
  teal: { backgroundColor: '#ECFDF5', borderColor: 'rgba(16, 185, 129, 0.18)' },
  amber: { backgroundColor: '#FFFBEB', borderColor: 'rgba(245, 158, 11, 0.18)' },
  pink: { backgroundColor: '#FDF2F8', borderColor: 'rgba(236, 72, 153, 0.18)' },
  ghost: { backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: colors.border },
} as const;

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
    },
    android: { elevation: 4 },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.14,
      shadowRadius: 22,
    },
    android: { elevation: 12 },
    default: {},
  }),
};

export const backgroundDots = [
  { top: 44, left: 28 },
  { top: 92, left: 146 },
  { top: 126, left: 302 },
  { top: 214, left: 72 },
  { top: 252, left: 222 },
  { top: 334, left: 26 },
  { top: 384, left: 176 },
  { top: 468, left: 296 },
  { top: 536, left: 88 },
  { top: 612, left: 244 },
  { top: 684, left: 34 },
  { top: 772, left: 196 },
];

export const formatCurrency = (value?: number | null) => {
  if (!value) {
    return 'Rs 0';
  }

  return `Rs ${new Intl.NumberFormat('en-IN').format(value)}`;
};
