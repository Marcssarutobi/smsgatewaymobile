import { useMutation } from '@tanstack/react-query';
import { twoFactorService } from '../services/twoFactorService';

export function useVerifyTwoFactor() {
  return useMutation({
    mutationFn: twoFactorService.verify,
  });
}