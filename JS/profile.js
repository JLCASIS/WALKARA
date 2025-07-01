import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, Timestamp, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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
// 
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
const orderList = document.getElementById('orderList');
const noOrders = document.getElementById('noOrders');
const orderTemplate = document.getElementById('orderTemplate');
const orderItemTemplate = document.getElementById('orderItemTemplate');

let currentUserId = null;
let currentShippingInfo = null;
let allOrders = []; // Store all orders

// Modal logic
const orderModal = document.getElementById('orderModal');
const orderModalBody = document.getElementById('orderModalBody');
const orderModalClose = document.getElementById('orderModalClose');

if (orderModalClose) orderModalClose.onclick = () => orderModal.style.display = 'none';
if (orderModal) orderModal.onclick = (e) => {
  if (e.target === orderModal) orderModal.style.display = 'none';
};

// Use a CDN default avatar image
const DEFAULT_AVATAR_URL = "https://cdn-icons-png.flaticon.com/512/1077/1077012.png";

const authGuard = getAuth();
onAuthStateChanged(authGuard, function(user) {
  if (!user) {
    window.location.href = 'index.html';
  }
});

function showOrderModal(orderData) {
  let html = `
    <h2>Order Details</h2>
    <div class="order-modal-items">
      ${orderData.items.map(item => `
        <div class="order-modal-item">
          <img src="${item.image || 'default-product.png'}" alt="${item.name}">
          <div class="order-modal-item-details">
            <div class="order-modal-item-title">${item.name}</div>
            <div class="order-modal-item-qty">Quantity: ${item.quantity}</div>
            <div class="order-modal-item-size">Size: ${item.size}</div>
            <div class="order-modal-item-price">Price: ₱${item.price.toLocaleString()}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div><strong>Status:</strong> ${orderData.status || 'N/A'}</div>
    <div><strong>Total:</strong> ₱${orderData.total ? orderData.total.toLocaleString() : 0}</div>
    <div class="order-modal-shipping">
      <strong>Shipping Info</strong>
      <span>Name: ${orderData.shippingInfo?.firstName || ''} ${orderData.shippingInfo?.middleName || ''} ${orderData.shippingInfo?.lastName || ''}</span>
      <span>Address: ${orderData.shippingInfo?.address || ''}</span>
      <span>Municipality: ${orderData.shippingInfo?.municipality || ''}</span>
      <span>Province: ${orderData.shippingInfo?.province || ''}</span>
    </div>
    <div style="margin-top:10px; font-size:12px; color:#888;">Ordered on: ${orderData.createdAt.toDate().toLocaleString()}</div>
  `;
  orderModalBody.innerHTML = html;
  orderModal.style.display = 'flex';
}

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
  profilePic.src = data.photoURL || user.photoURL || DEFAULT_AVATAR_URL;
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

  // Load orders
  await loadOrders(user.uid);
}

// Load orders from Firestore in real-time
function loadOrders(userId) {
  // Clear the list first
  while (orderList.firstChild) {
    orderList.removeChild(orderList.firstChild);
  }
  noOrders.style.display = "block";
  noOrders.textContent = "Loading orders...";

  const pendingQuery = query(
    collection(db, "orders"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  // Listen for real-time updates
  onSnapshot(pendingQuery, (pendingSnapshot) => {
    allOrders = [];
    pendingSnapshot.forEach(docSnap => {
      const orderData = docSnap.data();
      orderData._docId = docSnap.id;
      orderData._source = "orders";
      if (!orderData.createdAt) {
        orderData.createdAt = Timestamp.now();
      } else if (!(orderData.createdAt instanceof Timestamp)) {
        orderData.createdAt = Timestamp.fromDate(new Date(orderData.createdAt));
      }
      allOrders.push(orderData);
    });

    // Get the current filter from the active button
    const currentFilter = document.querySelector('.order-filter-btn.active')?.getAttribute('data-filter') || 'all';
    renderOrders(currentFilter);
    schedulePendingToCompleted();
  }, (error) => {
    console.error("Error loading orders:", error);
    noOrders.style.display = "block";
    noOrders.textContent = "Error loading orders. Please try again later.";
  });
}

// Schedule pending orders to become completed after 1 minute
function schedulePendingToCompleted() {
  allOrders.forEach(order => {
    if ((order.status || '').toLowerCase() === 'pending' && order._docId) {
      const now = new Date();
      const createdAt = order.createdAt.toDate();
      const elapsed = now - createdAt;
      const msLeft = 60000 - elapsed; // 1 minute in ms

      if (msLeft > 0) {
        setTimeout(async () => {
          try {
            const orderRef = doc(db, "orders", order._docId);
            await updateDoc(orderRef, { status: "completed" });
            // Optionally, reload orders or update UI here
          } catch (err) {
            console.error("Failed to update order status:", err);
          }
        }, msLeft);
      } else {
        (async () => {
          try {
            const orderRef = doc(db, "orders", order._docId);
            await updateDoc(orderRef, { status: "completed" });
            // Optionally, reload orders or update UI here
          } catch (err) {
            console.error("Failed to update order status:", err);
          }
        })();
      }
    }
  });
}

// Render orders based on filter
function renderOrders(filter) {
  while (orderList.firstChild) {
    orderList.removeChild(orderList.firstChild);
  }
  let filtered = [];
  if (filter === 'all') {
    filtered = allOrders;
  } else if (filter === 'pending') {
    filtered = allOrders.filter(o => o.status && o.status.toLowerCase() === "pending");
  } else if (filter === 'completed') {
    filtered = allOrders.filter(o => o.status && o.status.toLowerCase() === "completed");
  }
  if (filtered.length === 0) {
    noOrders.style.display = "block";
    noOrders.textContent = "No orders found";
    return;
  }
  noOrders.style.display = "none";
  filtered.forEach(orderData => displayOrder(orderData));
}

// Add event listeners for filter buttons
function setupOrderFilterButtons() {
  const filterBtns = document.querySelectorAll('.order-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderOrders(this.getAttribute('data-filter'));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupOrderFilterButtons();
  // Modal logic for logout confirmation
  const logoutModal = document.getElementById('logoutModal');
  const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
  const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');

  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    if (logoutModal) logoutModal.style.display = 'flex';
  });

  if (cancelLogoutBtn) cancelLogoutBtn.addEventListener('click', () => {
    if (logoutModal) logoutModal.style.display = 'none';
  });

  if (logoutModal) {
    logoutModal.addEventListener('click', (e) => {
      if (e.target === logoutModal) logoutModal.style.display = 'none';
    });
  }

  if (confirmLogoutBtn) confirmLogoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'home.html');
});

// Display a single order
function displayOrder(orderData) {
  try {
    console.log('Displaying order:', orderData);
    const orderElement = orderTemplate.content.cloneNode(true);
    
    // Set order status
    const statusElement = orderElement.querySelector('.order-status');
    statusElement.textContent = orderData.status || 'Processing';
    statusElement.classList.add((orderData.status || 'processing').toLowerCase().replace(/\s+/g, '-'));

    // Set order total
    orderElement.querySelector('.order-total-price').textContent = 
      `₱${(orderData.total || 0).toLocaleString()}`;
    
    // Set order date
    const orderDate = orderData.createdAt.toDate();
    orderElement.querySelector('.order-date-value').textContent = 
      orderDate.toLocaleDateString();

    // Get the container for order items
    const itemsContainer = orderElement.querySelector('.order-items-container');

    // Add each item in the order
    if (Array.isArray(orderData.items)) {
      console.log('Processing order items:', orderData.items.length);
      orderData.items.forEach(item => {
        const itemElement = orderItemTemplate.content.cloneNode(true);
        
        // Set item details
        const imgElement = itemElement.querySelector('.order-product-img');
        imgElement.src = item.image || 'default-product.png';
        imgElement.onerror = function() {
          console.log('Image failed to load:', item.image);
          this.src = 'default-product.png';
        };
        
        itemElement.querySelector('.order-product-title').textContent = item.name || 'Unknown Product';
        itemElement.querySelector('.size-value').textContent = item.size || 'N/A';
        itemElement.querySelector('.order-product-qty').textContent = 
          `x${item.quantity || 1}`;
        itemElement.querySelector('.order-new-price').textContent = 
          `₱${(item.price || 0).toLocaleString()}`;

        // Add buy again functionality
        const buyAgainBtn = itemElement.querySelector('.order-buy-again-btn');
        buyAgainBtn.addEventListener('click', () => {
          console.log('Buy again clicked for item:', item);
          // Store item details in localStorage
          const buyAgainItem = {
            id: item.id,
            name: item.name,
            price: item.price,
            size: item.size,
            image: item.image,
            quantity: 1 // Reset quantity to 1 for new purchase
          };
          localStorage.setItem('buyAgainItem', JSON.stringify(buyAgainItem));
          
          // Redirect to home page
          window.location.href = 'home.html';
        });

        itemsContainer.appendChild(itemElement);
      });
    } else {
      console.log('No items array in order data:', orderData);
    }

    // Add click event to show modal
    orderElement.querySelector('.order-card').onclick = () => showOrderModal(orderData);
    orderList.appendChild(orderElement);
  } catch (error) {
    console.error("Error displaying order:", error, orderData);
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



