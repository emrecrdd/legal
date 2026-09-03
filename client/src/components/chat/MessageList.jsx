import {
  useEffect,
  useRef,
} from 'react';

import MessageBubble from './MessageBubble.jsx';

const MessageList = ({
  messages,
  currentUserId,
  conversationType,
  hasMore,
  loadingMore,
  onLoadMore,
  readReceipt,
  onEdit,
  onDelete,
  onDownloadAttachment,
}) => {
  const containerRef =
    useRef(null);

  const lastMessageIdRef =
    useRef(null);

  useEffect(() => {
    const lastId =
      messages[
        messages.length -
          1
      ]?.id;

    if (
      !lastId ||
      lastMessageIdRef
        .current ===
        lastId
    ) {
      return;
    }

    lastMessageIdRef.current =
      lastId;

    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top:
        container.scrollHeight,

      behavior:
        'smooth',
    });
  }, [
    messages,
  ]);

  const lastOwnIndex =
    (() => {
      for (
        let index =
          messages.length -
          1;
        index >= 0;
        index -= 1
      ) {
        if (
          messages[
            index
          ]?.sender?.id ===
          currentUserId
        ) {
          return index;
        }
      }

      return -1;
    })();

  const readIndex =
    readReceipt
      ?.last_read_message_id
      ? messages.findIndex(
          (
            message
          ) =>
            message.id ===
            readReceipt
              .last_read_message_id
        )
      : -1;

  const lastOwnRead =
    readReceipt
      ?.user_id &&
    readReceipt.user_id !==
      currentUserId &&
    readIndex >=
      lastOwnIndex &&
    lastOwnIndex >= 0;

  return (
    <div
      ref={
        containerRef
      }
      className="min-h-0 flex-1 overflow-y-auto bg-[#f3f5f7] px-3 py-5 dark:bg-[#061324] md:px-6"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(15, 42, 76, 0.055) 1px, transparent 0), linear-gradient(135deg, rgba(255,255,255,0.58), rgba(255,255,255,0.08))',

        backgroundSize:
          '26px 26px, 100% 100%',
      }}
    >
      {hasMore && (
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            onClick={
              onLoadMore
            }
            disabled={
              loadingMore
            }
            className="
              rounded-full border border-slate-200/90
              bg-white/90 px-3.5 py-1.5 backdrop-blur
              text-[10px] font-semibold
              text-gray-500 shadow-sm
              transition hover:bg-gray-50
              disabled:opacity-50
              dark:border-white/[0.07]
              dark:bg-white/[0.04]
              dark:text-slate-400
              dark:hover:bg-white/[0.07]
            "
          >
            {loadingMore
              ? 'Yükleniyor...'
              : 'Daha eski mesajları yükle'}
          </button>
        </div>
      )}

      {messages.length ===
      0 ? (
        <div className="flex h-full min-h-[300px] items-center justify-center text-center">
          <div>
            <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">
              Henüz mesaj yok
            </p>

            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              İlk mesajı göndererek sohbeti başlat.
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[1080px] space-y-2.5">
          {messages.map(
            (
              message,
              index
            ) => {
              const own =
                message
                  ?.sender?.id ===
                currentUserId;

              const previous =
                messages[
                  index -
                    1
                ];

              const showSender =
                conversationType ===
                  'office' &&
                !own &&
                previous
                  ?.sender?.id !==
                  message
                    ?.sender?.id;

              return (
                <MessageBubble
                  key={
                    message.id
                  }
                  message={
                    message
                  }
                  own={
                    own
                  }
                  showSender={
                    showSender
                  }
                  showReadReceipt={
                    own &&
                    index ===
                      lastOwnIndex &&
                    lastOwnRead
                  }
                  onEdit={
                    onEdit
                  }
                  onDelete={
                    onDelete
                  }
                  onDownloadAttachment={
                    onDownloadAttachment
                  }
                />
              );
            }
          )}
        </div>
      )}
    </div>
  );
};

export default MessageList;
