import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { radius } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  selected?: boolean;
  danger?: boolean;
  size?: number;
};

export function IconButton({ icon, label, onPress, selected, danger, size = 22 }: IconButtonProps) {
  const { colors } = useAppTheme();
  const color = danger ? colors.danger : selected ? colors.primary : colors.text;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: selected ? colors.primarySoft : colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      <Ionicons color={color} name={icon} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
