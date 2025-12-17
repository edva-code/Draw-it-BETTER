import axios from 'axios'

const api = axios.create({
    baseURL: "/api/v1",
    withCredentials: true // Important for cookies
});

export default api;