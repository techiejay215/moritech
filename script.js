// Service Functions with Backend Integration
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Global cart instance
let cartInstance = null;

// Connectivity Check Function
async function checkConnectivity() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Connection error:', error);
    return false;
  }
}

// Enhanced error handling function
async function handleResponseError(response) {
  // Clone the response to safely read it multiple times
  const responseClone = response.clone();
  let errorMessage = 'Request failed';

  try {
    const errorData = await responseClone.json();
    errorMessage = errorData.message || errorMessage;
  } catch (jsonError) {
    try {
      const text = await response.text();
      errorMessage = text || errorMessage;
    } catch (textError) {
      console.error('Error reading response text:', textError);
    }
  }
  
  return new Error(`${errorMessage} (Status: ${response.status})`);
}

// Authentication Service
const authService = {
  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // Added for session cookie support
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  async checkSession() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        credentials: 'include'
      });
      
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Session check error:', error);
      return null;
    }
  },
  
  async logout() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
};

// Cart Service
const cartService = {
  async getCart() {
    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        credentials: 'include'
      });
      
      if (!response.ok) return { items: [] };
      return await response.json();
    } catch (error) {
      console.error('Cart error:', error);
      return { items: [] };
    }
  },

  async addToCart(productId, quantity = 1) {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, quantity })
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Cart error:', error);
      throw error;
    }
  },

  async updateCartItem(itemId, quantity) {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity })
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Cart error:', error);
      throw error;
    }
  },

  async removeCartItem(itemId) {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return true;
    } catch (error) {
      console.error('Cart error:', error);
      throw error;
    }
  }
};

// Inquiry Service
const inquiryService = {
  async submitInquiry(inquiryData) {
    try {
      const response = await fetch(`${API_BASE_URL}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // Added for session cookie support
        body: JSON.stringify(inquiryData)
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Inquiry error:', error);
      throw error;
    }
  }
};

// Product Service
const productService = {
  async getProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Product fetch error:', error);
      throw error;
    }
  },

  async searchProducts(query) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  },

  async getProductsByCategory(category) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/category/${encodeURIComponent(category)}`);
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Category error:', error);
      throw error;
    }
  },
  
  async deleteProduct(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Delete product error:', error);
      throw error;
    }
  }
};

// Image Slider Functionality
function initSlider() {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.slider-dot');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  
  if (!slides.length) return;
  
  let currentSlide = 0;
  let slideInterval;
  
  function showSlide(index) {
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    currentSlide = index;
  }
  
  function nextSlide() {
    showSlide((currentSlide + 1) % slides.length);
  }
  
  function prevSlide() {
    showSlide((currentSlide - 1 + slides.length) % slides.length);
  }
  
  function startSlideShow() {
    slideInterval = setInterval(nextSlide, 5000);
  }
  
  function stopSlideShow() {
    clearInterval(slideInterval);
  }
  
  // Event listeners
  prevBtn?.addEventListener('click', () => {
    stopSlideShow();
    prevSlide();
    startSlideShow();
  });
  
  nextBtn?.addEventListener('click', () => {
    stopSlideShow();
    nextSlide();
    startSlideShow();
  });
  
  dots.forEach(dot => {
    dot.addEventListener('click', function() {
      const slideIndex = parseInt(this.dataset.slide);
      stopSlideShow();
      showSlide(slideIndex);
      startSlideShow();
    });
  });
  
  // Start the slideshow
  showSlide(0);
  startSlideShow();
}

// Category Filtering
function initCategoryFilter() {
  const categoryButtons = document.querySelectorAll('.category-btn');
  
  if (!categoryButtons.length) return;
  
  categoryButtons.forEach(button => {
    button.addEventListener('click', async function() {
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.dataset.category;
      
      try {
        const products = category === 'all' 
          ? await productService.getProducts()
          : await productService.getProductsByCategory(category);
        
        renderProducts(products);
      } catch (error) {
        console.error('Category filter error:', error);
        alert('Failed to load products. Please try again.');
      }
    });
  });
}

// Search Functionality
function initSearch() {
  const searchInput = document.getElementById('search-input');
  
  if (!searchInput) return;
  
  let searchTimeout;
  
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.trim();
    
    clearTimeout(searchTimeout);
    
    if (searchTerm.length < 2) {
      loadProducts();
      return;
    }
    
    searchTimeout = setTimeout(async () => {
      try {
        const products = await productService.searchProducts(searchTerm);
        renderProducts(products);
      } catch (error) {
        console.error('Search error:', error);
        alert('Search failed. Please try again.');
      }
    }, 500);
  });
}

// Smooth Scrolling
function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Active nav highlighting
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('nav ul li a');
  
  window.addEventListener('scroll', function() {
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      
      if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
        current = section.getAttribute('id');
      }
    });
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        link.classList.toggle('active', href.substring(1) === current);
      }
    });
  });
}

// Authentication Modal
function initAuthModal() {
  const authModal = document.getElementById('auth-modal');
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const closeModal = document.querySelector('.modal .close-modal');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (!authModal) return;

  // Modal toggle functions
  const openModal = (tab) => {
    authModal.style.display = 'block';
    showTab(tab);
  };

  const closeModalHandler = () => {
    authModal.style.display = 'none';
  };

  const showTab = (tabName) => {
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
  };

  // Event listeners
  loginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('login');
  });

  registerLink?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('register');
  });

  closeModal?.addEventListener('click', closeModalHandler);
  window.addEventListener('click', (e) => e.target === authModal && closeModalHandler());

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  // Form submissions
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;
    
    try {
      const response = await authService.login({ email, password });
      
      closeModalHandler();
      const sessionData = await updateAuthUI();
      
      // Initialize cart if not already initialized
      if (!cartInstance) {
        cartInstance = initCart();
      }
      
      if (cartInstance) {
        await cartInstance.fetchCart();
      }
    } catch (error) {
      console.error('Login error details:', error);
      if (error.message.includes('Network')) {
        alert('Network error. Please check your internet connection.');
      } else {
        alert(error.message || 'Login failed. Please try again.');
      }
    }
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = registerForm.querySelector('input[type="text"]').value;
    const email = registerForm.querySelector('input[type="email"]').value;
    const phone = registerForm.querySelector('input[type="tel"]').value;
    const password = registerForm.querySelector('input[type="password"]').value;
    const confirmPassword = registerForm.querySelectorAll('input[type="password"]')[1].value;

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      await authService.register({ name, email, phone, password });
      alert('Registration successful! Please login.');
      showTab('login');
    } catch (error) {
      alert(error.message || 'Registration failed. Please try again.');
    }
  });
}

// Cart Management
function initCart() {
  if (cartInstance) return cartInstance;
  
  const cartIcon = document.querySelector('.cart-icon');
  const cartSidebar = document.getElementById('cart-sidebar');
  const closeCart = document.querySelector('.close-cart');
  const cartItemsContainer = document.querySelector('.cart-items');
  const cartCount = document.querySelector('.cart-count');
  const cartTotal = document.querySelector('.total-amount');
  const checkoutBtn = document.querySelector('.checkout-btn');

  if (!cartSidebar) return null;

  // Cart toggle functions
  const openCart = () => {
    cartSidebar.classList.add('active');
  };

  const closeCartHandler = () => {
    cartSidebar.classList.remove('active');
  };

  // Event listeners
  cartIcon?.addEventListener('click', openCart);
  closeCart?.addEventListener('click', closeCartHandler);

  // Fetch and display cart
  async function fetchCart() {
    try {
      const cartData = await cartService.getCart();
      updateCartUI(cartData);
      return cartData;
    } catch (error) {
      console.error('Cart fetch error:', error);
      updateCartUI({ items: [] });
      return { items: [] };
    }
  }

  // Update cart UI
  function updateCartUI(cart) {
    const items = cart.items || [];
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    if (cartCount) cartCount.textContent = totalItems;
    
    if (cartItemsContainer) {
      cartItemsContainer.innerHTML = '';
      
      if (items.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        if (cartTotal) cartTotal.textContent = 'Ksh 0';
        return;
      }
      
      let total = 0;
      
      items.forEach(item => {
        const itemTotal = item.product.price * item.quantity;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
          <div class="cart-item-img">
            <i class="${getProductIcon(item.product.category)}"></i>
          </div>
          <div class="cart-item-details">
            <div class="cart-item-title">${item.product.name}</div>
            <div class="cart-item-price">Ksh ${item.product.price.toLocaleString()} × ${item.quantity}</div>
          </div>
          <div class="cart-item-actions">
            <button class="decrease-quantity" data-id="${item._id}">-</button>
            <span class="cart-item-quantity">${item.quantity}</span>
            <button class="increase-quantity" data-id="${item._id}">+</button>
            <button class="remove-item" data-id="${item._id}"><i class="fas fa-trash"></i></button>
          </div>
        `;
        
        cartItemsContainer.appendChild(cartItem);
        
        // Add event listeners
        cartItem.querySelector('.decrease-quantity').addEventListener('click', async () => {
          await updateQuantity(item._id, item.quantity - 1);
        });
        
        cartItem.querySelector('.increase-quantity').addEventListener('click', async () => {
          await updateQuantity(item._id, item.quantity + 1);
        });
        
        cartItem.querySelector('.remove-item').addEventListener('click', async () => {
          await removeItem(item._id);
        });
      });
      
      if (cartTotal) cartTotal.textContent = `Ksh ${total.toLocaleString()}`;
    }
  }

  // Update cart item quantity
  async function updateQuantity(itemId, quantity) {
    try {
      if (quantity < 1) {
        await removeItem(itemId);
        return;
      }
      
      await cartService.updateCartItem(itemId, quantity);
      await fetchCart();
    } catch (error) {
      console.error('Cart update error:', error);
      alert(error.message || 'Failed to update item quantity');
    }
  }

  // Remove cart item
  async function removeItem(itemId) {
    try {
      await cartService.removeCartItem(itemId);
      await fetchCart();
    } catch (error) {
      console.error('Cart remove error:', error);
      alert(error.message || 'Failed to remove item');
    }
  }

  // Checkout process
  checkoutBtn?.addEventListener('click', async () => {
    try {
      const cart = await fetchCart();
      if (cart.items.length === 0) {
        alert('Your cart is empty');
        return;
      }
      
      alert('Proceeding to checkout - this would connect to payment gateway');
      await fetchCart();
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed. Please try again.');
    }
  });

  // Add to cart function
  async function addToCart(productId) {
    try {
      await cartService.addToCart(productId);
      await fetchCart();
      openCart();
    } catch (error) {
      console.error('Add to cart error:', error);
      
      if (error.message.includes('Authentication')) {
        document.getElementById('login-link')?.click();
        alert('Please login to add items to your cart');
      } else {
        alert(error.message || 'Failed to add to cart');
      }
    }
  }

  // Initialize cart
  fetchCart();

  // Return public methods
  cartInstance = {
    addToCart,
    fetchCart
  };
  return cartInstance;
}

// Toggle new category input visibility
function toggleNewCategoryInput() {
  const categorySelect = document.getElementById('product-category');
  const newCategoryInput = document.getElementById('new-category-input');
  
  if (categorySelect.value === 'new') {
    newCategoryInput.style.display = 'block';
    newCategoryInput.required = true;
  } else {
    newCategoryInput.style.display = 'none';
    newCategoryInput.required = false;
  }
}

// Product Rendering with Category Display
function renderProducts(products) {
  const productGrid = document.querySelector('.product-grid');
  if (!productGrid) return;

  productGrid.innerHTML = '';

  if (!products || !products.length) {
    productGrid.innerHTML = '<p class="no-products">No products available at this time</p>';
    return;
  }

  const IMAGE_BASE_URL = API_BASE_URL.replace('/api', ''); // http://127.0.0.1:5000

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.category = product.category;
    card.dataset.id = product._id;

    // Proper image URL handling
    let imageHTML = '';
    if (product.image) {
      imageHTML = `<img src="${IMAGE_BASE_URL}${product.image}" alt="${product.name}">`;
    } else {
      imageHTML = `<div class="product-icon"><i class="${getProductIcon(product.category)}"></i></div>`;
    }

    card.innerHTML = `
      <div class="product-img">
        ${imageHTML}
      </div>
      <div class="product-content">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <span class="product-category">${product.category}</span>
        <span>Ksh ${product.price.toLocaleString()}</span>
        <div class="button-group">
          <button class="inquire-btn">Inquire</button>
          <button class="add-to-cart-btn">Add to Cart</button>
        </div>
      </div>
    `;

    // Add event listeners
    card.querySelector('.inquire-btn').addEventListener('click', () => inquire(product.name));
    card.querySelector('.add-to-cart-btn').addEventListener('click', () => {
      if (cartInstance) {
        cartInstance.addToCart(product._id);
      }
    });
    
    productGrid.appendChild(card);
  });
}

// Load Products Function
async function loadProducts() {
  const productGrid = document.querySelector('.product-grid');
  if (!productGrid) return;

  try {
    productGrid.innerHTML = '<div class="loading">Loading products...</div>';
    const products = await productService.getProducts();
    renderProducts(products);
  } catch (error) {
    console.error('Product load error:', error);
    productGrid.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Products Unavailable</h3>
        <p>We're having trouble loading products. Please try again later.</p>
        <button onclick="loadProducts()">Retry</button>
      </div>
    `;
  }
}

// Helper Functions
function getProductIcon(category) {
  const icons = {
    'laptops': 'fas fa-laptop',
    'desktops': 'fas fa-desktop',
    'monitors': 'fas fa-tv',
    'accessories': 'fas fa-mouse',
    'storage': 'fas fa-hdd',
    'printers': 'fas fa-print',
    'ram': 'fas fa-memory'
  };
  return icons[category] || 'fas fa-box';
}

// Inquire Functionality
function inquire(productName) {
  const modal = document.createElement('div');
  modal.className = 'inquiry-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h3>Inquire about ${productName}</h3>
      <form id="inquiry-form">
        <input type="text" placeholder="Your Name" required>
        <input type="email" placeholder="Your Email" required>
        <input type="tel" placeholder="Your Phone">
        <textarea placeholder="Your Message" required></textarea>
        <button type="submit">Submit Inquiry</button>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.close-modal').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  const form = modal.querySelector('#inquiry-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      name: form.querySelector('input[type="text"]').value,
      email: form.querySelector('input[type="email"]').value,
      phone: form.querySelector('input[type="tel"]').value || '',
      message: form.querySelector('textarea').value,
      product: productName
    };
    
    try {
      await inquiryService.submitInquiry(formData);
      alert('Thank you for your inquiry! We will contact you shortly.');
      document.body.removeChild(modal);
    } catch (error) {
      alert(error.message || 'Failed to submit inquiry');
    }
  });
}

// Authentication UI Management
async function updateAuthUI() {
  try {
    const sessionData = await authService.checkSession();
    const authLinks = document.querySelector('.top-bar-user .auth-links');
    const userProfile = document.querySelector('.top-bar-user .user-profile');
    
    if (authLinks && userProfile) {
      if (sessionData?.user) {
        authLinks.style.display = 'none';
        userProfile.style.display = 'flex';
        const userName = sessionData.user.name || 'User';
        userProfile.querySelector('span').textContent = `Welcome, ${userName}`;
      } else {
        authLinks.style.display = 'flex';
        userProfile.style.display = 'none';
      }
    }
    return sessionData;
  } catch (error) {
    console.error('Auth UI update error:', error);
    return null;
  }
}

// Logout Functionality
function initLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;
  
  logoutBtn.addEventListener('click', async () => {
    try {
      await authService.logout();
      await updateAuthUI();
      if (cartInstance) {
        await cartInstance.fetchCart();
      }
      alert('You have been logged out');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Logout failed. Please try again.');
    }
  });
}

// Admin Panel
async function initAdminPanel() {
  try {
    const sessionData = await authService.checkSession();
    const adminSection = document.getElementById('admin');
    if (adminSection && sessionData?.user?.role === 'admin') {
      adminSection.style.display = 'block';
      renderAdminProducts();
    }
  } catch (error) {
    console.error('Admin panel init error:', error);
  }
}

// Render products in admin panel
async function renderAdminProducts() {
  const container = document.querySelector('.products-list-container');
  if (!container) return;

  try {
    container.innerHTML = '<div class="loading">Loading products...</div>';
    const products = await productService.getProducts();
    
    if (!products.length) {
      container.innerHTML = '<p>No products found</p>';
      return;
    }
    
    container.innerHTML = '';
    
    products.forEach(product => {
      const item = document.createElement('div');
      item.className = 'admin-product-item';
      item.dataset.id = product._id;
      
      item.innerHTML = `
        <div class="admin-product-info">
          <strong>${product.name}</strong>
          <div>${product.category} | Ksh ${product.price.toLocaleString()}</div>
        </div>
        <div class="admin-product-actions">
          <button class="delete-product-btn">Delete</button>
        </div>
      `;
      
      container.appendChild(item);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const productId = this.closest('.admin-product-item').dataset.id;
        if (confirm('Are you sure you want to delete this product?')) {
          try {
            await productService.deleteProduct(productId);
            this.closest('.admin-product-item').remove();
            loadProducts(); // Refresh main product list
            alert('Product deleted successfully');
          } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete product: ' + error.message);
          }
        }
      });
    });
    
  } catch (error) {
    console.error('Admin products load error:', error);
    container.innerHTML = `<div class="error">Error loading products: ${error.message}</div>`;
  }
}

// Product Form with Category Management
function initProductForm() {
  const form = document.getElementById('add-product-form');
  if (!form) return;
  
  // Add event listener for category change
  const categorySelect = document.getElementById('product-category');
  categorySelect.addEventListener('change', toggleNewCategoryInput);
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const categoryValue = formData.get('category');
    
    // Handle new category
    if (categoryValue === 'new') {
      const newCategory = formData.get('newCategory').trim().toLowerCase();
      if (!newCategory) {
        alert('Please enter a new category name');
        return;
      }
      formData.set('category', newCategory);
    }
    
    formData.delete('newCategory'); // Remove the temporary field
    
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add product');
      }
      
      alert('Product added successfully!');
      form.reset();
      
      // Clear image preview and reset category
      const imagePreview = document.getElementById('image-preview');
      if (imagePreview) imagePreview.innerHTML = '';
      toggleNewCategoryInput(); // Reset category UI
      
      // Reload products
      loadProducts();
      renderAdminProducts();
    } catch (error) {
      console.error('Product submission error:', error);
      alert(error.message || 'Failed to add product');
    }
  });

  // Image preview functionality
  const imageInput = document.getElementById('product-image');
  const imagePreview = document.getElementById('image-preview');
  
  if (imageInput && imagePreview) {
    imageInput.addEventListener('change', function() {
      imagePreview.innerHTML = '';
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.maxWidth = '200px';
          img.style.maxHeight = '200px';
          imagePreview.appendChild(img);
        }
        reader.readAsDataURL(this.files[0]);
      }
    });
  }

  // Initialize category input state
  toggleNewCategoryInput();
}

// Main Initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Initialize authentication UI first
    const sessionData = await updateAuthUI();
    
    // Initialize all modules
    initSlider();
    initCategoryFilter();
    initSearch();
    initSmoothScrolling();
    initAuthModal();
    
    // Initialize cart BEFORE loading products
    cartInstance = initCart();
    
    // Now load products
    loadProducts();
    
    initLogout();
    
    // Initialize admin panel if user is admin
    if (sessionData?.user?.role === 'admin') {
      initAdminPanel();
      initProductForm();
    }
    
    // Add event delegation for static product cards
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('add-to-cart-btn') && cartInstance) {
        const productCard = e.target.closest('.product-card');
        if (productCard) {
          const productId = productCard.dataset.id;
          if (productId) {
            cartInstance.addToCart(productId);
          }
        }
      }
    });
  } catch (error) {
    console.error('Initialization error:', error);
  }
  
});