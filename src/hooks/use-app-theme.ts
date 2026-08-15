import { useColorScheme } from 'react-native';

import { colorsForScheme } from '@/constants/theme';

export function useAppTheme() {
  const scheme = useColorScheme();

  return {
    scheme: scheme === 'dark' ? ('dark' as const) : ('light' as const),
    colors: colorsForScheme(scheme),
  };
}
