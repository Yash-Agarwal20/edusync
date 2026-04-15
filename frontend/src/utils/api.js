import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('edusync_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('edusync_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const login = (data) => api.post('/auth/login', data);
export const signup = (data) => api.post('/auth/signup', data);
export const getPublicCourses = () => api.get('/auth/public/courses');
export const getMe = () => api.get('/auth/me');

// ── DATA ──────────────────────────────────────────────────────────────────────
export const getUsers = () => api.get('/users');
export const createUser = (d) => api.post('/users', d);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const updateUser = (id, d) => api.put(`/users/${id}`, d);

export const getCourses = () => api.get('/courses');
export const createCourse = (d) => api.post('/courses', d);
export const updateCourse = (id, d) => api.put(`/courses/${id}`, d);
export const deleteCourse = (id) => api.delete(`/courses/${id}`);

export const getSubjects = () => api.get('/subjects');
export const createSubject = (d) => api.post('/subjects', d);
export const updateSubject = (id, d) => api.put(`/subjects/${id}`, d);
export const deleteSubject = (id) => api.delete(`/subjects/${id}`);

export const getClassrooms = () => api.get('/classrooms');
export const createClassroom = (d) => api.post('/classrooms', d);
export const updateClassroom = (id, d) => api.put(`/classrooms/${id}`, d);
export const deleteClassroom = (id) => api.delete(`/classrooms/${id}`);

export const getTimetable = () => api.get('/timetable');
export const generateTimetable = (d) => api.post('/timetable/generate', d);
export const clearTimetable = () => api.delete('/timetable');

export const getAttendance = () => api.get('/attendance');
export const logAttendanceSession = (d) => api.post('/attendance/session', d);
export const addAttendance = (d) => api.post('/attendance', d);
export const deleteAttendance = (id) => api.delete(`/attendance/${id}`);

export const getFaceScanLogs = () => api.get('/facescanlogs');
export const addFaceScanLog = (d) => api.post('/facescanlogs', d);
export const deleteFaceScanLog = (id) => api.delete(`/facescanlogs/${id}`);

export const getWifiSessions = () => api.get('/wifisessions');
export const addWifiSession = (d) => api.post('/wifisessions', d);
export const deleteWifiSession = (id) => api.delete(`/wifisessions/${id}`);

export const getResults = () => api.get('/results');
export const saveResult = (d) => api.post('/results', d);
export const deleteResult = (id) => api.delete(`/results/${id}`);

export const getFees = () => api.get('/fees');
export const createFee = (d) => api.post('/fees', d);
export const updateFee = (id, d) => api.put(`/fees/${id}`, d);
export const deleteFee = (id) => api.delete(`/fees/${id}`);

export const getAnnouncements = () => api.get('/announcements');
export const createAnnouncement = (d) => api.post('/announcements', d);
export const markAnnouncementRead = (id) => api.put(`/announcements/${id}/read`);
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);

export const getDepartments = () => api.get('/departments');
export const createDepartment = (d) => api.post('/departments', d);

export const getSections = () => api.get('/sections');
export const createSection = (d) => api.post('/sections', d);
