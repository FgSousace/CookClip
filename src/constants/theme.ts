import { ColorSchemeName } from 'react-native';

export type AppColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  overlay: string;
  shadow: string;
};

const light: AppColors = {
  background: '#F5F7F3',
  surface: '#FFFFFF',
  surfaceElevated: '#FAFCF8',
  text: '#142018',
  textMuted: '#657168',
  border: '#DFE6DE',
  primary: '#2F7D4A',
  primaryPressed: '#24653B',
  primarySoft: '#E4F3E8',
  danger: '#B8423D',
  dangerSoft: '#FBE9E7',
  warning: '#D78B18',
  overlay: 'rgba(12, 22, 15, 0.52)',
  shadow: '#16231A',
};

const dark: AppColors = {
  background: '#0F1511',
  surface: '#18201A',
  surfaceElevated: '#202A22',
  text: '#F1F6F2',
  textMuted: '#A7B4AA',
  border: '#303C33',
  primary: '#65C982',
  primaryPressed: '#4FAE6B',
  primarySoft: '#203D29',
  danger: '#FF8B83',
  dangerSoft: '#422522',
  warning: '#F1B95F',
  overlay: 'rgba(4, 8, 5, 0.66)',
  shadow: '#000000',
};

export const palette = { light, dark };

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export function colorsForScheme(scheme: ColorSchemeName): AppColors {
  return scheme === 'dark' ? dark : light;
}
