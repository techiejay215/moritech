let adminProducts = []; // Store products for client-side filtering
console.log("🟢 Loaded updated script.js (Mobile Fix + Admin Panel + Cloudinary)");
const API_BASE_URL = 'https://moritech.onrender.com/api';
let cartInstance = null;
let adminPanelInitialized = false;
let refreshingToken = null; // For handling concurrent refresh requests

function getAuthHeaders(contentType = 'application/json') {
  const headers = {
    'Content-Type': contentType
  };
  
  // Add JWT token to headers if available
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

async function handleResponseError(response) {
  const responseClone = response.clone();
  let errorMessage = 'Request failed';

  try {
    const errorData = await responseClone.json();
    errorMessage = errorData.message || errorMessage;
  } catch {
    try {
      errorMessage = await response.text() || errorMessage;
    } catch {
      errorMessage = `Request failed with status ${response.status}`;
    }
  }

  // Handle token expiration - don't remove tokens for all 401 errors
  if (response.status === 401) {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Attempt token refresh
        const newToken = await authService.refreshToken();
        localStorage.setItem('token', token);
        return; // Return after successful refresh
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }
    
    // Only remove tokens if refresh fails
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    await updateAuthUI();
  }

  throw new Error(`${errorMessage} (Status: ${response.status})`);
}

async function checkConnectivity() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { credentials: 'include' });
    return response.ok;
  } catch (error) {
    console.error('Connection error:', error);
    return false;
  }
}

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
      // Enhanced mobile error detection
      if (error.message.includes('Failed to fetch')) {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          throw new Error('Network error. Please check your mobile connection and try again.');
        }
      }
      throw error;
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
        method: 'GET',
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
      // Clear token first
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Call logout API
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
    // If a refresh is already in progress, return that promise
    if (refreshingToken) {
      return refreshingToken;
    }
    
    try {
      refreshingToken = new Promise(async (resolve, reject) => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error('Token refresh failed');
          }
          
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
        method: 'GET',
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

function initSlider() {
  const slides = document.querySelectorAll('.slide');
  if (!slides.length) return;
  
  const dots = document.querySelectorAll('.slider-dot');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  
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
  
  showSlide(0);
  startSlideShow();
}

function initCategoryFilter() {
  const categoryButtons = document.querySelectorAll('.category-btn');
  if (!categoryButtons.length) return;
  
  categoryButtons.forEach(button => {
    button.addEventListener('click', async function() {
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.dataset.category;
      
      if (window.innerWidth <= 768) {
        const productsSection = document.getElementById('products');
        if (productsSection) {
          window.scrollTo({
            top: productsSection.offsetTop - 100,
            behavior: 'smooth'
          });
        }
      }
      
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
      } catch {
        alert('Search failed. Please try again.');
      }
    }, 500);
  });
}

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
  
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('nav ul li a');
  
  window.addEventListener('scroll', function() {
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (pageYOffset >= (sectionTop - 150)) {
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

function initAuthModal() {
  const authModal = document.getElementById('auth-modal');
  if (!authModal) return;

  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const closeModal = document.querySelector('.modal .close-modal');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const backToLogin = document.getElementById('backToLogin');

  const openModal = (tab) => {
    authModal.style.display = 'block';
    showTab(tab);
  };

  const closeModalHandler = () => {
    authModal.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    if (resetPasswordForm) resetPasswordForm.style.display = 'none';
  };

  function showTab(tabName) {
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
  }

  forgotPasswordLink?.addEventListener('click', (e) => {
    e.preventDefault();
    if (loginForm) loginForm.style.display = 'none';
    if (resetPasswordForm) resetPasswordForm.style.display = 'block';
  });

  backToLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    if (resetPasswordForm) resetPasswordForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
  });

  resetPasswordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = resetPasswordForm.querySelector('input[type="email"]').value;
    
    try {
      const messageEl = document.getElementById('reset-message') || document.createElement('div');
      messageEl.id = 'reset-message';
      messageEl.style.marginTop = '10px';
      resetPasswordForm.appendChild(messageEl);
      
      messageEl.textContent = 'Sending reset link...';
      messageEl.style.display = 'block';
      messageEl.style.color = '#333';
      
      await authService.requestPasswordReset(email);
      
      messageEl.textContent = 'Password reset link sent! Check your email.';
      messageEl.style.color = 'green';
      
      setTimeout(() => {
        resetPasswordForm.reset();
        messageEl.style.display = 'none';
        if (resetPasswordForm) resetPasswordForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';
      }, 3000);
    } catch (error) {
      const messageEl = document.getElementById('reset-message');
      messageEl.textContent = error.message || 'Failed to send reset link';
      messageEl.style.color = 'red';
      messageEl.style.display = 'block';
    }
  });

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

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;
    
    try {
      const user = await authService.login({ email, password });
      closeModalHandler();
      const updatedUser = await updateAuthUI();
      
      // Add this check for admin role
      if (updatedUser?.role === 'admin') {
        await initAdminPanel();
        initProductForm();
      }
      
      // Initialize cart
      if (!cartInstance) {
        cartInstance = initCart();
      }
      await cartInstance.fetchCart();
    } catch (error) {
      console.error('Login error:', error);
      alert(error.message || 'Login failed. Please try again.');
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
      const user = await authService.register({ name, email, phone, password });
      alert('Registration successful! You are now logged in.');
      closeModalHandler();
      const updatedUser = await updateAuthUI();
      
      // Initialize admin panel if user is admin
      if (updatedUser?.role === 'admin') {
        await initAdminPanel();
        initProductForm();
      }
    } catch (error) {
      alert(error.message || 'Registration failed. Please try again.');
    }
  });
}

function initCart() {
  if (cartInstance) return cartInstance;
  
  const cartIcon = document.querySelector('.cart-icon');
  const cartSidebar = document.getElementById('cart-sidebar');
  if (!cartSidebar) return null;

  const closeCart = document.querySelector('.close-cart');
  const cartItemsContainer = document.querySelector('.cart-items');
  const cartCount = document.querySelector('.cart-count');
  const cartTotal = document.querySelector('.total-amount');
  const checkoutBtn = document.querySelector('.checkout-btn');
  const cartOverlay = document.createElement('div');
  cartOverlay.className = 'cart-overlay';
  document.body.appendChild(cartOverlay);

  const openCart = () => {
    cartSidebar.classList.add('active');
    cartOverlay.style.display = 'block';
  };

  const closeCartHandler = () => {
    cartSidebar.classList.remove('active');
    cartOverlay.style.display = 'none';
  };

  cartOverlay.addEventListener('click', closeCartHandler);
  cartIcon?.addEventListener('click', openCart);
  closeCart?.addEventListener('click', closeCartHandler);

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

  function updateCartUI(cart) {
    const items = cart.items || [];
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    
    // Update both desktop and mobile cart counts
    document.querySelectorAll('.cart-count, .mobile-cart-count').forEach(el => {
      el.textContent = totalItems;
    });
    
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

  async function updateQuantity(itemId, quantity) {
    try {
      if (quantity < 1) {
        await removeItem(itemId);
        return;
      }
      
      await cartService.updateCartItem(itemId, quantity);
      await fetchCart();
    } catch (error) {
      alert(error.message || 'Failed to update item quantity');
    }
  }

  async function removeItem(itemId) {
    try {
      await cartService.removeCartItem(itemId);
      await fetchCart();
    } catch (error) {
      alert(error.message || 'Failed to remove item');
    }
  }

  checkoutBtn?.addEventListener('click', async () => {
    try {
      const cart = await fetchCart();
      if (cart.items.length === 0) {
        alert('Your cart is empty');
        return;
      }
      
      alert('Proceeding to checkout');
      await fetchCart();
    } catch {
      alert('Checkout failed. Please try again.');
    }
  });

  async function addToCart(productId) {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
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

  fetchCart();

  cartInstance = {
    addToCart,
    fetchCart,
    openCart
  };
  return cartInstance;
}

function toggleNewCategoryInput() {
  const categorySelect = document.getElementById('product-category');
  const newCategoryInput = document.getElementById('new-category-input');
  
  if (!categorySelect || !newCategoryInput) return;
  
  if (categorySelect.value === 'new') {
    newCategoryInput.style.display = 'block';
    newCategoryInput.required = true;
  } else {
    newCategoryInput.style.display = 'none';
    newCategoryInput.required = false;
  }
}

function renderProducts(products) {
  const productGrid = document.querySelector('.product-grid');
  if (!productGrid) return;

  productGrid.innerHTML = '';

  if (!products || !products.length) {
    productGrid.innerHTML = '<p class="no-products">No products available</p>';
    return;
  }

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.category = product.category;
    card.dataset.id = product._id;

    let imageHTML = '';
    if (product.image) {
      imageHTML = `<img src="${product.image}" alt="${product.name}">`;
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

    card.querySelector('.inquire-btn').addEventListener('click', () => inquire(product.name));
    card.querySelector('.add-to-cart-btn').addEventListener('click', () => {
      cartInstance?.addToCart(product._id);
    });
    
    productGrid.appendChild(card);
  });
}

async function loadProducts() {
  const productGrid = document.querySelector('.product-grid');
  if (!productGrid) return;

  try {
    productGrid.innerHTML = '<div class="loading">Loading products...</div>';
    const products = await productService.getProducts();
    renderProducts(products);
  } catch {
    productGrid.innerHTML = `
      <div class="error-message">
        <h3>Products Unavailable</h3>
        <p>We're having trouble loading products</p>
        <button onclick="loadProducts()">Retry</button>
      </div>
    `;
  }
}

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

async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image loading failed'));
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(
          blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
          'image/jpeg',
          quality
        );
      };
    };
    reader.readAsDataURL(file);
  });
}
async function uploadImageToCloudinary(file) {
  try {
    const formData = new FormData();
    formData.append('image', file); // Key must be 'image'

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: formData, // ✅ FormData handles Content-Type automatically
      credentials: 'include'
    });

    if (!response.ok) throw await handleResponseError(response);
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

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
    } catch {
      alert('Failed to submit inquiry');
    }
  });
}

// Replace updateAuthUI function with this:
async function updateAuthUI() {
  try {
    let user = null;
    
    // Always use session check to get user data
    const sessionData = await authService.checkSession();
    user = sessionData?.user || null;
    
    // Update UI based on authentication status
    const authLinks = document.querySelector('.top-bar-user .auth-links');
    const userProfile = document.querySelector('.top-bar-user .user-profile');
    const mobileUserProfile = document.querySelector('.mobile-user-profile');
    
    if (user) {
      if (authLinks) authLinks.style.display = 'none';
      if (userProfile) {
        userProfile.style.display = 'flex';
        // Use user.name if available, otherwise use email
        const displayName = user.name || user.email.split('@')[0];
        userProfile.querySelector('span').textContent = `Welcome, ${displayName}`;
      }
      if (mobileUserProfile) {
        mobileUserProfile.style.display = 'block';
        const displayName = user.name || user.email.split('@')[0];
        document.getElementById('mobile-welcome').textContent = `Welcome, ${displayName}`;
      }
    } else {
      if (authLinks) authLinks.style.display = 'flex';
      if (userProfile) userProfile.style.display = 'none';
      if (mobileUserProfile) mobileUserProfile.style.display = 'none';
    }
    
    return user;
  } catch (error) {
    console.error('Auth UI update error:', error);
    return null;
  }
}

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
    } catch {
      alert('Logout failed. Please try again.');
    }
  });
}

function initMobileLogout() {
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  if (!mobileLogoutBtn) return;
  
  mobileLogoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await authService.logout();
      await updateAuthUI();
      if (cartInstance) {
        await cartInstance.fetchCart();
      }
      alert('You have been logged out');
    } catch {
      alert('Logout failed. Please try again.');
    }
  });
}

async function initAdminPanel() {
  try {
    const user = await updateAuthUI();
    const adminSection = document.getElementById('admin');
    
    if (adminSection && user?.role === 'admin') {
      adminSection.style.display = 'block';
      
      // Load products and store them
      adminProducts = await productService.getProducts();
      await renderAdminProducts(adminProducts);
      
      // Initialize search functionality
      initAdminSearch();
      
      adminPanelInitialized = true;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Admin panel init error:', error);
    return false;
  }
}
function initAdminSearch() {
  const searchInput = document.getElementById('admin-search-input');
  if (!searchInput) return;
  
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase().trim();
    
    if (!searchTerm) {
      renderAdminProducts(adminProducts);
      return;
    }
    
    const filteredProducts = adminProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) || 
      product.category.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm))
    );
    
    renderAdminProducts(filteredProducts);
  });
}

async function renderAdminProducts(products) {
  const container = document.querySelector('.products-list-container');
  if (!container) return;

  try {
    if (!products || !products.length) {
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
      
      item.querySelector('.delete-product-btn').addEventListener('click', async function() {
        const productId = this.closest('.admin-product-item').dataset.id;
        if (confirm('Delete this product?')) {
          try {
            await productService.deleteProduct(productId);
            // Update local product list
            adminProducts = adminProducts.filter(p => p._id !== productId);
            renderAdminProducts(adminProducts);
            loadProducts();
            alert('Product deleted');
          } catch {
            alert('Failed to delete product');
          }
        }
      });
    });
    
  } catch {
    container.innerHTML = `<div class="error">Error loading products</div>`;
  }
}

function initProductForm() {
  const form = document.getElementById('add-product-form');
  if (!form) return;
  
  const categorySelect = document.getElementById('product-category');
  if (categorySelect) {
    categorySelect.addEventListener('change', toggleNewCategoryInput);
  }
  
  form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const productData = {
    name: document.getElementById('product-name').value,
    description: document.getElementById('product-description').value,
    price: document.getElementById('product-price').value,
  };

  // Handle category
  let category = document.getElementById('product-category').value;
  if (category === 'new') {
    category = document.getElementById('new-category-input').value.trim();
    if (!category) {
      alert('Please enter a new category name');
      return;
    }
  }
  productData.category = category;

  // Handle image upload - only if file exists
  const imageInput = document.getElementById('product-image');
  let imageUrl = '';
  
  if (imageInput.files.length > 0) {
    try {
      const originalFile = imageInput.files[0];
      const compressedFile = await compressImage(originalFile);
      imageUrl = await uploadImageToCloudinary(compressedFile);
    } catch (error) {
      alert('Error uploading image: ' + error.message);
      return;
    }
  } else {
    // Use default icon if no image selected
    imageUrl = ''; 
  }

  // Only add image property if we have a URL
  if (imageUrl) {
    productData.image = imageUrl;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
      credentials: 'include'
    });

    if (!response.ok) throw await handleResponseError(response);
    
    alert('Product added successfully!');
    form.reset();
    
    // Reset image preview
    const imagePreview = document.getElementById('image-preview');
    if (imagePreview) imagePreview.innerHTML = '';
    
    toggleNewCategoryInput();
    loadProducts();
    
    if (adminPanelInitialized) {
  adminProducts = await productService.getProducts();
  renderAdminProducts(adminProducts);
}
  } catch (error) {
    alert(error.message || 'Failed to add product');
  }
});
  const imageInput = document.getElementById('product-image');
  const imagePreview = document.getElementById('image-preview');
  
  if (imageInput && imagePreview) {
    imageInput.addEventListener('change', function() {
      imagePreview.innerHTML = '';
      
      if (this.files && this.files[0]) {
        const file = this.files[0];
        
        if (file.size > 2 * 1024 * 1024) {
          const warning = document.createElement('div');
          warning.className = 'file-warning';
          warning.textContent = `Large image (${Math.round(file.size/1024/1024)}MB). Compressing...`;
          imagePreview.appendChild(warning);
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.maxWidth = '200px';
          img.style.maxHeight = '200px';
          imagePreview.appendChild(img);
        }
        reader.readAsDataURL(file);
      }
    });
  }

  toggleNewCategoryInput();
}

// MOBILE AUTHENTICATION HANDLING
function initMobileAuth() {
  const mobileAccountBtn = document.getElementById('mobile-account-btn');
  const mobileAuthModal = document.getElementById('mobile-auth-modal');
  const closeMobileModal = document.querySelector('.close-mobile-modal');
  const mobileLoginBtn = document.querySelector('.mobile-login-btn');
  const mobileRegisterBtn = document.querySelector('.mobile-register-btn');
  
  if (!mobileAccountBtn) return;
  
  mobileAccountBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (mobileAuthModal) {
      mobileAuthModal.style.display = 'flex';
    }
  });
  
  closeMobileModal?.addEventListener('click', () => {
    if (mobileAuthModal) mobileAuthModal.style.display = 'none';
  });
  
  mobileLoginBtn?.addEventListener('click', () => {
    if (mobileAuthModal) mobileAuthModal.style.display = 'none';
    document.getElementById('login-link')?.click();
  });
  
  mobileRegisterBtn?.addEventListener('click', () => {
    if (mobileAuthModal) mobileAuthModal.style.display = 'none';
    document.getElementById('register-link')?.click();
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === mobileAuthModal) {
      mobileAuthModal.style.display = 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
    // First check auth state
    const user = await updateAuthUI();
    
    // Then initialize cart
    cartInstance = initCart();
    
    // Then load products
    await loadProducts();

    // Then other initializations
    initSlider();
    initCategoryFilter();
    initSearch();
    initSmoothScrolling();
    initAuthModal();
    initMobileAuth();
    initLogout();
    initMobileLogout();
    
    if (user?.role === 'admin') {
      await initAdminPanel();
      initProductForm();
    }
    
    // Mobile cart button
    document.getElementById('mobile-cart-btn')?.addEventListener('click', () => {
      cartInstance?.openCart();
    });
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');

    if (mobileNav) {
      const mobileNavClose = document.createElement('span');
      mobileNavClose.className = 'mobile-nav-close';
      mobileNavClose.innerHTML = '&times;';
      mobileNav.appendChild(mobileNavClose);

      mobileMenuToggle?.addEventListener('click', () => {
        mobileNav.classList.add('active');
      });

      mobileNavClose.addEventListener('click', () => {
        mobileNav.classList.remove('active');
      });
    }
    
  } catch (error) {
    console.error('Initialization error:', error);
    alert(`Initialization failed: ${error.message}`);
  }
});