/* ===================================================
   ID Card — hero student-ID interactions
   (split out of github-widgets.js: drop-in entrance, 3D tilt,
   click-to-flip, lightbox enlarge viewer)
   =================================================== */
    // ---- Hero: ID badge — drop-in, mouse tilt, click to flip ----
    (function(){
      var wrap = document.getElementById('hero-badge-wrap');
      var card = document.getElementById('hero-badge-card');
      var media = document.getElementById('hero-media');
      if (!wrap || !card) return;

      var reducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var finePointer = window.matchMedia &&
        window.matchMedia('(pointer: fine)').matches;

      // Image error fallback (exposed for the inline onerror attr)
      window._heroBadgeImgError = function(img) {
        var fallback = document.getElementById('hero-badge-photo-fallback');
        img.style.display = 'none';
        if (fallback) fallback.style.display = 'flex';
      };

      // Real QR error fallback → decorative pattern
      window._heroBadgeQrError = function(img) {
        img.style.display = 'none';
        var fb = document.getElementById('hero-badge-qr-fallback');
        if (fb) fb.style.display = 'block';
      };

      // Drop-in entrance (strap unreels via CSS once hero-revealed is added)
      if (reducedMotion) {
        wrap.classList.add('hero-revealed');
      } else {
        requestAnimationFrame(function() {
          wrap.classList.add('hero-revealed');
        });
      }

      // Point the back-side QR + site link at the live site (graceful fallback if offline).
      // renderPortfolio() overrides the QR with the admin-set QR link when present.
      var site = window.location.origin + window.location.pathname;
      if (/index\.html$/.test(site)) site = site.replace(/index\.html$/, '');
      if (!site || site.indexOf('http') !== 0) site = (window.PORTFOLIO_META && window.PORTFOLIO_META.siteUrl) || 'https://brokeCode05.github.io/portfolio/';
      var qr = document.getElementById('hero-badge-qr-real');
      if (qr) {
        qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=' +
          encodeURIComponent(site);
      }
      var backSiteLink = document.querySelector('.hero-badge-back-link-site');
      if (backSiteLink) backSiteLink.href = site;

      // ── 3D mouse tilt (fine pointers only; card follows the cursor) ──
      // The card hangs at a small resting tilt and leans toward the cursor
      // while hovering the hero. Lerped per-frame for a smooth physical feel.
      var TILT_X = 4, TILT_Y = -3;  // resting tilt (deg), mirrors the old static pose
      var curX = TILT_X, curY = TILT_Y;
      var targetX = TILT_X, targetY = TILT_Y;
      var tiltRaf = null;

      function applyTilt() {
        curX += (targetX - curX) * 0.14;
        curY += (targetY - curY) * 0.14;
        card.style.transform =
          'perspective(1000px) rotateX(' + curX.toFixed(2) + 'deg) rotateY(' + curY.toFixed(2) + 'deg)';
        if (Math.abs(targetX - curX) > 0.02 || Math.abs(targetY - curY) > 0.02) {
          tiltRaf = requestAnimationFrame(applyTilt);
        } else {
          tiltRaf = null;
        }
      }

      function setTiltTarget(x, y) {
        targetX = x; targetY = y;
        if (!tiltRaf) tiltRaf = requestAnimationFrame(applyTilt);
      }

      if (finePointer && !reducedMotion) {
        var zone = media || wrap;
        zone.addEventListener('mousemove', function(e) {
          var r = card.getBoundingClientRect();
          if (!r.width || !r.height) return;
          var nx = (e.clientX - r.left) / r.width - 0.5;   // -0.5..0.5 across the card
          var ny = (e.clientY - r.top) / r.height - 0.5;
          // Lean into the cursor: tilt X follows vertical, Y follows horizontal
          setTiltTarget(TILT_X - ny * 10, TILT_Y + nx * 14);
        });
        zone.addEventListener('mouseleave', function() {
          setTiltTarget(TILT_X, TILT_Y);
        });
      }

      // ── Click / tap / keyboard to flip the ID over ──
      function setFlipped(on) {
        card.classList.toggle('flipped', on);
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
        card.setAttribute('aria-label',
          (on ? 'Student ID badge — back side. ' : 'Student ID badge — ') +
          'Click to flip. Use the corner button to enlarge.');
      }
      card.addEventListener('click', function() {
        setFlipped(!card.classList.contains('flipped'));
      });
      card.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === card) {
          e.preventDefault();
          setFlipped(!card.classList.contains('flipped'));
        }
      });

      // The back-side site link opens the profile instead of flipping the card
      var backSiteLink = card.querySelector('.hero-badge-back-link-site');
      if (backSiteLink) {
        backSiteLink.addEventListener('click', function(e) {
          e.stopPropagation();
        });
      }
      // The front GitHub handle opens the profile instead of flipping the card
      var frontHandle = card.querySelector('.hero-badge-handle');
      if (frontHandle) {
        frontHandle.addEventListener('click', function(e) {
          e.stopPropagation();
        });
      }

      // ── Enlarge the ID in a lightbox viewer (click-to-flip stays on the card) ──
      var expandBtn = document.getElementById('hero-badge-expand');
      var idOverlay = document.getElementById('idzoom-overlay');
      var idModal = document.getElementById('idzoom-modal');
      var idBody = document.getElementById('idzoom-body');
      var idClose = document.getElementById('idzoom-close');
      var idFlip = document.getElementById('idzoom-flip');
      var idCloseTimer = null;
      if (expandBtn && idOverlay && idModal && idBody) {
        function openIdZoom() {
          if (idCloseTimer) { clearTimeout(idCloseTimer); idCloseTimer = null; }
          // Clear any leftover closing state so the fresh stage plays the pop.
          idModal.classList.remove('closing');
          // Clone the card so the small one keeps its own state and handlers.
          var clone = card.cloneNode(true);
          // Strip ids so the clone never collides with the live card.
          clone.removeAttribute('id');
          clone.querySelectorAll('[id]').forEach(function(el) { el.removeAttribute('id'); });
          clone.classList.remove('flipped');
          clone.setAttribute('aria-label', 'Student ID card — enlarged. Click to flip.');
          clone.addEventListener('click', function() {
            clone.classList.toggle('flipped');
          });
          clone.addEventListener('keydown', function(ev) {
            if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === clone) {
              ev.preventDefault();
              clone.classList.toggle('flipped');
            }
          });
          // Inner links open normally without flipping the card.
          clone.querySelectorAll('a').forEach(function(a) {
            a.addEventListener('click', function(ev) { ev.stopPropagation(); });
          });
          // Wrap the clone in a stage so the entrance animation never fights
          // the card's own flip transform.
          var stage = document.createElement('div');
          stage.className = 'idzoom-stage';
          idBody.innerHTML = '';
          stage.appendChild(clone);
          idBody.appendChild(stage);
          idOverlay.hidden = false;
          idModal.hidden = false;
          requestAnimationFrame(function() { idOverlay.classList.add('open'); });
          document.body.classList.add('modal-open');
          if (idClose) idClose.focus();
        }
        function closeIdZoom() {
          if (idCloseTimer) return;
          idOverlay.classList.remove('open');
          idModal.classList.add('closing');
          document.body.classList.remove('modal-open');
          // Reduced-motion users get an instant hide (no exit animation, no delay).
          if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            idOverlay.hidden = true;
            idModal.hidden = true;
            idModal.classList.remove('closing');
            idBody.innerHTML = '';
            if (expandBtn) expandBtn.focus();
            return;
          }
          idCloseTimer = setTimeout(function() {
            idOverlay.hidden = true;
            idModal.hidden = true;
            idModal.classList.remove('closing');
            idBody.innerHTML = '';
            idCloseTimer = null;
          }, 460);
          if (expandBtn) expandBtn.focus();
        }
        expandBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          openIdZoom();
        });
        if (idClose) idClose.addEventListener('click', closeIdZoom);
        if (idFlip) {
          idFlip.addEventListener('click', function() {
            var cc = idBody.querySelector('.hero-badge-card');
            if (cc) cc.classList.toggle('flipped');
          });
        }
        idOverlay.addEventListener('click', function(e) {
          if (e.target === idOverlay) closeIdZoom();
        });
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && !idOverlay.hidden) closeIdZoom();
          else if (e.key === 'Tab' && !idOverlay.hidden) {
            if (window.trapFocus) window.trapFocus(e, idModal);
          }
        });
      }
    })();