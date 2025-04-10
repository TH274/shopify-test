/* ================ Collection Page AJAX Add to Cart ================ */
theme.CollectionAjaxCart = (function() {
    var selectors = {
      addToCartBtn: '.js-ajax-submit',
      cartPopupWrapper: '[data-cart-popup-wrapper]',
      cartPopup: '[data-cart-popup]',
      cartPopupTitle: '[data-cart-popup-title]',
      cartPopupQuantity: '[data-cart-popup-quantity]',
      cartPopupQuantityLabel: '[data-cart-popup-quantity-label]',
      cartPopupClose: '[data-cart-popup-close]',
      cartPopupDismiss: '[data-cart-popup-dismiss]',
      cartPopupImageWrapper: '[data-cart-popup-image-wrapper]',
      cartPopupImagePlaceholder: '[data-cart-popup-image-placeholder]',
      cartPopupProductDetails: '[data-cart-popup-product-details]',
      cartPopupCartQuantity: '[data-cart-popup-cart-quantity]',
      cartCountBubble: '[data-cart-count-bubble]',
      cartCount: '[data-cart-count]'
    };
  
    function CollectionAjaxCart() {
      this.init();
    }
  
    CollectionAjaxCart.prototype = Object.assign({}, CollectionAjaxCart.prototype, {
      init: function() {
        // Adding event listeners to "Add to cart" buttons on collection page
        $(document).on('click', selectors.addToCartBtn, this._onAddToCart.bind(this));
  
        // Setup popup closer listeners
        this._setupCartPopupEventListeners();
      },
  
      _onAddToCart: function(evt) {
        evt.preventDefault();
        var $addToCartBtn = $(evt.currentTarget);
        var $form = $addToCartBtn.closest('form');
        
        // Disable the Add to Cart button
        $addToCartBtn.attr('disabled', 'disabled').addClass('btn--loading');
  
        // Add item to cart
        this._addItemToCart($form);
        
        return false;
      },
  
      _addItemToCart: function($form) {
        var params = {
          url: '/cart/add.js',
          data: $form.serialize(),
          dataType: 'json'
        };
  
        $.post(params)
          .done(
            function(item) {
              this._setupCartPopup(item);
              this._hideErrorMessage();
            }.bind(this)
          )
          .fail(
            function(response) {
              this._showErrorMessage(response.responseJSON
                ? response.responseJSON.description
                : theme.strings.cartError);
              this._resetButtonState($form.find(selectors.addToCartBtn));
            }.bind(this)
          );
      },
  
      _setupCartPopup: function(item) {
        this._setupCartPopupEventListeners();
        this._updateCartPopupContent(item);
      },
  
      _updateCartPopupContent: function(item) {
        var quantity = this.$quantityInput.length ? this.$quantityInput.val() : 1;
  
        $(selectors.cartPopupTitle).text(item.product_title);
        $(selectors.cartPopupQuantity).text(quantity);
        $(selectors.cartPopupQuantityLabel).text(
          theme.strings.quantityLabel.replace('[count]', quantity)
        );
  
        this._setCartPopupPlaceholder(
          item.featured_image.url,
          item.featured_image.aspect_ratio
        );
        this._setCartPopupImage(item.featured_image.url, item.featured_image.alt);
        this._setCartPopupProductDetails(
          item.product_has_only_default_variant,
          item.options_with_values,
          item.properties
        );
  
        $.getJSON('/cart.js').then(
          function(cart) {
            this._setCartQuantity(cart.item_count);
            this._setCartCountBubble(cart.item_count);
            this._showCartPopup();
            
            this._resetButtonState($(selectors.addToCartBtn));
          }.bind(this)
        );
      },
  
      _setCartPopupPlaceholder: function(imageUrl, imageAspectRatio) {
        this.$cartPopupImagePlaceholder = this.$cartPopupImagePlaceholder || $(
          selectors.cartPopupImagePlaceholder
        );
  
        if (imageUrl === null) {
          this.$cartPopupImagePlaceholder.addClass('hide');
          return;
        }
  
        var $placeholder = this.$cartPopupImagePlaceholder.removeClass('hide');
        var $placeholderSVG = $placeholder.find('svg');
        var $placeholderImg = $placeholder.find('img');
  
        if ($placeholderImg.length) {
          $placeholderImg.css('max-height', '100%');
        } else if ($placeholderSVG.length) {
          $placeholderSVG.css('max-height', '100%');
        }

        var popupHeight = 260 / imageAspectRatio;
        var popupSize = 150;
        var remainingHeight = popupHeight - popupSize;
  
        if (remainingHeight > 0) {
          this.$cartPopupImageWrapper = this.$cartPopupImageWrapper || $(
            selectors.cartPopupImageWrapper
          );
          this.$cartPopupImageWrapper.css('padding-top', remainingHeight + 'px');
        }
  
        $placeholder.find('[data-placeholder-size]').css({
          width: popupSize + 'px',
          height: popupSize + 'px'
        });
      },
  
      _setCartPopupImage: function(imageUrl, imageAlt) {
        if (imageUrl === null) return;
  
        this.$cartPopupImageWrapper = this.$cartPopupImageWrapper || $(
          selectors.cartPopupImageWrapper
        );
        this.$cartPopupImagePlaceholder = this.$cartPopupImagePlaceholder || $(
          selectors.cartPopupImagePlaceholder
        );
  
        var $cartPopupImageEl = $('<img>', {
          src: imageUrl,
          alt: imageAlt,
          class: 'cart-popup-item__image'
        });
  
        $cartPopupImageEl.on('load', function() {
          this.$cartPopupImagePlaceholder.addClass('hide');
          this.$cartPopupImageWrapper.removeClass('hide').append($cartPopupImageEl);
          $cartPopupImageEl.css('max-height', $cartPopupImageEl.width() + 'px');
        }.bind(this));
      },
  
      _setCartPopupProductDetails: function(
        productHasOnlyDefaultVariant,
        options,
        properties
      ) {
        this.$cartPopupProductDetails = this.$cartPopupProductDetails || $(
          selectors.cartPopupProductDetails
        );
        var variantPropertiesHTML = '';
  
        if (!productHasOnlyDefaultVariant) {
          variantPropertiesHTML = variantPropertiesHTML + this._getVariantOptionList(options);
        }
  
        if (properties !== null && Object.keys(properties).length !== 0) {
          variantPropertiesHTML = variantPropertiesHTML + this._getPropertyList(properties);
        }
  
        this.$cartPopupProductDetails.html(variantPropertiesHTML);
      },
  
      _getVariantOptionList: function(variantOptions) {
        var variantOptionListHTML = '';
  
        variantOptions.forEach(function(variantOption) {
          variantOptionListHTML =
            variantOptionListHTML +
            '<li class="product-details__item product-details__item--variant-option">' +
            variantOption.name +
            ': ' +
            variantOption.value +
            '</li>';
        });
  
        return variantOptionListHTML;
      },
  
      _getPropertyList: function(properties) {
        var propertyListHTML = '';
        var propertiesArray = Object.entries(properties);
  
        propertiesArray.forEach(function(property) {
          // Line item properties prefixed with an underscore are not to be displayed
          if (property[0].charAt(0) === '_') return;
  
          // if the property value has a length of 0 (empty), don't display it
          if (property[1].length === 0) return;
  
          propertyListHTML =
            propertyListHTML +
            '<li class="product-details__item product-details__item--property">' +
            '<span class="product-details__property-label">' +
            property[0] +
            ': </span>' +
            property[1];
          '</li>';
        });
  
        return propertyListHTML;
      },
  
      _setCartQuantity: function(quantity) {
        var ariaLabel;
  
        if (quantity === 1) {
          ariaLabel = theme.strings.oneCartCount;
        } else if (quantity > 1) {
          ariaLabel = theme.strings.otherCartCount.replace('[count]', quantity);
        }
  
        this.$cartPopupCartQuantity = this.$cartPopupCartQuantity || $(
          selectors.cartPopupCartQuantity
        );
        this.$cartPopupCartQuantity.text(quantity).attr('aria-label', ariaLabel);
      },
  
      _setCartCountBubble: function(quantity) {
        this.$cartCountBubble = this.$cartCountBubble || $(selectors.cartCountBubble);
        this.$cartCount = this.$cartCount || $(selectors.cartCount);
  
        if (quantity === 0) {
          this.$cartCountBubble.removeClass('cart-count-bubble--visible');
          return;
        }
        this.$cartCountBubble.addClass('cart-count-bubble--visible');
        this.$cartCount.text(quantity);
      },
  
      _showCartPopup: function() {
        this.$cartPopupWrapper = this.$cartPopupWrapper || $(
          selectors.cartPopupWrapper
        );
        this.$cartPopup = this.$cartPopup || $(selectors.cartPopup);
  
        this.$cartPopupWrapper
          .prepareTransition()
          .removeClass('cart-popup-wrapper--hidden');
        this.$cartPopup.focus();
      },
  
      _hideCartPopup: function(event) {
        var setFocus = event.detail === 0 ? true : false;
        this.$cartPopupWrapper = this.$cartPopupWrapper || $(
          selectors.cartPopupWrapper
        );
        this.$cartPopup = this.$cartPopup || $(selectors.cartPopup);
  
        this.$cartPopupWrapper
          .prepareTransition()
          .addClass('cart-popup-wrapper--hidden');
  
        $(selectors.cartPopupImage).remove();
        this.$cartPopupImagePlaceholder.removeClass('hide');
        this.$cartPopupImageWrapper.addClass('hide');
  
        slate.a11y.removeTrapFocus({
          $container: this.$cartPopup,
          namespace: 'cartPopup'
        });
  
        if (setFocus) this.$previouslyFocusedElement.focus();
      },
  
      _setupCartPopupEventListeners: function() {
        this.$cartPopupWrapper = this.$cartPopupWrapper || $(
          selectors.cartPopupWrapper
        );
        this.$cartPopup = this.$cartPopup || $(selectors.cartPopup);
        this.$cartPopupClose = this.$cartPopupClose || $(selectors.cartPopupClose);
        this.$cartPopupDismiss = this.$cartPopupDismiss || $(
          selectors.cartPopupDismiss
        );
  
        // Setup event handlers
        this.$cartPopupWrapper.on(
          'keyup',
          function(event) {
            if (event.keyCode === slate.utils.keyboardKeys.ESCAPE) {
              this._hideCartPopup(event);
            }
          }.bind(this)
        );
  
        this.$cartPopupClose.on('click', this._hideCartPopup.bind(this));
        this.$cartPopupDismiss.on('click', this._hideCartPopup.bind(this));
        $('body').on('click', this._onBodyClick.bind(this));
      },
  
      _onBodyClick: function(event) {
        this.$cartPopupWrapper = this.$cartPopupWrapper || $(
          selectors.cartPopupWrapper
        );
  
        var $target = $(event.target);
        if (
          $target[0] !== this.$cartPopupWrapper[0] &&
          !$target.parents(selectors.cartPopup).length
        ) {
          this._hideCartPopup(event);
        }
      },
  
      _showErrorMessage: function(errorMessage) {
        var $errorMessageContainer = $('.js-ajax-error-message');
        $errorMessageContainer.html(errorMessage);
        $errorMessageContainer.removeClass('hide');
  
        setTimeout(function() {
          $errorMessageContainer.addClass('hide');
        }, 5000);
      },
  
      _hideErrorMessage: function() {
        $('.js-ajax-error-message').addClass('hide');
      },
  
      _resetButtonState: function($button) {
        $button.removeAttr('disabled').removeClass('btn--loading');
      }
    });
  
    return CollectionAjaxCart;
  })();
  
  theme.collectionAjaxCart = new theme.CollectionAjaxCart();