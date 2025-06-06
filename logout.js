document.addEventListener('DOMContentLoaded', function() {
  // Check if Firebase is already initialized
  if (typeof firebase === 'undefined') {
    console.error('Firebase is not loaded');
    return;
  }

  try {
    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: "AIzaSyAxApCdOhgO09fIB8_Qw-NSCLPi72aW1Q8",
        authDomain: "walkara.firebaseapp.com",
        projectId: "walkara",
        storageBucket: "walkara.appspot.com",
        messagingSenderId: "456097891643",
        appId: "1:456097891643:web:99cadac413780ad62de31e",
        measurementId: "G-5T4ZGKW3Q4"
      });
      console.log('Firebase initialized');
    }

    // Set up logout button
    const logoutBtn = document.querySelector('.logout-btn');
    
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        console.log('Logout clicked');
        firebase.auth().signOut()
          .then(() => {
            console.log('Sign-out successful');
            alert('Successfully Logout.');  // Added alert box here
            window.location.href = 'index.html';
          })
          .catch((error) => {
            console.error('Sign out error:', error);
            alert('Error signing out. Please try again.');
          });
      });
    } else {
      console.error('Logout button not found');
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
});