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
    this.name = 'LicenseApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const isJwtLike = (value) => {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return false;
  }

  const parts =
    value.trim().split('.');

  return parts.length === 3 &&
    parts.every(Boolean);
};

const extractTokenFromObject = (
  value,
  depth = 0
) => {
  if (
    !value ||
    typeof value !== 'object' ||
    depth > 3
  ) {
    return null;
  }

  const preferredKeys = [
    'accessToken',
    'access_token',
    'authToken',
    'token',
  ];

  for (const key of preferredKeys) {
    const candidate = value[key];

    if (isJwtLike(candidate)) {
      return candidate.trim();
    }
  }

  for (const [key, candidate] of Object.entries(value)) {
    if (
      /refresh/i.test(key)
    ) {
      continue;
    }

    if (
      candidate &&
      typeof candidate === 'object'
    ) {
      const nested =
        extractTokenFromObject(
          candidate,
          depth + 1
        );

      if (nested) {
        return nested;
      }
    }
  }

  return null;
};

const readStorageToken = (
  storage
) => {
  if (!storage) {
    return null;
  }

  const preferredKeys = [
    'accessToken',
    'access_token',
    'authToken',
    'token',
    'derkenar_access_token',
    'derkenar_token',
  ];

  for (const key of preferredKeys) {
    try {
      const candidate =
        storage.getItem(key);

      if (isJwtLike(candidate)) {
        return candidate.trim();
      }

      if (candidate) {
        try {
          const parsed =
            JSON.parse(candidate);

          const nested =
            extractTokenFromObject(parsed);

          if (nested) {
            return nested;
          }
        } catch {
          // JSON değilse sonraki anahtara geç.
        }
      }
    } catch {
      // Storage erişim hatası auth akışını kırmasın.
    }
  }

  /*
   * Uygulamadaki auth storage anahtarının adı farklıysa
   * access/token/auth içeren kayıtları kontrollü biçimde tara.
   * refresh token anahtarlarını özellikle dışarıda bırakıyoruz.
   */
  try {
    for (
      let index = 0;
      index < storage.length;
      index += 1
    ) {
      const key =
        storage.key(index);

      if (
        !key ||
        /refresh/i.test(key) ||
        !/(access|token|auth|session)/i.test(key)
      ) {
        continue;
      }

      const raw =
        storage.getItem(key);

      if (isJwtLike(raw)) {
        return raw.trim();
      }

      if (!raw) {
        continue;
      }

      try {
        const parsed =
          JSON.parse(raw);

        const nested =
          extractTokenFromObject(parsed);

        if (nested) {
          return nested;
        }
      } catch {
        // JSON değilse geç.
      }
    }
  } catch {
    // Storage tamamen kullanılamıyorsa null dön.
  }

  return null;
};

const resolveAccessToken = (
  explicitToken
) => {
  if (isJwtLike(explicitToken)) {
    return explicitToken.trim();
  }

  if (
    typeof window === 'undefined'
  ) {
    return null;
  }

  return (
    readStorageToken(
      window.localStorage
    ) ||
    readStorageToken(
      window.sessionStorage
    ) ||
    null
  );
};

const request = async (
  path,
  token,
  options = {}
) => {
  const accessToken =
    resolveAccessToken(token);

  if (!accessToken) {
    throw new LicenseApiError(
      'Aktif oturum anahtarı bulunamadı. Lütfen yeniden giriş yapın.',
      {
        status: 401,
        code: 'AUTH_TOKEN_MISSING',
      }
    );
  }

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
    Authorization:
      `Bearer ${accessToken}`,
  };

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers,
        credentials: 'include',
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
        status: response.status,
        code: payload?.code || null,
        data: payload,
      }
    );
  }

  return payload?.data ?? payload;
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
