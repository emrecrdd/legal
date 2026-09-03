import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowLeft,
  MessagesSquare,
  Users,
} from 'lucide-react';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import ConversationList from '../../components/chat/ConversationList.jsx';
import MessageList from '../../components/chat/MessageList.jsx';
import MessageInput from '../../components/chat/MessageInput.jsx';
import NewDirectChatModal from '../../components/chat/NewDirectChatModal.jsx';

import chatApi from '../../features/chat/chat.api.js';

import {
  useChatConversations,
  useChatMessages,
  useChatUsers,
  useDeleteChatMessage,
  useEditChatMessage,
  useMarkChatRead,
  useOpenDirectConversation,
  useSendChatMessage,
  useSendChatAttachments,
} from '../../features/chat/chat.query.js';

import {
  useChatRealtime,
} from '../../features/chat/chat.socket.js';

const getMessagesFromInfiniteData = (
  data
) => {
  if (
    !Array.isArray(
      data?.pages
    )
  ) {
    return [];
  }

  /*
   * İlk page en yeni 30 mesajdır.
   * fetchNextPage daha eski sayfaları sona ekler.
   * Timeline için page sırasını ters çeviriyoruz.
   */
  return [
    ...data.pages,
  ]
    .reverse()
    .flatMap(
      (
        page
      ) =>
        Array.isArray(
          page?.data
        )
          ? page.data
          : []
    );
};

const ChatPage = () => {
  const {
    user,
  } =
    useAuth();

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] =
    useState(null);

  const [
    conversationSearch,
    setConversationSearch,
  ] =
    useState('');

  const [
    directModalOpen,
    setDirectModalOpen,
  ] =
    useState(false);

  const [
    mobileConversationOpen,
    setMobileConversationOpen,
  ] =
    useState(false);

  const [
    editingMessage,
    setEditingMessage,
  ] =
    useState(null);

  const conversationsQuery =
    useChatConversations();

  const usersQuery =
    useChatUsers(
      directModalOpen
    );

  const openDirect =
    useOpenDirectConversation();

  const sendMessage =
    useSendChatMessage();

  const sendAttachments =
    useSendChatAttachments();

  const editMessage =
    useEditChatMessage();

  const deleteMessage =
    useDeleteChatMessage();

  const markRead =
    useMarkChatRead();

  const {
    typingState,
    readState,
    sendTyping,
  } =
    useChatRealtime();

  const conversations =
    Array.isArray(
      conversationsQuery
        .data
    )
      ? conversationsQuery
          .data
      : [];

  useEffect(() => {
    if (
      selectedConversationId ||
      conversations.length ===
        0
    ) {
      return;
    }

    const office =
      conversations.find(
        (
          conversation
        ) =>
          conversation.type ===
          'office'
      );

    setSelectedConversationId(
      office?.id ||
        conversations[0]
          ?.id ||
        null
    );
  }, [
    conversations,
    selectedConversationId,
  ]);

  const selectedConversation =
    useMemo(
      () =>
        conversations.find(
          (
            conversation
          ) =>
            conversation.id ===
            selectedConversationId
        ) ||
        null,
      [
        conversations,
        selectedConversationId,
      ]
    );

  const filteredConversations =
    useMemo(
      () => {
        const query =
          conversationSearch
            .trim()
            .toLocaleLowerCase(
              'tr-TR'
            );

        if (!query) {
          return conversations;
        }

        return conversations.filter(
          (
            conversation
          ) =>
            String(
              conversation
                .display_name ||
              ''
            )
              .toLocaleLowerCase(
                'tr-TR'
              )
              .includes(
                query
              )
        );
      },
      [
        conversations,
        conversationSearch,
      ]
    );

  const messagesQuery =
    useChatMessages(
      selectedConversationId
    );

  const messages =
    useMemo(
      () =>
        getMessagesFromInfiniteData(
          messagesQuery.data
        ),
      [
        messagesQuery.data,
      ]
    );

  const latestMessage =
    messages[
      messages.length -
        1
    ];

  useEffect(() => {
    if (
      !selectedConversation ||
      !latestMessage ||
      markRead.isPending
    ) {
      return;
    }

    if (
      latestMessage
        ?.sender?.id ===
      user?.id
    ) {
      return;
    }

    if (
      selectedConversation
        .last_read_message_id ===
      latestMessage.id
    ) {
      return;
    }

    markRead.mutate({
      conversationId:
        selectedConversation.id,

      messageId:
        latestMessage.id,
    });
  }, [
    selectedConversation,
    latestMessage,
    user?.id,
    markRead,
  ]);

  const typingUserIds =
    typingState[
      selectedConversationId
    ] ||
    [];

  const typingNames =
    typingUserIds
      .map(
        (
          userId
        ) =>
          selectedConversation
            ?.members
            ?.find(
              (
                member
              ) =>
                member.user_id ===
                userId
            )
            ?.user
      )
      .filter(Boolean)
      .map(
        (
          memberUser
        ) =>
          [
            memberUser
              .first_name,
            memberUser
              .last_name,
          ]
            .filter(Boolean)
            .join(' ')
      );

  const handleSelectConversation =
    (
      conversation
    ) => {
      setSelectedConversationId(
        conversation.id
      );

      setMobileConversationOpen(
        true
      );
    };

  const handleOpenDirect =
    async (
      targetUser
    ) => {
      const result =
        await openDirect.mutateAsync(
          targetUser.id
        );

      const conversation =
        result?.data;

      if (
        conversation?.id
      ) {
        setSelectedConversationId(
          conversation.id
        );

        setMobileConversationOpen(
          true
        );

        setDirectModalOpen(
          false
        );
      }
    };

  const handleSend =
    async (
      content
    ) => {
      if (
        !selectedConversationId
      ) {
        return;
      }

      if (
        editingMessage
      ) {
        await editMessage.mutateAsync({
          messageId:
            editingMessage.id,

          content,
        });

        setEditingMessage(
          null
        );

        return;
      }

      await sendMessage.mutateAsync({
        conversationId:
          selectedConversationId,

        content,
      });
    };

  const handleSendFiles =
    async (
      files,
      content = ''
    ) => {
      if (
        !selectedConversationId ||
        !Array.isArray(
          files
        ) ||
        files.length ===
          0
      ) {
        return;
      }

      await sendAttachments.mutateAsync({
        conversationId:
          selectedConversationId,

        files,

        content,
      });
    };

  const handleEdit =
    (
      message
    ) => {
      /*
       * İlk sürümde ayrı modal açmadan kullanıcıya
       * düzenlenecek metni prompt ile alıyoruz.
       * Chat omurgası stabil olduktan sonra inline editor
       * yapılabilir.
       */
      const nextContent =
        window.prompt(
          'Mesajı düzenle:',
          message.content ||
            ''
        );

      if (
        nextContent ===
          null
      ) {
        return;
      }

      const normalized =
        nextContent.trim();

      if (!normalized) {
        return;
      }

      editMessage.mutate({
        messageId:
          message.id,

        content:
          normalized,
      });
    };

  const handleDelete =
    (
      message
    ) => {
      const confirmed =
        window.confirm(
          'Bu mesajı silmek istediğine emin misin?'
        );

      if (!confirmed) {
        return;
      }

      deleteMessage.mutate(
        message.id
      );
    };

  const handleDownloadAttachment =
    async (
      attachment
    ) => {
      try {
        const result =
          await chatApi.getAttachmentDownload(
            attachment.id
          );

        const url =
          result?.data?.url;

        if (!url) {
          return;
        }

        window.location.href =
          url;
      } catch {
        /*
         * Storage şu anda kapalı olabilir.
         * Backend error middleware mesajı axios interceptor /
         * global error handler üzerinden gösterilebilir.
         */
      }
    };

  const otherMember =
    selectedConversation
      ?.type ===
      'direct'
      ? selectedConversation
          ?.members
          ?.find(
            (
              member
            ) =>
              member.user_id !==
              user?.id
          )
          ?.user
      : null;

  return (
    <>
      <div className="mx-auto h-[calc(100vh-112px)] min-h-[560px] max-w-[1600px] px-3 pb-3 md:px-5 md:pb-5">
        <div className="grid h-full min-h-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33] md:grid-cols-[320px_minmax(0,1fr)]">
          <aside
            className={`
              min-h-0 border-r border-gray-200
              dark:border-white/[0.06]
              ${
                mobileConversationOpen
                  ? 'hidden md:block'
                  : 'block'
              }
            `}
          >
            <ConversationList
              conversations={
                filteredConversations
              }
              selectedId={
                selectedConversationId
              }
              onSelect={
                handleSelectConversation
              }
              onNewDirect={() =>
                setDirectModalOpen(
                  true
                )
              }
              searchValue={
                conversationSearch
              }
              onSearchChange={
                setConversationSearch
              }
              loading={
                conversationsQuery
                  .isLoading
              }
            />
          </aside>

          <section
            className={`
              min-h-0 min-w-0
              ${
                mobileConversationOpen
                  ? 'flex'
                  : 'hidden md:flex'
              }
              flex-col
            `}
          >
            {!selectedConversation ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div>
                  <MessagesSquare
                    size={34}
                    className="mx-auto text-gray-300 dark:text-slate-600"
                  />

                  <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Bir sohbet seç
                  </p>

                  <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                    Ofis Genel veya bir çalışanla birebir konuşabilirsin.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex min-h-[64px] items-center gap-3 border-b border-gray-200 px-3 py-2.5 dark:border-white/[0.06] md:px-4">
                  <button
                    type="button"
                    onClick={() =>
                      setMobileConversationOpen(
                        false
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-white/[0.05] md:hidden"
                    aria-label="Sohbet listesine dön"
                  >
                    <ArrowLeft
                      size={18}
                    />
                  </button>

                  <div
                    className={`
                      flex h-10 w-10 shrink-0
                      items-center justify-center
                      rounded-xl
                      ${
                        selectedConversation
                          .type ===
                        'office'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300'
                      }
                    `}
                  >
                    {selectedConversation
                      .type ===
                    'office' ? (
                      <Users
                        size={18}
                      />
                    ) : (
                      <span className="text-xs font-bold">
                        {selectedConversation
                          .display_name
                          ?.split(
                            /\s+/
                          )
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
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                      {
                        selectedConversation
                          .display_name
                      }
                    </h2>

                    <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-slate-500">
                      {typingNames.length >
                      0
                        ? `${typingNames.join(
                            ', '
                          )} yazıyor...`
                        : selectedConversation
                              .type ===
                            'office'
                          ? 'Tüm aktif ofis kullanıcıları'
                          : otherMember
                              ?.is_active
                            ? 'Aktif'
                            : 'Pasif kullanıcı'}
                    </p>
                  </div>
                </div>

                {messagesQuery
                  .isLoading ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-50/70 dark:bg-[#071426]/55">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600 dark:border-white/[0.08] dark:border-b-blue-500" />
                  </div>
                ) : (
                  <MessageList
                    messages={
                      messages
                    }
                    currentUserId={
                      user?.id
                    }
                    conversationType={
                      selectedConversation
                        .type
                    }
                    hasMore={
                      Boolean(
                        messagesQuery
                          .hasNextPage
                      )
                    }
                    loadingMore={
                      messagesQuery
                        .isFetchingNextPage
                    }
                    onLoadMore={() =>
                      messagesQuery
                        .fetchNextPage()
                    }
                    readReceipt={
                      readState[
                        selectedConversation
                          .id
                      ] ||
                      null
                    }
                    onEdit={
                      handleEdit
                    }
                    onDelete={
                      handleDelete
                    }
                    onDownloadAttachment={
                      handleDownloadAttachment
                    }
                  />
                )}

                <MessageInput
                  disabled={
                    !selectedConversationId ||
                    (
                      selectedConversation
                        .type ===
                        'direct' &&
                      otherMember &&
                      otherMember
                        .is_active !==
                        true
                    )
                  }
                  sending={
                    sendMessage
                      .isPending ||
                    sendAttachments
                      .isPending ||
                    editMessage
                      .isPending
                  }
                  onSend={
                    handleSend
                  }
                  onSendFiles={
                    handleSendFiles
                  }
                  onTyping={(
                    isTyping
                  ) =>
                    sendTyping(
                      selectedConversationId,
                      isTyping
                    )
                  }
                  attachmentsEnabled={
                    true
                  }
                />
              </>
            )}
          </section>
        </div>
      </div>

      <NewDirectChatModal
        open={
          directModalOpen
        }
        users={
          usersQuery.data ||
          []
        }
        loading={
          usersQuery
            .isLoading
        }
        opening={
          openDirect
            .isPending
        }
        onClose={() =>
          setDirectModalOpen(
            false
          )
        }
        onSelect={
          handleOpenDirect
        }
      />
    </>
  );
};

export default ChatPage;
