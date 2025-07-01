// Import Firebase modules at the top level
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Initialize Firebase at the top level
const firebaseConfig = {
    apiKey: "AIzaSyAxApCdOhgO09fIB8_Qw-NSCLPi72aW1Q8",
    authDomain: "walkara.firebaseapp.com",
    projectId: "walkara",
    storageBucket: "walkara.appspot.com",
    messagingSenderId: "456097891643",
    appId: "1:456097891643:web:99cadac413780ad62de31e",
    measurementId: "G-5T4ZGKW3Q4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded");
    
    // Get DOM elements
    const loginBox = document.getElementById('loginBox');
    const signupBox = document.getElementById('signupBox');
    const showSignupBtn = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');
    
    // Debug: Check if elements exist
    console.log({
        loginBox,
        signupBox,
        showSignupBtn,
        showLoginLink
    });
    
    // Toggle between forms
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Signup button clicked");
            if (loginBox && signupBox) {
                loginBox.style.display = 'none';
                signupBox.style.display = 'block';
            }
        });
    }
    
    if (showLoginLink) {
        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Login link clicked");
            if (loginBox && signupBox) {
                signupBox.style.display = 'none';
                loginBox.style.display = 'block';
            }
        });
    }
    
    // Signup function
    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
        signupBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('signupUsername').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                await setDoc(doc(db, "users", user.uid), {
                    username: username,
                    email: email,
                    createdAt: new Date()
                });
                
                showPopup('Account created successfully!', 'success');
                signupBox.style.display = 'none';
                loginBox.style.display = 'block';
                
                // Clear form
                document.getElementById('signupUsername').value = '';
                document.getElementById('signupEmail').value = '';
                document.getElementById('signupPassword').value = '';
                
            } catch (error) {
                console.error("Error signing up:", error);
                showPopup(getFriendlyErrorMessage(error), 'error');
            }
        });
    }
    
    // Login function
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                await signInWithEmailAndPassword(auth, email, password);
                showPopup('Account login successfully!', 'success');
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1500);
            } catch (error) {
                console.error("Error logging in:", error);
                showPopup(getFriendlyErrorMessage(error), 'error');
            }
        });
    } 

    // Popup message logic
    function showPopup(message, type = 'success') {
        const popup = document.getElementById('popupMessage');
        const popupContent = document.querySelector('.popup-content');
        const popupText = document.getElementById('popupText');
        popupText.textContent = message;
        popupContent.classList.remove('success', 'error');
        popupContent.classList.add(type);
        popup.style.display = 'flex';
    }

    function hidePopup() {
        document.getElementById('popupMessage').style.display = 'none';
    }

    const closePopupBtn = document.getElementById('closePopupBtn');
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', hidePopup);
    }

    const popupMessage = document.getElementById('popupMessage');
    if (popupMessage) {
        popupMessage.addEventListener('click', function(e) {
            if (e.target === this) hidePopup();
        });
    }
});

// Map Firebase error codes to user-friendly messages
function getFriendlyErrorMessage(error) {
    if (!error || !error.code) return 'An unknown error occurred.';
    switch (error.code) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please log in or use another email.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/missing-password':
            return 'Please enter your password.';
        case 'auth/missing-email':
            return 'Please enter your email address.';
        default:
            return error.message || 'An unknown error occurred.';
    }
}

