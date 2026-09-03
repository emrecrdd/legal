import path from 'path';

import {
  Conversation,
  ConversationMember,
  Message,
  MessageAttachment,
  User,
} from '../../models/index.js';

import {
  minioService,
} from '../../integrations/minio.service.js';

import {
  logger,
} from '../../config/logger.js';

import {
  assertConversationAccess,
} from './chat.service.js';

const MAX_CAPTION_LENGTH =
  10_000;

const DOWNLOAD_URL_EXPIRY_SECONDS =
  10 * 60;

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
) => (
  typeof value ===
    'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  )
);

const normalizeOptionalCaption = (
  value
) => {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return null;
  }

  if (
    typeof value !==
    'string'
  ) {
    throw createChatError(
      'Mesaj açıklaması geçersiz.',
      400,
      'CHAT_INVALID_CAPTION'
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  if (
    normalized.length >
    MAX_CAPTION_LENGTH
  ) {
    throw createChatError(
      `Mesaj açıklaması en fazla ${MAX_CAPTION_LENGTH} karakter olabilir.`,
      400,
      'CHAT_CAPTION_TOO_LONG'
    );
  }

  return normalized;
};

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
) => ({
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
    message.content,

  attachments: (
    message.attachments ||
    []
  ).map(
    serializeAttachment
  ),

  is_deleted:
    false,

  edited_at:
    message.edited_at,

  created_at:
    message.created_at,

  updated_at:
    message.updated_at,

  deleted_at:
    null,
});

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

const cleanupUploadedObjects =
  async (
    uploadedObjects
  ) => {
    for (
      const uploaded
      of uploadedObjects
    ) {
      try {
        await minioService.deleteFile(
          uploaded.filename
        );
      } catch (
        cleanupError
      ) {
        logger.error(
          'Chat attachment rollback cleanup başarısız',
          {
            storageKey:
              uploaded.filename,

            message:
              cleanupError?.message,
          }
        );
      }
    }
  };

export const chatAttachmentService = {
  async sendFiles(
    conversationId,
    actor,
    files,
    caption = null
  ) {
    if (
      !Array.isArray(files) ||
      files.length === 0
    ) {
      throw createChatError(
        'Gönderilecek dosya bulunamadı.',
        400,
        'CHAT_FILE_REQUIRED'
      );
    }

    const normalizedCaption =
      normalizeOptionalCaption(
        caption
      );

    /*
     * Upload başlamadan önce access kontrolü yapılır.
     */
    const {
      conversation,
    } =
      await assertConversationAccess(
        conversationId,
        actor
      );

    await assertDirectRecipientActive(
      conversation,
      actor.id
    );

    const uploadedObjects =
      [];

    try {
      for (
        const file
        of files
      ) {
        const uploaded =
          await minioService.uploadFile(
            file,
            `chat/${conversation.id}`
          );

        if (!uploaded) {
          throw createChatError(
            'Dosya depolama servisi kullanılamıyor.',
            503,
            'CHAT_STORAGE_UNAVAILABLE'
          );
        }

        uploadedObjects.push(
          uploaded
        );
      }

      const sequelize =
        Conversation.sequelize;

      const result =
        await sequelize.transaction(
          async (
            transaction
          ) => {
            /*
             * Upload sırasında üyelik/pasiflik değişmiş olabilir;
             * DB kaydından hemen önce tekrar doğrulanır.
             */
            const {
              conversation:
                currentConversation,
            } =
              await assertConversationAccess(
                conversation.id,
                actor,
                {
                  transaction,
                }
              );

            await assertDirectRecipientActive(
              currentConversation,
              actor.id,
              transaction
            );

            const message =
              await Message.create(
                {
                  conversation_id:
                    currentConversation.id,

                  sender_id:
                    actor.id,

                  type:
                    'file',

                  content:
                    normalizedCaption,
                },
                {
                  transaction,
                }
              );

            const attachmentRows =
              uploadedObjects.map(
                (
                  uploaded,
                  index
                ) => {
                  const sourceFile =
                    files[index];

                  const extension =
                    path
                      .extname(
                        sourceFile.originalname ||
                        ''
                      )
                      .toLowerCase();

                  return {
                    message_id:
                      message.id,

                    storage_key:
                      uploaded.filename,

                    original_name:
                      path.basename(
                        sourceFile.originalname ||
                        `dosya${extension}`
                      ),

                    mime_type:
                      sourceFile.mimetype ||
                      'application/octet-stream',

                    file_size:
                      sourceFile.size,

                    extension:
                      extension ||
                      '.bin',
                  };
                }
              );

            await MessageAttachment.bulkCreate(
              attachmentRows,
              {
                transaction,
              }
            );

            await ConversationMember.update(
              {
                last_read_message_id:
                  message.id,
              },
              {
                where: {
                  conversation_id:
                    currentConversation.id,

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

      return result;
    } catch (
      error
    ) {
      await cleanupUploadedObjects(
        uploadedObjects
      );

      throw error;
    }
  },

  async getDownloadUrl(
    attachmentId,
    actor
  ) {
    if (
      !isUuid(
        attachmentId
      )
    ) {
      throw createChatError(
        'Dosya bulunamadı.',
        404,
        'CHAT_ATTACHMENT_NOT_FOUND'
      );
    }

    const attachment =
      await MessageAttachment.findByPk(
        attachmentId,
        {
          include: [
            {
              model:
                Message,

              as:
                'message',

              required:
                true,

              paranoid:
                false,

              attributes: [
                'id',
                'conversation_id',
                'deleted_at',
              ],
            },
          ],
        }
      );

    if (
      !attachment ||
      !attachment.message ||
      attachment.message.deleted_at
    ) {
      throw createChatError(
        'Dosya bulunamadı.',
        404,
        'CHAT_ATTACHMENT_NOT_FOUND'
      );
    }

    await assertConversationAccess(
      attachment.message
        .conversation_id,
      actor
    );

    const url =
      await minioService.getSignedUrl(
        attachment.storage_key,
        DOWNLOAD_URL_EXPIRY_SECONDS
      );

    if (!url) {
      throw createChatError(
        'Dosya depolama servisi kullanılamıyor.',
        503,
        'CHAT_STORAGE_UNAVAILABLE'
      );
    }

    return {
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

      url,

      expires_in:
        DOWNLOAD_URL_EXPIRY_SECONDS,
    };
  },
};

export default chatAttachmentService;
