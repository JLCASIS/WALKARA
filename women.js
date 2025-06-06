// Initialize Firebase
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

// Product data
const products = [
  //WOMEN category
  { id: 19, image: "shoes/women/1.jpg", name: "Fashion Shoes", price: 1500 },
  { id: 20, image: "shoes/women/2.webp", name: "Nike Free RN", price: 2400 },
  { id: 21, image: "shoes/women/3.webp", name: "Skechers Women Max", price: 4932 },
  { id: 22, image: "shoes/women/4.jpg", name: "Adidas Violet", price: 3455 },
  { id: 23, image: "shoes/women/5.jpeg", name: "Nike Black/Voilet", price: 4114 },
  { id: 24, image: "shoes/women/6.avif", name: "Hoka Black", price: 3000 },
  { id: 25, image: "shoes/women/7.png", name: "Hoka Blue", price: 2530 },
  { id: 26, image: "shoes/women/8.jpeg", name: "Puma Peachy", price: 4242 },
  { id: 27, image: "shoes/women/9.png", name: "New Balance Scary Porty", price: 3280},
  { id: 28, image: "shoes/women/10.jpg", name: "Xporty Womany", price: 2400 },
  { id: 29, image: "shoes/women/11.jfif", name: "Nike Black Pink Area", price: 3900 },
  { id: 30, image: "shoes/women/12.jpg", name: "Fashion Pinky Worty", price: 1500 },
  { id: 31, image: "shoes/women/13.webp", name: "Aexis White Off On", price: 3200 },
  { id: 32, image: "shoes/women/14.jpg", name: "Fashion Designer Off The Back", price: 1400 },
  { id: 33, image: "shoes/women/15.avif", name: "Porkey Kunchi", price: 2400 },
  { id: 34, image: "shoes/women/16.webp", name: "Voopet Muchet", price: 2500 },
  { id: 35, image: "shoes/women/17.jpg", name: "Fashion Pinkish", price: 1000 },
  { id: 36, image: "shoes/women/18.webp", name: "Hielo Goddie", price: 2430 } 
];

// DOM elements
const productGrid = document.querySelector('.product-grid');
const cartCount = document.querySelector('.cart-count');
const flyingProduct = document.getElementById('flyingProduct');
const userProfile = document.getElementById('userProfile');

// Current user and cart
let currentUser = null;
let cartItems = [];

// Initialize the app
function init() {
  renderProducts();
  setupAuthListener();
}

// Render products to the page
function renderProducts() {
  productGrid.innerHTML = products.map(product => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}" />
      <p class="price">₱${product.price.toLocaleString()}</p>
      <button class="add-to-cart">ADD TO BAG</button>
    </div>
  `).join('');
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
      cartItems = [];
      updateCartCount();
    }
  });
}

// Load cart items from Firestore
function loadCartItems(userId) {
  db.collection('users').doc(userId).collection('cart').get()
    .then(snapshot => {
      cartItems = [];
      snapshot.forEach(doc => {
        cartItems.push(doc.data());
      });
      updateCartCount();
    })
    .catch(error => {
      console.error("Error loading cart items:", error);
    });
}

// Add item to cart - modified to handle button feedback
function addToCart(productId, button) {
  if (!currentUser) {
    alert("Please sign in to add items to your cart");
    return null;
  }

  const product = products.find(p => p.id === productId);
  if (!product) return null;

  // Visual feedback - turn button green immediately
  button.textContent = "ADDED TO BAG";
  button.classList.add('added');

  // Check if product already in cart
  const existingItemIndex = cartItems.findIndex(item => item.id === productId);
  
  if (existingItemIndex >= 0) {
    // Update quantity
    cartItems[existingItemIndex].quantity += 1;
  } else {
    // Add new item
    cartItems.push({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: 1,
      size: "9.5"
    });
  }

  // Update Firestore
  updateCartInFirestore();
  
  // Update cart count
  updateCartCount();

  // Set timeout to revert button after 3 seconds
  setTimeout(() => {
    button.classList.remove('added');
    button.textContent = "ADD TO BAG";
  }, 3000);
  
  return product;
}

// Update cart in Firestore
function updateCartInFirestore() {
  if (!currentUser) return;

  const userCartRef = db.collection('users').doc(currentUser.uid).collection('cart');
  
  userCartRef.get().then(snapshot => {
    const batch = db.batch();
    snapshot.forEach(doc => {
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
    console.log("Cart updated in Firestore");
  }).catch(error => {
    console.error("Error updating cart:", error);
  });
}

// Simplified to only update cart count
function updateCartCount() {
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
  cartCount.textContent = totalItems;
}

// Animate product to cart
function animateToCart(product, button) {
  const productImg = button.closest('.product-card').querySelector('img');
  const cartIcon = document.querySelector('.cart');
  
  const productRect = productImg.getBoundingClientRect();
  const cartRect = cartIcon.getBoundingClientRect();
  
  const startX = productRect.left + productRect.width / 2;
  const startY = productRect.top + productRect.height / 2;
  const endX = cartRect.left + cartRect.width / 2 - startX;
  const endY = cartRect.top + cartRect.height / 2 - startY;
  
  flyingProduct.style.backgroundImage = `url(${product.image})`;
  flyingProduct.style.left = `${startX}px`;
  flyingProduct.style.top = `${startY}px`;
  flyingProduct.style.setProperty('--endX', `${endX}px`);
  flyingProduct.style.setProperty('--endY', `${endY}px`);
  flyingProduct.style.display = 'block';
  flyingProduct.style.animation = 'flyToCart 0.8s forwards';
  
  setTimeout(() => {
    flyingProduct.style.display = 'none';
    flyingProduct.style.animation = '';
  }, 800);
}

// Event delegation for add to cart buttons
document.addEventListener('DOMContentLoaded', () => {
  productGrid.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart')) {
      const productCard = e.target.closest('.product-card');
      const productId = parseInt(productCard.dataset.id);
      
      const product = addToCart(productId, e.target);
      if (product) {
        animateToCart(product, e.target);
      }
    }
  });
});

// Initialize the app
init();


const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

burger.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});


