import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  title: string;
  description: string;
  icon: IconName;
};

export default function PlaceholderScreen({ title, description, icon }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-brand-50 px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-white shadow">
        <Ionicons name={icon} size={36} color="#1858b8" />
      </View>
      <Text className="mt-6 text-2xl font-bold text-slate-900">{title}</Text>
      <Text className="mt-2 text-center text-sm text-slate-600">
        {description}
      </Text>
    </View>
  );
}
