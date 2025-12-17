import axios from 'axios'
import serverBaseUrl from '@/constants/urls.js';

const BASE_URL = serverBaseUrl;

const api = axios.create({
    baseURL: "/api/v1",
    withCredentials: true // Important for cookies
});

export default api;