import { consultationService } from './consultation.service.js';

const normalizeControllerError = (error) => {

  const message = String(error?.message || '');

  if ([
    'Consultation not found',
    'Client not found',
    'Assignee not found',
    'Case assignee not found',
  ].includes(message)) {

    error.statusCode = error.statusCode || 404;

  }

  if ([
    'Danışmanlık zaten bir müvekkile bağlı',
    'Danışmanlık zaten davaya dönüştürülmüş',
    'Assignee already assigned',
  ].includes(message)) {

    error.statusCode = error.statusCode || 409;

  }

  if (
    message.startsWith('Validation error') ||
    message === 'Consultation assignees must be an array' ||
    message === 'At least one consultation assignee is required' ||
    message === 'Aynı sorumlu birden fazla kez eklenemez' ||
    message === 'En fazla bir ana sorumlu seçilebilir' ||
    message === 'Danışmanlıkta en az bir sorumlu kalmalıdır' ||
    message === 'Geçersiz danışmanlık durumu' ||
    message === 'Davaya dönüştürüldü durumu yalnız davaya dönüştürme işlemiyle atanabilir' ||
    message === 'Davaya dönüştürmeden önce müvekkile dönüştürülmelidir'
  ) {

    error.statusCode = error.statusCode || 400;

  }

  return error;

};

const ok = (res, data, message = null) => res.status(200).json({

  success: true,

  ...(message ? { message } : {}),

  data,

});

export const consultationController = {

  async getAssignableUsers(req, res, next) {

    try {

      return ok(

        res,

        await consultationService.getAssignableUsers()

      );

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async create(req, res, next) {

    try {

      const data = await consultationService.create(req.body, req.user);

      return res.status(201).json({

        success: true,

        message: 'Danışmanlık oluşturuldu',

        data,

      });

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async findAll(req, res, next) {

    try {

      const result = await consultationService.findAll({

        ...req.query,

        actor: req.user,

      });

      return res.status(200).json({

        success: true,

        data: result.data,

        pagination: result.pagination,

      });

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async findOne(req, res, next) {

    try {

      return ok(res, await consultationService.findOne(req.params.id, req.user));

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async update(req, res, next) {

    try {

      return ok(

        res,

        await consultationService.update(req.params.id, req.body, req.user),

        'Danışmanlık güncellendi'

      );

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async remove(req, res, next) {

    try {

      await consultationService.remove(req.params.id, req.user);

      return res.status(200).json({ success: true, message: 'Danışmanlık silindi' });

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async updateStatus(req, res, next) {

    try {

      return ok(

        res,

        await consultationService.updateStatus(req.params.id, req.body.status, req.user),

        'Danışmanlık durumu güncellendi'

      );

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async addAssignee(req, res, next) {

    try {

      return ok(

        res,

        await consultationService.addAssignee(req.params.id, req.body, req.user),

        'Sorumlu eklendi'

      );

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async removeAssignee(req, res, next) {

    try {

      return ok(

        res,

        await consultationService.removeAssignee(

          req.params.id,

          req.params.userId,

          req.user

        ),

        'Sorumlu kaldırıldı'

      );

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async getTasks(req, res, next) {

    try {

      return ok(res, await consultationService.getTasks(req.params.id, req.user));

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async getMeetings(req, res, next) {

    try {

      return ok(res, await consultationService.getMeetings(req.params.id, req.user));

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async getDocuments(req, res, next) {

    try {

      return ok(res, await consultationService.getDocuments(req.params.id, req.user));

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async convertToClient(req, res, next) {

    try {

      return ok(

        res,

        await consultationService.convertToClient(req.params.id, req.body, req.user),

        'Talep sahibi müvekkile dönüştürüldü'

      );

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async convertToCase(req, res, next) {

    try {

      return ok(

        res,

        await consultationService.convertToCase(req.params.id, req.body, req.user),

        'Danışmanlık davaya dönüştürüldü'

      );

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

  async getStatistics(req, res, next) {

    try {

      return ok(res, await consultationService.getStatistics(req.user));

    } catch (error) {

      return next(normalizeControllerError(error));

    }

  },

};

export default consultationController;
