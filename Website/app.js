import 'https://unpkg.com/@fluentui/web-components';

const LISTING_URL = "{{ listingInfo.Url }}";

const PACKAGES = {
{{~ for package in packages ~}}
  "{{ package.Name }}": {
    name: "{{ package.Name }}",
    displayName: "{{ if package.DisplayName; package.DisplayName; end; }}",
    description: "{{ if package.Description; package.Description; end; }}",
    version: "{{ package.Version }}",
    author: {
      name: "{{ if package.Author.Name; package.Author.Name; end; }}",
      url: "{{ if package.Author.Url; package.Author.Url; end; }}",
    },
    dependencies: {
      {{~ for dependency in package.Dependencies ~}}
        "{{ dependency.Name }}": "{{ dependency.Version }}",
      {{~ end ~}}
    },
    keywords: [
      {{~ for keyword in package.Keywords ~}}
        "{{ keyword }}",
      {{~ end ~}}
    ],
    license: "{{ package.License }}",
    licensesUrl: "{{ package.LicensesUrl }}",
  },
{{~ end ~}}
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const setTheme = () => {
  document.body.setAttribute('data-theme', 'dark');
  document.body.classList.add('theme-dark');
};

const readFieldValue = (field) => field?.value || field?.getAttribute('value') || LISTING_URL;

const copyFieldValue = async (field, button) => {
  const value = readFieldValue(field);
  field?.select?.();
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  if (!button) return;
  const originalAppearance = button.getAttribute('appearance') || 'neutral';
  button.setAttribute('appearance', 'accent');
  button.setAttribute('data-copied', 'true');
  window.setTimeout(() => {
    button.setAttribute('appearance', originalAppearance);
    button.removeAttribute('data-copied');
  }, 1100);
};

const openVccListing = () => {
  window.location.assign(`vcc://vpm/addRepo?url=${encodeURIComponent(LISTING_URL)}`);
};

const setDialogOpen = (dialog, open) => {
  if (!dialog) return;
  dialog.hidden = !open;
  if (open) dialog.setAttribute('aria-hidden', 'false');
  else dialog.setAttribute('aria-hidden', 'true');
};

const fillPackageInfo = (packageId) => {
  const packageInfo = PACKAGES?.[packageId];
  if (!packageInfo) {
    console.error(`Did not find package ${packageId}. Packages available:`, PACKAGES);
    return;
  }

  $('#packageInfoName').textContent = packageInfo.displayName || packageInfo.name;
  $('#packageInfoId').textContent = packageId;
  $('#packageInfoVersion').textContent = packageInfo.version ? `v${packageInfo.version}` : '';
  $('#packageInfoDescription').textContent = packageInfo.description || 'No description provided.';

  const author = $('#packageInfoAuthor');
  author.textContent = packageInfo.author?.name || 'JustSleightly';
  author.href = packageInfo.author?.url || 'https://just.sleightly.dev';

  const keywordWrap = $('#packageInfoKeywords');
  const keywordSection = keywordWrap?.parentElement;
  keywordWrap.replaceChildren();
  if (!packageInfo.keywords?.length) {
    keywordSection?.classList.add('hidden');
  } else {
    keywordSection?.classList.remove('hidden');
    packageInfo.keywords.forEach((keyword) => {
      const chip = document.createElement('span');
      chip.className = 'badge';
      chip.textContent = keyword;
      keywordWrap.append(chip);
    });
  }

  const license = $('#packageInfoLicense');
  const licenseSection = license?.parentElement;
  const hasLicense = Boolean(packageInfo.license?.length || packageInfo.licensesUrl?.length);
  licenseSection?.classList.toggle('hidden', !hasLicense);
  if (hasLicense) {
    license.textContent = packageInfo.license || 'See license';
    license.href = packageInfo.licensesUrl || '#';
  }

  const dependencies = $('#packageInfoDependencies');
  dependencies.replaceChildren();
  const dependencyEntries = Object.entries(packageInfo.dependencies || {});
  if (!dependencyEntries.length) {
    const li = document.createElement('li');
    li.textContent = 'No external VPM dependencies listed.';
    dependencies.append(li);
  } else {
    dependencyEntries.forEach(([name, version]) => {
      const li = document.createElement('li');
      li.textContent = `${name} @ ${version}`;
      dependencies.append(li);
    });
  }

  setDialogOpen($('#packageInfoModal'), true);
};

const wirePackageControls = () => {
  const rows = $$('#packageGrid fluent-data-grid-row[data-package-id]');
  const countMetric = $('#packageCountMetric');
  if (countMetric) countMetric.textContent = String(rows.length || Object.keys(PACKAGES).length || 0);

  $$('.rowAddToVccButton').forEach((button) => {
    button.addEventListener('click', openVccListing);
  });

  $$('.rowPackageInfoButton').forEach((button) => {
    button.addEventListener('click', () => fillPackageInfo(button.dataset.packageId));
  });

  const rowMoreMenu = $('#rowMoreMenu');
  const downloadItem = $('#rowMoreMenuDownload');
  let activeDownloadUrl = '';

  const hideRowMoreMenu = (event) => {
    if (rowMoreMenu?.contains(event.target)) return;
    rowMoreMenu.hidden = true;
    document.removeEventListener('click', hideRowMoreMenu);
  };

  $$('.rowMenuButton').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      activeDownloadUrl = button.dataset.packageUrl || '';
      const rect = button.getBoundingClientRect();
      rowMoreMenu.style.top = `${window.scrollY + rect.bottom + 8}px`;
      rowMoreMenu.style.left = `${Math.max(12, window.scrollX + rect.right - 170)}px`;
      rowMoreMenu.hidden = false;
      window.setTimeout(() => document.addEventListener('click', hideRowMoreMenu), 1);
    });
  });

  downloadItem?.addEventListener('click', () => {
    if (activeDownloadUrl) window.open(activeDownloadUrl, '_blank', 'noopener');
    rowMoreMenu.hidden = true;
  });
};

const wireSearch = () => {
  const packageGrid = $('#packageGrid');
  const searchInput = $('#searchInput');
  const emptyState = $('#emptyState');
  if (!packageGrid || !searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = (searchInput.value || '').trim().toLowerCase();
    let visibleCount = 0;
    $$('#packageGrid fluent-data-grid-row[data-package-id]').forEach((row) => {
      const haystack = `${row.dataset.packageName || ''} ${row.dataset.packageId || ''}`.toLowerCase();
      const visible = !query || haystack.includes(query);
      row.style.display = visible ? 'grid' : 'none';
      if (visible) visibleCount += 1;
    });
    if (emptyState) emptyState.hidden = visibleCount !== 0;
  });
};

const wireDialogsAndCopy = () => {
  $('#urlBarHelp')?.addEventListener('click', () => setDialogOpen($('#addListingToVccHelp'), true));
  $('#addListingToVccHelpClose')?.addEventListener('click', () => setDialogOpen($('#addListingToVccHelp'), false));
  $('#packageInfoModalClose')?.addEventListener('click', () => setDialogOpen($('#packageInfoModal'), false));
  $('#packageInfoListingHelp')?.addEventListener('click', () => setDialogOpen($('#addListingToVccHelp'), true));

  $('#vccAddRepoButton')?.addEventListener('click', openVccListing);
  $('#vccUrlFieldCopy')?.addEventListener('click', (event) => copyFieldValue($('#vccUrlField'), event.currentTarget));
  $('#vccListingInfoUrlFieldCopy')?.addEventListener('click', (event) => copyFieldValue($('#vccListingInfoUrlField'), event.currentTarget));
  $('#packageInfoVccUrlFieldCopy')?.addEventListener('click', (event) => copyFieldValue($('#packageInfoVccUrlField'), event.currentTarget));

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setDialogOpen($('#addListingToVccHelp'), false);
    setDialogOpen($('#packageInfoModal'), false);
    const menu = $('#rowMoreMenu');
    if (menu) menu.hidden = true;
  });
};

const initStageCanvas = () => {
  const canvas = $('#stageCanvas');
  if (!canvas || prefersReducedMotion()) return;

  const ctx = canvas.getContext('2d');
  const symbols = ['♠', '♥', '♦', '♣', '▰'];
  const particles = [];
  const pointer = { x: -9999, y: -9999 };
  const particleCount = Math.min(54, Math.max(26, Math.floor(window.innerWidth / 32)));

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const createParticle = (seed = Math.random()) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: 14 + Math.random() * 20,
    speed: 0.12 + Math.random() * 0.28,
    drift: -0.18 + Math.random() * 0.36,
    rotation: Math.random() * Math.PI * 2,
    spin: -0.004 + Math.random() * 0.008,
    symbol: symbols[Math.floor(seed * symbols.length) % symbols.length],
    red: Math.random() > 0.54,
    alpha: 0.16 + Math.random() * 0.24,
  });

  const resetParticles = () => {
    particles.length = 0;
    for (let i = 0; i < particleCount; i += 1) particles.push(createParticle(i / particleCount));
  };

  const draw = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    particles.forEach((p) => {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 170) {
        const force = (170 - distance) / 170;
        p.x += (dx / Math.max(distance, 1)) * force * 1.4;
        p.y += (dy / Math.max(distance, 1)) * force * 1.4;
      }

      p.y -= p.speed;
      p.x += p.drift;
      p.rotation += p.spin;
      if (p.y < -50) {
        p.y = window.innerHeight + 50;
        p.x = Math.random() * window.innerWidth;
      }
      if (p.x < -60) p.x = window.innerWidth + 60;
      if (p.x > window.innerWidth + 60) p.x = -60;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.font = `700 ${p.size}px "IBM Plex Sans", system-ui, sans-serif`;
      ctx.fillStyle = p.red ? `rgba(255, 0, 42, ${p.alpha})` : `rgba(220, 226, 224, ${p.alpha})`;
      ctx.shadowColor = p.red ? 'rgba(255,0,42,0.22)' : 'rgba(255,255,255,0.12)';
      ctx.shadowBlur = 12;
      ctx.fillText(p.symbol, 0, 0);
      ctx.restore();
    });

    requestAnimationFrame(draw);
  };

  window.addEventListener('resize', () => { resize(); resetParticles(); });
  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    pointer.x = -9999;
    pointer.y = -9999;
  });

  resize();
  resetParticles();
  draw();
};

const init = () => {
  setTheme();
  wireDialogsAndCopy();
  wireSearch();
  wirePackageControls();
  initStageCanvas();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
