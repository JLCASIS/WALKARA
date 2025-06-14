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
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const logoutBtn = document.getElementById('logoutBtn');
const backBtn = document.getElementById('backBtn');
const uploadInput = document.getElementById('profilePicUpload');

let currentUserId = null;

// Load profile data from Firestore (profiles/{userId})
async function loadProfile(user) {
  currentUserId = user.uid;
  // Try the new 'profiles' collection first
  const profileDoc = await getDoc(doc(db, "profiles", user.uid));
  if (profileDoc.exists()) {
    const data = profileDoc.data();
    profilePic.src = data.photoURL || user.photoURL || "default-avatar.png";
    profileName.textContent = data.username || user.displayName || "No Name";
    profileEmail.textContent = data.email || user.email || "No Email";
  } else {
    // Fallback: check "users" collection (old data)
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      profilePic.src = data.photoURL || user.photoURL || "default-avatar.png";
      profileName.textContent = data.username || user.displayName || "No Name";
      profileEmail.textContent = data.email || user.email || "No Email";
    } else {
      profilePic.src = user.photoURL || "default-avatar.png";
      profileName.textContent = user.displayName || "No Name";
      profileEmail.textContent = user.email || "No Email";
    }
  }
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
      const newProfile = {
        photoURL: data.secure_url,
        username: profileName.textContent,
        email: profileEmail.textContent,
        cloudinary_public_id: data.public_id,
        cloudinary_version: data.version,
        uploadedAt: new Date()
      };
      await setDoc(doc(db, "profiles", currentUserId), newProfile, { merge: true });
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