import type { LucideIcon } from 'lucide-react-native';

type TabIconProps = {
  Icon: LucideIcon;
  color: string;
  focused: boolean;
};

export function TabIcon({ Icon, color, focused }: TabIconProps) {
  return (
    <Icon
      color={color}
      size={focused ? 24 : 22}
      strokeWidth={focused ? 2.2 : 1.8}
    />
  );
}
