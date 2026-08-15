import {
  useState,
} from 'react';

import documentApi from './document.api.js';

import toast from 'react-hot-toast';

// ======================================================
// FILE HELPERS
// ======================================================

export const useFileUpload = () => {
  const validateFile = (
    file,
    options = {}
  ) => {
    if (!file) {
      return false;
    }

    const {
      maxSize = 10,
      allowedTypes = null,
    } = options;

    const maxSizeBytes =
      maxSize *
      1024 *
      1024;

    if (
      file.size >
      maxSizeBytes
    ) {
      toast.error(
        `Dosya boyutu ${maxSize} MB'dan büyük olamaz`
      );

      return false;
    }

    if (
      Array.isArray(
        allowedTypes
      ) &&
      allowedTypes.length >
        0 &&
      !allowedTypes.includes(
        file.type
      )
    ) {
      toast.error(
        'Dosya türü desteklenmiyor'
      );

      return false;
    }

    return true;
  };

  const getFileIcon = (
    mimeType
  ) => {
    if (!mimeType) {
      return '📎';
    }

    if (
      mimeType.includes(
        'pdf'
      )
    ) {
      return '📄';
    }

    if (
      mimeType.includes(
        'word'
      ) ||
      mimeType.includes(
        'document'
      )
    ) {
      return '📝';
    }

    if (
      mimeType.includes(
        'excel'
      ) ||
      mimeType.includes(
        'sheet'
      )
    ) {
      return '📊';
    }

    if (
      mimeType.includes(
        'image'
      )
    ) {
      return '🖼️';
    }

    if (
      mimeType.includes(
        'video'
      )
    ) {
      return '🎬';
    }

    return '📎';
  };

  const formatFileSize = (
    bytes
  ) => {
    const size =
      Number(bytes) || 0;

    if (size <= 0) {
      return '0 B';
    }

    const units = [
      'B',
      'KB',
      'MB',
      'GB',
    ];

    const index =
      Math.min(
        Math.floor(
          Math.log(size) /
            Math.log(1024)
        ),
        units.length - 1
      );

    const value =
      size /
      1024 ** index;

    return `${Number(
      value.toFixed(2)
    )} ${units[index]}`;
  };

  return {
    validateFile,
    getFileIcon,
    formatFileSize,
  };
};

// ======================================================
// DOCUMENT DOWNLOAD
// ======================================================

export const useDocumentDownload =
  () => {
    const [
      isDownloading,
      setIsDownloading,
    ] = useState(false);

    const download =
      async (
        documentId,
        filename =
          'document'
      ) => {
        if (!documentId) {
          toast.error(
            'Geçersiz belge'
          );

          return;
        }

        setIsDownloading(
          true
        );

        let objectUrl = null;
        let anchor = null;

        try {
          const response =
            await documentApi.download(
              documentId
            );

          const blob =
            new Blob(
              [response.data],
              {
                type:
                  response.headers?.[
                    'content-type'
                  ] ||
                  'application/octet-stream',
              }
            );

          objectUrl =
            window.URL.createObjectURL(
              blob
            );

          anchor =
            window.document.createElement(
              'a'
            );

          anchor.href =
            objectUrl;

          anchor.download =
            filename ||
            'document';

          anchor.style.display =
            'none';

          window.document.body.appendChild(
            anchor
          );

          anchor.click();

          toast.success(
            'Dosya indirildi'
          );
        } catch (error) {
          const message =
            error?.response
              ?.data?.message ||
            error?.message ||
            'Dosya indirilemedi';

          toast.error(
            message
          );

          throw error;
        } finally {
          if (
            anchor?.parentNode
          ) {
            anchor.parentNode.removeChild(
              anchor
            );
          }

          if (objectUrl) {
            window.URL.revokeObjectURL(
              objectUrl
            );
          }

          setIsDownloading(
            false
          );
        }
      };

    return {
      download,
      isDownloading,
    };
  };