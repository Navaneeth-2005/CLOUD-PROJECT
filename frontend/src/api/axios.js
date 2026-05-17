import axios from 'axios';

const API = axios.create({
  baseURL: 'http://a44873505701344cba71f72d3e0dc774-1621922902.ap-south-1.elb.amazonaws.com/api'
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;