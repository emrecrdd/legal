import {
  Op,
} from 'sequelize';

import {
  Conversation,
  ConversationMember,
  Message,
  MessageAttachment,
  User,
} from '../../models/index.js';

const OFFICE_CONVERSATION_NAME =
  'Ofis Genel';

const DEFAULT_MESSAGE_LIMIT =
  30;

const MAX_MESSAGE_LIMIT =
  50;

const MAX_MESSAGE_LENGTH =
  10_000;

// ======================================================
// ERRORS / VALIDATION
// ======================================================

const createChatError = (
  message,
  statusCode = 400,
  code = 'CHAT_ERROR'
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  error.code =
    code;

  return error;
};

const isUuid = (
  value
) => {
  if (
    typeof value !==
    'string'
  ) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
};

const normalizeId = (
  value
) => {
  if (!isUuid(value)) {
    return null;
  }

  return value
    .trim()
    .toLowerCase();
};

const clampLimit = (
  value
) => {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed <= 0
  ) {
    return DEFAULT_MESSAGE_LIMIT;
  }

  return Math.min(
    parsed,
    MAX_MESSAGE_LIMIT
  );
};

const normalizeMessageContent = (
  content
) => {
  if (
    typeof content !==
    'string'
  ) {
    throw createChatError(
      'Mesaj içeriği gereklidir.',
      400,
      'CHAT_MESSAGE_REQUIRED'
    );
  }

  const normalized =
    content.trim();

  if (!normalized) {
    throw createChatError(
      'Boş mesaj gönderilemez.',
      400,
      'CHAT_MESSAGE_EMPTY'
    );
  }

  if (
    normalized.length >
    MAX_MESSAGE_LENGTH
  ) {
    throw createChatError(
      `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.`,
      400,
      'CHAT_MESSAGE_TOO_LONG'
    );
  }

  return normalized;
};

const buildDirectKey = (
  firstUserId,
  secondUserId
) => {
  const ids = [
    normalizeId(
      firstUserId
    ),
    normalizeId(
      secondUserId
    ),
  ];

  if (
    ids.some(
      (id) => !id
    )
  ) {
    throw createChatError(
      'Geçersiz kullanıcı bilgisi.',
      400,
      'CHAT_INVALID_USER_ID'
    );
  }

  ids.sort();

  return ids.join(':');
};

// ======================================================
// SERIALIZERS
// ======================================================

const serializeUser = (
  user
) => {
  if (!user) {
    return null;
  }

  return {
    id:
      user.id,

    first_name:
      user.first_name,

    last_name:
      user.last_name,

    title:
      user.title ??
      null,

    avatar:
      user.avatar ??
      null,

    is_active:
      user.is_active ===
      true,
  };
};

const serializeAttachment = (
  attachment
) => ({
  id:
    attachment.id,

  original_name:
    attachment.original_name,

  mime_type:
    attachment.mime_type,

  file_size:
    Number(
      attachment.file_size
    ),

  extension:
    attachment.extension,
});

const serializeMessage = (
  message
) => {
  if (!message) {
    return null;
  }

  const isDeleted =
    Boolean(
      message.deleted_at
    );

  return {
    id:
      message.id,

    conversation_id:
      message.conversation_id,

    sender:
      serializeUser(
        message.sender
      ),

    type:
      message.type,

    content:
      isDeleted
        ? null
        : message.content,

    attachments:
      isDeleted
        ? []
        : (
            message.attachments ||
            []
          ).map(
            serializeAttachment
          ),

    is_deleted:
      isDeleted,

    edited_at:
      message.edited_at,

    created_at:
      message.created_at,

    updated_at:
      message.updated_at,

    deleted_at:
      message.deleted_at ??
      null,
  };
};

const getConversationDisplayName = (
  conversation,
  actorId
) => {
  if (
    conversation.type ===
    'office'
  ) {
    return (
      conversation.name ||
      OFFICE_CONVERSATION_NAME
    );
  }

  const members =
    conversation.members ||
    [];

  const otherMember =
    members.find(
      (member) =>
        member.user_id !==
        actorId
    );

  const user =
    otherMember?.user;

  if (!user) {
    return 'Birebir Sohbet';
  }

  return [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(' ') ||
    'Birebir Sohbet';
};

const serializeConversation = ({
  conversation,
  actorId,
  membership,
  lastMessage = null,
  unreadCount = 0,
}) => ({
  id:
    conversation.id,

  type:
    conversation.type,

  name:
    conversation.name,

  display_name:
    getConversationDisplayName(
      conversation,
      actorId
    ),

  members: (
    conversation.members ||
    []
  ).map(
    (member) => ({
      id:
        member.id,

      user_id:
        member.user_id,

      user:
        serializeUser(
          member.user
        ),
    })
  ),

  last_read_message_id:
    membership
      ?.last_read_message_id ??
    null,

  unread_count:
    unreadCount,

  last_message:
    serializeMessage(
      lastMessage
    ),

  created_at:
    conversation.created_at,

  updated_at:
    conversation.updated_at,
});

// ======================================================
// INCLUDES
// ======================================================

const memberInclude = {
  model:
    ConversationMember,

  as:
    'members',

  required:
    false,

  include: [
    {
      model:
        User,

      as:
        'user',

      attributes: [
        'id',
        'first_name',
        'last_name',
        'title',
        'avatar',
        'is_active',
      ],
    },
  ],
};

const messageIncludes = [
  {
    model:
      User,

    as:
      'sender',

    attributes: [
      'id',
      'first_name',
      'last_name',
      'title',
      'avatar',
      'is_active',
    ],
  },
  {
    model:
      MessageAttachment,

    as:
      'attachments',

    required:
      false,
  },
];

// ======================================================
// MEMBERSHIP / ACCESS
// ======================================================

const ensureOfficeConversation =
  async (
    actor,
    {
      transaction = null,
    } = {}
  ) => {
    if (
      !actor?.id ||
      actor.is_active !==
        true
    ) {
      throw createChatError(
        'Sohbet bulunamadı.',
        404,
        'CHAT_NOT_FOUND'
      );
    }

    const [
      conversation,
    ] =
      await Conversation.findOrCreate({
        where: {
          type:
            'office',
        },

        defaults: {
          type:
            'office',

          name:
            OFFICE_CONVERSATION_NAME,

          direct_key:
            null,

          created_by:
            actor.id,
        },

        transaction,
      });

    const [
      membership,
      membershipCreated,
    ] =
      await ConversationMember.findOrCreate({
        where: {
          conversation_id:
            conversation.id,

          user_id:
            actor.id,
        },

        defaults: {
          joined_at:
            new Date(),
        },

        transaction,
      });

    /*
     * Yeni eklenen bir çalışan eski Ofis Genel geçmişini
     * okuyabilsin; fakat sisteme ilk girişinde geçmişteki
     * tüm mesajlar "okunmamış" diye sayılmasın.
     */
    if (membershipCreated) {
      const latestMessage =
        await Message.findOne({
          where: {
            conversation_id:
              conversation.id,
          },

          paranoid:
            false,

          order: [
            [
              'created_at',
              'DESC',
            ],
            [
              'id',
              'DESC',
            ],
          ],

          transaction,
        });

      if (latestMessage) {
        await membership.update(
          {
            last_read_message_id:
              latestMessage.id,
          },
          {
            transaction,
          }
        );
      }
    }

    return {
      conversation,
      membership,
    };
  };

const assertConversationAccess =
  async (
    conversationId,
    actor,
    {
      transaction = null,
      lock = null,
    } = {}
  ) => {
    const normalizedConversationId =
      normalizeId(
        conversationId
      );

    if (
      !normalizedConversationId ||
      !actor?.id
    ) {
      throw createChatError(
        'Sohbet bulunamadı.',
        404,
        'CHAT_NOT_FOUND'
      );
    }

    const conversation =
      await Conversation.findByPk(
        normalizedConversationId,
        {
          transaction,
          ...(lock
            ? { lock }
            : {}),
        }
      );

    if (!conversation) {
      throw createChatError(
        'Sohbet bulunamadı.',
        404,
        'CHAT_NOT_FOUND'
      );
    }

    if (
      conversation.type ===
      'office'
    ) {
      const {
        membership,
      } =
        await ensureOfficeConversation(
          actor,
          {
            transaction,
          }
        );

      return {
        conversation,
        membership,
      };
    }

    const membership =
      await ConversationMember.findOne({
        where: {
          conversation_id:
            conversation.id,

          user_id:
            actor.id,
        },

        transaction,
        ...(lock
          ? { lock }
          : {}),
      });

    if (!membership) {
      /*
       * Özellikle 403 dönmüyoruz.
       * Böylece conversation UUID'sinin varlığı sızmaz.
       */
      throw createChatError(
        'Sohbet bulunamadı.',
        404,
        'CHAT_NOT_FOUND'
      );
    }

    return {
      conversation,
      membership,
    };
  };

const getConversationWithMembers =
  async (
    conversationId,
    transaction = null
  ) => {
    return Conversation.findByPk(
      conversationId,
      {
        include: [
          memberInclude,
        ],

        transaction,
      }
    );
  };

const assertDirectRecipientActive =
  async (
    conversation,
    actorId,
    transaction = null
  ) => {
    if (
      conversation.type !==
      'direct'
    ) {
      return;
    }

    const members =
      await ConversationMember.findAll({
        where: {
          conversation_id:
            conversation.id,
        },

        include: [
          {
            model:
              User,

            as:
              'user',

            attributes: [
              'id',
              'is_active',
            ],
          },
        ],

        transaction,
      });

    const otherMember =
      members.find(
        (member) =>
          member.user_id !==
          actorId
      );

    if (
      !otherMember?.user ||
      otherMember.user.is_active !==
        true
    ) {
      throw createChatError(
        'Bu kullanıcı artık aktif olmadığı için yeni mesaj gönderilemez.',
        409,
        'CHAT_RECIPIENT_INACTIVE'
      );
    }
  };

// ======================================================
// MESSAGE HELPERS
// ======================================================

const getMessageCursorWhere =
  async (
    conversationId,
    before,
    transaction = null
  ) => {
    if (!before) {
      return {};
    }

    const beforeId =
      normalizeId(before);

    if (!beforeId) {
      throw createChatError(
        'Geçersiz mesaj imleci.',
        400,
        'CHAT_INVALID_CURSOR'
      );
    }

    const anchor =
      await Message.findOne({
        where: {
          id:
            beforeId,

          conversation_id:
            conversationId,
        },

        paranoid:
          false,

        transaction,
      });

    if (!anchor) {
      throw createChatError(
        'Geçersiz mesaj imleci.',
        400,
        'CHAT_INVALID_CURSOR'
      );
    }

    return {
      [Op.or]: [
        {
          created_at: {
            [Op.lt]:
              anchor.created_at,
          },
        },
        {
          created_at:
            anchor.created_at,

          id: {
            [Op.lt]:
              anchor.id,
          },
        },
      ],
    };
  };

const getLastMessage =
  async (
    conversationId
  ) => {
    return Message.findOne({
      where: {
        conversation_id:
          conversationId,
      },

      include:
        messageIncludes,

      paranoid:
        false,

      order: [
        [
          'created_at',
          'DESC',
        ],
        [
          'id',
          'DESC',
        ],
      ],
    });
  };

const getUnreadCount =
  async ({
    conversationId,
    actorId,
    membership,
  }) => {
    const where = {
      conversation_id:
        conversationId,

      sender_id: {
        [Op.ne]:
          actorId,
      },
    };

    if (
      membership
        ?.last_read_message_id
    ) {
      const lastReadMessage =
        await Message.findOne({
          where: {
            id:
              membership
                .last_read_message_id,

            conversation_id:
              conversationId,
          },

          paranoid:
            false,
        });

      if (lastReadMessage) {
        where[Op.or] = [
          {
            created_at: {
              [Op.gt]:
                lastReadMessage
                  .created_at,
            },
          },
          {
            created_at:
              lastReadMessage
                .created_at,

            id: {
              [Op.gt]:
                lastReadMessage.id,
            },
          },
        ];
      }
    }

    return Message.count({
      where,
    });
  };

const compareMessages = (
  first,
  second
) => {
  const firstTime =
    new Date(
      first.created_at
    ).getTime();

  const secondTime =
    new Date(
      second.created_at
    ).getTime();

  if (
    firstTime !==
    secondTime
  ) {
    return firstTime -
      secondTime;
  }

  return String(
    first.id
  ).localeCompare(
    String(
      second.id
    )
  );
};

// ======================================================
// SERVICE
// ======================================================

export const chatService = {
  // ====================================================
  // AVAILABLE CHAT USERS
  // ====================================================

  async getAvailableUsers(
    actor
  ) {
    if (
      !actor?.id ||
      actor.is_active !==
        true
    ) {
      throw createChatError(
        'Kullanıcı bulunamadı.',
        404,
        'CHAT_USER_NOT_FOUND'
      );
    }

    const users =
      await User.findAll({
        where: {
          is_active:
            true,

          id: {
            [Op.ne]:
              actor.id,
          },
        },

        attributes: [
          'id',
          'first_name',
          'last_name',
          'title',
          'avatar',
          'is_active',
        ],

        order: [
          [
            'first_name',
            'ASC',
          ],
          [
            'last_name',
            'ASC',
          ],
        ],
      });

    return users.map(
      serializeUser
    );
  },

  // ====================================================
  // OFFICE GENERAL
  // ====================================================

  async getOfficeConversation(
    actor
  ) {
    const sequelize =
      Conversation.sequelize;

    return sequelize.transaction(
      async (
        transaction
      ) => {
        const {
          conversation,
          membership,
        } =
          await ensureOfficeConversation(
            actor,
            {
              transaction,
            }
          );

        const hydrated =
          await getConversationWithMembers(
            conversation.id,
            transaction
          );

        return serializeConversation({
          conversation:
            hydrated,

          actorId:
            actor.id,

          membership,
        });
      }
    );
  },

  // ====================================================
  // CONVERSATION LIST
  // ====================================================

  async getConversations(
    actor
  ) {
    await ensureOfficeConversation(
      actor
    );

    const memberships =
      await ConversationMember.findAll({
        where: {
          user_id:
            actor.id,
        },

        attributes: [
          'id',
          'conversation_id',
          'last_read_message_id',
        ],
      });

    if (
      memberships.length ===
      0
    ) {
      return [];
    }

    const membershipByConversation =
      new Map(
        memberships.map(
          (membership) => [
            membership.conversation_id,
            membership,
          ]
        )
      );

    const conversations =
      await Conversation.findAll({
        where: {
          id: {
            [Op.in]:
              memberships.map(
                (membership) =>
                  membership
                    .conversation_id
              ),
          },
        },

        include: [
          memberInclude,
        ],
      });

    const result =
      await Promise.all(
        conversations.map(
          async (
            conversation
          ) => {
            const membership =
              membershipByConversation.get(
                conversation.id
              );

            const [
              lastMessage,
              unreadCount,
            ] =
              await Promise.all([
                getLastMessage(
                  conversation.id
                ),
                getUnreadCount({
                  conversationId:
                    conversation.id,

                  actorId:
                    actor.id,

                  membership,
                }),
              ]);

            return serializeConversation({
              conversation,
              actorId:
                actor.id,
              membership,
              lastMessage,
              unreadCount,
            });
          }
        )
      );

    result.sort(
      (
        first,
        second
      ) => {
        const firstTime =
          first.last_message
            ?.created_at ||
          first.updated_at ||
          first.created_at;

        const secondTime =
          second.last_message
            ?.created_at ||
          second.updated_at ||
          second.created_at;

        return (
          new Date(
            secondTime
          ).getTime() -
          new Date(
            firstTime
          ).getTime()
        );
      }
    );

    return result;
  },

  // ====================================================
  // DIRECT CONVERSATION
  // ====================================================

  async getOrCreateDirectConversation(
    actor,
    targetUserId
  ) {
    const targetId =
      normalizeId(
        targetUserId
      );

    if (!targetId) {
      throw createChatError(
        'Kullanıcı bulunamadı.',
        404,
        'CHAT_USER_NOT_FOUND'
      );
    }

    if (
      targetId ===
      normalizeId(
        actor.id
      )
    ) {
      throw createChatError(
        'Kendinizle birebir sohbet başlatamazsınız.',
        400,
        'CHAT_SELF_DIRECT_NOT_ALLOWED'
      );
    }

    const targetUser =
      await User.findOne({
        where: {
          id:
            targetId,

          is_active:
            true,
        },
      });

    if (!targetUser) {
      throw createChatError(
        'Kullanıcı bulunamadı.',
        404,
        'CHAT_USER_NOT_FOUND'
      );
    }

    const directKey =
      buildDirectKey(
        actor.id,
        targetId
      );

    const sequelize =
      Conversation.sequelize;

    return sequelize.transaction(
      async (
        transaction
      ) => {
        const [
          conversation,
          created,
        ] =
          await Conversation.findOrCreate({
            where: {
              type:
                'direct',

              direct_key:
                directKey,
            },

            defaults: {
              type:
                'direct',

              name:
                null,

              direct_key:
                directKey,

              created_by:
                actor.id,
            },

            transaction,
          });

        await ConversationMember.bulkCreate(
          [
            {
              conversation_id:
                conversation.id,

              user_id:
                actor.id,

              joined_at:
                new Date(),
            },
            {
              conversation_id:
                conversation.id,

              user_id:
                targetId,

              joined_at:
                new Date(),
            },
          ],
          {
            ignoreDuplicates:
              true,

            transaction,
          }
        );

        const membership =
          await ConversationMember.findOne({
            where: {
              conversation_id:
                conversation.id,

              user_id:
                actor.id,
            },

            transaction,
          });

        const hydrated =
          await getConversationWithMembers(
            conversation.id,
            transaction
          );

        return {
          created,

          conversation:
            serializeConversation({
              conversation:
                hydrated,

              actorId:
                actor.id,

              membership,
            }),
        };
      }
    );
  },

  // ====================================================
  // GET MESSAGES
  // ====================================================

  async getMessages(
    conversationId,
    actor,
    {
      before = null,
      limit = DEFAULT_MESSAGE_LIMIT,
    } = {}
  ) {
    const {
      conversation,
    } =
      await assertConversationAccess(
        conversationId,
        actor
      );

    const normalizedLimit =
      clampLimit(limit);

    const cursorWhere =
      await getMessageCursorWhere(
        conversation.id,
        before
      );

    const rows =
      await Message.findAll({
        where: {
          conversation_id:
            conversation.id,

          ...cursorWhere,
        },

        include:
          messageIncludes,

        paranoid:
          false,

        order: [
          [
            'created_at',
            'DESC',
          ],
          [
            'id',
            'DESC',
          ],
        ],

        /*
         * Bir fazla kayıt çekerek gerçekten eski mesaj
         * bulunup bulunmadığını kesinleştiriyoruz.
         */
        limit:
          normalizedLimit +
          1,
      });

    const hasMore =
      rows.length >
      normalizedLimit;

    const pageRows =
      hasMore
        ? rows.slice(
            0,
            normalizedLimit
          )
        : rows;

    const chronological =
      [...pageRows].reverse();

    return {
      data:
        chronological.map(
          serializeMessage
        ),

      next_cursor:
        hasMore
          ? pageRows[
              pageRows.length - 1
            ]?.id ||
            null
          : null,
    };
  },

  // ====================================================
  // SEND TEXT MESSAGE
  // ====================================================

  async sendTextMessage(
    conversationId,
    actor,
    content
  ) {
    const normalizedContent =
      normalizeMessageContent(
        content
      );

    const sequelize =
      Conversation.sequelize;

    return sequelize.transaction(
      async (
        transaction
      ) => {
        const {
          conversation,
        } =
          await assertConversationAccess(
            conversationId,
            actor,
            {
              transaction,
            }
          );

        await assertDirectRecipientActive(
          conversation,
          actor.id,
          transaction
        );

        const message =
          await Message.create(
            {
              conversation_id:
                conversation.id,

              sender_id:
                actor.id,

              type:
                'text',

              content:
                normalizedContent,
            },
            {
              transaction,
            }
          );

        /*
         * Kullanıcının kendi gönderdiği mesaj,
         * bu conversation için okunmuş kabul edilir.
         */
        await ConversationMember.update(
          {
            last_read_message_id:
              message.id,
          },
          {
            where: {
              conversation_id:
                conversation.id,

              user_id:
                actor.id,
            },

            transaction,
          }
        );

        const hydrated =
          await Message.findByPk(
            message.id,
            {
              include:
                messageIncludes,

              transaction,
            }
          );

        return serializeMessage(
          hydrated
        );
      }
    );
  },

  // ====================================================
  // EDIT OWN MESSAGE
  // ====================================================

  async editMessage(
    messageId,
    actor,
    content
  ) {
    const normalizedMessageId =
      normalizeId(
        messageId
      );

    const normalizedContent =
      normalizeMessageContent(
        content
      );

    if (!normalizedMessageId) {
      throw createChatError(
        'Mesaj bulunamadı.',
        404,
        'CHAT_MESSAGE_NOT_FOUND'
      );
    }

    const sequelize =
      Conversation.sequelize;

    return sequelize.transaction(
      async (
        transaction
      ) => {
        const message =
          await Message.findOne({
            where: {
              id:
                normalizedMessageId,

              sender_id:
                actor.id,
            },

            transaction,
          });

        if (!message) {
          throw createChatError(
            'Mesaj bulunamadı.',
            404,
            'CHAT_MESSAGE_NOT_FOUND'
          );
        }

        await assertConversationAccess(
          message.conversation_id,
          actor,
          {
            transaction,
          }
        );

        await message.update(
          {
            content:
              normalizedContent,

            edited_at:
              new Date(),
          },
          {
            transaction,
          }
        );

        const hydrated =
          await Message.findByPk(
            message.id,
            {
              include:
                messageIncludes,

              transaction,
            }
          );

        return serializeMessage(
          hydrated
        );
      }
    );
  },

  // ====================================================
  // DELETE OWN MESSAGE
  // ====================================================

  async deleteMessage(
    messageId,
    actor
  ) {
    const normalizedMessageId =
      normalizeId(
        messageId
      );

    if (!normalizedMessageId) {
      throw createChatError(
        'Mesaj bulunamadı.',
        404,
        'CHAT_MESSAGE_NOT_FOUND'
      );
    }

    const sequelize =
      Conversation.sequelize;

    return sequelize.transaction(
      async (
        transaction
      ) => {
        const message =
          await Message.findOne({
            where: {
              id:
                normalizedMessageId,

              sender_id:
                actor.id,
            },

            transaction,
          });

        if (!message) {
          throw createChatError(
            'Mesaj bulunamadı.',
            404,
            'CHAT_MESSAGE_NOT_FOUND'
          );
        }

        await assertConversationAccess(
          message.conversation_id,
          actor,
          {
            transaction,
          }
        );

        /*
         * Mesaj timeline'da "Bu mesaj silindi" olarak
         * kalabilsin diye içerik temizlenir ve paranoid
         * soft-delete uygulanır.
         *
         * Attachment storage objeleri bu fazda silinmez.
         */
        await message.update(
          {
            content:
              null,
          },
          {
            transaction,
          }
        );

        await message.destroy({
          transaction,
        });

        const deletedMessage =
          await Message.findByPk(
            message.id,
            {
              paranoid:
                false,

              include:
                messageIncludes,

              transaction,
            }
          );

        return serializeMessage(
          deletedMessage
        );
      }
    );
  },

  // ====================================================
  // MARK READ
  // ====================================================

  async markRead(
    conversationId,
    actor,
    messageId = null
  ) {
    const sequelize =
      Conversation.sequelize;

    return sequelize.transaction(
      async (
        transaction
      ) => {
        const {
          conversation,
          membership,
        } =
          await assertConversationAccess(
            conversationId,
            actor,
            {
              transaction,
            }
          );

        let targetMessage =
          null;

        if (messageId) {
          const normalizedMessageId =
            normalizeId(
              messageId
            );

          if (!normalizedMessageId) {
            throw createChatError(
              'Mesaj bulunamadı.',
              404,
              'CHAT_MESSAGE_NOT_FOUND'
            );
          }

          targetMessage =
            await Message.findOne({
              where: {
                id:
                  normalizedMessageId,

                conversation_id:
                  conversation.id,
              },

              paranoid:
                false,

              transaction,
            });

          if (!targetMessage) {
            throw createChatError(
              'Mesaj bulunamadı.',
              404,
              'CHAT_MESSAGE_NOT_FOUND'
            );
          }
        } else {
          targetMessage =
            await Message.findOne({
              where: {
                conversation_id:
                  conversation.id,
              },

              paranoid:
                false,

              order: [
                [
                  'created_at',
                  'DESC',
                ],
                [
                  'id',
                  'DESC',
                ],
              ],

              transaction,
            });
        }

        if (!targetMessage) {
          return {
            success:
              true,

            conversation_id:
              conversation.id,

            last_read_message_id:
              membership
                .last_read_message_id ??
              null,
          };
        }

        let shouldUpdate =
          true;

        if (
          membership
            .last_read_message_id
        ) {
          const currentLastRead =
            await Message.findOne({
              where: {
                id:
                  membership
                    .last_read_message_id,

                conversation_id:
                  conversation.id,
              },

              paranoid:
                false,

              transaction,
            });

          if (
            currentLastRead &&
            compareMessages(
              targetMessage,
              currentLastRead
            ) <= 0
          ) {
            shouldUpdate =
              false;
          }
        }

        if (shouldUpdate) {
          await membership.update(
            {
              last_read_message_id:
                targetMessage.id,
            },
            {
              transaction,
            }
          );
        }

        return {
          success:
            true,

          conversation_id:
            conversation.id,

          last_read_message_id:
            shouldUpdate
              ? targetMessage.id
              : membership
                  .last_read_message_id,
        };
      }
    );
  },
};

export {
  assertConversationAccess,
  buildDirectKey,
};

export default chatService;
