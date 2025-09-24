/**
 * Products Page - Tealium Sandbox
 * E-commerce product listing functionality with comprehensive event tracking
 */

// Product data for easy reference
const productData = {
    'PROD-001': {
        id: 'PROD-001',
        name: 'iPhone 15 Pro',
        category: 'Smartphones',
        subcategory: 'Premium Phones',
        brand: 'Apple',
        price: 999.99,
        currency: 'USD',
        availability: 'in_stock',
        rating: 4.8,
        reviews: 1250,
        image_url: '/images/iphone-15-pro.jpg'
    },
    'PROD-002': {
        id: 'PROD-002',
        name: 'MacBook Air M2',
        category: 'Laptops',
        subcategory: 'Ultrabooks',
        brand: 'Apple',
        price: 1199.99,
        currency: 'USD',
        availability: 'in_stock',
        rating: 4.7,
        reviews: 890,
        image_url: '/images/macbook-air-m2.jpg'
    },
    'PROD-003': {
        id: 'PROD-003',
        name: 'iPad Pro',
        category: 'Tablets',
        subcategory: 'Professional Tablets',
        brand: 'Apple',
        price: 1099.99,
        currency: 'USD',
        availability: 'low_stock',
        rating: 4.9,
        reviews: 567,
        image_url: '/images/ipad-pro.jpg'
    },
    'PROD-004': {
        id: 'PROD-004',
        name: 'AirPods Pro',
        category: 'Audio',
        subcategory: 'Wireless Earbuds',
        brand: 'Apple',
        price: 249.99,
        currency: 'USD',
        availability: 'in_stock',
        rating: 4.6,
        reviews: 2340,
        image_url: '/images/airpods-pro.jpg'
    },
    'PROD-005': {
        id: 'PROD-005',
        name: 'Apple Watch Series 9',
        category: 'Wearables',
        subcategory: 'Smart Watches',
        brand: 'Apple',
        price: 399.99,
        currency: 'USD',
        availability: 'in_stock',
        rating: 4.5,
        reviews: 1890,
        image_url: '/images/apple-watch-9.jpg'
    },
    'PROD-006': {
        id: 'PROD-006',
        name: 'iMac 24-inch',
        category: 'Computers',
        subcategory: 'All-in-One',
        brand: 'Apple',
        price: 1299.99,
        currency: 'USD',
        availability: 'in_stock',
        rating: 4.8,
        reviews: 234,
        image_url: '/images/imac-24.jpg'
    }
};

// Shopping cart state
let cartItems = JSON.parse(localStorage.getItem('sandbox_cart') || '[]');
let wishlistItems = JSON.parse(localStorage.getItem('sandbox_wishlist') || '[]');

/**
 * Initialize the products page
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeProductsPage();
    updateCartCount();
    
    // Trigger initial page view after a short delay to ensure Tealium loads
    setTimeout(() => {
        triggerPageView();
    }, 1000);
});

/**
 * Initialize products page functionality
 */
function initializeProductsPage() {
    console.log('🛍️ Products page initialized');
    logEvent('PAGE', 'Products page loaded', utag_data);
    
    // Update debug information
    updateDebugInfo();
    
    // Set up product card interactions
    setupProductInteractions();
}

/**
 * View product details - navigate to product detail page
 */
function viewProduct(productId) {
    const product = productData[productId];
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }
    
    // Track product view click
    const eventData = {
        event_name: 'product_click',
        event_category: 'product_interaction',
        event_action: 'view_details',
        product_id: productId,
        product_name: product.name,
        product_category: product.category,
        product_price: product.price,
        click_location: 'product_listing',
        list_position: getProductPosition(productId),
        timestamp: new Date().toISOString()
    };
    
    // Fire Tealium link event
    if (typeof utag !== 'undefined' && utag.link) {
        utag.link(eventData);
    }
    
    logEvent('PRODUCT_CLICK', `View details: ${product.name}`, eventData);
    showToast(`Viewing details for ${product.name}`, 'info');
    
    // In a real implementation, this would navigate to product detail page
    // For demo purposes, we'll simulate navigation
    setTimeout(() => {
        window.location.href = `product-detail.html?id=${productId}`;
    }, 500);
}

/**
 * Add product to cart
 */
function addToCart(productId, quantity = 1) {
    const product = productData[productId];
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }
    
    // Check if product already in cart
    const existingItem = cartItems.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cartItems.push({
            ...product,
            quantity: quantity,
            added_timestamp: new Date().toISOString()
        });
    }
    
    // Save to localStorage
    localStorage.setItem('sandbox_cart', JSON.stringify(cartItems));
    updateCartCount();
    
    // Track add to cart event
    const eventData = {
        event_name: 'add_to_cart',
        event_category: 'ecommerce',
        event_action: 'add_to_cart',
        product_id: productId,
        product_name: product.name,
        product_category: product.category,
        product_subcategory: product.subcategory,
        product_brand: product.brand,
        product_price: product.price,
        product_currency: product.currency,
        product_quantity: quantity,
        cart_total_items: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        cart_total_value: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        list_position: getProductPosition(productId),
        source_page: 'product_listing',
        timestamp: new Date().toISOString()
    };
    
    // Fire Tealium link event
    if (typeof utag !== 'undefined' && utag.link) {
        utag.link(eventData);
    }
    
    logEvent('ADD_TO_CART', `Added: ${product.name}`, eventData);
    showToast(`✅ ${product.name} added to cart!`, 'success');
    
    // Visual feedback
    animateAddToCart(productId);
}

/**
 * Add product to wishlist
 */
function addToWishlist(productId) {
    const product = productData[productId];
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }
    
    // Check if already in wishlist
    if (wishlistItems.find(item => item.id === productId)) {
        showToast(`${product.name} is already in your wishlist`, 'warning');
        return;
    }
    
    wishlistItems.push({
        ...product,
        added_timestamp: new Date().toISOString()
    });
    
    // Save to localStorage
    localStorage.setItem('sandbox_wishlist', JSON.stringify(wishlistItems));
    
    // Track wishlist event
    const eventData = {
        event_name: 'add_to_wishlist',
        event_category: 'engagement',
        event_action: 'add_to_wishlist',
        product_id: productId,
        product_name: product.name,
        product_category: product.category,
        product_price: product.price,
        wishlist_total_items: wishlistItems.length,
        source_page: 'product_listing',
        timestamp: new Date().toISOString()
    };
    
    // Fire Tealium link event
    if (typeof utag !== 'undefined' && utag.link) {
        utag.link(eventData);
    }
    
    logEvent('ADD_TO_WISHLIST', `Added: ${product.name}`, eventData);
    showToast(`❤️ ${product.name} added to wishlist!`, 'success');
    
    // Visual feedback
    const button = document.querySelector(`[data-product-id="${productId}"] .btn-wishlist`);
    if (button) {
        button.style.background = '#ff6b6b';
        button.textContent = '💖';
        setTimeout(() => {
            button.style.background = '';
            button.textContent = '❤️';
        }, 1000);
    }
}

/**
 * Apply filter and track filtering event
 */
function applyFilter(filterType, filterValue) {
    // Update utag_data with new filter
    const currentFilters = utag_data.applied_filters || [];
    const newFilter = `${filterType}:${filterValue}`;
    
    // Remove existing filter of same type
    const filteredArray = currentFilters.filter(filter => !filter.startsWith(`${filterType}:`));
    
    // Add new filter if value is not empty
    if (filterValue) {
        filteredArray.push(newFilter);
    }
    
    utag_data.applied_filters = filteredArray;
    
    // Track filter event
    const eventData = {
        event_name: 'filter_applied',
        event_category: 'navigation',
        event_action: 'filter_products',
        filter_type: filterType,
        filter_value: filterValue,
        applied_filters: filteredArray,
        category_name: utag_data.category_name,
        products_before_filter: utag_data.products_displayed,
        timestamp: new Date().toISOString()
    };
    
    // Fire Tealium link event
    if (typeof utag !== 'undefined' && utag.link) {
        utag.link(eventData);
    }
    
    logEvent('FILTER_APPLIED', `${filterType}: ${filterValue}`, eventData);
    showToast(`Filter applied: ${filterType} = ${filterValue}`, 'info');
    
    // Update debug info
    updateDebugInfo();
    
    // Simulate filter results (in real implementation, this would reload products)
    setTimeout(() => {
        const newProductCount = Math.floor(Math.random() * 10) + 3;
        utag_data.products_displayed = newProductCount;
        document.querySelector('#debug-products').textContent = newProductCount;
        showToast(`${newProductCount} products found`, 'success');
    }, 500);
}

/**
 * Apply sorting and track sorting event
 */
function applySorting(sortMethod) {
    utag_data.sort_method = sortMethod;
    
    // Track sorting event
    const eventData = {
        event_name: 'sort_applied',
        event_category: 'navigation',
        event_action: 'sort_products',
        sort_method: sortMethod,
        category_name: utag_data.category_name,
        products_count: utag_data.products_displayed,
        timestamp: new Date().toISOString()
    };
    
    // Fire Tealium link event
    if (typeof utag !== 'undefined' && utag.link) {
        utag.link(eventData);
    }
    
    logEvent('SORT_APPLIED', `Sort: ${sortMethod}`, eventData);
    showToast(`Products sorted by: ${sortMethod}`, 'info');
    
    // Update debug info
    updateDebugInfo();
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    // Reset form controls
    document.getElementById('brandFilter').value = '';
    document.getElementById('priceFilter').value = '';
    document.getElementById('sortFilter').value = 'popularity';
    
    // Reset data layer
    utag_data.applied_filters = [];
    utag_data.sort_method = 'popularity';
    utag_data.products_displayed = 12;
    
    // Track clear filters event
    const eventData = {
        event_name: 'filters_cleared',
        event_category: 'navigation',
        event_action: 'clear_filters',
        category_name: utag_data.category_name,
        timestamp: new Date().toISOString()
    };
    
    // Fire Tealium link event
    if (typeof utag !== 'undefined' && utag.link) {
        utag.link(eventData);
    }
    
    logEvent('FILTERS_CLEARED', 'All filters cleared', eventData);
    showToast('All filters cleared', 'info');
    
    // Update debug info
    updateDebugInfo();
}

/**
 * Change page (pagination)
 */
function changePage(pageNumber) {
    utag_data.page_number = pageNumber;
    
    // Track pagination event
    const eventData = {
        event_name: 'pagination',
        event_category: 'navigation',
        event_action: 'change_page',
        page_number: pageNumber,
        category_name: utag_data.category_name,
        timestamp: new Date().toISOString()
    };
    
    // Fire Tealium link event
    if (typeof utag !== 'undefined' && utag.link) {
        utag.link(eventData);
    }
    
    logEvent('PAGINATION', `Page: ${pageNumber}`, eventData);
    showToast(`Loading page ${pageNumber}...`, 'info');
    
    // Simulate page change
    setTimeout(() => {
        triggerPageView();
        showToast(`Page ${pageNumber} loaded`, 'success');
    }, 500);
}

/**
 * Trigger page view event
 */
function triggerPageView() {
    if (typeof utag !== 'undefined' && utag.view) {
        // Update timestamp for fresh page view
        utag_data.timestamp = new Date().toISOString();
        utag_data.page_load_time = Date.now();
        
        utag.view(utag_data);
        logEvent('PAGE_VIEW', 'Product listing page view', utag_data);
        showToast('Page view event triggered', 'success');
    } else {
        showToast('Tealium not loaded - configure and load first', 'error');
    }
}

/**
 * Show current data layer
 */
function showDataLayer() {
    console.group('📊 Current Data Layer (utag_data)');
    console.log(utag_data);
    console.groupEnd();
    
    // Create a formatted display
    const dataDisplay = document.createElement('div');
    dataDisplay.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: white; border: 2px solid #007bff; border-radius: 10px; padding: 20px; max-width: 400px; max-height: 70vh; overflow-y: auto; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <h3 style="margin-top: 0; color: #007bff;">📊 Current Data Layer</h3>
            <pre style="background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto;">${JSON.stringify(utag_data, null, 2)}</pre>
            <button onclick="this.parentElement.remove()" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Close</button>
        </div>
    `;
    document.body.appendChild(dataDisplay);
    
    logEvent('DATA_LAYER', 'Data layer displayed', utag_data);
}

/**
 * Test all events for demonstration
 */
function testAllEvents() {
    logEvent('TEST', 'Running all event tests...');
    
    let delay = 0;
    const tests = [
        () => triggerPageView(),
        () => addToCart('PROD-001'),
        () => addToWishlist('PROD-002'),
        () => applyFilter('brand', 'apple'),
        () => applySorting('price_low')
    ];
    
    tests.forEach((test, index) => {
        setTimeout(test, delay);
        delay += 1000;
    });
    
    showToast('Running all event tests...', 'info');
}

/**
 * Get product position in listing (for analytics)
 */
function getProductPosition(productId) {
    const productCards = Array.from(document.querySelectorAll('.product-card'));
    const position = productCards.findIndex(card => card.dataset.productId === productId) + 1;
    return position;
}

/**
 * Update cart count display
 */
function updateCartCount() {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = `(${totalItems})`;
    }
}

/**
 * Update debug information display
 */
function updateDebugInfo() {
    document.querySelector('#debug-page-type').textContent = utag_data.page_type;
    document.querySelector('#debug-products').textContent = utag_data.products_displayed;
    document.querySelector('#debug-category').textContent = utag_data.category_name;
    document.querySelector('#debug-filters').textContent = utag_data.applied_filters.join(', ') || 'none';
}

/**
 * Setup product card interactions for enhanced tracking
 */
function setupProductInteractions() {
    // Track product card hover events
    document.querySelectorAll('.product-card').forEach(card => {
        const productId = card.dataset.productId;
        
        card.addEventListener('mouseenter', () => {
            const product = productData[productId];
            if (product && typeof utag !== 'undefined' && utag.link) {
                utag.link({
                    event_name: 'product_hover',
                    event_category: 'engagement',
                    product_id: productId,
                    product_name: product.name,
                    list_position: getProductPosition(productId),
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        // Track image clicks separately
        const image = card.querySelector('.product-image');
        if (image) {
            image.addEventListener('click', () => {
                const product = productData[productId];
                if (product && typeof utag !== 'undefined' && utag.link) {
                    utag.link({
                        event_name: 'product_image_click',
                        event_category: 'product_interaction',
                        product_id: productId,
                        product_name: product.name,
                        click_element: 'product_image',
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Navigate to product detail
                viewProduct(productId);
            });
        }
    });
}

/**
 * Animate add to cart action
 */
function animateAddToCart(productId) {
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    const button = card.querySelector('.btn-secondary');
    
    if (button) {
        const originalText = button.textContent;
        button.style.background = '#28a745';
        button.textContent = '✅ Added!';
        
        setTimeout(() => {
            button.style.background = '';
            button.textContent = originalText;
        }, 2000);
    }
}

/**
 * Load Tealium with current configuration
 */
function loadTealium() {
    const account = document.getElementById('account').value.trim();
    const profile = document.getElementById('profile').value.trim();
    const environment = document.getElementById('environment').value;
    
    if (!account || !profile) {
        showToast('Please enter both account and profile', 'error');
        return;
    }
    
    // Remove existing script if present
    const existingScript = document.querySelector('script[src*="utag.js"]');
    if (existingScript) {
        existingScript.remove();
    }
    
    // Clear existing utag object
    if (window.utag) {
        delete window.utag;
    }
    
    // Create and load new script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://tags.tiqcdn.com/utag/${account}/${profile}/${environment}/utag.js`;
    
    script.onload = function() {
        updateTealiumStatus(true);
        showToast(`Tealium loaded: ${account}/${profile}/${environment}`, 'success');
        logEvent('TEALIUM', 'Library loaded successfully');
        
        // Trigger initial page view
        setTimeout(() => {
            triggerPageView();
        }, 500);
    };
    
    script.onerror = function() {
        updateTealiumStatus(false);
        showToast('Failed to load Tealium. Check configuration.', 'error');
        logEvent('ERROR', 'Failed to load Tealium library');
    };
    
    document.head.appendChild(script);
    showToast('Loading Tealium...', 'info');
    updateTealiumStatus(false, 'Loading...');
}

/**
 * Update Tealium status display
 */
function updateTealiumStatus(loaded = false, customMessage = null) {
    const statusElement = document.getElementById('tealium-status');
    const statusText = statusElement.querySelector('.status-text');
    
    if (customMessage) {
        statusText.textContent = `Tealium Status: ${customMessage}`;
        statusElement.className = 'status-indicator';
        return;
    }
    
    if (loaded) {
        statusText.textContent = 'Tealium Status: Loaded & Ready';
        statusElement.className = 'status-indicator loaded';
    } else {
        statusText.textContent = 'Tealium Status: Not Loaded';
        statusElement.className = 'status-indicator';
    }
}

// Global error handler
window.addEventListener('error', function(e) {
    logEvent('ERROR', `JavaScript Error: ${e.message}`, {
        filename: e.filename,
        lineno: e.lineno,
        error: e.error
    });
});

// Export functions for console testing
window.productsPageDebug = {
    addToCart,
    viewProduct,
    triggerPageView,
    showDataLayer,
    productData,
    cartItems,
    wishlistItems
};
