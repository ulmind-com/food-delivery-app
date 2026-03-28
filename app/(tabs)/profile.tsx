import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../constants/ThemeContext';

export default function ProfileScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.foreground }]}>Profile Screen Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
  },
});
