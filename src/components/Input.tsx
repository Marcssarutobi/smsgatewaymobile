import { View, TextInput, Text, TextInputProps } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label: string;
  icon: LucideIcon;
  error?: string;
}

export function Input({ label, icon: Icon, error, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-slate-700">{label}</Text>
      <View className={`flex-row items-center h-12 rounded-xl border bg-white px-3 ${
        error ? 'border-red-400' : 'border-slate-200'
      }`}>
        <Icon size={18} color="#94A3B8" />
        <TextInput
          className="flex-1 ml-2.5 text-slate-900 text-base"
          placeholderTextColor="#94A3B8"
          {...props}
        />
      </View>
      {error && <Text className="text-xs text-red-600">{error}</Text>}
    </View>
  );
}