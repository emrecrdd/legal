import axios from '../../app/config/axios.js';

import {
  API_ROUTES,
} from '../../constants/apiRoutes.js';

const {
  CONSULTATIONS,
} = API_ROUTES;

const consultationApi = {
  // ======================================================
  // CONSULTATIONS
  // ======================================================

  getAll: (
    params = {}
  ) => {
    return axios.get(
      CONSULTATIONS.GET_ALL,
      {
        params,
      }
    );
  },

  getOne: (
    id
  ) => {
    return axios.get(
      CONSULTATIONS.GET_ONE(
        id
      )
    );
  },

  create: (
    data
  ) => {
    return axios.post(
      CONSULTATIONS.CREATE,
      data
    );
  },

  // ======================================================
  // UPDATE
  // ======================================================

  /*
   * Consultation backend normal güncellemeyi PATCH ile
   * kabul ediyor. Case API'deki PUT davranışı burada
   * kopyalanmaz.
   */
  update: (
    id,
    data
  ) => {
    return axios.patch(
      CONSULTATIONS.UPDATE(
        id
      ),
      data
    );
  },

  delete: (
    id
  ) => {
    return axios.delete(
      CONSULTATIONS.DELETE(
        id
      )
    );
  },

  updateStatus: (
    id,
    status
  ) => {
    return axios.patch(
      CONSULTATIONS.UPDATE_STATUS(
        id
      ),
      {
        status,
      }
    );
  },

  // ======================================================
  // ASSIGNABLE USERS
  // ======================================================

  getAssignableUsers:
    () => {
      return axios.get(
        CONSULTATIONS.ASSIGNABLE_USERS
      );
    },

  // ======================================================
  // STATISTICS
  // ======================================================

  getStatistics:
    () => {
      return axios.get(
        CONSULTATIONS.STATISTICS
      );
    },

  // ======================================================
  // ASSIGNEES
  // ======================================================

  addAssignee: (
    id,
    data
  ) => {
    return axios.post(
      CONSULTATIONS.ADD_ASSIGNEE(
        id
      ),
      data
    );
  },

  removeAssignee: (
    id,
    userId
  ) => {
    return axios.delete(
      CONSULTATIONS.REMOVE_ASSIGNEE(
        id,
        userId
      )
    );
  },

  // ======================================================
  // RELATED DATA
  // ======================================================

  getTasks: (
    id
  ) => {
    return axios.get(
      CONSULTATIONS.GET_TASKS(
        id
      )
    );
  },

  getMeetings: (
    id
  ) => {
    return axios.get(
      CONSULTATIONS.GET_MEETINGS(
        id
      )
    );
  },

  getDocuments: (
    id
  ) => {
    return axios.get(
      CONSULTATIONS.GET_DOCUMENTS(
        id
      )
    );
  },

  // ======================================================
  // CONVERSIONS
  // ======================================================

  convertToClient: (
    id,
    data = {}
  ) => {
    return axios.post(
      CONSULTATIONS.CONVERT_TO_CLIENT(
        id
      ),
      data
    );
  },

  convertToCase: (
    id,
    data
  ) => {
    return axios.post(
      CONSULTATIONS.CONVERT_TO_CASE(
        id
      ),
      data
    );
  },
};

export default consultationApi;
