const admin = require('firebase-admin');

const firebaseAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.log('Error verifying Firebase token:', err);
    return res.status(401).send('Unauthorized');
  }
};

module.exports = firebaseAuth;
