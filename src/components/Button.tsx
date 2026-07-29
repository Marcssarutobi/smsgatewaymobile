import { Pressable, Text, ActivityIndicator, PressableProps } from 'react-native';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: 'primary' | 'outline';
  isLoading?: boolean;
}

export function Button({ label, variant = 'primary', isLoading, disabled, ...props }: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      disabled={disabled || isLoading}
      className={`h-12 rounded-xl items-center justify-center flex-row gap-2 ${
        isPrimary ? 'bg-indigo-600' : 'bg-white border border-slate-300'
      } ${(disabled || isLoading) ? 'opacity-60' : ''}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : '#4F46E5'} />
      ) : (
        <Text className={`font-semibold text-base ${isPrimary ? 'text-white' : 'text-slate-800'}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}