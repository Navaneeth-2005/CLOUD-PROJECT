import axios from 'axios';

const API = axios.create({
  baseURL: 'https://dgeb48f0ffhmi.cloudfront.net/api'
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;