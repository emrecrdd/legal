import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import toast from 'react-hot-toast';

import setupApi from './setup.api.js';

const messageOf = (
  error,
  fallback
) =>
  String(
    error?.response?.data?.message ||
      error?.message ||
      fallback
  ).trim();

export const useSetupInvite = (
  token
) => {
  return useQuery({
    queryKey: [
      'setup-invite',
      token,
    ],

    queryFn: async () => {
      const response =
        await setupApi.inspect(
          token
        );

      return (
        response?.data?.data ||
        response?.data
      );
    },

    enabled:
      Boolean(
        token
      ),

    retry:
      false,

    staleTime:
      0,
  });
};

export const useClaimSetupInvite = () => {
  return useMutation({
    mutationFn: async ({
      token,
      data,
    }) => {
      const response =
        await setupApi.claim(
          token,
          data
        );

      return (
        response?.data ||
        response
      );
    },

    onError: (
      error
    ) => {
      toast.error(
        messageOf(
          error,
          'Kurulum tamamlanamadı.'
        )
      );
    },
  });
};

export const useVerifySetupEmail = () => {
  return useMutation({
    mutationFn: async (
      token
    ) => {
      const response =
        await setupApi.verifyEmail(
          token
        );

      return (
        response?.data ||
        response
      );
    },
  });
};

export const useResendSetupVerification = () => {
  return useMutation({
    mutationFn: async (
      email
    ) => {
      const response =
        await setupApi.resendVerification(
          email
        );

      return (
        response?.data ||
        response
      );
    },

    onSuccess: () => {
      toast.success(
        'Doğrulama e-postası yeniden gönderildi.'
      );
    },

    onError: (
      error
    ) => {
      toast.error(
        messageOf(
          error,
          'Doğrulama e-postası gönderilemedi.'
        )
      );
    },
  });
};
