import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAxApCdOhgO09fIB8_Qw-NSCLPi72aW1Q8",
  authDomain: "walkara.firebaseapp.com",
  projectId: "walkara",
  storageBucket: "walkara.appspot.com",
  messagingSenderId: "456097891643",
  appId: "1:456097891643:web:99cadac413780ad62de31e",
  measurementId: "G-5T4ZGKW3Q4"
};

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/1077/1077012.png";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const profilePic = document.getElementById('profilePic');
const profileUsername = document.getElementById('profileUsername');
const profileGmail = document.getElementById('profileGmail');
const profileName = document.getElementById('profileName');
const profileAddress = document.getElementById('profileAddress');
const profileMunicipality = document.getElementById('profileMunicipality');
const profileProvince = document.getElementById('profileProvince');
const logoutBtn = document.getElementById('logoutBtn');
const backBtn = document.getElementById('backBtn');
const changeProfileBtn = document.getElementById('changeProfileBtn');
const orderList = document.getElementById('orderList');
const noOrders = document.getElementById('noOrders');
const orderTemplate = document.getElementById('orderTemplate');
const orderItemTemplate = document.getElementById('orderItemTemplate');

let currentUserId = null;
let currentShippingInfo = null;

// Load profile data from Firestore (profiles/{userId})
async function loadProfile(user) {
  currentUserId = user.uid;
  // Try the new 'profiles' collection first
  const profileDoc = await getDoc(doc(db, "profiles", user.uid));
  let data = {};
  if (profileDoc.exists()) {
    data = profileDoc.data();
  } else {
    // Fallback: check "users" collection (old data)
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      data = userDoc.data();
    } else {
      data = user;
    }
  }
  profilePic.src = data.photoURL || user.photoURL || DEFAULT_AVATAR;
  // ... rest of the code ...
}