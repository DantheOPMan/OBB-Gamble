// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { APIURL } from './constants';

// Your web app's Firebase configuration
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

// src/firebase.js
const makeRequest = async (endpoint, method, body = null) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User is not authenticated");
  }

  const authToken = await user.getIdToken(true);

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${APIURL}${endpoint}`, options);
    if (!response.ok) {
      const errorDetails = await response.json();
      throw new Error(`Network response was not ok: ${response.statusText}. Details: ${JSON.stringify(errorDetails)}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Error in ${endpoint}:`, err.message);
    throw err;
  }
};

const registerUser = async (uid, email) => {
  return makeRequest('/api/users/register', 'POST', { uid, email });
};

const getUser = async (uid) => {
  return makeRequest(`/api/users/${uid}`, 'GET');
};

const requestDeposit = async (userId, amount, discordUsername, obkUsername) => {
  const marketName = ""; // Set marketName to an empty string
  return makeRequest('/api/transactions/deposit', 'POST', { userId, amount, marketName, discordUsername, obkUsername });
};

const requestWithdraw = async (userId, amount, discordUsername, obkUsername) => {
  const marketName = ""; // Set marketName to an empty string
  return makeRequest('/api/transactions/withdraw', 'POST', { userId, amount, marketName, discordUsername, obkUsername });
};

const approveTransaction = async (transactionId) => {
  return makeRequest(`/api/transactions/approve/${transactionId}`, 'PUT');
};

const rejectTransaction = async (transactionId) => {
  return makeRequest(`/api/transactions/reject/${transactionId}`, 'PUT');
};

const fetchPendingTransactions = async () => {
  return makeRequest('/api/transactions/pending', 'GET');
};

const updateUser = async (uid, discordUsername, obkUsername) => {
  return makeRequest(`/api/users/${uid}`, 'PUT', { discordUsername, obkUsername });
};

const createMarket = async (marketName, competitors) => {
  return makeRequest('/api/markets', 'POST', { marketName, competitors });
};

const getMarkets = async () => {
  return makeRequest('/api/markets', 'GET');
};


const closeMarket = async (marketId, winner) => {
  return makeRequest(`/api/markets/close/${marketId}`, 'POST', { winner });
};

const getMarketById = async (marketId) => {
  return makeRequest(`/api/markets/${marketId}`, 'GET');
};

const placeBet = async (marketId, amount) => {
  const userId = auth.currentUser.uid;
  return makeRequest(`/api/markets/bet/${marketId}`, 'POST', { userId, amount });
};

export { auth, provider, signInWithPopup, signOut, onAuthStateChanged, registerUser, getUser, updateUser, requestDeposit, requestWithdraw, approveTransaction, rejectTransaction, fetchPendingTransactions, createMarket, getMarkets, closeMarket, getMarketById, placeBet };
