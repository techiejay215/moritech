console.log("🟢 Loaded optimized script.js (Performance + Security + Mobile Fix)");
const API_BASE_URL = 'https://moritech.onrender.com/api';
let cartInstance = null;
let adminProducts = [];
let adminPanelInitialized = false;
let refreshingToken = null;

// ========================
// UTILITY FUNCTIONS
// ========================
function getAuthHeaders(contentType = 'application/json') {
  const headers = { 'Content-Type': contentType };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponseError(response) {
  const errorMessage = await response.text().catch(() => `Request failed with status ${response.status}`);
  console.error(`API Error: ${response.status} - ${errorMessage}`);
  
  if (response.status === 401) {
    try {
      await authService.refreshToken();
      return;
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      await updateAuthUI();
    }
  }
  
  throw new Error(`${errorMessage} (Status: ${response.status})`);
}

function getProductIcon(category) {
  const icons = {
    laptops: 'fas fa-laptop',
    desktops: 'fas fa-desktop',
    monitors: 'fas fa-tv',
    accessories: 'fas fa-keyboard',
    storage: 'fas fa-hdd',
    printers: 'fas fa-print',
    ram: 'fas fa-memory'
  };
  return icons[category] || 'fas fa-microchip';
}

// ========================
// API SERVICES
// ========================
const authService = {
  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
        credentials: 'include'
      });

      if (!response.ok) throw await handleResponseError(response);
      
      const { user, token } = await response.json();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(credentials),
        credentials: 'include'
      });

      if (!response.ok) throw await handleResponseError(response);

      const { user, token } = await response.json();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      throw new Error(/Android|iPhone|iPad/i.test(navigator.userAgent) 
        ? 'Network error. Please check your connection.'
        : error.message || 'Login failed');
    }
  },

  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email })
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  },

  async checkSession() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
      
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Session check error:', error);
      return null;
    }
  },

  async logout() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  async refreshToken() {
    if (refreshingToken) return refreshingToken;
    
    try {
      refreshingToken = new Promise(async (resolve, reject) => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
          });
          
          if (!response.ok) throw new Error('Token refresh failed');
          
          const { token } = await response.json();
          localStorage.setItem('token', token);
          resolve(token);
        } catch (error) {
          reject(error);
        } finally {
          refreshingToken = null;
        }
      });
      
      return await refreshingToken;
    } catch (error) {
      refreshingToken = null;
      throw error;
    }
  }
};

const cartService = {
  async getCart() {
    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return { items: [] };
      }

      if (!response.ok) return { items: [] };
      return await response.json();
    } catch {
      return { items: [] };
    }
  },
  
  async addToCart(productId, quantity = 1) {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/items`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId, quantity }),
        credentials: 'include'
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
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity }),
        credentials: 'include'
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
        headers: getAuthHeaders(),
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

const inquiryService = {
  async submitInquiry(inquiryData) {
    try {
      const response = await fetch(`${API_BASE_URL}/inquiries`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(inquiryData),
        credentials: 'include'
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Inquiry error:', error);
      throw error;
    }
  }
};

const productService = {
  async getProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Product fetch error:', error);
      throw error;
    }
  },

  async searchProducts(query) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/search?query=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  },

  async getProductsByCategory(category) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/category/${encodeURIComponent(category)}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
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
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return true;
    } catch (error) {
      console.error('Delete product error:', error);
      throw error;
    }
  }
};

const offerService = {
  async getOffers() {
    try {
      const response = await fetch(`${API_BASE_URL}/offers`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load offers');
      return await response.json();
    } catch (error) {
      console.error('Offer load error:', error);
      return [];
    }
  },

  async addOffer(offerData) {
    try {
      const formData = new FormData();
      for (const key in offerData) {
        formData.append(key, offerData[key]);
      }
      
      const response = await fetch(`${API_BASE_URL}/offers`, {
        method: 'POST',
        headers: getAuthHeaders('multipart/form-data'),
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Add offer error:', error);
      throw error;
    }
  },

  async deleteOffer(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/offers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      
      if (!response.ok) throw await handleResponseError(response);
      return true;
    } catch (error) {
      console.error('Delete offer error:', error);
      throw error;
    }
  }
};

// ========================
// UI COMPONENTS
// ========================
async function updateAuthUI() {
  try {
    const sessionData = await authService.checkSession();
    const user = sessionData?.user || null;
    
    // Update desktop UI
    const authLinks = document.querySelector('.top-bar-user .auth-links');
    const userProfile = document.querySelector('.top-bar-user .user-profile');
    if (user) {
      if (authLinks) authLinks.style.display = 'none';
      if (userProfile) {
        userProfile.style.display = 'flex';
        userProfile.querySelector('span').textContent = `Welcome, ${user.name || user.email.split('@')[0]}`;
      }
    } else {
      if (authLinks) authLinks.style.display = 'flex';
      if (userProfile) userProfile.style.display = 'none';
    }
    
    // Update mobile UI
    const mobileUserProfile = document.querySelector('.mobile-nav .mobile-user-profile');
    const mobileHeaderProfile = document.querySelector('.mobile-header .mobile-user-profile');
    if (user) {
      if (mobileUserProfile) {
        mobileUserProfile.style.display = 'block';
        document.getElementById('mobile-welcome').textContent = `Welcome, ${user.name || user.email.split('@')[0]}`;
      }
      if (mobileHeaderProfile) {
        mobileHeaderProfile.style.display = 'flex';
        document.getElementById('mobile-welcome-header').textContent = `Welcome, ${user.name || user.email.split('@')[0]}`;
      }
    } else {
      if (mobileUserProfile) mobileUserProfile.style.display = 'none';
      if (mobileHeaderProfile) mobileHeaderProfile.style.display = 'none';
    }
    
    return user;
  } catch (error) {
    console.error('Auth UI update error:', error);
    return null;
  }
}

function renderProducts(products) {
  const productGrid = document.querySelector('.product-grid');
  if (!productGrid) return;

  productGrid.innerHTML = products?.length 
    ? products.map(product => `
        <div class="product-card" data-id="${product._id}">
          <div class="product-img" onclick="showProductDetails('${product._id}')">
            ${product.image 
              ? `<img src="${product.image}" alt="${product.name}">` 
              : `<div class="product-icon"><i class="${getProductIcon(product.category)}"></i></div>`}
          </div>
          <div class="product-content">
            <p onclick="showProductDetails('${product._id}')">${product.description}</p>
            <span class="price" onclick="showProductDetails('${product._id}')">Ksh ${product.price.toLocaleString()}</span>
            <div class="button-group">
              <button class="inquire-btn" onclick="inquire('${product.name}')">Inquire</button>
              <button class="add-to-cart-btn" onclick="cartInstance?.addToCart('${product._id}')">Add to Cart</button>
            </div>
          </div>
        </div>
      `).join('')
    : '<p class="no-products">No products available</p>';
}

async function showProductDetails(productId) {
  try {
    const productDetailsSection = document.getElementById('product-details');
    const productDetailsContainer = productDetailsSection.querySelector('.product-details-container');
    productDetailsSection.style.display = 'block';
    productDetailsContainer.innerHTML = '<div class="loading">Loading product details...</div>';

    // Hide other sections
    document.querySelectorAll('section').forEach(section => {
      if (section.id !== 'product-details') section.style.display = 'none';
    });

    // Fetch product details
    const response = await fetch(`${API_BASE_URL}/products/${productId}`, { 
      headers: getAuthHeaders(),
      credentials: 'include' 
    });
    
    if (!response.ok) throw await handleResponseError(response);
    const product = await response.json();

    // Render product details
    productDetailsContainer.innerHTML = `
      <div class="product-gallery">
        <div class="main-image">
          <img id="main-product-image" src="${product.image || 'https://via.placeholder.com/500?text=Product+Image'}" alt="${product.name}">
        </div>
        <div class="thumbnail-container">
          ${product.image 
            ? `<div class="thumbnail active"><img src="${product.image}" alt="${product.name} thumbnail"></div>` 
            : ''}
        </div>
      </div>
      <div class="product-info">
        <h2 id="product-detail-name">${product.name}</h2>
        <div class="price-category">
          <span id="product-detail-price" class="price">Ksh ${product.price.toLocaleString()}</span>
          <span id="product-detail-category" class="category">${product.category}</span>
        </div>
        <p id="product-detail-description" class="description">${product.description}</p>
        <div class="action-buttons">
          <button id="add-to-cart-detail" class="btn cart-btn">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
          <a id="whatsapp-order" class="btn whatsapp-btn" 
             href="https://wa.me/254719362202?text=${encodeURIComponent(`Hi, I'm interested in ${product.name} (Ksh ${product.price.toLocaleString()}). Product ID: ${product._id}`)}" 
             target="_blank">
            <i class="fab fa-whatsapp"></i> Order on WhatsApp
          </a>
        </div>
      </div>
    `;

    // Setup add to cart button
    document.getElementById('add-to-cart-detail').addEventListener('click', () => {
      cartInstance?.addToCart(product._id);
      alert(`${product.name} added to cart!`);
    });
    
  } catch (error) {
    document.getElementById('product-details').innerHTML = `
      <div class="error-message">
        <h3>Error Loading Product</h3>
        <p>${error.message || 'Could not load product details'}</p>
        <button onclick="location.reload()">Go Back</button>
      </div>
    `;
  }
}

function initCart() {
  if (cartInstance) return cartInstance;
  
  const cartSidebar = document.getElementById('cart-sidebar');
  if (!cartSidebar) return null;

  const openCart = () => {
    cartSidebar.classList.add('active');
    document.querySelector('.cart-overlay').style.display = 'block';
  };

  const closeCartHandler = () => {
    cartSidebar.classList.remove('active');
    document.querySelector('.cart-overlay').style.display = 'none';
  };

  async function updateCartUI(cart) {
    const items = cart.items || [];
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    
    // Update cart counts
    document.querySelectorAll('.cart-count, .mobile-cart-count').forEach(el => {
      el.textContent = totalItems;
    });
    
    const cartItemsContainer = document.querySelector('.cart-items');
    if (!cartItemsContainer) return;
    
    cartItemsContainer.innerHTML = items.length 
      ? items.map(item => {
          const itemTotal = item.product.price * item.quantity;
          return `
            <div class="cart-item">
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
            </div>
          `;
        }).join('')
      : '<p class="empty-cart">Your cart is empty</p>';
    
    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    document.querySelector('.total-amount').textContent = `Ksh ${total.toLocaleString()}`;
    
    // Add event listeners
    items.forEach(item => {
      document.querySelector(`.decrease-quantity[data-id="${item._id}"]`).addEventListener('click', async () => {
        await cartService.updateCartItem(item._id, item.quantity - 1);
        await fetchCart();
      });
      
      document.querySelector(`.increase-quantity[data-id="${item._id}"]`).addEventListener('click', async () => {
        await cartService.updateCartItem(item._id, item.quantity + 1);
        await fetchCart();
      });
      
      document.querySelector(`.remove-item[data-id="${item._id}"]`).addEventListener('click', async () => {
        await cartService.removeCartItem(item._id);
        await fetchCart();
      });
    });
  }

  async function fetchCart() {
    try {
      const cartData = await cartService.getCart();
      updateCartUI(cartData);
      return cartData;
    } catch {
      updateCartUI({ items: [] });
      return { items: [] };
    }
  }

  // Add to cart function
  async function addToCart(productId) {
    try {
      if (!localStorage.getItem('token')) {
        document.getElementById('login-link')?.click();
        alert('Please login to add items to your cart');
        return;
      }
      
      await cartService.addToCart(productId);
      await fetchCart();
      openCart();
    } catch (error) {
      alert(error.message || 'Failed to add to cart');
    }
  }

  // Initialize cart UI
  fetchCart();
  
  // Setup event listeners
  document.querySelector('.cart-icon')?.addEventListener('click', openCart);
  document.querySelector('.close-cart')?.addEventListener('click', closeCartHandler);
  document.querySelector('.cart-overlay')?.addEventListener('click', closeCartHandler);
  document.querySelector('.checkout-btn')?.addEventListener('click', () => {
    alert('Proceeding to checkout');
    closeCartHandler();
  });

  cartInstance = { addToCart, fetchCart, openCart };
  return cartInstance;
}

// ========================
// INITIALIZATION FUNCTIONS
// ========================
async function loadProducts() {
  try {
    const products = await productService.getProducts();
    renderProducts(products);
  } catch (error) {
    const productGrid = document.querySelector('.product-grid');
    if (productGrid) {
      productGrid.innerHTML = `
        <div class="error">
          <p>Failed to load products. Please try again later.</p>
          <button onclick="loadProducts()">Retry</button>
        </div>
      `;
    }
  }
}

function initAuthModal() {
  const authModal = document.getElementById('auth-modal');
  if (!authModal) return;

  const openModal = (tab) => {
    authModal.style.display = 'block';
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  };

  const closeModalHandler = () => {
    authModal.style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('resetPasswordForm').style.display = 'none';
  };

  // Login Form
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.elements.email.value;
    const password = e.target.elements.password.value;
    
    try {
      const user = await authService.login({ email, password });
      closeModalHandler();
      const updatedUser = await updateAuthUI();
      
      if (updatedUser?.role === 'admin') {
        await initAdminPanel();
        initProductForm();
      }
      
      if (!cartInstance) cartInstance = initCart();
      await cartInstance.fetchCart();
    } catch (error) {
      alert(error.message || 'Login failed. Please try again.');
    }
  });

  // Registration Form
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.elements.name.value;
    const email = e.target.elements.email.value;
    const phone = e.target.elements.phone.value;
    const password = e.target.elements.password.value;
    const confirmPassword = e.target.elements.confirmPassword.value;

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const user = await authService.register({ name, email, phone, password });
      alert('Registration successful! You are now logged in.');
      closeModalHandler();
      await updateAuthUI();
      
      if (user?.role === 'admin') {
        await initAdminPanel();
        initProductForm();
      }
    } catch (error) {
      alert(error.message || 'Registration failed. Please try again.');
    }
  });

  // Password Reset
  document.getElementById('resetPasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.elements.email.value;
    
    try {
      await authService.requestPasswordReset(email);
      alert('Password reset link sent! Check your email.');
      e.target.reset();
      document.getElementById('login-form').style.display = 'block';
      e.target.style.display = 'none';
    } catch (error) {
      alert(error.message || 'Failed to send reset link');
    }
  });

  // Event listeners
  document.getElementById('login-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('login');
  });

  document.getElementById('register-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('register');
  });

  document.querySelector('.close-modal')?.addEventListener('click', closeModalHandler);
  document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('resetPasswordForm').style.display = 'block';
  });

  document.getElementById('backToLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('resetPasswordForm').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
  });
}

function initLogout() {
  const logoutHandler = async () => {
    try {
      await authService.logout();
      await updateAuthUI();
      if (cartInstance) await cartInstance.fetchCart();
      alert('You have been logged out');
    } catch {
      alert('Logout failed. Please try again.');
    }
  };

  document.getElementById('logout-btn')?.addEventListener('click', logoutHandler);
  document.getElementById('mobile-logout-btn')?.addEventListener('click', logoutHandler);
  document.getElementById('mobile-logout-header')?.addEventListener('click', logoutHandler);
}

function initMobileMenu() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileNavClose = document.querySelector('.mobile-nav-close');

  mobileMenuToggle?.addEventListener('click', () => {
    mobileNav.classList.add('active');
  });

  mobileNavClose?.addEventListener('click', () => {
    mobileNav.classList.remove('active');
  });
}

function initCategoryFilter() {
  document.querySelectorAll('.category-btn').forEach(button => {
    button.addEventListener('click', async function() {
      document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.dataset.category;
      try {
        const products = category === 'all' 
          ? await productService.getProducts()
          : await productService.getProductsByCategory(category);
        renderProducts(products);
      } catch {
        alert('Failed to load products. Please try again.');
      }
    });
  });
}

function initSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;
  
  let searchTimeout;
  
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const searchTerm = this.value.trim();
    
    if (searchTerm.length < 2) {
      loadProducts();
      return;
    }
    
    searchTimeout = setTimeout(async () => {
      try {
        const products = await productService.searchProducts(searchTerm);
        renderProducts(products);
      } catch {
        alert('Search failed. Please try again.');
      }
    }, 500);
  });
}

async function initAdminPanel() {
  try {
    const user = await updateAuthUI();
    const adminSection = document.getElementById('admin');
    
    if (adminSection && user?.role === 'admin') {
      adminSection.style.display = 'block';
      adminProducts = await productService.getProducts();
      renderAdminProducts(adminProducts);
      adminPanelInitialized = true;
    }
  } catch (error) {
    console.error('Admin panel init error:', error);
  }
}

function renderAdminProducts(products) {
  const container = document.querySelector('.products-list-container');
  if (!container) return;
  
  container.innerHTML = products?.length 
    ? products.map(product => `
        <div class="admin-product-item" data-id="${product._id}">
          <div class="admin-product-info">
            <strong>${product.name}</strong>
            <div>${product.category} | Ksh ${product.price.toLocaleString()}</div>
          </div>
          <div class="admin-product-actions">
            <button class="delete-product-btn">Delete</button>
          </div>
        </div>
      `).join('')
    : '<p>No products found</p>';
  
  // Add delete event listeners
  document.querySelectorAll('.delete-product-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const productId = this.closest('.admin-product-item').dataset.id;
      if (confirm('Delete this product?')) {
        try {
          await productService.deleteProduct(productId);
          adminProducts = adminProducts.filter(p => p._id !== productId);
          renderAdminProducts(adminProducts);
          loadProducts();
        } catch {
          alert('Failed to delete product');
        }
      }
    });
  });
}

function initProductForm() {
  const form = document.getElementById('add-product-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Handle category
    let category = document.getElementById('product-category').value;
    if (category === 'new') {
      category = document.getElementById('new-category-input').value.trim();
      if (!category) {
        alert('Please enter a new category name');
        return;
      }
    }
    
    // Create product data object
    const productData = {
      name: document.getElementById('product-name').value,
      description: document.getElementById('product-description').value,
      price: parseFloat(document.getElementById('product-price').value),
      category: category
    };

    try {
      await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(productData),
        credentials: 'include'
      });

      alert('Product added successfully!');
      form.reset();
      document.getElementById('image-preview').innerHTML = '';
      loadProducts();
      
      if (adminPanelInitialized) {
        adminProducts = await productService.getProducts();
        renderAdminProducts(adminProducts);
      }
    } catch (error) {
      alert(error.message || 'Failed to add product');
    }
  });
}

// ========================
// MAIN INITIALIZATION
// ========================
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Initialize core functionality
    await updateAuthUI();
    cartInstance = initCart();
    await loadProducts();
    
    // Initialize UI components
    initAuthModal();
    initLogout();
    initMobileMenu();
    initCategoryFilter();
    initSearch();
    
    // Setup back button
    document.getElementById('back-to-products')?.addEventListener('click', () => {
      document.getElementById('product-details').style.display = 'none';
      document.getElementById('products').style.display = 'block';
    });
    
    // Mobile cart button
    document.getElementById('mobile-cart-btn')?.addEventListener('click', () => {
      cartInstance?.openCart();
    });
    
    // Initialize admin panel if admin
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.role === 'admin') {
      await initAdminPanel();
      initProductForm();
    }
    
  } catch (error) {
    console.error('Initialization error:', error);
    alert(`Initialization failed: ${error.message}`);
  }
});