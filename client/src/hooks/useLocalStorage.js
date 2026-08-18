import {
  useCallback,
  useEffect,
  useState,
} from 'react';

export const useLocalStorage = (
  key,
  initialValue
) => {
  // ====================================================
  // INITIAL VALUE
  // ====================================================

  const getInitialValue =
    useCallback(() => {
      return typeof initialValue ===
        'function'
        ? initialValue()
        : initialValue;
    }, [initialValue]);

  // ====================================================
  // READ
  // ====================================================

  const readValue =
    useCallback(() => {
      if (
        typeof window ===
        'undefined'
      ) {
        return getInitialValue();
      }

      try {
        const item =
          window.localStorage.getItem(
            key
          );

        return item !== null
          ? JSON.parse(item)
          : getInitialValue();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            `localStorage read error (${key}):`,
            error
          );
        }

        return getInitialValue();
      }
    }, [
      key,
      getInitialValue,
    ]);

  const [
    storedValue,
    setStoredValue,
  ] = useState(readValue);

  // ====================================================
  // KEY DEĞİŞİRSE YENİDEN OKU
  // ====================================================

  useEffect(() => {
    setStoredValue(
      readValue()
    );
  }, [
    key,
    readValue,
  ]);

  // ====================================================
  // WRITE
  // ====================================================

  const setValue =
    useCallback(
      (value) => {
        try {
          const newValue =
            typeof value ===
            'function'
              ? value(
                  readValue()
                )
              : value;

          setStoredValue(
            newValue
          );

          if (
            typeof window !==
            'undefined'
          ) {
            window.localStorage.setItem(
              key,
              JSON.stringify(
                newValue
              )
            );
          }
        } catch (error) {
          if (
            import.meta.env.DEV
          ) {
            console.error(
              `localStorage write error (${key}):`,
              error
            );
          }
        }
      },
      [
        key,
        readValue,
      ]
    );

  // ====================================================
  // REMOVE
  // ====================================================

  const removeValue =
    useCallback(() => {
      try {
        if (
          typeof window !==
          'undefined'
        ) {
          window.localStorage.removeItem(
            key
          );
        }

        setStoredValue(
          getInitialValue()
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            `localStorage remove error (${key}):`,
            error
          );
        }
      }
    }, [
      key,
      getInitialValue,
    ]);

  // ====================================================
  // OTHER TAB SYNC
  // ====================================================

  useEffect(() => {
    if (
      typeof window ===
      'undefined'
    ) {
      return undefined;
    }

    const handleStorage = (
      event
    ) => {
      if (
        event.key !== key
      ) {
        return;
      }

      setStoredValue(
        readValue()
      );
    };

    window.addEventListener(
      'storage',
      handleStorage
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorage
      );
    };
  }, [
    key,
    readValue,
  ]);

  return [
    storedValue,
    setValue,
    removeValue,
  ];
};

export default useLocalStorage;