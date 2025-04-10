/* ================ Collection Page Quick View ================ */
theme.QuickView = (function() {
  var selectors = {
    quickViewTrigger: '.quick-view-trigger',
    quickViewPopupWrapper: '[data-quick-view-popup-wrapper]',
    quickViewPopup: '[data-quick-view-popup]',
    quickViewTitle: '[data-quick-view-title]',
    quickViewPrice: '[data-quick-view-price]',
    quickViewDescription: '[data-quick-view-description]',
    quickViewVariantSelector: '[data-quick-view-variant-selector]',
    quickViewFormContainer: '[data-quick-view-form-container]',
    quickViewDetailsLink: '[data-quick-view-details-link]',
    quickViewClose: '[data-quick-view-popup-close]',
    quickViewDismiss: '[data-quick-view-popup-dismiss]',
    quickViewImageWrapper: '[data-quick-view-image-wrapper]',
    quickViewImagePlaceholder: '[data-quick-view-image-placeholder]'
  };

  function QuickView() {
    this.init();
  }

  QuickView.prototype = Object.assign({}, QuickView.prototype, {
    init: function() {
      // Adding event listeners to Quick View buttons
      $(document).on('click', selectors.quickViewTrigger, this._onQuickViewTrigger.bind(this));

      // Setup popup closer listeners
      this._setupQuickViewEventListeners();
    },

    _onQuickViewTrigger: function(evt) {
      evt.preventDefault();
      var $quickViewBtn = $(evt.currentTarget);
      var productUrl = $quickViewBtn.data('product-url');
      var productId = $quickViewBtn.data('product-id');
      
      // Show loading state on the button
      $quickViewBtn.addClass('btn--loading');
      
      // Load product data
      this._loadProductData(productUrl);
      
      return false;
    },

    _loadProductData: function(productUrl) {
      var _this = this;
      
      // Fetch the product page HTML
      $.get(productUrl, function(data) {
        var $data = $(data);
        
        // Extract product JSON
        var productJSON = null;
        var scriptContent = $data.filter('script:contains("window.ShopifyAnalytics.meta")').html();
        
        if (scriptContent) {
          var match = scriptContent.match(/var meta = (.*);/);
          if (match && match[1]) {
            try {
              var meta = JSON.parse(match[1]);
              productJSON = meta.product;
            } catch (e) {
              console.error('Error parsing product JSON', e);
            }
          }
        }
        
        if (!productJSON) {
          console.error('Could not find product JSON');
          return;
        }
        
        // Extract product form
        var $productForm = $data.find('.product-form[data-product-form]').clone();
        
        // Update Quick View popup with product data
        _this._updateQuickViewContent(productJSON, $productForm);
        
        // Remove loading state from any quick view buttons for this product
        $('[data-product-id="' + productJSON.id + '"]').removeClass('btn--loading');
      });
    },

    _updateQuickViewContent: function(product, $productForm) {
      // Setup selectors
      this.$quickViewPopupWrapper = this.$quickViewPopupWrapper || $(selectors.quickViewPopupWrapper);
      this.$quickViewPopup = this.$quickViewPopup || $(selectors.quickViewPopup);
      this.$quickViewTitle = this.$quickViewTitle || $(selectors.quickViewTitle);
      this.$quickViewPrice = this.$quickViewPrice || $(selectors.quickViewPrice);
      this.$quickViewDescription = this.$quickViewDescription || $(selectors.quickViewDescription);
      this.$quickViewVariantSelector = this.$quickViewVariantSelector || $(selectors.quickViewVariantSelector);
      this.$quickViewFormContainer = this.$quickViewFormContainer || $(selectors.quickViewFormContainer);
      this.$quickViewDetailsLink = this.$quickViewDetailsLink || $(selectors.quickViewDetailsLink);
      this.$quickViewImageWrapper = this.$quickViewImageWrapper || $(selectors.quickViewImageWrapper);
      
      // Update popup content
      this.$quickViewTitle.text(product.title);
      
      // Set image
      if (product.featured_image) {
        var $image = $('<img>', {
          src: product.featured_image,
          alt: product.title,
          class: 'quick-view-popup__image'
        });
        
        this.$quickViewImageWrapper.find('img').remove();
        this.$quickViewImageWrapper.append($image);
      }
      
      // Update price
      var currentVariant = product.variants[0];
      if (currentVariant) {
        var priceHtml = '<span class="product__price">';
        if (currentVariant.compare_at_price > currentVariant.price) {
          priceHtml += '<s class="product__price product__price--compare">' + 
            theme.Currency.formatMoney(currentVariant.compare_at_price, theme.moneyFormat) + '</s> ';
          priceHtml += '<span class="product__price product__price--sale">' + 
            theme.Currency.formatMoney(currentVariant.price, theme.moneyFormat) + '</span>';
        } else {
          priceHtml += theme.Currency.formatMoney(currentVariant.price, theme.moneyFormat);
        }
        priceHtml += '</span>';
        this.$quickViewPrice.html(priceHtml);
      }
      
      // Update description (truncated)
      if (product.description) {
        var shortDescription = product.description.split('<!-- split -->')[0];
        if (!shortDescription || shortDescription === product.description) {
          shortDescription = product.description.substring(0, 300);
          if (product.description.length > 300) {
            shortDescription += '...';
          }
        }
        this.$quickViewDescription.html(shortDescription);
      } else {
        this.$quickViewDescription.html('');
      }
      
      // Add form
      this.$quickViewFormContainer.html('');
      
      // Create a simplified add to cart form
      var $simpleForm = $('<form>', {
        action: '/cart/add',
        method: 'post',
        class: 'quick-view-form',
        enctype: 'multipart/form-data'
      });
      
      // Add variant select only if there are multiple variants
      if (product.variants.length > 1) {
        var $variantSelect = $('<select>', {
          name: 'id',
          class: 'quick-view-variant-selector'
        });
        
        product.variants.forEach(function(variant) {
          var $option = $('<option>', {
            value: variant.id,
            text: variant.title
          });
          
          if (!variant.available) {
            $option.attr('disabled', 'disabled').text(variant.title + ' - Sold Out');
          }
          
          $variantSelect.append($option);
        });
        
        $simpleForm.append($variantSelect);
      } else {
        // Just a hidden input for the variant ID
        var $variantInput = $('<input>', {
          type: 'hidden',
          name: 'id',
          value: product.variants[0].id
        });
        
        $simpleForm.append($variantInput);
      }
      
      // Add quantity input
      var $quantityContainer = $('<div>', {
        class: 'quick-view-quantity'
      });
      
      var $quantityLabel = $('<label>', {
        for: 'Quantity-quickview',
        text: theme.strings.quantity || 'Quantity'
      });
      
      var $quantityInput = $('<input>', {
        type: 'number',
        id: 'Quantity-quickview',
        name: 'quantity',
        value: 1,
        min: 1,
        class: 'quick-view-quantity-input'
      });
      
      $quantityContainer.append($quantityLabel, $quantityInput);
      $simpleForm.append($quantityContainer);
      
      // Add submit button
      var $submitBtn = $('<button>', {
        type: 'submit',
        name: 'add',
        class: 'btn quick-view-add-to-cart-btn',
        text: product.available ? (theme.strings.addToCart || 'Add to Cart') : (theme.strings.soldOut || 'Sold Out')
      });
      
      if (!product.available) {
        $submitBtn.attr('disabled', 'disabled');
      }
      
      $simpleForm.append($submitBtn);
      
      // Add event listener for form submission
      $simpleForm.on('submit', this._handleAddToCart.bind(this));
      
      // Add the form to the container
      this.$quickViewFormContainer.append($simpleForm);
      
      // Update details link
      this.$quickViewDetailsLink.attr('href', '/products/' + product.handle);
      
      // Show the popup
      this._showQuickViewPopup();
    },
    
    _handleAddToCart: function(evt) {
      evt.preventDefault();
      var $form = $(evt.target);
      var $submitBtn = $form.find('button[type="submit"]');
      
      // Disable the Add to Cart button
      $submitBtn.attr('disabled', 'disabled').addClass('btn--loading');
      
      // Add item to cart
      $.ajax({
        url: '/cart/add.js',
        method: 'POST',
        data: $form.serialize(),
        dataType: 'json',
        success: function(item) {
          // Update cart count and show cart popup
          $.getJSON('/cart.js', function(cart) {
            // Update cart count
            if (theme.updateCartCount) {
              theme.updateCartCount(cart.item_count);
            }
            
            // Close quick view and show cart popup if available
            this._hideQuickViewPopup();
            
            // Show cart popup if it exists
            if (typeof theme.collectionAjaxCart !== 'undefined') {
              theme.collectionAjaxCart._setupCartPopup(item);
            }
          }.bind(this));
        }.bind(this),
        error: function(response) {
          var errorMessage = response.responseJSON ? 
            response.responseJSON.description : 
            theme.strings.cartError || 'Error adding item to cart';
          
          alert(errorMessage);
          $submitBtn.removeAttr('disabled').removeClass('btn--loading');
        }
      });
      
      return false;
    },

    _showQuickViewPopup: function() {
      this.$quickViewPopupWrapper = this.$quickViewPopupWrapper || $(selectors.quickViewPopupWrapper);
      this.$quickViewPopup = this.$quickViewPopup || $(selectors.quickViewPopup);

      this.$quickViewPopupWrapper
        .prepareTransition()
        .removeClass('quick-view-popup-wrapper--hidden');
      this.$quickViewPopup.focus();
      this._setupQuickViewEventListeners();
    },

    _hideQuickViewPopup: function(event) {
      this.$quickViewPopupWrapper = this.$quickViewPopupWrapper || $(selectors.quickViewPopupWrapper);
      this.$quickViewPopup = this.$quickViewPopup || $(selectors.quickViewPopup);

      this.$quickViewPopupWrapper
        .prepareTransition()
        .addClass('quick-view-popup-wrapper--hidden');
    },

    _setupQuickViewEventListeners: function() {
      this.$quickViewPopupWrapper = this.$quickViewPopupWrapper || $(selectors.quickViewPopupWrapper);
      this.$quickViewPopup = this.$quickViewPopup || $(selectors.quickViewPopup);
      this.$quickViewClose = this.$quickViewClose || $(selectors.quickViewClose);
      this.$quickViewDismiss = this.$quickViewDismiss || $(selectors.quickViewDismiss);

      // Setup event handlers
      this.$quickViewPopupWrapper.off('keyup.quickView');
      this.$quickViewPopupWrapper.on(
        'keyup.quickView',
        this._handleKeyUp.bind(this)
      );

      this.$quickViewClose.off('click.quickView');
      this.$quickViewClose.on('click.quickView', this._hideQuickViewPopup.bind(this));
      
      this.$quickViewDismiss.off('click.quickView');
      this.$quickViewDismiss.on('click.quickView', this._hideQuickViewPopup.bind(this));
      
      $('body').off('click.quickView');
      $('body').on('click.quickView', this._handleBodyClick.bind(this));
    },

    _handleKeyUp: function(event) {
      if (event.keyCode === 27) { // Escape key
        this._hideQuickViewPopup();
      }
    },

    _handleBodyClick: function(event) {
      var $target = $(event.target);
      if (
        this.$quickViewPopupWrapper &&
        this.$quickViewPopupWrapper.length &&
        $target[0] !== this.$quickViewPopupWrapper[0] &&
        !$target.parents(selectors.quickViewPopup).length &&
        !$target.hasClass('quick-view-trigger')
      ) {
        this._hideQuickViewPopup();
      }
    }
  });

  return QuickView;
})();

// Initialize the quick view
$(document).ready(function() {
  theme.quickView = new theme.QuickView();
}); 