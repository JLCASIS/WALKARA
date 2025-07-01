// Initialize Firebase (compat style)
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
}
// Authentication Guard: Redirect to login if not authenticated
firebase.auth().onAuthStateChanged(function(user) {
  if (!user) {
    window.location.href = 'index.html';
  }
});

const auth = firebase.auth();
const db = firebase.firestore();

// Product data
const products = [
  //Kids category
  { id: 37, image: "shoes/kids/1.jpg", name: "Kids M Blue/White", price: 530 },
  { id: 38, image: "shoes/kids/2.webp", name: "Kids M Gray/Black", price: 500 },
  { id: 39, image: "shoes/kids/3.webp", name: "Kids M Red", price: 450 },
  { id: 40, image: "shoes/kids/4.jpg", name: "Kids M Blue", price: 600 },
  { id: 41, image: "shoes/kids/5.webp", name: "Kids M White", price: 299 },
  { id: 42, image: "shoes/kids/6.webp", name: "Kids F Pink", price: 600 },
  { id: 43, image: "shoes/kids/7.jpg", name: "Kids F Yellow", price: 740 },
  { id: 44, image: "shoes/kids/8.jpg", name: "Kids M Dark Blue", price: 390 },
  { id: 45, image: "shoes/kids/9.webp", name: "Kids M Black", price: 490},
  { id: 46, image: "shoes/kids/10.webp", name: "Kids M Batman", price: 800 },
  { id: 47, image: "shoes/kids/11.jpg", name: "Kids M Adventure", price: 590 },
  { id: 48, image: "shoes/kids/12.jpg", name: "Kids M Sports Walk", price: 890 },
  { id: 49, image: "shoes/kids/13.webp", name: "Kids M High Cut Gray", price: 999 },
  { id: 50, image: "shoes/kids/14.avif", name: "Kids M High Cut Gray/White", price: 790 },
  { id: 51, image: "shoes/kids/15.avif", name: "Kids M Sky Blue", price: 300 },
  { id: 52, image: "shoes/kids/16.jpg", name: "Kids M Orange", price: 699 },
  { id: 53, image: "shoes/kids/17.jpg", name: "Kids F Violet Dora", price: 999 },
  { id: 54, image: "shoes/kids/18.jpg", name: "Kids F Violet", price: 890 } 
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

// Add item to cart in Firestore
async function addToCart(productId, button) {
  if (!currentUser) {
    alert("Please sign in to add items to your cart");
    return null;
  }

  const product = products.find(p => p.id === productId);
  if (!product) return null;

  // Visual feedback
  button.textContent = "ADDED TO BAG";
  button.classList.add('added');

  const userCartRef = db.collection('users').doc(currentUser.uid).collection('cart');
  // Check if item already exists in cart
  const existing = await userCartRef.where('id', '==', product.id).get();

  if (!existing.empty) {
    // Update quantity
    const docRef = existing.docs[0].ref;
    const data = existing.docs[0].data();
    await docRef.update({
      quantity: (data.quantity || 1) + 1
    });
  } else {
    // Add new item
    await userCartRef.add({
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: 1,
      size: "9.5"
    });
  }

  // Update cart count
  loadCartItems(currentUser.uid);

  setTimeout(() => {
    button.classList.remove('added');
    button.textContent = "ADD TO BAG";
  }, 3000);

  return product;
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
// Animate first, then update Firestore in background for smoothness
document.addEventListener('DOMContentLoaded', () => {
  productGrid.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart')) {
      const productCard = e.target.closest('.product-card');
      const productId = parseInt(productCard.dataset.id);

      // Get product info from local array for instant animation
      const product = products.find(p => p.id === productId);
      if (product) {
        animateToCart(product, e.target);
      }

      // Firestore write in background
      addToCart(productId, e.target);
    }
  });
});

// Fix burger menu error
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
if (burger && navLinks) {
  burger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
}

// Initialize the app
init();