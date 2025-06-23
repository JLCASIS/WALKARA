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
const placeOrderBtn = document.querySelector('.place-order');
const shippingModal = document.getElementById('shippingModal');
const successModal = document.getElementById('successModal');
const shippingForm = document.getElementById('shippingForm');
const oldShippingChoice = document.getElementById('oldShippingChoice');
const shippingFields = document.getElementById('shippingFields');
const shippingInfoParagraph = document.getElementById('shippingInfoParagraph');
const shippingInfoText = document.getElementById('shippingInfoText');
const editShippingInfo = document.getElementById('editShippingInfo');

// Current user and cart
let currentUser = null;
let cartItems = [];
let previousShippingInfo = null;

// Initialize the checkout page
function initCheckout() {
  setupAuthListener();
  setupEventListeners();
}

// Setup authentication listener
function setupAuthListener() {
  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      userProfile.src = user.photoURL || "https://cdn-icons-png.flaticon.com/512/1077/1077012.png";
      loadCartItems(user.uid);
    } else {
      userProfile.src = "https://cdn-icons-png.flaticon.com/512/1077/1077012.png";
      alert("Successfully Logout.");
      window.location.href = "home.html";
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  cartItemsContainer.addEventListener('click', handleCartActions);

  // Place Order handler
  placeOrderBtn.addEventListener('click', async () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty');
      return;
    }
    if (!currentUser) return;

    // Try to fetch previous shipping info from information collection
    previousShippingInfo = await fetchUserInformation(currentUser.uid);

    if (previousShippingInfo) {
      oldShippingChoice.style.display = 'block';
      showShippingInfoParagraph(previousShippingInfo);

      // Listen to radio change
      Array.from(shippingForm.shippingOption).forEach(radio => {
        radio.onchange = (e) => {
          if (e.target.value === 'previous') {
            showShippingInfoParagraph(previousShippingInfo);
          } else {
            shippingInfoParagraph.style.display = 'none';
            shippingFields.style.display = '';
            clearShippingForm();
            setShippingFieldsDisabled(false);
          }
        };
      });

      // Edit button logic
      editShippingInfo.onclick = () => {
        shippingInfoParagraph.style.display = 'none';
        shippingFields.style.display = '';
        fillShippingForm(previousShippingInfo);
        setShippingFieldsDisabled(false);
        // Switch radio to "new"
        shippingForm.shippingOption.value = "new";
      };
    } else {
      oldShippingChoice.style.display = 'none';
      shippingInfoParagraph.style.display = 'none';
      shippingFields.style.display = '';
      clearShippingForm();
      setShippingFieldsDisabled(false);
    }

    shippingModal.style.display = 'flex';
  });

  // Handle shipping form submission
  shippingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let usePrevious = false;
    if (oldShippingChoice.style.display === 'block') {
      usePrevious = shippingForm.shippingOption.value === 'previous';
    }

    if (usePrevious && previousShippingInfo) {
      placeOrderWithShippingInfo(previousShippingInfo);
    } else {
      // Validate form fields when using new shipping info
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const address = document.getElementById('address').value.trim();
      const municipality = document.getElementById('municipality').value.trim();
      const province = document.getElementById('province').value;

      if (!firstName || !lastName || !address || !municipality || !province) {
        alert('Please fill in all required fields');
        return;
      }

      const shippingInfo = {
        firstName: firstName,
        middleName: document.getElementById('middleName').value.trim(),
        lastName: lastName,
        address: address,
        municipality: municipality,
        province: province
      };
      
      // Save to information collection and place order
      saveUserInformationAndPlaceOrder(shippingInfo);
    }
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
}

// Show previous shipping info as a paragraph with edit
function showShippingInfoParagraph(info) {
  shippingFields.style.display = 'none';
  shippingInfoParagraph.style.display = 'block';
  
  // Remove required attributes from hidden fields to prevent validation errors
  document.getElementById('firstName').removeAttribute('required');
  document.getElementById('lastName').removeAttribute('required');
  document.getElementById('address').removeAttribute('required');
  document.getElementById('municipality').removeAttribute('required');
  document.getElementById('province').removeAttribute('required');
  
  // Compose nice string for info
  let name = `${info.firstName || ''}${info.middleName ? ' ' + info.middleName : ''} ${info.lastName || ''}`.trim();
  let address = `${info.address || ''}, ${info.municipality || ''}, ${info.province || ''}`;
  shippingInfoText.textContent = `${name}, ${address}`;
}

// Helper: Fetch previous shipping info (no index required)
function fetchUserInformation(userId) {
  return db.collection('information').doc(userId).get()
    .then(doc => {
      if (doc.exists) {
        return doc.data();
      }
      return null;
    })
    .catch(error => {
      console.error("Error fetching user information:", error);
      return null;
    });
}

// Save user information to information collection
async function saveUserInformation(userId, shippingInfo) {
  try {
    const informationData = {
      userId: userId,
      firstName: shippingInfo.firstName,
      middleName: shippingInfo.middleName,
      lastName: shippingInfo.lastName,
      address: shippingInfo.address,
      municipality: shippingInfo.municipality,
      province: shippingInfo.province,
      updatedAt: new Date()
    };

    await db.collection('information').doc(userId).set(informationData, { merge: true });
    console.log("User information saved successfully");
    return true;
  } catch (error) {
    console.error("Error saving user information:", error);
    return false;
  }
}

// Save user information and place order
async function saveUserInformationAndPlaceOrder(shippingInfo) {
  if (!currentUser) return;

  try {
    // First save the information
    const saveSuccess = await saveUserInformation(currentUser.uid, shippingInfo);
    
    if (saveSuccess) {
      // Then place the order
      placeOrderWithShippingInfo(shippingInfo);
    } else {
      alert("Failed to save information. Please try again.");
    }
  } catch (error) {
    console.error("Error in saveUserInformationAndPlaceOrder:", error);
    alert("An error occurred. Please try again.");
  }
}

// Fill the form with previous shipping info
function fillShippingForm(info) {
  document.getElementById('firstName').value = info.firstName || '';
  document.getElementById('middleName').value = info.middleName || '';
  document.getElementById('lastName').value = info.lastName || '';
  document.getElementById('address').value = info.address || '';
  document.getElementById('municipality').value = info.municipality || '';
  document.getElementById('province').value = info.province || '';
  
  // Add required attributes back when showing form fields
  document.getElementById('firstName').setAttribute('required', 'required');
  document.getElementById('lastName').setAttribute('required', 'required');
  document.getElementById('address').setAttribute('required', 'required');
  document.getElementById('municipality').setAttribute('required', 'required');
  document.getElementById('province').setAttribute('required', 'required');
}

// Clear the shipping form
function clearShippingForm() {
  document.getElementById('firstName').value = '';
  document.getElementById('middleName').value = '';
  document.getElementById('lastName').value = '';
  document.getElementById('address').value = '';
  document.getElementById('municipality').value = '';
  document.getElementById('province').value = '';
  
  // Add required attributes back when showing form fields
  document.getElementById('firstName').setAttribute('required', 'required');
  document.getElementById('lastName').setAttribute('required', 'required');
  document.getElementById('address').setAttribute('required', 'required');
  document.getElementById('municipality').setAttribute('required', 'required');
  document.getElementById('province').setAttribute('required', 'required');
}

// Enable/disable shipping fields
function setShippingFieldsDisabled(disabled) {
  document.getElementById('firstName').disabled = disabled;
  document.getElementById('middleName').disabled = disabled;
  document.getElementById('lastName').disabled = disabled;
  document.getElementById('address').disabled = disabled;
  document.getElementById('municipality').disabled = disabled;
  document.getElementById('province').disabled = disabled;
}

// Place order with shipping info
function placeOrderWithShippingInfo(shippingInfo) {
  if (!currentUser || cartItems.length === 0) return;

  // Calculate total
  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Create order data
  const orderData = {
    userId: currentUser.uid,
    items: cartItems,
    shippingInfo: shippingInfo,
    total: subtotal,
    status: 'pending',
    createdAt: new Date()
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

// Handle cart actions
function handleCartActions(e) {
  const cartItem = e.target.closest('.cart-item');
  if (!cartItem) return;

  const productId = parseInt(cartItem.dataset.id);
  const itemIndex = cartItems.findIndex(item => item.id === productId);

  if (itemIndex === -1) return;

  if (e.target.classList.contains('delete')) {
    showConfirmationModal(productId, itemIndex);
  } else if (e.target.classList.contains('increase-qty')) {
    cartItems[itemIndex].quantity += 1;
    updateCart();
  } else if (e.target.classList.contains('decrease-qty')) {
    if (cartItems[itemIndex].quantity > 1) {
      cartItems[itemIndex].quantity -= 1;
      updateCart();
    }
  }
}

// Show confirmation modal before deleting
function showConfirmationModal(productId, itemIndex) {
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

  modal.querySelector('.confirm-delete').addEventListener('click', () => {
    cartItems.splice(itemIndex, 1);
    updateCart();
    document.body.removeChild(modalOverlay);
  });

  modal.querySelector('.cancel-delete').addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
  });
}

// Load cart items from Firestore
function loadCartItems(userId) {
  db.collection('users').doc(userId).collection('cart').get()
    .then(snapshot => {
      cartItems = [];
      snapshot.forEach(doc => {
        const data = doc.data();
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
      renderCartItems();
    })
    .catch(error => {
      console.error("Error loading cart items:", error);
    });
}

// Render cart items
function renderCartItems() {
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
  if (!currentUser) return;

  const batch = db.batch();
  const userCartRef = db.collection('users').doc(currentUser.uid).collection('cart');

  userCartRef.get().then(snapshot => {
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    cartItems.forEach(item => {
      const newDocRef = userCartRef.doc();
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
    renderCartItems();
  }).catch(error => {
    console.error("Error updating cart:", error);
  });
}

// Initialize the checkout page
document.addEventListener('DOMContentLoaded', initCheckout);
