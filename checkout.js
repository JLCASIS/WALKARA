// Initialize Firebase with the same config
const firebaseConfig = {
    apiKey: "AIzaSyAxApCdOhgO09fIB8_Qw-NSCLPi72aW1Q8",
    authDomain: "walkara.firebaseapp.com",
    projectId: "walkara",
    storageBucket: "walkara.appspot.com",
    messagingSenderId: "456097891643",
    appId: "1:456097891643:web:99cadac413780ad62de31e",
    measurementId: "G-5T4ZGKW3Q4"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const cartItemsContainer = document.getElementById('cartItemsContainer');
const checkoutItemsContainer = document.getElementById('checkoutItemsContainer');
const subtotalAmount = document.getElementById('subtotalAmount');
const userProfile = document.getElementById('userProfile');
const cartCount = document.querySelector('.cart-count');

// Current user and cart
let currentUser = null;
let cartItems = [];

// Initialize the checkout page
function initCheckout() {
  console.log("Initializing checkout...");
  setupAuthListener();
  setupEventListeners();
}

// Setup authentication listener
function setupAuthListener() {
  auth.onAuthStateChanged(user => {
    console.log("Auth state changed:", user);
    currentUser = user;
    if (user) {
      // User is signed in
      userProfile.src = user.photoURL || "https://cdn-icons-png.flaticon.com/512/1077/1077012.png";
      loadCartItems(user.uid);
    } else {
      // User is signed out
      userProfile.src = "https://cdn-icons-png.flaticon.com/512/1077/1077012.png";
      alert("Successfully Logout.");
      window.location.href = "home.html";
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  cartItemsContainer.addEventListener('click', handleCartActions);
}

// Handle cart actions
// Handle cart actions
function handleCartActions(e) {
  const cartItem = e.target.closest('.cart-item');
  if (!cartItem) return;
  
  const productId = parseInt(cartItem.dataset.id);
  const itemIndex = cartItems.findIndex(item => item.id === productId);
  
  if (itemIndex === -1) return;
  
  if (e.target.classList.contains('delete')) {
    // Show confirmation before removing
    showConfirmationModal(productId, itemIndex);
  } else if (e.target.classList.contains('increase-qty')) {
    // Increase quantity
    cartItems[itemIndex].quantity += 1;
    updateCart();
  } else if (e.target.classList.contains('decrease-qty')) {
    // Decrease quantity (minimum 1)
    if (cartItems[itemIndex].quantity > 1) {
      cartItems[itemIndex].quantity -= 1;
      updateCart();
    }
  }
}

// Show confirmation modal before deleting
function showConfirmationModal(productId, itemIndex) {
  // Create modal elements
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'confirmation-modal';
  
  modal.innerHTML = `
    <h3>Remove Item</h3>
    <p>Are you sure you want to remove this item from your cart?</p>
    <div class="confirmation-buttons">
      <button class="confirm-delete">Yes, Remove</button>
      <button class="cancel-delete">Cancel</button>
    </div>
  `;
  
  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);
  
  // Add event listeners to buttons
  modal.querySelector('.confirm-delete').addEventListener('click', () => {
    // Remove item
    cartItems.splice(itemIndex, 1);
    updateCart();
    document.body.removeChild(modalOverlay);
  });
  
  modal.querySelector('.cancel-delete').addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });
  
  // Close modal when clicking outside
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
  });
}

// Load cart items from Firestore
function loadCartItems(userId) {
  console.log("Loading cart items for user:", userId);
  
  db.collection('users').doc(userId).collection('cart').get()
    .then(snapshot => {
      console.log(`Found ${snapshot.size} cart items`);
      cartItems = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log("Retrieved cart item:", data);
        
        // Validate and add to cart
        if (data.id && data.name && data.price) {
          cartItems.push({
            id: data.id,
            name: data.name,
            image: data.image || "default-image.jpg",
            price: data.price,
            quantity: data.quantity || 1,
            size: data.size || "9.5"
          });
        }
      });
      
      console.log("Final cart items before render:", cartItems);
      renderCartItems();
    })
    .catch(error => {
      console.error("Error loading cart items:", error);
    });
}

// Render cart items
function renderCartItems() {
  console.log("Rendering cart items:", cartItems);
  
  if (cartItems.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    checkoutItemsContainer.innerHTML = '';
    subtotalAmount.textContent = '0';
    cartCount.textContent = '0';
    return;
  }

  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  cartItemsContainer.innerHTML = cartItems.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image}" alt="${item.name}" />
      <div class="details">
        <p class="product-name">${item.name}</p>
        <p class="product-size">SIZE: ${item.size}</p>
      </div>
      <p class="price">₱${item.price.toLocaleString()}</p>
      <div class="quantity">
        <button class="decrease-qty">-</button>
        <input type="text" value="${item.quantity}" readonly />
        <button class="increase-qty">+</button>
      </div>
      <button class="delete">🗑️</button>
    </div>
  `).join('');

  checkoutItemsContainer.innerHTML = cartItems.map(item => `
    <div class="checkout-item">
      <p>${item.name} (x${item.quantity})</p>
      <p>₱${(item.price * item.quantity).toLocaleString()}</p>
    </div>
  `).join('');

  subtotalAmount.textContent = `₱${subtotal.toLocaleString()}`;
  cartCount.textContent = cartItems.reduce((total, item) => total + item.quantity, 0);
}

// Update cart in Firestore and UI
function updateCart() {
  if (!currentUser) {
    console.log("No user logged in, can't update cart");
    return;
  }
  
  console.log("Updating cart with items:", cartItems);
  
  const batch = db.batch();
  const userCartRef = db.collection('users').doc(currentUser.uid).collection('cart');
  
  // First clear the existing cart
  userCartRef.get().then(snapshot => {
    // Delete all existing documents
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Add all current items as new documents
    cartItems.forEach(item => {
      const newDocRef = userCartRef.doc(); // Auto-generated ID
      batch.set(newDocRef, {
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        size: item.size
      });
    });
    
    return batch.commit();
  }).then(() => {
    console.log("Cart successfully updated in Firestore");
    renderCartItems();
  }).catch(error => {
    console.error("Error updating cart:", error);
  });
}

// Initialize the checkout page
document.addEventListener('DOMContentLoaded', initCheckout);

// Add this at the top with other DOM elements
const placeOrderBtn = document.querySelector('.place-order');
const shippingModal = document.getElementById('shippingModal');
const successModal = document.getElementById('successModal');
const shippingForm = document.getElementById('shippingForm');

// Add this to setupEventListeners()
placeOrderBtn.addEventListener('click', () => {
  if (cartItems.length === 0) {
    alert('Your cart is empty');
    return;
  }
  shippingModal.style.display = 'flex';
});

// Handle shipping form submission
shippingForm.addEventListener('submit', (e) => {
  e.preventDefault();
  placeOrder();
});

// Close success modal
document.querySelector('.close-success')?.addEventListener('click', () => {
  successModal.style.display = 'none';
});

// Close modals when clicking outside
document.querySelectorAll('.modal-overlay').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});

// Place order function
function placeOrder() {
  if (!currentUser || cartItems.length === 0) return;

  // Get shipping info from form
  const shippingInfo = {
    firstName: document.getElementById('firstName').value,
    middleName: document.getElementById('middleName').value,
    lastName: document.getElementById('lastName').value,
    address: document.getElementById('address').value,
    municipality: document.getElementById('municipality').value,
    province: document.getElementById('province').value
  };

  // Calculate total
  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Create order data
  const orderData = {
    userId: currentUser.uid,
    items: cartItems,
    shippingInfo: shippingInfo,
    total: subtotal,
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  // Add order to Firestore
  db.collection('orders').add(orderData)
    .then(() => {
      // Clear the cart
      return db.collection('users').doc(currentUser.uid).collection('cart').get()
        .then(snapshot => {
          const batch = db.batch();
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          return batch.commit();
        });
    })
    .then(() => {
      // Show success message
      shippingModal.style.display = 'none';
      successModal.style.display = 'flex';
      
      // Clear local cart
      cartItems = [];
      renderCartItems();
    })
    .catch(error => {
      console.error("Error placing order:", error);
      alert("There was an error placing your order. Please try again.");
    });
}