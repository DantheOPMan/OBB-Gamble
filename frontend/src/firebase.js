// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { APIURL } from './constants';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCSAzSXbGLX2MKXME99i-hto3ganLgk1fM",
  authDomain: "obb-markets.firebaseapp.com",
  projectId: "obb-markets",
  storageBucket: "obb-markets.appspot.com",
  messagingSenderId: "1017301114598",
  appId: "1:1017301114598:web:03cc259063f54b587ba527",
  measurementId: "G-3033GJBZRP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const makeRequest = async (endpoint, method, body = null) => {
  const authToken = await auth.currentUser.getIdToken();
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${APIURL}${endpoint}`, options);
    return await response.json();
  } catch (err) {
    console.error(`Error in ${endpoint}:`, err.message);
  }
};

const registerUser = async (uid, email) => {
  return makeRequest('/api/users/register', 'POST', { uid, email });
};

const getUser = async (uid) => {
  return makeRequest(`/api/users/${uid}`, 'GET');
};

export { auth, provider, signInWithPopup, signOut, onAuthStateChanged, registerUser, getUser };
