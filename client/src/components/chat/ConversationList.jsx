import {
  MessageCirclePlus,
  Search,
  Users,
} from 'lucide-react';

const getInitials = (
  conversation
) => {
  const value =
    conversation
      ?.display_name ||
    conversation?.name ||
    'S';

  const words =
    String(
      value
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  return words
    .slice(
      0,
      2
    )
    .map(
      (
        word
      ) =>
        word[0]
    )
    .join('')
    .toUpperCase();
};

const getLastMessageText = (
  conversation
) => {
  const message =
    conversation
      ?.last_message;

  if (!message) {
    return 'Henüz mesaj yok';
  }

  if (
    message.is_deleted
  ) {
    return 'Bu mesaj silindi';
  }

  if (
    message.type ===
      'file'
  ) {
    return (
      message.content ||
      'Dosya gönderildi'
    );
  }

  return (
    message.content ||
    'Yeni mesaj'
  );
};

const formatTime = (
  value
) => {
  if (!value) {
    return '';
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleTimeString(
    'tr-TR',
    {
      hour:
        '2-digit',

      minute:
        '2-digit',
    }
  );
};

const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  onNewDirect,
  searchValue,
  onSearchChange,
  loading,
}) => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-gray-200 p-3 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            />

            <input
              type="search"
              value={
                searchValue
              }
              onChange={(
                event
              ) =>
                onSearchChange(
                  event.target.value
                )
              }
              placeholder="Sohbet ara..."
              className="
                h-10 w-full rounded-xl
                border border-gray-200
                bg-gray-50 pl-9 pr-3
                text-sm text-gray-900
                outline-none transition
                placeholder:text-gray-400
                focus:border-amber-300
                focus:bg-white
                focus:ring-2
                focus:ring-amber-100
                dark:border-white/[0.07]
                dark:bg-white/[0.035]
                dark:text-white
                dark:placeholder:text-slate-500
                dark:focus:border-amber-400/30
                dark:focus:ring-amber-500/10
              "
            />
          </div>

          <button
            type="button"
            onClick={
              onNewDirect
            }
            className="
              inline-flex h-10 w-10 shrink-0
              items-center justify-center
              rounded-xl bg-[#0c2858]
              text-white transition
              hover:bg-[#10356f]
              focus:outline-none
              focus:ring-2
              focus:ring-blue-300
              dark:bg-blue-600
              dark:hover:bg-blue-500
            "
            aria-label="Yeni birebir sohbet"
            title="Yeni birebir sohbet"
          >
            <MessageCirclePlus
              size={18}
            />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map(
              (
                item
              ) => (
                <div
                  key={
                    item
                  }
                  className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-white/[0.04]"
                />
              )
            )}
          </div>
        ) : conversations.length ===
          0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-5 text-center">
            <Users
              size={26}
              className="text-gray-300 dark:text-slate-600"
            />

            <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-slate-300">
              Sohbet bulunamadı
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-400 dark:text-slate-500">
              Yeni bir birebir sohbet başlatabilirsin.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map(
              (
                conversation
              ) => {
                const selected =
                  conversation.id ===
                  selectedId;

                const unread =
                  Number(
                    conversation
                      .unread_count ||
                    0
                  );

                return (
                  <button
                    key={
                      conversation.id
                    }
                    type="button"
                    onClick={() =>
                      onSelect(
                        conversation
                      )
                    }
                    className={`
                      flex w-full items-center gap-3
                      rounded-xl px-3 py-2.5
                      text-left transition
                      ${
                        selected
                          ? 'bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-500/[0.08] dark:ring-blue-500/15'
                          : 'hover:bg-gray-50 dark:hover:bg-white/[0.035]'
                      }
                    `}
                  >
                    <div
                      className={`
                        flex h-10 w-10 shrink-0
                        items-center justify-center
                        rounded-xl text-xs font-bold
                        ${
                          conversation.type ===
                          'office'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300'
                        }
                      `}
                    >
                      {getInitials(
                        conversation
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`
                            min-w-0 flex-1 truncate
                            text-sm text-gray-900
                            dark:text-white
                            ${
                              unread >
                              0
                                ? 'font-bold'
                                : 'font-semibold'
                            }
                          `}
                        >
                          {
                            conversation
                              .display_name
                          }
                        </p>

                        <span className="shrink-0 text-[10px] font-medium text-gray-400 dark:text-slate-600">
                          {formatTime(
                            conversation
                              ?.last_message
                              ?.created_at
                          )}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <p
                          className={`
                            min-w-0 flex-1 truncate
                            text-xs
                            ${
                              unread >
                              0
                                ? 'font-semibold text-gray-700 dark:text-slate-300'
                                : 'text-gray-400 dark:text-slate-500'
                            }
                          `}
                        >
                          {getLastMessageText(
                            conversation
                          )}
                        </p>

                        {unread >
                          0 && (
                          <span className="flex min-h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[9px] font-bold text-white">
                            {unread >
                            99
                              ? '99+'
                              : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
