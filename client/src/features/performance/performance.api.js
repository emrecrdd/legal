import axios from '../../app/config/axios.js';

const performanceApi = {
  // ======================================================
  // MY PERFORMANCE
  // ======================================================

  getMyPerformance: () => {
    return axios.get(
      '/performance/me'
    );
  },

  // ======================================================
  // TEAM OVERVIEW
  // Yetki:
  // view_team_performance
  // ======================================================

  getTeamOverview: () => {
    return axios.get(
      '/performance/overview'
    );
  },

  // ======================================================
  // USERS PERFORMANCE
  // Yetki:
  // view_team_performance
  // ======================================================

  getUsersPerformance: () => {
    return axios.get(
      '/performance/users'
    );
  },

  // ======================================================
  // USER PERFORMANCE DETAIL
  // Yetki:
  // view_team_performance
  // ======================================================

  getUserPerformance: (
    userId
  ) => {
    return axios.get(
      `/performance/users/${userId}`
    );
  },
};

export default performanceApi;