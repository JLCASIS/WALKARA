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
  //Spoerts category
  { id: 55, image: "shoes/sports/1.jpeg", name: "Adidas Blue Color way", price: 3800 },
  { id: 56, image: "shoes/sports/2.jpeg", name: "Puma Lamelo Orange/White", price: 6400 },
  { id: 57, image: "shoes/sports/3.jpeg", name: "Nike Precision 7 Light/Blue", price: 4900 },
  { id: 58, image: "shoes/sports/4.jpeg", name: "Nike Precision 7 Gray/White", price: 4900 },
  { id: 59, image: "shoes/sports/5.jpeg", name: "Nike Precision 5 Gray/White", price: 3500 },
  { id: 60, image: "shoes/sports/6.jpeg", name: "Nike Precision 7 Orange", price: 4900 },
  { id: 61, image: "shoes/sports/7.jpeg", name: "Nike Precision 5 Blue/Light Blue", price: 3500 },
  { id: 62, image: "shoes/sports/8.jpeg", name: "Nike Kyrie 4 Black/Green", price: 5000 },
  { id: 63, image: "shoes/sports/9.jpeg", name: "Nike Kyrie 4 Black/White", price: 5000},
  { id: 64, image: "shoes/sports/10.jpeg", name: "Nike Kyrie 4 Violet/Blue", price: 6000 },
  { id: 65, image: "shoes/sports/11.jpg", name: "Nike M Light Blue", price: 4500 },
  { id: 66, image: "shoes/sports/12.webp", name: "Nike Precision 5 Purple/White", price: 5200 },
  { id: 67, image: "shoes/sports/13.jpg", name: "Nike White Off On", price: 5000 },
  { id: 68, image: "shoes/sports/14.jpeg", name: "Nike Black Mamba Off White/Gray", price: 7000 },
  { id: 69, image: "shoes/sports/15.webp", name: "Nike KD 5 Gray/Black", price: 6500 },
  { id: 70, image: "shoes/sports/16.jpg", name: "Under Armour Curry 5 Red/Black", price: 8000 },
  { id: 71, image: "shoes/sports/17.webp", name: "Under Armour Curry 5 Blue/Black", price: 8000 },
  { id: 72, image: "shoes/sports/18.jfif", name: "Nike Precision 5 Black/White", price: 5000 } 
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


