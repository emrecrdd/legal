const API_BASE_URL =
  String(
    import.meta.env.VITE_API_URL ||
      '/api'
  ).replace(/\/+$/, '');

export class LicenseApiError extends Error {
  constructor(
    message,
    {
      status = 0,
      code = null,
      data = null,
    } = {}
  ) {
    super(message);
    this.name =
      'LicenseApiError';
    this.status =
      status;
    this.code =
      code;
    this.data =
      data;
  }
}

const request = async (
  path,
  token,
  options = {}
) => {
  const headers = {
    Accept:
      'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers,
        credentials:
          'include',
      }
    );

  const payload =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new LicenseApiError(
      payload?.message ||
        'Lisans bilgisi alınamadı.',
      {
        status:
          response.status,
        code:
          payload?.code ||
          null,
        data:
          payload,
      }
    );
  }

  return (
    payload?.data ??
    payload
  );
};

export const licenseApi = {
  current(token) {
    return request(
      '/license/current',
      token,
      {
        method: 'GET',
        cache: 'no-store',
      }
    );
  },
};

export default licenseApi;
