(function () {
  var STORAGE_KEY = 'dk_cookie_consent';

  // If already decided, apply and exit
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'accepted') { enableAnalytics(); return; }
  if (saved === 'rejected') { updateConsent('denied'); return; }

  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '#dk-cookie{position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#fff;border-top:1px solid #e5e7eb;box-shadow:0 -4px 24px rgba(0,0,0,.08);padding:20px 24px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    '#dk-cookie .dk-inner{max-width:1080px;margin:0 auto;display:flex;align-items:center;gap:20px;flex-wrap:wrap}',
    '#dk-cookie .dk-text{flex:1;min-width:220px;font-size:.875rem;color:#374151;line-height:1.5}',
    '#dk-cookie .dk-text a{color:#4f46e5;text-decoration:underline}',
    '#dk-cookie .dk-actions{display:flex;gap:10px;flex-shrink:0;flex-wrap:wrap}',
    '#dk-cookie .dk-btn{padding:10px 20px;border-radius:8px;font-size:.875rem;font-weight:600;cursor:pointer;border:none;white-space:nowrap;transition:opacity .15s}',
    '#dk-cookie .dk-accept{background:#4f46e5;color:#fff}',
    '#dk-cookie .dk-accept:hover{opacity:.85}',
    '#dk-cookie .dk-reject{background:#f3f4f6;color:#374151}',
    '#dk-cookie .dk-reject:hover{background:#e5e7eb}',
    '@media(max-width:540px){#dk-cookie .dk-inner{flex-direction:column;align-items:flex-start}#dk-cookie .dk-actions{width:100%}#dk-cookie .dk-btn{flex:1}}'
  ].join('');
  document.head.appendChild(style);

  // Inject banner HTML
  var banner = document.createElement('div');
  banner.id = 'dk-cookie';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Informasjonskapsler');
  banner.innerHTML = [
    '<div class="dk-inner">',
    '  <p class="dk-text">Vi bruker informasjonskapsler (cookies) for å forbedre brukeropplevelsen og vise relevante annonser. Les mer i vår <a href="/personvern">personvernerklæring</a>.</p>',
    '  <div class="dk-actions">',
    '    <button class="dk-btn dk-accept" id="dk-accept">Godta alle</button>',
    '    <button class="dk-btn dk-reject" id="dk-reject">Kun nødvendige</button>',
    '  </div>',
    '</div>'
  ].join('');
  document.body.appendChild(banner);

  document.getElementById('dk-accept').addEventListener('click', function () {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    enableAnalytics();
    removeBanner();
  });

  document.getElementById('dk-reject').addEventListener('click', function () {
    localStorage.setItem(STORAGE_KEY, 'rejected');
    updateConsent('denied');
    removeBanner();
  });

  function removeBanner() {
    var el = document.getElementById('dk-cookie');
    if (el) el.remove();
  }

  function enableAnalytics() {
    updateConsent('granted');
  }

  function updateConsent(state) {
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('consent', 'update', {
      'ad_storage': state,
      'ad_user_data': state,
      'ad_personalization': state,
      'analytics_storage': state
    });
  }
})();
