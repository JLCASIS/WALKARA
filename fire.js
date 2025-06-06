import { 
    getFirestore, 
    doc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Initialize Firestore
const db = getFirestore(app);

// Inside the signup event listener:
await setDoc(doc(db, "users", user.uid), {
    username: username,
    email: email,
    createdAt: new Date()
});
