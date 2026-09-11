import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadow } from '../theme';

export default function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    ...shadow.card,
  },
});
