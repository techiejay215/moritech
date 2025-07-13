let adminProducts = []; // Store products for client-side filtering
console.log("🟢 Loaded updated script.js (Mobile Fix + Admin Panel + Cloudinary)");
const API_BASE_URL = 'https://moritech.onrender.com/api';
window.cartInstance = null;
let adminPanelInitialized = false;
let refreshingToken = null; // For handling concurrent refresh requests
let allProducts = [];

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
        localStorage.setItem('token', newToken);
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
        body: JSON.stringify({ email, credentials: 'include' })
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
  async deleteProduct(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!response.ok) throw await handleResponseError(response);
    return true;
  } catch (error) {
    console.error('Product delete error:', error);
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
      const isSubcategory = [
        'hp-laptops', 'lenovo-laptops', 'dell-laptops', 'asus-laptops', 'samsung-laptops',
        'hp-printers', 'canon-printers', 'epson-printers', 'kyocera-printers', 'ecosys-printers',
        'hp-desktops', 'dell-desktops', 'lenovo-desktops',
        'hp-monitors', 'lenovo-monitors', 'samsung-monitors', 'fujitsu-monitors'
      ].includes(category);

      if (isSubcategory) {
        const mainCategory = category.split('-')[1];
        const allResponse = await fetch(`${API_BASE_URL}/products/category/${mainCategory}`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });

        if (!allResponse.ok) throw await handleResponseError(allResponse);
        const allProducts = await allResponse.json();

        const brand = category.split('-')[0];
        return allProducts.filter(product =>
          product.brand && product.brand.toLowerCase() === brand
        );
      }

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

  async getRelatedProducts(currentId, category) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/related/${currentId}?category=${encodeURIComponent(category)}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) throw await handleResponseError(response);
      return await response.json();
    } catch (error) {
      console.error('Related products error:', error);
      return [];
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
      formData.append('productId', offerData.productId);
      formData.append('name', offerData.name);
      formData.append('oldPrice', offerData.oldPrice);
      formData.append('price', offerData.price);

      if (offerData.image) {
        formData.append('image', offerData.image);
      }

      const response = await fetch(`${API_BASE_URL}/offers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
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

    // Consider 204 (No Content) as successful
    if (response.ok || response.status === 204) {
      return true;
    }
    throw await handleResponseError(response);
  } catch (error) {
    console.error('Delete offer error:', error);
    throw error;
  }
}
};

async function initSlider() {
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
    dot.addEventListener('click', function () {
      const slideIndex = parseInt(this.dataset.slide);
      stopSlideShow();
      showSlide(slideIndex);
      startSlideShow();
    });
  });

  showSlide(0);
  startSlideShow();
}


function getProductIcon(category) {
  const icons = {
    'laptops': 'fas fa-laptop',
    'desktops': 'fas fa-desktop',
    'monitors': 'fas fa-tv',
    'accessories': 'fas fa-keyboard',
    'storage': 'fas fa-hdd',
    'printers': 'fas fa-print',
    'ram': 'fas fa-memory',
    'toners': 'fas fa-fill-drip',
    'networking': 'fas fa-network-wired',
    'software': 'fas fa-compact-disc'
  };
  return icons[category] || 'fas fa-microchip';
}
// Updated renderOffers function
function renderOffers(offers) {
  const container = document.querySelector('.offers-container');
  if (!container) return;

  container.innerHTML = '';

  offers.forEach(offer => {
    const offerEl = document.createElement('div');
    offerEl.className = 'offer-card';

    // FIX: Use offer.productId._id instead of offer.productId
    const productId = offer.productId._id || offer.productId; // Fallback for safety

    // Determine tag based on category
    let tag = '';
    const category = (offer.productId.category || '').toLowerCase();

    if (category === 'toners') tag = '<div class="offer-tag">TONER</div>';
    else if (category === 'networking') tag = '<div class="offer-tag">NETWORK</div>';
    else if (category === 'software') tag = '<div class="offer-tag">SOFTWARE</div>';

    offerEl.innerHTML = `
      <div class="offer-image" style="background-image: url(${offer.image || 'https://via.placeholder.com/300?text=Offer+Image'})">
        ${tag}
      </div>
      <div class="offer-content">
        <h3>${offer.name}</h3>
        <div class="offer-prices">
          <span class="old-price">Ksh ${offer.oldPrice.toLocaleString()}</span>
          <span class="new-price">Ksh ${offer.price.toLocaleString()}</span>
        </div>
        <div class="offer-save">Save Ksh ${(offer.oldPrice - offer.price).toLocaleString()}</div>
      </div>
    `;

    // ✅ Fixed: Use the actual product ID
    offerEl.addEventListener('click', () => {
      showProductDetails(productId);
    });

    container.appendChild(offerEl);
  });
}

function initOffersControls() {
  const container = document.querySelector('.offers-container');
  const prevBtn = document.querySelector('.offers-prev');
  const nextBtn = document.querySelector('.offers-next');

  if (!container || !prevBtn || !nextBtn) return;

  const offerCards = container.querySelectorAll('.offer-card');
  if (!offerCards.length) return;

  if (offerCards.length <= 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    return;
  }

  let currentIndex = 0;
  const cardWidth = offerCards[0].offsetWidth + 40; // 20px gap + 20px margin

  function updatePosition() {
    container.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
  }

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updatePosition();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentIndex < offerCards.length - 1) {
      currentIndex++;
      updatePosition();
    }
  });

  updatePosition();
}


function initOfferForm() {
  const form = document.getElementById('add-offer-form');
  if (!form) return;

  // 🔄 Update image preview to handle multiple images
  const imageInput = document.getElementById('offer-image');
  const imagePreview = document.getElementById('image-preview');

  imageInput?.addEventListener('change', function () {
    imagePreview.innerHTML = '';

    if (this.files && this.files.length > 0) {
      for (let i = 0; i < this.files.length; i++) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.maxWidth = '200px';
          img.style.maxHeight = '200px';
          img.style.margin = '5px';
          imagePreview.appendChild(img);
        }
        reader.readAsDataURL(this.files[i]);
      }
    }
  });
  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const productId = document.getElementById('offer-product-select').value;
    if (!productId || !/^[0-9a-fA-F]{24}$/.test(productId)) {
      alert('Please select a valid product');
      return;
    }
    const offerData = {
      productId,
      name: form.elements['name'].value,
      oldPrice: parseFloat(form.elements['oldPrice'].value),
      price: parseFloat(form.elements['price'].value),
      image: imageInput.files[0] || null
    };

    try {
      // Add image compression before upload
      if (offerData.image) {
        offerData.image = await compressImage(offerData.image);
      }

      await offerService.addOffer(offerData);
      alert('Offer added successfully!');
      form.reset();
      imagePreview.innerHTML = '';
      await loadAdminOffers();
    } catch (error) {
      alert(error.message || 'Failed to add offer');
    }
  });
}

async function loadAdminOffers() {
  const container = document.querySelector('.offers-list-container');
  if (!container) return;

  try {
    const offers = await offerService.getOffers();
    container.innerHTML = '';

    if (!offers.length) {
      container.innerHTML = '<p>No offers found</p>';
      return;
    }

    offers.forEach(offer => {
      const item = document.createElement('div');
      item.className = 'admin-offer-item';
      item.innerHTML = `
        <div class="admin-offer-info">
          <strong>${offer.name}</strong>
          <div>Ksh ${offer.oldPrice.toLocaleString()} → Ksh ${offer.price.toLocaleString()}</div>
        </div>
        <div class="admin-offer-actions">
          <button class="delete-offer-btn" data-id="${offer._id}">Delete</button>
        </div>
      `;
      container.appendChild(item);

      item.querySelector('.delete-offer-btn').addEventListener('click', async () => {
        if (confirm('Delete this offer?')) {
          try {
            await offerService.deleteOffer(offer._id);
            item.remove();
            initOffersSlider(); // Refresh frontend display
          } catch {
            alert('Failed to delete offer');
          }
        }
      });
    });
  } catch (error) {
    container.innerHTML = `<div class="error">Error loading offers</div>`;
  }
}

function initCategoryFilter() {
  const categoryButtons = document.querySelectorAll('.category-btn');
  if (!categoryButtons.length) return;

  categoryButtons.forEach(button => {
    button.addEventListener('click', async function () {
      if (window.innerWidth <= 768) return;

      const category = this.dataset.category;

      if (window.innerWidth <= 768) {
        const productsSection = document.getElementById('products');
        if (productsSection) {
          window.scrollTo({
            top: productsSection.offsetTop - 100,
            behavior: 'smooth',
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

  // ✅ Handle main category dropdown click (desktop only)
  document.querySelectorAll('.dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', async function () {
      const category = this.dataset.category;

      if (window.innerWidth > 768) {
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        try {
          const products = await productService.getProductsByCategory(category);
          renderProducts(products);
        } catch {
          alert('Failed to load products. Please try again.');
        }
      }
    });
  });
}

// Update initSearch() function in script.js
function initSearch() {
  const desktopSearch = document.getElementById('search-input');
  const mobileSearch = document.getElementById('mobile-search-input');

  const headerSearch = document.getElementById('header-search-input');

  function setupSearch(inputElement) {
    if (!inputElement) return;

    let searchTimeout;
    inputElement.addEventListener('input', function () {
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

  setupSearch(desktopSearch);
  setupSearch(mobileSearch);
  setupSearch(headerSearch);
}

function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
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

  window.addEventListener('scroll', function () {
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
        await populateProductDropdown();
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
  if (window.cartInstance) return cartInstance;

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
  // Replace the entire addToCart function in initCart
  // Replace the existing addToCart function with this corrected version
  async function addToCart(productId) {
    console.log(`Adding product ${productId} to cart`);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Mobile/desktop login prompt
        if (window.innerWidth <= 768) {
          document.getElementById('mobile-account-btn')?.click();
        } else {
          document.getElementById('login-link')?.click();
        }
        alert('Please login to add items to your cart');
        return;
      }

      // FIX: Remove the nested try-catch block and handle refresh properly
      try {
        await cartService.addToCart(productId);
      } catch (error) {
        // Handle token refresh on 401 error
        if (error.message.includes('401')) {
          await authService.refreshToken();
          await cartService.addToCart(productId);
        } else {
          throw error;
        }
      }

      await fetchCart();
      openCart();

      // Mobile feedback animation
      if (window.innerWidth <= 768) {
        const mobileCartBtn = document.getElementById('mobile-cart-btn');
        if (mobileCartBtn) {
          mobileCartBtn.classList.add('pulse');
          setTimeout(() => mobileCartBtn.classList.remove('pulse'), 1000);
        }
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      alert(error.message || 'Failed to add to cart');
    }
  }

  fetchCart();

  window.cartInstance = {
    addToCart,
    fetchCart,
    openCart
  };
  return window.cartInstance;
}

// Replace the existing setupProductEventDelegation function with this:
function setupProductEventDelegation() {
  document.body.addEventListener('click', async (e) => {
    const addToCartBtn = e.target.closest('.add-to-cart-btn');
    const inquireBtn = e.target.closest('.inquire-btn');
    const productCard = e.target.closest('.product-card');

    if (addToCartBtn) {
      const card = addToCartBtn.closest('.product-card');
      window.cartInstance?.addToCart(card.dataset.id);
    } 
    else if (inquireBtn) {
      const card = inquireBtn.closest('.product-card');
      inquire(card.dataset.name);
    }
    else if (productCard) {
      showProductDetails(productCard.dataset.id);
    }
  });
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
    if (!product._id || !/^[0-9a-fA-F]{24}$/.test(product._id)) {
      console.warn('Skipping product with invalid ID:', product);
      return;
    }
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product._id;
    card.dataset.name = product.name;

    card.innerHTML = `
      <div class="product-img">
        ${getProductImageHTML(product)}
      </div>
      <div class="product-content">
        <p>${product.description}</p>
        <span class="price">Ksh ${product.price.toLocaleString()}</span>
        <div class="button-group">
          <button class="inquire-btn">Inquire</button>
          <button class="add-to-cart-btn">Add to Cart</button>
        </div>
      </div>
    `;


    // Click to show details
    card.querySelector('.product-img, .product-content p, .price').addEventListener('click', () => {
      showProductDetails(product._id);
    });

    productGrid.appendChild(card);
  });
}

// Helper function for product image
function getProductImageHTML(product) {
  if (product.images && product.images.length > 0) {
    return `<img src="${product.images[0]}" alt="${product.name}">`;
  }
  return `<div class="product-icon"><i class="${getProductIcon(product.category)}"></i></div>`;
}
async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
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
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}
async function uploadImageToCloudinary(file) {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: formData,
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
    const mobileUserProfile = document.querySelector('.mobile-nav .mobile-user-profile');
    const mobileHeaderProfile = document.querySelector('.mobile-header .mobile-user-profile');

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
      if (mobileHeaderProfile) {
        mobileHeaderProfile.style.display = 'flex';
        const displayName = user.name || user.email.split('@')[0];
        document.getElementById('mobile-welcome-header').textContent = `Welcome, ${displayName}`;
      }
    } else {
      if (authLinks) authLinks.style.display = 'flex';
      if (userProfile) userProfile.style.display = 'none';
      if (mobileUserProfile) mobileUserProfile.style.display = 'none';
      if (mobileHeaderProfile) mobileHeaderProfile.style.display = 'none';
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
  const mobileLogoutHeader = document.getElementById('mobile-logout-header');

  const logoutHandler = async (e) => {
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
  };

  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', logoutHandler);
  }

  if (mobileLogoutHeader) {
    mobileLogoutHeader.addEventListener('click', logoutHandler);
  }
}

async function showProductDetails(productId) {
  try {
    const productDetailsSection = document.getElementById('product-details');
    const productDetailsContainer = productDetailsSection.querySelector('.product-details-container');
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-overlay';
    loadingElement.innerHTML = '<div class="loading">Loading product details...</div>';

    // Show loading overlay
    productDetailsSection.appendChild(loadingElement);
    productDetailsContainer.style.display = 'none';
    productDetailsSection.style.display = 'block';

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

    // NEW: Fetch related products
    let relatedProducts = [];
    try {
      relatedProducts = await productService.getRelatedProducts(productId, product.category);
    } catch (error) {
      console.error('Failed to load related products:', error);
    }

    // Populate product details
    document.getElementById('product-detail-name').textContent = product.name;
    document.getElementById('product-detail-price').textContent = `Ksh ${product.price.toLocaleString()}`;
    document.getElementById('product-detail-category').textContent = product.category;
    document.getElementById('product-detail-description').textContent = product.description;

    const specsContainer = document.getElementById('product-specs');
    if (specsContainer) {
      if (product.specifications && product.specifications.trim() !== '') {
        specsContainer.innerHTML = product.specifications;
      } else {
        specsContainer.innerHTML = '<p>No specifications available</p>';
      }
    }

    // Set up WhatsApp link
    const whatsappLink = document.getElementById('whatsapp-order');
    const message = `Hi, I'm interested in this product: ${product.name} (Ksh ${product.price.toLocaleString()}). Product ID: ${product._id}`;
    whatsappLink.href = `https://wa.me/254719362202?text=${encodeURIComponent(message)}`;

    const mainImage = document.getElementById('main-product-image');
    const thumbnailContainer = document.querySelector('.thumbnail-container');
    thumbnailContainer.innerHTML = '';

    // Use product images or placeholder
    const images = product.images && product.images.length > 0
      ? product.images
      : [product.image || 'https://via.placeholder.com/500?text=Product+Image'];

    mainImage.src = images[0];
    mainImage.alt = product.name;

    images.forEach((img, index) => {
      const thumbnail = document.createElement('div');
      thumbnail.className = 'thumbnail' + (index === 0 ? ' active' : '');
      thumbnail.innerHTML = `<img src="${img}" alt="${product.name} thumbnail">`;

      thumbnail.addEventListener('click', () => {
        mainImage.src = img;
        document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
        thumbnail.classList.add('active');
      });

      thumbnailContainer.appendChild(thumbnail);
    });
    // Set up Add to Cart button
    const addToCartBtn = document.getElementById('add-to-cart-detail');
    if (addToCartBtn) {
      addToCartBtn.onclick = null; // Remove previous listeners
      addToCartBtn.addEventListener('click', () => {
        cartInstance.addToCart(product._id);
        alert(`${product.name} added to cart!`);
      });
    }

    // NEW: Render reviews
    renderReviews(product.reviews || []);


    // NEW: Render related products
    renderRelatedProducts(relatedProducts);

    // Remove loading and show content
    productDetailsSection.removeChild(loadingElement);
    productDetailsContainer.style.display = 'block';

  } catch (error) {
    console.error('Product details error:', error);
    document.getElementById('product-details').innerHTML = `
      <div class="container">
        <div class="error-message">
          <h3>Error Loading Product</h3>
          <p>${error.message || 'Could not load product details'}</p>
          <button onclick="location.reload()">Go Back</button>
        </div>
      </div>
    `;
  }
}

// NEW: Function to render reviews
function renderReviews(reviews) {
  const reviewsContainer = document.getElementById('product-reviews');
  if (!reviewsContainer) return;

  reviewsContainer.innerHTML = '';

  if (!reviews.length) {
    reviewsContainer.innerHTML = '<p>No reviews yet. Be the first to review!</p>';
    return;
  }

  reviews.forEach(review => {
    const reviewEl = document.createElement('div');
    reviewEl.className = 'review';
    reviewEl.innerHTML = `
      <div class="review-header">
        <span class="review-author">${review.name}</span>
        <div class="review-rating">
          ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
        </div>
      </div>
      <div class="review-date">${new Date(review.date).toLocaleDateString()}</div>
      <p class="review-content">${review.comment}</p>
    `;
    reviewsContainer.appendChild(reviewEl);
  });
}

// NEW: Function to render related products
function renderRelatedProducts(products) {
  const container = document.getElementById('related-products');
  if (!container) return;

  container.innerHTML = '';

  if (!products.length) {
    container.innerHTML = '<p>No related products found</p>';
    return;
  }

  products.slice(0, 4).forEach(product => {
    const card = document.createElement('div');
    card.className = 'related-product-card';
    card.dataset.id = product._id;

    card.innerHTML = `
      <div class="related-product-img">
        ${getProductImageHTML(product)}
      </div>
      <div class="related-product-info">
        <h4>${product.name}</h4>
        <div class="related-product-price">Ksh ${product.price.toLocaleString()}</div>
      </div>
    `;

    card.addEventListener('click', () => showProductDetails(product._id));
    container.appendChild(card);
  });
}


function setupBackButton() {
  const backBtn = document.getElementById('back-to-products');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Hide product details
      document.getElementById('product-details').style.display = 'none';
      
      // Show products section
      document.getElementById('products').style.display = 'block';
      
      // Scroll to top
      window.scrollTo(0, 0);
    });
  }
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
      initOfferForm();
      await loadAdminOffers();

      // POPULATE THE DROPDOWN HERE
      await populateProductDropdown();

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

  searchInput.addEventListener('input', function () {
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

      item.querySelector('.delete-product-btn').addEventListener('click', async function () {
        const productId = this.closest('.admin-product-item').dataset.id;
        if (confirm('Delete this product?')) {
          try {
            await productService.deleteProduct(productId);
            // Update local product list
            adminProducts = adminProducts.filter(p => p._id !== productId);
            renderAdminProducts(adminProducts);
            loadProducts();
            await populateProductDropdown();
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

  // Add this function to handle multiple file previews
  const imageInput = document.getElementById('product-image');
  const imagePreview = document.getElementById('image-preview');

  imageInput?.addEventListener('change', function () {
    imagePreview.innerHTML = '';

    if (this.files && this.files.length > 0) {
      for (let i = 0; i < this.files.length; i++) {
        const file = this.files[i];

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
          alert(`File ${file.name} is not an image. Only image files are allowed.`);
          this.value = '';
          imagePreview.innerHTML = '';
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 5MB.`);
          this.value = '';
          imagePreview.innerHTML = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.maxWidth = '200px';
          img.style.maxHeight = '200px';
          img.style.margin = '5px';
          imagePreview.appendChild(img);
        }
        reader.readAsDataURL(file);
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect form data
    const name = document.getElementById('product-name').value;
    const description = document.getElementById('product-description').value;
    const price = document.getElementById('product-price').value;
    const specifications = document.getElementById('product-specifications').value;
    const categorySelect = document.getElementById('product-category');
    const category = categorySelect.value === 'new'
      ? document.getElementById('new-category-input').value
      : categorySelect.value;

    // Create FormData
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('specifications', specifications);

    // Append all images
   const imageInput = document.getElementById('product-image');
  if (imageInput.files && imageInput.files.length > 0) {
    for (let i = 0; i < imageInput.files.length; i++) {
      const file = imageInput.files[i];
      // Validate file type and size
      if (file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
        formData.append('images', file);
      }
    }
  }

    try {
      console.log('Submitting product form with', imageInput.files.length, 'images');

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add product');
      }

      const result = await response.json();
      console.log('Product created:', result);

      alert(`Product added successfully with ${result.images?.length || 0} images!`);

      // Reset form
      form.reset();
      imagePreview.innerHTML = '';
      toggleNewCategoryInput();

      // Refresh products
      await loadProducts();
      await populateProductDropdown();

      if (adminPanelInitialized) {
        adminProducts = await productService.getProducts();
        renderAdminProducts(adminProducts);
      }
    } catch (error) {
      console.error('Add product error:', error);
      alert(`Error: ${error.message || 'Failed to add product'}`);
    }
  });

  toggleNewCategoryInput();
}

const imageInput = document.getElementById('product-image');
const imagePreview = document.getElementById('image-preview');

if (imageInput && imagePreview) {
  imageInput.addEventListener('change', function () {
    imagePreview.innerHTML = '';

    if (this.files && this.files.length > 0) {
      for (const file of this.files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`❌ File "${file.name}" is not an image. Only image files are allowed.`);
          this.value = '';
          imagePreview.innerHTML = '';
          return;
        }

        // Validate file size
        if (file.size > 5 * 1024 * 1024) { // 5MB
          alert(`❌ File "${file.name}" is too large. Max allowed size is 5MB.`);
          this.value = '';
          imagePreview.innerHTML = '';
          return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = function (e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.maxWidth = '200px';
          img.style.maxHeight = '200px';
          img.style.margin = '5px';
          imagePreview.appendChild(img);
        };
        reader.readAsDataURL(file);
      }
    }
  });
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
async function loadProducts() {
  try {
    const products = await productService.getProducts();
    allProducts = products; // Store products globally
    renderProducts(products);
  } catch (error) {
    console.error('Failed to load products:', error);
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
async function loadOffers() {
  try {
    const offers = await offerService.getOffers();
    if (offers.length > 0) {
      renderOffers(offers);
      initOffersControls();
      document.querySelector('.offers-section').style.display = 'block';
    }
  } catch (error) {
    console.error('Failed to load offers:', error);
  }
}
async function populateProductDropdown() {
  const select = document.getElementById('offer-product-select');
  if (!select) return;

  try {
    select.innerHTML = '<option value="">Select a product</option>';

    // Filter out products with invalid IDs
    const validProducts = allProducts.filter(p =>
      p._id && /^[0-9a-fA-F]{24}$/.test(p._id)
    );

    validProducts.forEach(product => {
      const option = document.createElement('option');
      option.value = product._id;
      option.textContent = product.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to populate products dropdown:', error);
  }
}
function initCategoryDropdowns() {
  console.log('Initializing category dropdowns...');
  const toggles = document.querySelectorAll('.dropdown-toggle');
  console.log(`Found ${toggles.length} dropdown toggles`);

  // Handle desktop dropdown hover
  if (window.innerWidth > 768) {
    console.log('Setting up desktop dropdown hover');
    document.querySelectorAll('.dropdown').forEach(dropdown => {
      dropdown.addEventListener('mouseenter', () => {
        console.log('Mouse enter on dropdown');
        dropdown.classList.add('active');
      });

      dropdown.addEventListener('mouseleave', () => {
        console.log('Mouse leave on dropdown');
        dropdown.classList.remove('active');
      });
    });
  }
  // Handle mobile dropdown click
  else {
    console.log('Setting up mobile dropdown click');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', function (e) {
        console.log('Dropdown toggle clicked');
        e.preventDefault();
        e.stopPropagation();
        const dropdown = this.closest('.dropdown');

        // Close all other dropdowns
        document.querySelectorAll('.dropdown').forEach(d => {
          if (d !== dropdown) d.classList.remove('active');
        });

        // Toggle this dropdown
        dropdown.classList.toggle('active');
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
      // Only close if click is outside dropdowns
      if (!e.target.closest('.dropdown')) {
        console.log('Document click - closing dropdowns');
        document.querySelectorAll('.dropdown').forEach(dropdown => {
          dropdown.classList.remove('active');
        });
      }
    });
  }
}

function initSubcategoryButtons() {
  const subcategoryButtons = document.querySelectorAll('.subcategory-btn');
  console.log(`Initializing ${subcategoryButtons.length} subcategory buttons`);

  subcategoryButtons.forEach(btn => {
    btn.addEventListener('click', async function (e) {
      console.log('Subcategory button clicked:', this.dataset.category);
      e.preventDefault();
      e.stopPropagation();
      const category = this.dataset.category;

      // Update UI
      document.querySelectorAll('.category-btn, .subcategory-btn').forEach(b => {
        b.classList.remove('active');
      });
      this.classList.add('active');

      // Make sure the parent dropdown toggle also gets active class
      const dropdown = this.closest('.dropdown');
      const dropdownToggle = dropdown.querySelector('.dropdown-toggle');
      dropdownToggle.classList.add('active');

      // Load products
      try {
        console.log(`Loading products for category: ${category}`);
        const products = await productService.getProductsByCategory(category);
        renderProducts(products);

        // Scroll to products section on mobile
        if (window.innerWidth <= 768) {
          const productsSection = document.getElementById('products');
          if (productsSection) {
            window.scrollTo({
              top: productsSection.offsetTop - 100,
              behavior: 'smooth'
            });
          }
        }

        // Close the dropdown after selection on mobile
        if (window.innerWidth <= 768) {
          dropdown.classList.remove('active');
        }
      } catch (error) {
        console.error('Error loading products:', error);
        alert('Failed to load products. Please try again.');
      }
    });
  });
}
// Add this function to toggle password visibility
function initPasswordToggle() {
  document.querySelectorAll('.password-container').forEach(container => {
    const input = container.querySelector('input');
    const icon = container.querySelector('.password-toggle');

    icon.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.classList.toggle('fa-eye', !isPassword);
      icon.classList.toggle('fa-eye-slash', isPassword);
    });
  });
}
function initPasswordToggle() {
  document.querySelectorAll('.password-container').forEach(container => {
    const input = container.querySelector('input');
    const icon = container.querySelector('.password-toggle');

    icon.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.classList.toggle('fa-eye', !isPassword);
      icon.classList.toggle('fa-eye-slash', isPassword);
    });
  });
}
async function getRelatedProducts(currentId, category) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/related/${currentId}?category=${encodeURIComponent(category)}`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!response.ok) throw await handleResponseError(response);
    return await response.json();
  } catch (error) {
    console.error('Related products error:', error);
    return [];
  }
}
async function testCloudinary() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/test-upload`);
    const data = await response.json();
    console.log('Cloudinary Test:', data);
    alert(data.status);
  } catch (error) {
    console.error('Cloudinary Test Failed:', error);
    alert('Cloudinary connection failed');
  }
}

document.addEventListener('DOMContentLoaded', async function () {
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
    setupBackButton();
    initCart();
    setupProductEventDelegation();
    await loadOffers();
    initCategoryDropdowns();
    initSubcategoryButtons();
    initPasswordToggle();


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