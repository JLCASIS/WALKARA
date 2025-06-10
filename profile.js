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

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Monitor auth state
firebase.auth().onAuthStateChanged(function (user) {
  if (user) {
    document.getElementById('userEmail').textContent = `Logged in as: ${user.email}`;
  } else {
    window.location.href = 'index.html';
  }
});

// Logout button event
document.getElementById('logoutBtn').addEventListener('click', function () {
  firebase.auth().signOut()
    .then(() => {
      alert('Successfully logged out.');
      window.location.href = 'index.html';
    })
    .catch((error) => {
      console.error('Sign out error:', error);
      alert('Error signing out. Please try again.');
    });
});

// Back button event
document.getElementById('backBtn').addEventListener('click', function () {
  window.location.href = 'home.html';
});
