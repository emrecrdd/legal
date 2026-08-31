const PROD_API_ORIGIN =
  'https://legal-eblw.onrender.com';

const getApiBaseUrl = () => {
  const configured =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    PROD_API_ORIGIN;

  const clean =
    String(configured)
      .trim()
      .replace(/\/+$/, '');

  return clean.endsWith('/api')
    ? clean
    : `${clean}/api`;
};

const looksLikeJwt = (
  value
) => {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      value.trim()
    )
  );
};

const decodeJwtPayload = (
  token
) => {
  try {
    const encoded =
      token.split('.')[1];

    const normalized =
      encoded
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const padded =
      normalized.padEnd(
        Math.ceil(
          normalized.length / 4
        ) * 4,
        '='
      );

    return JSON.parse(
      decodeURIComponent(
        Array.from(
          atob(padded)
        )
          .map(
            (char) =>
              `%${char
                .charCodeAt(0)
                .toString(16)
                .padStart(2, '0')}`
          )
          .join('')
      )
    );
  } catch {
    return null;
  }
};

const collectJwtCandidates = (
  value,
  result,
  depth = 0
) => {
  if (
    depth > 5 ||
    value === null ||
    value === undefined
  ) {
    return;
  }

  if (
    typeof value === 'string'
  ) {
    const clean =
      value.trim();

    if (
      looksLikeJwt(
        clean
      )
    ) {
      result.push(
        clean
      );
      return;
    }

    if (
      (clean.startsWith('{') &&
        clean.endsWith('}')) ||
      (clean.startsWith('[') &&
        clean.endsWith(']'))
    ) {
      try {
        collectJwtCandidates(
          JSON.parse(clean),
          result,
          depth + 1
        );
      } catch {
        // JSON olmayan storage değeri.
      }
    }

    return;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    value.forEach(
      (item) =>
        collectJwtCandidates(
          item,
          result,
          depth + 1
        )
    );
    return;
  }

  if (
    typeof value === 'object'
  ) {
    Object.values(
      value
    ).forEach(
      (item) =>
        collectJwtCandidates(
          item,
          result,
          depth + 1
        )
    );
  }
};

const tokenScore = (
  token
) => {
  const payload =
    decodeJwtPayload(
      token
    );

  if (!payload) {
    return 1;
  }

  if (
    payload.type ===
    'refresh'
  ) {
    return -100;
  }

  let score = 2;

  if (
    payload.type ===
    'access'
  ) {
    score += 100;
  }

  const audience =
    Array.isArray(
      payload.aud
    )
      ? payload.aud.join(' ')
      : String(
          payload.aud || ''
        );

  if (
    audience
      .toLowerCase()
      .includes('access')
  ) {
    score += 20;
  }

  if (
    Number(payload.exp) >
    Math.floor(
      Date.now() / 1000
    )
  ) {
    score += 10;
  }

  return score;
};

export const resolveAccessToken = (
  explicitToken = null
) => {
  const candidates = [];

  collectJwtCandidates(
    explicitToken,
    candidates
  );

  if (
    typeof window !==
    'undefined'
  ) {
    [
      window.localStorage,
      window.sessionStorage,
    ].forEach(
      (storage) => {
        try {
          for (
            let index = 0;
            index <
            storage.length;
            index += 1
          ) {
            const key =
              storage.key(
                index
              );

            if (!key) {
              continue;
            }

            collectJwtCandidates(
              storage.getItem(
                key
              ),
              candidates
            );
          }
        } catch {
          // Bazı tarayıcı gizlilik modlarında storage erişimi sınırlı olabilir.
        }
      }
    );
  }

  const unique =
    [
      ...new Set(
        candidates
      ),
    ];

  unique.sort(
    (left, right) =>
      tokenScore(right) -
      tokenScore(left)
  );

  const selected =
    unique.find(
      (token) =>
        tokenScore(token) >=
        0
    );

  return selected ||
    null;
};

export class ScreenLockApiError extends Error {
  constructor({
    message,
    status,
    code,
    data,
  }) {
    super(
      message ||
        'Ekran kilidi isteği başarısız oldu.'
    );

    this.name =
      'ScreenLockApiError';
    this.status =
      status || 0;
    this.code =
      code ||
      'SCREEN_LOCK_API_ERROR';
    this.data =
      data || {};
  }
}

const request = async (
  path,
  {
    method = 'GET',
    body,
    token,
    signal,
  } = {}
) => {
  const accessToken =
    resolveAccessToken(
      token
    );

  if (!accessToken) {
    throw new ScreenLockApiError({
      message:
        'Aktif oturum anahtarı bulunamadı. Lütfen yeniden giriş yapın.',
      status:
        401,
      code:
        'SCREEN_LOCK_AUTH_TOKEN_MISSING',
    });
  }

  let response;

  try {
    response =
      await fetch(
        `${getApiBaseUrl()}${path}`,
        {
          method,
          signal,
          credentials:
            'include',
          headers: {
            Accept:
              'application/json',
            Authorization:
              `Bearer ${accessToken}`,
            ...(body !== undefined
              ? {
                  'Content-Type':
                    'application/json',
                }
              : {}),
          },
          ...(body !== undefined
            ? {
                body:
                  JSON.stringify(
                    body
                  ),
              }
            : {}),
        }
      );
  } catch (error) {
    if (
      error?.name ===
      'AbortError'
    ) {
      throw error;
    }

    throw new ScreenLockApiError({
      message:
        'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.',
      status:
        0,
      code:
        'SCREEN_LOCK_NETWORK_ERROR',
    });
  }

  let payload =
    null;

  try {
    payload =
      await response.json();
  } catch {
    payload =
      null;
  }

  if (!response.ok) {
    throw new ScreenLockApiError({
      message:
        payload?.message ||
        'Ekran kilidi isteği başarısız oldu.',
      status:
        response.status,
      code:
        payload?.code ||
        'SCREEN_LOCK_API_ERROR',
      data:
        payload?.data || {},
    });
  }

  return payload?.data;
};

export const screenLockApi = {
  status(
    token,
    options = {}
  ) {
    return request(
      '/screen-lock/status',
      {
        token,
        signal:
          options.signal,
      }
    );
  },

  setup(
    {
      pin,
      confirmPin,
    },
    token
  ) {
    return request(
      '/screen-lock/setup',
      {
        method:
          'POST',
        body: {
          pin,
          confirmPin,
        },
        token,
      }
    );
  },

  lock(
    reason,
    token
  ) {
    return request(
      '/screen-lock/lock',
      {
        method:
          'POST',
        body: {
          reason,
        },
        token,
      }
    );
  },

  touch(
    token
  ) {
    return request(
      '/screen-lock/touch',
      {
        method:
          'POST',
        body: {},
        token,
      }
    );
  },

  unlock(
    pin,
    token
  ) {
    return request(
      '/screen-lock/unlock',
      {
        method:
          'POST',
        body: {
          pin,
        },
        token,
      }
    );
  },

  recoverWithPassword(
    {
      password,
      newPin,
      confirmPin,
    },
    token
  ) {
    return request(
      '/screen-lock/recover/password',
      {
        method:
          'POST',
        body: {
          password,
          newPin,
          confirmPin,
        },
        token,
      }
    );
  },

  recoverWithCode(
    {
      recoveryCode,
      newPin,
      confirmPin,
    },
    token
  ) {
    return request(
      '/screen-lock/recover/recovery-code',
      {
        method:
          'POST',
        body: {
          recoveryCode,
          newPin,
          confirmPin,
        },
        token,
      }
    );
  },
};

export default screenLockApi;
