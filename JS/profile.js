import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAxApCdOhgO09fIB8_Qw-NSCLPi72aW1Q8",
  authDomain: "walkara.firebaseapp.com",
  projectId: "walkara",
  storageBucket: "walkara.appspot.com",
  messagingSenderId: "456097891643",
  appId: "1:456097891643:web:99cadac413780ad62de31e",
  measurementId: "G-5T4ZGKW3Q4"
};

// Cloudinary config
const CLOUD_NAME = "dl1ueeytm";
const UPLOAD_PRESET = "profile_upload";

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
  profilePic.src = data.photoURL || user.photoURL || "default-avatar.png";
  profileUsername.textContent = data.username || user.displayName || "-";
  profileGmail.textContent = data.email || user.email || "-";
  profileName.textContent = data.fullName || user.displayName || "-";
  // Load address info from 'information' collection
  const infoDoc = await getDoc(doc(db, "information", user.uid));
  if (infoDoc.exists()) {
    const info = infoDoc.data();
    profileAddress.textContent = info.address || "-";
    profileMunicipality.textContent = info.municipality || "-";
    profileProvince.textContent = info.province || "-";
    // Optionally, update name if available
    const fullName = `${info.firstName || ''}${info.middleName ? ' ' + info.middleName : ''} ${info.lastName || ''}`.trim();
    if (fullName) profileName.textContent = fullName;
  } else {
    profileAddress.textContent = "-";
    profileMunicipality.textContent = "-";
    profileProvince.textContent = "-";
  }
  
  // Load shipping information from information collection
  const informationDoc = await getDoc(doc(db, "information", user.uid));
  if (informationDoc.exists()) {
    const data = informationDoc.data();
    currentShippingInfo = data;
    displayShippingInfo(data);
  } else {
    displayShippingInfo(null);
  }
}

// Display shipping information
function displayShippingInfo(shippingInfo) {
  if (!shippingInfo) {
    profileName.textContent = "No information saved";
    profileAddress.textContent = "-";
    profileMunicipality.textContent = "-";
    profileProvince.textContent = "-";
    return;
  }

  const fullName = `${shippingInfo.firstName || ''}${shippingInfo.middleName ? ' ' + shippingInfo.middleName : ''} ${shippingInfo.lastName || ''}`.trim();
  profileName.textContent = fullName || "No name provided";
  profileAddress.textContent = shippingInfo.address || "-";
  profileMunicipality.textContent = shippingInfo.municipality || "-";
  profileProvince.textContent = shippingInfo.province || "-";
}

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  await loadProfile(user);
});

// Handle profile picture upload
let uploadInput = document.getElementById('profilePicUpload');
if (!uploadInput) {
  uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.id = 'profilePicUpload';
  uploadInput.accept = 'image/*';
  uploadInput.style.display = 'none';
  document.body.appendChild(uploadInput);
}

// Change Profile icon triggers file input
if (changeProfileBtn) {
  changeProfileBtn.addEventListener('click', () => {
    uploadInput.click();
  });
}

// Handle profile picture upload
uploadInput.addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (!file || !currentUserId) return;
  try {
    // 1. Upload to Cloudinary
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (data.secure_url) {
      // 2. Save metadata in Firestore (profiles/{userId})
      const profileDoc = await getDoc(doc(db, "profiles", currentUserId));
      let profileData = {};
      if (profileDoc.exists()) {
        profileData = profileDoc.data();
      }
      profileData.photoURL = data.secure_url;
      profileData.username = profileUsername ? profileUsername.textContent : '';
      profileData.email = profileGmail ? profileGmail.textContent : '';
      profileData.cloudinary_public_id = data.public_id;
      profileData.cloudinary_version = data.version;
      profileData.uploadedAt = new Date();
      // Preserve existing shipping info
      if (currentShippingInfo) {
        profileData.shippingInfo = currentShippingInfo;
      }
      await setDoc(doc(db, "profiles", currentUserId), profileData, { merge: true });
      profilePic.src = data.secure_url;
      alert("Profile picture updated!");
    } else {
      throw new Error("Cloudinary upload failed");
    }
  } catch (err) {
    alert("Upload failed: " + (err.message || err));
  }
});

// Logout & Back
if (logoutBtn) logoutBtn.addEventListener('click', async () => { await signOut(auth); window.location.href = 'index.html'; });
if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'home.html');

