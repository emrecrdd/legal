import axios from '../../app/config/axios.js';

const setupApi = {
  inspect(
    token
  ) {
    return axios.get(
      `/setup/${encodeURIComponent(
        token
      )}`
    );
  },

  claim(
    token,
    data
  ) {
    return axios.post(
      `/setup/${encodeURIComponent(
        token
      )}/claim`,
      data
    );
  },

  verifyEmail(
    token
  ) {
    return axios.post(
      '/setup/verify-email',
      null,
      {
        params: {
          token,
        },
      }
    );
  },

  resendVerification(
    email
  ) {
    return axios.post(
      '/setup/resend-verification',
      {
        email,
      }
    );
  },
};

export default setupApi;
