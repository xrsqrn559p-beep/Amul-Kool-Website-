import './style.css';

// Configuration
const totalFrames = 233;
const images = [];
let loadedCount = 0;

// Rendering & Animation State
let currentFrame = 1;
let targetFrame = 1;
const lerpFactor = 0.08; // High-end organic scroll smoothing factor
let entranceStartTime = null;
const entranceDuration = 1500; // 1.5 seconds

// DOM Elements
const canvas = document.getElementById('scroll-canvas');
const ctx = canvas.getContext('2d');
const preloader = document.getElementById('preloader');
const loadProgressBar = document.getElementById('load-progress-bar');

// 1. Asynchronous Image Preloader
const preloadImages = () => {
  return new Promise((resolve) => {
    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      
      img.onload = () => handleImageLoad(resolve);
      img.onerror = () => {
        console.warn(`Failed to preload frame ${i}`);
        handleImageLoad(resolve);
      };
      
      const frameNum = String(i).padStart(3, '0');
      img.src = `/frames/ezgif-frame-${frameNum}.jpg`;
      images.push(img);
    }
  });
};

const handleImageLoad = (resolve) => {
  loadedCount++;
  const pct = Math.floor((loadedCount / totalFrames) * 100);
  
  if (loadProgressBar) {
    loadProgressBar.style.width = `${pct}%`;
  }

  if (loadedCount === totalFrames) {
    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('loaded');
      }
      resolve();
    }, 800); // Cinematic fade-in transition delay
  }
};

// Caching variables for high performance (No Layout Reflows)
let wrapperElement = null;
let cachedScrollableRange = 0;
let cachedViewportHeight = 0;

let heroTextElement = null;
let lastHeroOpacity = -1;
let lastHeroTranslateY = -999;

let timelineElement = null;
let timelineScrollFillElement = null;
let cachedTimelineOffsetTop = 0;
let cachedTimelineHeight = 0;

let cachedSections = [];
let navLinksElements = [];
let lastActiveSectionId = '';

let mainNavElement = null;
let lastScrolledState = null;
let lastLightThemeState = null;

let btnScrollTopElement = null;
let lastScrollWidgetsState = null;

const cacheLayoutSizes = () => {
  wrapperElement = wrapperElement || document.getElementById('animation-wrapper');
  if (wrapperElement) {
    const wrapperHeight = wrapperElement.offsetHeight;
    cachedViewportHeight = window.innerHeight;
    cachedScrollableRange = wrapperHeight - cachedViewportHeight;
  }

  timelineElement = timelineElement || document.getElementById('section-timeline');
  timelineScrollFillElement = timelineScrollFillElement || document.getElementById('timeline-scroll-fill');
  if (timelineElement) {
    cachedTimelineOffsetTop = timelineElement.offsetTop;
    cachedTimelineHeight = timelineElement.offsetHeight;
  }

  const sections = [
    document.getElementById('animation-wrapper'),
    document.getElementById('section-benefits'),
    document.getElementById('section-ingredients'),
    document.getElementById('section-gallery'),
    document.getElementById('section-locator'),
    document.getElementById('footer')
  ];
  
  cachedSections = sections.map(section => {
    if (section) {
      return {
        id: section.getAttribute('id'),
        top: section.offsetTop,
        height: section.offsetHeight
      };
    }
    return null;
  }).filter(Boolean);

  navLinksElements = Array.from(document.querySelectorAll('.nav-link'));
};

// 2. High-Performance Canvas Scaling (Aspect Cover Fit)
const resizeCanvas = () => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;

  cacheLayoutSizes();
  drawFrame(Math.round(currentFrame));
};

let lastRenderedFrame = -1;

const drawFrame = (frameIndex) => {
  const index = Math.min(Math.max(Math.round(frameIndex), 1), totalFrames);
  if (index === lastRenderedFrame) return; // Skip redundant canvas draws!

  const img = images[index - 1];
  if (!img || !img.complete) return;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const imgWidth = img.width;
  const imgHeight = img.height;

  // Object-fit: cover scaling math
  const scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
  const x = (canvasWidth / 2) - (imgWidth / 2) * scale;
  const y = (canvasHeight / 2) - (imgHeight / 2) * scale;
  const width = imgWidth * scale;
  const height = imgHeight * scale;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, width, height);

  lastRenderedFrame = index;
};

// 3. Scroll Tracker (Map Scroll Position within the Animation Wrapper to Frame Index)
const updateScrollState = (scrollTop) => {
  const progress = cachedScrollableRange > 0 ? Math.min(Math.max(scrollTop / cachedScrollableRange, 0), 1) : 0;
  targetFrame = 1 + progress * (totalFrames - 1);
};

// 4. Kinetic Render Loop (Lerp Interpolation Physics)
const updateHeroTextAnimation = (scrollTop) => {
  if (!heroTextElement) heroTextElement = document.getElementById('hero-text-overlay');
  if (!heroTextElement) return;

  let opacity = 1;
  let translateY = 0;

  if (scrollTop === 0) {
    // Entrance Animation Phase (only if page is not scrolled)
    if (!entranceStartTime) {
      if (preloader && preloader.classList.contains('loaded')) {
        entranceStartTime = performance.now();
      } else {
        heroTextElement.style.opacity = 0;
        return;
      }
    }
    
    const elapsed = performance.now() - entranceStartTime;
    const entranceProgress = Math.min(elapsed / entranceDuration, 1);
    
    // easeOutCubic curve for premium entrance
    const ease = 1 - Math.pow(1 - entranceProgress, 3);
    opacity = ease;
    translateY = 30 * (1 - ease); // Fades in and slides up from 30px to 0px
  } else {
    // Scroll Scrubbing Animation Phase
    entranceStartTime = 1; // bypass entrance animation if user scrolled early
    
    const progress = cachedScrollableRange > 0 ? Math.min(Math.max(scrollTop / cachedScrollableRange, 0), 1) : 0;

    // 0% to 30% scroll progress: gradually fades out and slides up
    if (progress <= 0.3) {
      const t = progress / 0.3; // scale from 0% - 30% to [0, 1]
      opacity = 1 - t;
      translateY = -40 * t; // moves upward to -40px
    } else {
      opacity = 0;
      translateY = -40;
    }
  }

  // Only write to DOM if visual properties changed
  if (opacity !== lastHeroOpacity || translateY !== lastHeroTranslateY) {
    heroTextElement.style.opacity = opacity;
    heroTextElement.style.transform = `translate3d(0, ${translateY}px, 0)`; // GPU layer acceleration
    lastHeroOpacity = opacity;
    lastHeroTranslateY = translateY;
  }
};

let lastScrollTop = -1;

const tick = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  
  if (scrollTop !== lastScrollTop) {
    updateScrollState(scrollTop);
    handleScrollWidgets(scrollTop);
    updateTimelineScroll(scrollTop);
    if (window.updateNavScroll) window.updateNavScroll(scrollTop);
    if (window.trackActiveSection) window.trackActiveSection(scrollTop);
    lastScrollTop = scrollTop;
  }

  const frameDiff = targetFrame - currentFrame;
  if (Math.abs(frameDiff) > 0.01) {
    currentFrame += frameDiff * lerpFactor;
    drawFrame(currentFrame);
  } else {
    currentFrame = targetFrame;
    drawFrame(currentFrame);
  }

  updateHeroTextAnimation(scrollTop);

  requestAnimationFrame(tick);
};

// 5. Navigation Bar Logic (Blur, Theme Transitions, Active Highlighting, Mobile Toggle)
const initNavigation = () => {
  const mainNav = document.getElementById('main-nav');
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileOverlay = document.getElementById('mobile-menu-overlay');

  if (!mainNav) return;

  // 1. Scroll-Based Theme and Blur updates
  window.updateNavScroll = (scrollTop) => {
    const isScrolled = scrollTop > 50;
    if (isScrolled !== lastScrolledState) {
      if (isScrolled) {
        mainNav.classList.add('scrolled');
      } else {
        mainNav.classList.remove('scrolled');
      }
      lastScrolledState = isScrolled;
    }

    // Switch themes when transitioning past the sticky canvas section
    const isLightTheme = scrollTop >= cachedScrollableRange;
    if (isLightTheme !== lastLightThemeState) {
      if (isLightTheme) {
        mainNav.classList.add('light-theme');
      } else {
        mainNav.classList.remove('light-theme');
      }
      lastLightThemeState = isLightTheme;
    }
  };

  window.updateNavScroll(window.scrollY || document.documentElement.scrollTop);

  // 2. Mobile Menu Toggling
  if (mobileToggle && mobileOverlay) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileToggle.classList.contains('open');
      if (isOpen) {
        mobileToggle.classList.remove('open');
        mobileOverlay.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      } else {
        mobileToggle.classList.add('open');
        mobileOverlay.classList.add('open');
        mobileToggle.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // 3. Smooth Navigation Scroll
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Close mobile menu if active
      if (mobileToggle && mobileToggle.classList.contains('open')) {
        mobileToggle.classList.remove('open');
        mobileOverlay.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }

      const targetId = link.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // 4. Scroll Active State Tracker (Active Link Highlight)
  window.trackActiveSection = (scrollTop) => {
    const scrollMiddle = scrollTop + (cachedViewportHeight / 3);
    let activeSectionId = 'animation-wrapper';

    for (let i = 0; i < cachedSections.length; i++) {
      const section = cachedSections[i];
      if (scrollMiddle >= section.top && scrollMiddle < section.top + section.height) {
        activeSectionId = section.id;
        break;
      }
    }

    if (activeSectionId !== lastActiveSectionId) {
      navLinksElements.forEach(link => {
        const targetSectionName = link.getAttribute('data-section');
        if (targetSectionName === activeSectionId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
      lastActiveSectionId = activeSectionId;
    }
  };

  window.trackActiveSection(window.scrollY || document.documentElement.scrollTop);
};

// 6. Timeline scroll path filling logic
const updateTimelineScroll = (scrollTop) => {
  if (!timelineElement || !timelineScrollFillElement) return;
  
  const entryPoint = scrollTop + cachedViewportHeight - cachedTimelineOffsetTop;
  
  let progress = 0;
  if (entryPoint > 0) {
    progress = Math.min(Math.max(entryPoint / (cachedTimelineHeight + cachedViewportHeight / 2), 0), 1);
  }
  
  timelineScrollFillElement.style.height = `${progress * 100}%`;
};

// 7. Video Player Modal Logic
let currentIframeSrc = '';
window.openVideoModal = () => {
  const modal = document.getElementById('video-modal');
  const modalContainer = document.getElementById('video-modal-container');
  const iframe = document.getElementById('modal-iframe');
  if (modal && iframe) {
    currentIframeSrc = 'https://www.youtube.com/embed/yQ21g9QWskE?autoplay=1';
    iframe.src = currentIframeSrc;
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
    if (modalContainer) {
      modalContainer.classList.remove('scale-90');
      modalContainer.classList.add('scale-100');
    }
  }
};

window.closeVideoModal = () => {
  const modal = document.getElementById('video-modal');
  const modalContainer = document.getElementById('video-modal-container');
  const iframe = document.getElementById('modal-iframe');
  if (modal && iframe) {
    iframe.src = '';
    modal.classList.remove('opacity-100', 'pointer-events-auto');
    modal.classList.add('opacity-0', 'pointer-events-none');
    if (modalContainer) {
      modalContainer.classList.remove('scale-100');
      modalContainer.classList.add('scale-90');
    }
  }
};

// 8. FAQ Accordion Logic
window.toggleFaq = (button) => {
  const content = button.nextElementSibling;
  const icon = button.querySelector('.material-symbols-outlined');
  
  const allFaqs = document.querySelectorAll('#section-faq .accordion-content');
  const allIcons = document.querySelectorAll('#section-faq button .material-symbols-outlined');
  
  allFaqs.forEach((item, index) => {
    if (item !== content) {
      item.classList.remove('open');
      if (allIcons[index]) {
        allIcons[index].style.transform = 'rotate(0deg)';
      }
    }
  });

  if (content) {
    const isOpen = content.classList.contains('open');
    if (isOpen) {
      content.classList.remove('open');
      if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
      content.classList.add('open');
      if (icon) icon.style.transform = 'rotate(180deg)';
    }
  }
};

// 9. Instagram Lightbox Gallery Logic
const instagramData = [
  {
    img: '/instagram_picnic_flatlay.png',
    user: '@kool_traveler',
    caption: 'Golden Sunsets & Rose Sips #AmulKool #RoseMilk',
    likes: '1,245 Likes • 42 Comments'
  },
  {
    img: '/instagram_cafe_flatlay.png',
    user: '@design_latte',
    caption: 'Midday Luxury Break #ExoticRose #AmulKoolGold',
    likes: '982 Likes • 18 Comments'
  },
  {
    img: '/instagram_beach_refreshment.png',
    user: '@party_chaser',
    caption: 'Chilled to Perfection #SummerVibes #IceCold',
    likes: '2,118 Likes • 89 Comments'
  },
  {
    img: '/instagram_cozy_aesthetic.png',
    user: '@gourmet_sweet',
    caption: 'Dessert Mixology #RoseShake #AmulKoolRecipies',
    likes: '1,432 Likes • 53 Comments'
  },
  {
    img: '/instagram_workout_gym.png',
    user: '@outdoor_vibes',
    caption: 'Nature & Pure Refreshment #DairyFresh #AmulKool',
    likes: '874 Likes • 21 Comments'
  },
  {
    img: '/instagram_party_sparklers.png',
    user: '@kool_style',
    caption: 'Always Chilled, Always Kool #GoldStandard #RosePetals',
    likes: '3,412 Likes • 112 Comments'
  }
];

let currentLightboxIndex = 0;

window.openInstagramLightbox = (index) => {
  currentLightboxIndex = index;
  updateLightboxContent();
  const lightbox = document.getElementById('instagram-lightbox');
  if (lightbox) {
    lightbox.classList.remove('opacity-0', 'pointer-events-none');
    lightbox.classList.add('opacity-100', 'pointer-events-auto');
  }
};

window.closeInstagramLightbox = () => {
  const lightbox = document.getElementById('instagram-lightbox');
  if (lightbox) {
    lightbox.classList.remove('opacity-100', 'pointer-events-auto');
    lightbox.classList.add('opacity-0', 'pointer-events-none');
  }
};

const updateLightboxContent = () => {
  const data = instagramData[currentLightboxIndex];
  const img = document.getElementById('lightbox-img');
  const user = document.getElementById('lightbox-user');
  const caption = document.getElementById('lightbox-caption');
  const likes = document.getElementById('lightbox-likes');

  if (img) img.src = data.img;
  if (user) user.innerText = data.user;
  if (caption) caption.innerText = data.caption;
  if (likes) likes.innerText = data.likes;
};

window.prevInstagramImage = () => {
  currentLightboxIndex = (currentLightboxIndex - 1 + instagramData.length) % instagramData.length;
  updateLightboxContent();
};

window.nextInstagramImage = () => {
  currentLightboxIndex = (currentLightboxIndex + 1) % instagramData.length;
  updateLightboxContent();
};

// 10. Form Submissions Logic
window.handleNewsletterSubmit = (e) => {
  e.preventDefault();
  const form = document.getElementById('newsletter-form');
  const success = document.getElementById('newsletter-success');
  
  if (form && success) {
    form.classList.add('hidden');
    success.classList.remove('hidden');
  }
};

window.handleContactSubmit = (e) => {
  e.preventDefault();
  const form = document.getElementById('contact-form');
  const success = document.getElementById('contact-success');
  
  if (form && success) {
    form.classList.add('hidden');
    success.classList.remove('hidden');
  }
};

window.resetContactForm = () => {
  const form = document.getElementById('contact-form');
  const success = document.getElementById('contact-success');
  
  if (form && success) {
    form.reset();
    form.classList.remove('hidden');
    success.classList.add('hidden');
  }
};

// 11. Scroll-To-Top and Floating Actions
window.scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};

const handleScrollWidgets = () => {
  const btnScrollTop = document.getElementById('btn-scroll-top');
  if (btnScrollTop) {
    if (window.scrollY > 800) {
      btnScrollTop.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
      btnScrollTop.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
    } else {
      btnScrollTop.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
      btnScrollTop.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
    }
  }
};

// 12. Smart Store Locator Upgrade (Leaflet Map Integration)
let map;
let userMarker;
let markersGroup;
let nearestStoreCoords = null;

const defaultParlors = [
  { name: "Amul Foodland (Anand)", lat: 22.5630, lng: 72.9300, address: "Amul Dairy Road, Anand" },
  { name: "Amul Parlor (Railway Station)", lat: 22.5560, lng: 72.9230, address: "Station Road, Anand" },
  { name: "Amul Parlor (V V Nagar)", lat: 22.5520, lng: 72.9242, address: "Bhaikaka Marg, Vallabh Vidyanagar" },
  { name: "Amul Milk Palace (GIDC)", lat: 22.5690, lng: 72.9400, address: "GIDC Area, Anand" }
];

const cityCoordinates = {
  "anand": { lat: 22.5645, lng: 72.9289, parlors: defaultParlors },
  "ahmedabad": {
    lat: 23.0225, lng: 72.5714,
    parlors: [
      { name: "Amul Shoppe (C G Road)", lat: 23.0240, lng: 72.5620, address: "C G Road, Ahmedabad" },
      { name: "Amul Parlor (Vastrapur)", lat: 23.0360, lng: 72.5250, address: "Near Vastrapur Lake, Ahmedabad" },
      { name: "Amul Shoppe (Satellite)", lat: 23.0180, lng: 72.5310, address: "Satellite Road, Ahmedabad" }
    ]
  },
  "mumbai": {
    lat: 19.0760, lng: 72.8777,
    parlors: [
      { name: "Amul Shoppe (Bandra)", lat: 19.0600, lng: 72.8360, address: "Linking Road, Bandra West" },
      { name: "Amul Parlor (Churchgate)", lat: 18.9320, lng: 72.8280, address: "Near Churchgate Station, Mumbai" },
      { name: "Amul Outlet (Andheri)", lat: 19.1200, lng: 72.8480, address: "S V Road, Andheri West" }
    ]
  },
  "delhi": {
    lat: 28.6139, lng: 77.2090,
    parlors: [
      { name: "Amul Shoppe (Connaught Place)", lat: 28.6300, lng: 77.2180, address: "Connaught Place, New Delhi" },
      { name: "Amul Parlor (Karol Bagh)", lat: 28.6440, lng: 77.1900, address: "Ajmal Khan Road, Karol Bagh" },
      { name: "Amul Parlor (South Ext)", lat: 28.5720, lng: 77.2220, address: "South Extension I, New Delhi" }
    ]
  },
  "bangalore": {
    lat: 12.9716, lng: 77.5946,
    parlors: [
      { name: "Amul Parlor (Indiranagar)", lat: 12.9780, lng: 77.6400, address: "100 Feet Road, Indiranagar" },
      { name: "Amul Shoppe (Koramangala)", lat: 12.9340, lng: 77.6190, address: "80 Feet Road, Koramangala" },
      { name: "Amul Shoppe (Jayanagar)", lat: 12.9280, lng: 77.5830, address: "Jayanagar 4th Block, Bangalore" }
    ]
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const initMap = () => {
  if (!document.getElementById('map') || typeof L === 'undefined') return;
  
  map = L.map('map', {
    scrollWheelZoom: false
  }).setView([22.5645, 72.9289], 13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  }).addTo(map);

  markersGroup = L.layerGroup().addTo(map);
  loadParlorMarkers(defaultParlors);
};

const loadParlorMarkers = (parlors, userLoc = null) => {
  markersGroup.clearLayers();
  const listContainer = document.getElementById('suggestions-list');
  const suggestionsDiv = document.getElementById('nearby-suggestions');
  
  if (listContainer) listContainer.innerHTML = '';
  
  let sortedParlors = [...parlors];
  
  if (userLoc) {
    sortedParlors = parlors.map(p => {
      const dist = calculateDistance(userLoc.lat, userLoc.lng, p.lat, p.lng);
      return { ...p, distance: dist };
    }).sort((a, b) => a.distance - b.distance);
  }

  const bounds = [];
  
  const amulIcon = L.divIcon({
    html: `<div class="w-8 h-8 rounded-full bg-primary border-2 border-white flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2">
             <span class="material-symbols-outlined text-white text-base" style="font-variation-settings: 'FILL' 1;">storefront</span>
           </div>`,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  sortedParlors.forEach((parlor) => {
    const marker = L.marker([parlor.lat, parlor.lng], { icon: amulIcon });
    
    const popupContent = `
      <div class="p-2 space-y-1">
        <h4 class="font-bold text-on-background text-sm">${parlor.name}</h4>
        <p class="text-xs text-on-surface-variant">${parlor.address}</p>
        ${parlor.distance ? `<p class="text-xs text-primary font-bold">${parlor.distance.toFixed(1)} km away</p>` : ''}
        <a href="https://www.google.com/maps/dir/?api=1&destination=${parlor.lat},${parlor.lng}" target="_blank" class="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline mt-2">
          <span class="material-symbols-outlined text-xs">navigation</span> Get Directions
        </a>
      </div>
    `;
    
    marker.bindPopup(popupContent);
    markersGroup.addLayer(marker);
    bounds.push([parlor.lat, parlor.lng]);

    if (listContainer) {
      const item = document.createElement('div');
      item.className = 'p-3 bg-surface-container-lowest rounded-xl border border-outline-variant hover:border-primary transition-colors cursor-pointer flex justify-between items-center gap-4';
      item.onclick = () => {
        map.setView([parlor.lat, parlor.lng], 15);
        marker.openPopup();
        updateOverlayInfo(parlor);
      };

      item.innerHTML = `
        <div>
          <h4 class="font-bold text-on-background text-xs">${parlor.name}</h4>
          <p class="text-[10px] text-on-surface-variant mt-0.5">${parlor.address}</p>
        </div>
        <div class="text-right">
          <span class="text-xs font-bold text-primary whitespace-nowrap">${parlor.distance ? `${parlor.distance.toFixed(1)} km` : 'Open'}</span>
        </div>
      `;
      listContainer.appendChild(item);
    }
  });

  if (userLoc) {
    const userIcon = L.divIcon({
      html: `<div class="w-6 h-6 rounded-full bg-secondary border-2 border-white flex items-center justify-center shadow-lg relative">
               <div class="absolute inset-0 rounded-full bg-secondary/35 animate-ping"></div>
               <span class="material-symbols-outlined text-white text-xs">my_location</span>
             </div>`,
      className: 'user-location-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    const userMarkerInstance = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon });
    userMarkerInstance.bindPopup("<div class='p-1 font-bold text-xs'>Your Location</div>");
    markersGroup.addLayer(userMarkerInstance);
    bounds.push([userLoc.lat, userLoc.lng]);

    if (suggestionsDiv) suggestionsDiv.classList.remove('hidden');
    updateOverlayInfo(sortedParlors[0]);
  }

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
};

const updateOverlayInfo = (store) => {
  const overlay = document.getElementById('map-overlay-info');
  const nameEl = document.getElementById('nearest-store-name');
  const distEl = document.getElementById('nearest-store-dist');
  
  if (overlay && nameEl && distEl) {
    overlay.classList.remove('hidden');
    nameEl.innerText = store.name;
    distEl.innerText = store.distance ? `${store.distance.toFixed(1)} km away` : 'Selected store';
    nearestStoreCoords = { lat: store.lat, lng: store.lng };
  }
};

window.openDirections = () => {
  if (nearestStoreCoords) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${nearestStoreCoords.lat},${nearestStoreCoords.lng}`, '_blank');
  }
};

window.detectUserLocation = () => {
  const btn = document.getElementById('detect-loc-btn');
  if (btn) btn.classList.add('animate-pulse');

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        const simulatedParlors = [
          { name: "Amul Kool Premium Parlor", lat: userLoc.lat + 0.005, lng: userLoc.lng + 0.003, address: "Main Retail Block, Near You" },
          { name: "Amul Foodland Express", lat: userLoc.lat - 0.004, lng: userLoc.lng - 0.005, address: "Shopping Complex, Center Plaza" },
          { name: "Amul Daily Center Outlet", lat: userLoc.lat + 0.002, lng: userLoc.lng - 0.007, address: "Metro Station Corner Shops" }
        ];

        loadParlorMarkers(simulatedParlors, userLoc);
        if (btn) btn.classList.remove('animate-pulse');
      },
      (error) => {
        console.warn("Geolocation failed: ", error);
        alert("Could not detect location. Showing default Anand parlors.");
        if (btn) btn.classList.remove('animate-pulse');
      }
    );
  } else {
    alert("Geolocation is not supported by your browser.");
    if (btn) btn.classList.remove('animate-pulse');
  }
};

window.searchStores = () => {
  const input = document.getElementById('store-search-input');
  if (!input) return;
  const query = input.value.trim().toLowerCase();
  if (!query) return;

  let match = null;
  for (const city in cityCoordinates) {
    if (query.includes(city) || city.includes(query)) {
      match = cityCoordinates[city];
      break;
    }
  }

  if (match) {
    map.setView([match.lat, match.lng], 13);
    loadParlorMarkers(match.parlors, { lat: match.lat, lng: match.lng });
  } else {
    alert(`Showing parlors in search result for: ${input.value}`);
    loadParlorMarkers(defaultParlors);
  }
};

// Keyboard listener for video and lightbox modals
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.closeVideoModal();
    window.closeInstagramLightbox();
  }
  const lightbox = document.getElementById('instagram-lightbox');
  if (lightbox && lightbox.classList.contains('opacity-100')) {
    if (e.key === 'ArrowLeft') {
      window.prevInstagramImage();
    } else if (e.key === 'ArrowRight') {
      window.nextInstagramImage();
    }
  }
});

// 13. Initialize Pipeline
const init = async () => {
  window.addEventListener('resize', resizeCanvas);
  
  await preloadImages();
  
  // Setup fixed navigation bar controls
  initNavigation();

  // Cache sizes & initialize offsets
  cacheLayoutSizes();
  resizeCanvas();

  // Initialize store map
  initMap();

  // Trigger initial scroll states
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  updateScrollState(scrollTop);
  handleScrollWidgets(scrollTop);
  updateTimelineScroll(scrollTop);
  if (window.updateNavScroll) window.updateNavScroll(scrollTop);
  if (window.trackActiveSection) window.trackActiveSection(scrollTop);

  // Dynamic image lazy loading and deferred decoding below the fold
  const allImgs = document.querySelectorAll('img');
  allImgs.forEach((img, idx) => {
    if (idx > 3) {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    }
  });

  requestAnimationFrame(tick);
};

// Start execution
document.addEventListener('DOMContentLoaded', init);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  init();
}
