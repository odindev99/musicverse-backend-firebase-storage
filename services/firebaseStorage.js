const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");

const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
	credential: cert(serviceAccount),
	storageBucket: "musicverse-backend.appspot.com",
});

const firebaseStorage = getStorage().bucket();

module.exports = firebaseStorage;
