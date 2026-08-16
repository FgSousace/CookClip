import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  const { colors } = useAppTheme();
  const backgroundColor =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.dangerSoft : colors.surfaceElevated;
  const textColor = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor: variant === 'secondary' ? colors.border : backgroundColor },
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons color={textColor} name={icon} size={19} /> : null}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
