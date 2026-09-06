import { sequelize } from '../../config/database.js';
import { consultationRepository } from './consultation.repository.js';
import { clientService } from '../clients/client.service.js';
import { notificationService } from '../notifications/notification.service.js';
import { AuditLog } from '../../models/AuditLog.js';
import { CONSULTATION_STATUS } from '../../constants/consultation.js';

const getActorId = (actor) => actor?.id || null;
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const normalizeNullableText = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const getActorDisplayName = (actor) => {
  const name = [actor?.first_name, actor?.last_name].filter(Boolean).join(' ').trim();
  return name || actor?.email || 'Bir kullanıcı';
};

const normalizeAssignments = (value) => {
  if (!Array.isArray(value)) {
    throw new Error('Consultation assignees must be an array');
  }
  if (value.length === 0) {
    throw new Error('At least one consultation assignee is required');
  }

  const normalized = value.map((item) => ({
    user_id: String(item?.user_id || '').trim(),
    is_primary: item?.is_primary === true,
  }));

  if (normalized.some((item) => !item.user_id)) {
    throw new Error('Assignee not found');
  }

  const ids = normalized.map((item) => item.user_id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Aynı sorumlu birden fazla kez eklenemez');
  }

  const primaryCount = normalized.filter((item) => item.is_primary).length;
  if (primaryCount > 1) {
    throw new Error('En fazla bir ana sorumlu seçilebilir');
  }

  return normalized;
};

const sanitizeCreateData = (data) => {
  const payload = { ...data };
  delete payload.id;
  delete payload.consultation_number;
  delete payload.created_by;
  delete payload.updated_by;
  delete payload.deleted_at;
  delete payload.completed_at;
  delete payload.converted_case_id;
  payload.status = CONSULTATION_STATUS.NEW;
  return payload;
};

const sanitizeUpdateData = (data) => {
  const payload = { ...data };
  delete payload.id;
  delete payload.consultation_number;
  delete payload.created_by;
  delete payload.updated_by;
  delete payload.deleted_at;
  delete payload.converted_case_id;
  delete payload.completed_at;
  delete payload.status;
  return payload;
};

const createAudit = async ({
  action,
  consultationId,
  actorId,
  oldValues = null,
  newValues = null,
  description,
  metadata = {},
}, transaction) => {
  return AuditLog.create(
    {
      action,
      entity_type: 'consultation',
      entity_id: consultationId,
      old_values: oldValues,
      new_values: newValues,
      description,
      user_id: actorId,
      metadata,
    },
    { transaction }
  );
};

const notifyConsultation = async ({
  userId,
  consultationId,
  consultationTitle,
  actor,
  action = 'assigned',
}) => {
  if (!userId || userId === getActorId(actor)) return;

  await notificationService.notifyConsultationAssigned(
    userId,
    consultationId,
    consultationTitle,
    getActorDisplayName(actor),
    action
  );
};

const notifyAssignmentChanges = async ({
  consultationId,
  consultationTitle,
  actor,
  oldAssignments = [],
  newAssignments = [],
}) => {
  const oldIds = new Set(oldAssignments.map((item) => item.user_id));
  const oldPrimary = oldAssignments.find((item) => item.is_primary)?.user_id || null;
  const newPrimary = newAssignments.find((item) => item.is_primary)?.user_id || null;

  const notifications = [];

  for (const item of newAssignments) {
    if (!oldIds.has(item.user_id)) {
      notifications.push({
        userId: item.user_id,
        action: newPrimary === item.user_id && oldPrimary && oldPrimary !== newPrimary
          ? 'transferred'
          : 'assigned',
      });
    }
  }

  if (
    newPrimary &&
    newPrimary !== oldPrimary &&
    oldIds.has(newPrimary) &&
    !notifications.some((item) => item.userId === newPrimary)
  ) {
    notifications.push({ userId: newPrimary, action: 'transferred' });
  }

  await Promise.allSettled(
    notifications.map((item) => notifyConsultation({
      ...item,
      consultationId,
      consultationTitle,
      actor,
    }))
  );
};

const markClientCreateError = (error) => {
  const message = String(error?.message || '');

  if (
    message.includes('başka bir müvekkil kaydında') ||
    message.includes('Bu değer başka bir müvekkil kaydında')
  ) {
    error.statusCode = error.statusCode || 409;
    return error;
  }

  error.statusCode = error.statusCode || 400;
  return error;
};

export const consultationService = {
  async getAssignableUsers() {
    return consultationRepository.getAssignableUsers();
  },

  async create(data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw new Error('Consultation not found');

    const { assignees, ...rawConsultationData } = data || {};
    const assignments = normalizeAssignments(assignees);

    const result = await sequelize.transaction(async (transaction) => {
      const clientId = normalizeNullableText(rawConsultationData.client_id);

      if (clientId) {
        await consultationRepository.assertClientAccess(clientId, actor, { transaction });
      }

      await consultationRepository.assertEligibleAssignees(
        assignments.map((item) => item.user_id),
        { transaction }
      );

      const consultationNumber = await consultationRepository.getNextNumber(transaction);
      const consultation = await consultationRepository.create(
        {
          ...sanitizeCreateData(rawConsultationData),
          client_id: clientId,
          consultation_number: consultationNumber,
          created_by: actorId,
          updated_by: actorId,
        },
        { transaction }
      );

      await consultationRepository.replaceAssignees(
        consultation.id,
        assignments,
        actorId,
        { transaction }
      );

      await createAudit({
        action: 'create',
        consultationId: consultation.id,
        actorId,
        newValues: {
          consultation_number: consultation.consultation_number,
          title: consultation.title,
          status: consultation.status,
          client_id: consultation.client_id,
        },
        description: 'Danışmanlık oluşturuldu',
        metadata: { event: 'consultation_created' },
      }, transaction);

      return {
        id: consultation.id,
        title: consultation.title,
        assignments,
      };
    });

    await notifyAssignmentChanges({
      consultationId: result.id,
      consultationTitle: result.title,
      actor,
      oldAssignments: [],
      newAssignments: result.assignments,
    });

    return consultationRepository.findOne(result.id, actor);
  },

  async findAll(params) {
    return consultationRepository.findAll(params);
  },

  async findOne(id, actor) {
    return consultationRepository.findOne(id, actor);
  },

  async update(id, data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw new Error('Consultation not found');

    const { assignees, ...rawUpdateData } = data || {};
    const shouldUpdateAssignees = assignees !== undefined;
    const assignments = shouldUpdateAssignees ? normalizeAssignments(assignees) : null;

    const result = await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      if (!consultation) throw new Error('Consultation not found');

      const oldValues = consultation.toJSON();
      const oldAssignments = shouldUpdateAssignees
        ? await consultationRepository.getAssigneeRecords(id, { transaction })
        : [];

      const updateData = sanitizeUpdateData(rawUpdateData);

      if (hasOwn(updateData, 'client_id')) {
        updateData.client_id = normalizeNullableText(updateData.client_id);
        if (updateData.client_id) {
          await consultationRepository.assertClientAccess(
            updateData.client_id,
            actor,
            { transaction }
          );
        }
      }

      if (shouldUpdateAssignees) {
        await consultationRepository.assertEligibleAssignees(
          assignments.map((item) => item.user_id),
          { transaction }
        );
      }

      await consultationRepository.updateInstance(
        consultation,
        { ...updateData, updated_by: actorId },
        { transaction }
      );

      if (shouldUpdateAssignees) {
        await consultationRepository.replaceAssignees(
          id,
          assignments,
          actorId,
          { transaction }
        );
      }

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues,
        newValues: {
          ...updateData,
          ...(shouldUpdateAssignees ? { assignees: assignments } : {}),
        },
        description: 'Danışmanlık güncellendi',
        metadata: { event: 'consultation_updated' },
      }, transaction);

      return {
        title: consultation.title,
        oldAssignments,
        newAssignments: shouldUpdateAssignees ? assignments : [],
        shouldUpdateAssignees,
      };
    });

    if (result.shouldUpdateAssignees) {
      await notifyAssignmentChanges({
        consultationId: id,
        consultationTitle: result.title,
        actor,
        oldAssignments: result.oldAssignments,
        newAssignments: result.newAssignments,
      });
    }

    return consultationRepository.findOne(id, actor);
  },

  async remove(id, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw new Error('Consultation not found');

    return sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) throw new Error('Consultation not found');

      await createAudit({
        action: 'delete',
        consultationId: id,
        actorId,
        oldValues: consultation.toJSON(),
        description: 'Danışmanlık silindi',
        metadata: { event: 'consultation_deleted' },
      }, transaction);

      await consultationRepository.removeInstance(consultation, { transaction });
      return consultation;
    });
  },

  async updateStatus(id, status, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw new Error('Consultation not found');

    const normalizedStatus = String(status || '').trim();
    if (!Object.values(CONSULTATION_STATUS).includes(normalizedStatus)) {
      throw new Error('Geçersiz danışmanlık durumu');
    }
    if (normalizedStatus === CONSULTATION_STATUS.CONVERTED_TO_CASE) {
      throw new Error('Davaya dönüştürüldü durumu yalnız davaya dönüştürme işlemiyle atanabilir');
    }

    await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) throw new Error('Consultation not found');

      const oldStatus = consultation.status;
      const completedAt = normalizedStatus === CONSULTATION_STATUS.COMPLETED
        ? (consultation.completed_at || new Date())
        : null;

      await consultationRepository.updateInstance(
        consultation,
        {
          status: normalizedStatus,
          completed_at: completedAt,
          updated_by: actorId,
        },
        { transaction }
      );

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: { status: oldStatus },
        newValues: { status: normalizedStatus, completed_at: completedAt },
        description: 'Danışmanlık durumu güncellendi',
        metadata: { event: 'consultation_status_changed' },
      }, transaction);
    });

    return consultationRepository.findOne(id, actor);
  },

  async addAssignee(id, data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw new Error('Consultation not found');

    const assignment = {
      user_id: String(data?.user_id || '').trim(),
      is_primary: data?.is_primary === true,
    };

    const result = await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) throw new Error('Consultation not found');

      await consultationRepository.assertEligibleAssignees(
        [assignment.user_id],
        { transaction }
      );

      const current = await consultationRepository.getAssigneeRecords(id, { transaction });
      if (current.some((item) => item.user_id === assignment.user_id)) {
        const error = new Error('Assignee already assigned');
        error.statusCode = 409;
        throw error;
      }

      const previousPrimary = current.find((item) => item.is_primary)?.user_id || null;
      if (assignment.is_primary) {
        await consultationRepository.clearPrimaryAssignee(id, { transaction });
      }

      await consultationRepository.addAssigneeRecord(
        id,
        assignment,
        actorId,
        { transaction }
      );

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: { primary_assignee_id: previousPrimary },
        newValues: { added_assignee: assignment },
        description: 'Danışmanlığa sorumlu eklendi',
        metadata: { event: 'consultation_assignee_added', user_id: assignment.user_id },
      }, transaction);

      return {
        title: consultation.title,
        action: assignment.is_primary && previousPrimary
          ? 'transferred'
          : 'assigned',
      };
    });

    await Promise.allSettled([
      notifyConsultation({
        userId: assignment.user_id,
        consultationId: id,
        consultationTitle: result.title,
        actor,
        action: result.action,
      }),
    ]);

    return consultationRepository.findOne(id, actor);
  },

  async removeAssignee(id, userId, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw new Error('Consultation not found');

    await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) throw new Error('Consultation not found');

      const current = await consultationRepository.getAssigneeRecords(id, { transaction });
      const target = current.find((item) => item.user_id === userId);
      if (!target) throw new Error('Assignee not found');

      if (current.length <= 1) {
        throw new Error('Danışmanlıkta en az bir sorumlu kalmalıdır');
      }

      await consultationRepository.removeAssigneeRecord(id, userId, { transaction });

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: { removed_assignee: target },
        newValues: null,
        description: 'Danışmanlıktan sorumlu kaldırıldı',
        metadata: { event: 'consultation_assignee_removed', user_id: userId },
      }, transaction);
    });

    return consultationRepository.findOne(id, actor);
  },

  async getTasks(id, actor) {
    return consultationRepository.getTasks(id, actor);
  },

  async getMeetings(id, actor) {
    return consultationRepository.getMeetings(id, actor);
  },

  async getDocuments(id, actor) {
    return consultationRepository.getDocuments(id, actor);
  },

  async getNotes(id, actor) {
    return consultationRepository.getNotes(id, actor);
  },

  async addNote(id, data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw new Error('Consultation not found');

    const content = String(data?.content ?? '').trim();
    if (!content) throw new Error('Not içeriği gereklidir');

    return sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      if (!consultation) throw new Error('Consultation not found');

      const note = await consultationRepository.addNoteRecord(
        id,
        actorId,
        content,
        { transaction }
      );

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: null,
        newValues: { note_id: note.id },
        description: 'Danışmanlık notu eklendi',
        metadata: {
          event: 'consultation_note_added',
          note_id: note.id,
        },
      }, transaction);

      return consultationRepository.findNoteById(
        note.id,
        { transaction }
      );
    });
  },

  async convertToClient(id, data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw new Error('Consultation not found');

    const result = await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) throw new Error('Consultation not found');

      if (consultation.client_id) {
        const error = new Error('Danışmanlık zaten bir müvekkile bağlı');
        error.statusCode = 409;
        throw error;
      }

      const clientData = {
        ...(data || {}),
        name: normalizeNullableText(data?.name) || consultation.prospect_name,
        client_type: data?.client_type || 'individual',
        email: hasOwn(data || {}, 'email') ? data.email : consultation.prospect_email,
        phone: hasOwn(data || {}, 'phone') ? data.phone : consultation.prospect_phone,
      };

      let client;
      try {
        client = await clientService.create(
          clientData,
          actor,
          { transaction }
        );
      } catch (error) {
        throw markClientCreateError(error);
      }

      await consultationRepository.updateInstance(
        consultation,
        {
          client_id: client.id,
          updated_by: actorId,
        },
        { transaction }
      );

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: { client_id: null },
        newValues: { client_id: client.id },
        description: 'Danışmanlık talep sahibi müvekkile dönüştürüldü',
        metadata: {
          event: 'consultation_converted_to_client',
          client_id: client.id,
        },
      }, transaction);

      return { clientId: client.id };
    });

    const consultation = await consultationRepository.findOne(id, actor);
    return {
      consultation,
      client_id: result.clientId,
    };
  },

  async convertToCase(id, data, actor) {
    const actorId = getActorId(actor);
    if (!actorId) throw new Error('Consultation not found');

    const result = await sequelize.transaction(async (transaction) => {
      const consultation = await consultationRepository.findScopedInstance(
        id,
        actor,
        { transaction, lock: transaction.LOCK.UPDATE }
      );
      if (!consultation) throw new Error('Consultation not found');

      if (
        consultation.converted_case_id ||
        consultation.status === CONSULTATION_STATUS.CONVERTED_TO_CASE
      ) {
        const error = new Error('Danışmanlık zaten davaya dönüştürülmüş');
        error.statusCode = 409;
        throw error;
      }

      if (!consultation.client_id) {
        throw new Error('Davaya dönüştürmeden önce müvekkile dönüştürülmelidir');
      }

      const assignedTo = String(data?.assigned_to || '').trim();
      await consultationRepository.assertCaseAssignableUser(
        assignedTo,
        { transaction }
      );

      const oldStatus =
        consultation.status;

      const judiciaryType =
        normalizeNullableText(
          data?.judiciary_type
        );

      const judiciaryUnit =
        normalizeNullableText(
          data?.judiciary_unit
        );

      if (
        !judiciaryType ||
        !judiciaryUnit
      ) {
        const error =
          new Error(
            'Yargı türü ve yargı birimi gereklidir'
          );

        error.statusCode =
          400;

        throw error;
      }

      const caseTitle =
        `${judiciaryType} - ${judiciaryUnit}`;

      const newCase = await consultationRepository.createCaseFromConsultation(
        {
          title:
            caseTitle,

          judiciary_type:
            judiciaryType,

          judiciary_unit:
            judiciaryUnit,

          court_name:
            normalizeNullableText(
              data?.court_name
            ),

          case_number:
            normalizeNullableText(
              data?.case_number
            ),

          subject:
            hasOwn(
              data || {},
              'subject'
            )
              ? normalizeNullableText(
                  data.subject
                )
              : consultation.title,

          description:
            hasOwn(
              data || {},
              'description'
            )
              ? normalizeNullableText(
                  data.description
                )
              : consultation.description,

          status:
            'preparation',

          priority:
            data?.priority ||
            consultation.priority ||
            'normal',

          assigned_to:
            assignedTo,

          opening_date:
            normalizeNullableText(
              data?.opening_date
            ),

          created_by:
            actorId,
        },
        consultation.client_id,
        { transaction }
      );

      const linked = await consultationRepository.linkChildrenToCase(
        id,
        newCase.id,
        { transaction }
      );

      await consultationRepository.updateInstance(
        consultation,
        {
          converted_case_id: newCase.id,
          status: CONSULTATION_STATUS.CONVERTED_TO_CASE,
          completed_at: consultation.completed_at || new Date(),
          updated_by: actorId,
        },
        { transaction }
      );

      await createAudit({
        action: 'update',
        consultationId: id,
        actorId,
        oldValues: {
          status: oldStatus,
          converted_case_id: null,
        },
        newValues: {
          status: CONSULTATION_STATUS.CONVERTED_TO_CASE,
          converted_case_id: newCase.id,
        },
        description: 'Danışmanlık davaya dönüştürüldü',
        metadata: {
          event: 'consultation_converted_to_case',
          case_id: newCase.id,
          linked_children: linked,
        },
      }, transaction);

      return {
        caseId: newCase.id,
        caseTitle: newCase.title,
        consultationTitle: consultation.title,
        assignedTo,
        linked,
      };
    });

    if (
      result.assignedTo &&
      result.assignedTo !== actorId
    ) {
      await Promise.allSettled([
        notificationService.notifyConsultationConvertedToCase(
          result.assignedTo,
          id,
          result.consultationTitle,
          result.caseId,
          result.caseTitle,
          getActorDisplayName(actor)
        ),
      ]);
    }

    return {
      consultation: await consultationRepository.findOne(id, actor),
      case_id: result.caseId,
      linked_children: result.linked,
    };
  },

  async getStatistics(actor) {
    return consultationRepository.getStatistics(actor);
  },
};

export default consultationService;
