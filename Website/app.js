const LISTING_URL = "{{ listingInfo.Url }}";

const PACKAGES = {
{{~ for package in packages ~}}
  "{{ package.Name }}": {
    name: "{{ package.Name }}",
    displayName: "{{ if package.DisplayName; package.DisplayName; end; }}",
    description: "{{ if package.Description; package.Description; end; }}",
    version: "{{ package.Version }}",
    type: "{{ package.Type }}",
    zipUrl: "{{ package.ZipUrl }}",
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
let activePackageId = '';

const safeHttpUrl = (value, fallback = '') => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
};

const titleCaseSegment = (segment = '') => segment
  .split(/[-_.\s]+/)
  .filter(Boolean)
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join('');

const deriveRepoUrl = (packageInfo) => {
  const candidates = [packageInfo.zipUrl, packageInfo.url, packageInfo.repoUrl, packageInfo.repositoryUrl, packageInfo.sourceUrl];
  for (const candidate of candidates) {
    const safeUrl = safeHttpUrl(candidate);
    const match = safeUrl.match(/^https:\/\/github\.com\/([^/?#]+)\/([^/?#]+)(?:[/?#]|$)/i);
    if (match) return `https://github.com/${match[1]}/${match[2]}`;
  }

  const inferredName = titleCaseSegment((packageInfo.name || '').split('.').pop()) || titleCaseSegment(packageInfo.displayName?.replace(/^JS[-\s]*/i, '')) || 'Packages';
  return `https://github.com/JustSleightly/${inferredName}`;
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
  const originalText = button.textContent;
  button.textContent = 'Copied';
  button.dataset.copied = 'true';
  window.setTimeout(() => {
    button.textContent = originalText;
    delete button.dataset.copied;
  }, 1100);
};

const openVccListing = () => {
  window.location.assign(`vcc://vpm/addRepo?url=${encodeURIComponent(LISTING_URL)}`);
};

const setDialogOpen = (dialog, open) => {
  if (!dialog) return;
  dialog.hidden = !open;
  dialog.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) dialog.querySelector('button, a, input')?.focus?.();
};

const fillPackageInfo = (packageId) => {
  const packageInfo = PACKAGES?.[packageId];
  if (!packageInfo) {
    console.error(`Did not find package ${packageId}. Packages available:`, PACKAGES);
    return;
  }
  activePackageId = packageId;

  $('#packageInfoName').textContent = packageInfo.displayName || packageInfo.name;
  $('#packageInfoId').textContent = packageId;
  $('#packageInfoVersion').textContent = packageInfo.version ? `v${packageInfo.version}` : '';
  $('#packageInfoDescription').textContent = packageInfo.description || 'No description provided.';

  const author = $('#packageInfoAuthor');
  author.textContent = packageInfo.author?.name || 'JustSleightly';
  author.href = packageInfo.author?.url || 'https://links.sleightly.dev';

  const download = $('#packageInfoDownloadZip');
  if (download) {
    const hasZip = Boolean(packageInfo.zipUrl?.length);
    download.classList.toggle('hidden', !hasZip);
    download.href = hasZip ? packageInfo.zipUrl : '#';
    download.setAttribute('aria-label', `Download ${(packageInfo.displayName || packageInfo.name)} package zip`);
  }

  const keywordWrap = $('#packageInfoKeywords');
  const keywordSection = keywordWrap?.closest('section');
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

  const repoUrl = deriveRepoUrl(packageInfo);
  const repoLabel = repoUrl.replace(/^https:\/\/github\.com\//i, '');
  const repoName = $('#packageInfoRepoName');
  const repoLink = $('#packageInfoRepoLink');
  const docsLink = $('#packageInfoDocsLink');
  if (repoName) repoName.textContent = repoLabel;
  if (repoLink) {
    repoLink.href = repoUrl;
    repoLink.setAttribute('aria-label', `Browse ${repoLabel} on GitHub`);
  }
  if (docsLink) {
    docsLink.href = `${repoUrl}#readme`;
    docsLink.setAttribute('aria-label', `Read ${repoLabel} README documentation`);
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
  const rows = $$('#packageGrid .package-row[data-package-id]');
  const countMetric = $('#packageCountMetric');
  if (countMetric) countMetric.textContent = String(rows.length || Object.keys(PACKAGES).length || 0);

  $$('.rowAddToVccButton').forEach((button) => {
    button.addEventListener('click', openVccListing);
  });

  $$('.rowPackageInfoButton').forEach((button) => {
    button.addEventListener('click', () => fillPackageInfo(button.dataset.packageId));
  });
};

const wireSearch = () => {
  const searchInput = $('#searchInput');
  const emptyState = $('#emptyState');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = (searchInput.value || '').trim().toLowerCase();
    let visibleCount = 0;
    $$('#packageGrid .package-row[data-package-id]').forEach((row) => {
      const haystack = `${row.dataset.packageName || ''} ${row.dataset.packageId || ''}`.toLowerCase();
      const visible = !query || haystack.includes(query);
      row.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    if (emptyState) emptyState.hidden = visibleCount !== 0;
  });
};

const wireDialogsAndCopy = () => {
  $('#urlBarHelp')?.addEventListener('click', () => setDialogOpen($('#addListingToVccHelp'), true));
  $('#addListingToVccHelpClose')?.addEventListener('click', () => setDialogOpen($('#addListingToVccHelp'), false));
  $('#packageInfoModalClose')?.addEventListener('click', () => setDialogOpen($('#packageInfoModal'), false));
  $('#packageInfoAddToVcc')?.addEventListener('click', openVccListing);

  $('#navAddRepoButton')?.addEventListener('click', openVccListing);
  $('#vccAddRepoButton')?.addEventListener('click', openVccListing);
  $('#vccUrlFieldCopy')?.addEventListener('click', (event) => copyFieldValue($('#vccUrlField'), event.currentTarget));
  $('#vccListingInfoUrlFieldCopy')?.addEventListener('click', (event) => copyFieldValue($('#vccListingInfoUrlField'), event.currentTarget));
  $('#packageInfoVccUrlFieldCopy')?.addEventListener('click', (event) => copyFieldValue($('#packageInfoVccUrlField'), event.currentTarget));

  $$('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) setDialogOpen(overlay, false);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setDialogOpen($('#addListingToVccHelp'), false);
    setDialogOpen($('#packageInfoModal'), false);
  });
};

const initStageCanvas = () => {
  const canvas = $('#stageCanvas');
  if (!canvas || prefersReducedMotion()) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const symbols = ['♠', '♥', '♦', '♣'];
  const particles = [];
  const pointer = { x: -9999, y: -9999 };
  let frame = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const particleTarget = () => Math.min(34, Math.max(18, Math.floor(window.innerWidth / 52)));

  const createParticle = (seed = Math.random()) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: 13 + Math.random() * 16,
    speed: 0.055 + Math.random() * 0.105,
    drift: -0.055 + Math.random() * 0.11,
    rotation: Math.random() * Math.PI * 2,
    spin: -0.0018 + Math.random() * 0.0036,
    symbol: symbols[Math.floor(seed * symbols.length) % symbols.length],
    red: Math.random() > 0.6,
    alpha: 0.085 + Math.random() * 0.09,
  });

  const resetParticles = () => {
    particles.length = 0;
    const count = particleTarget();
    for (let i = 0; i < count; i += 1) particles.push(createParticle(i / count));
  };

  const draw = () => {
    frame = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    particles.forEach((p) => {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 150) {
        const force = (150 - distance) / 150;
        p.x += (dx / Math.max(distance, 1)) * force * 0.55;
        p.y += (dy / Math.max(distance, 1)) * force * 0.55;
      }

      p.y -= p.speed;
      p.x += p.drift;
      p.rotation += p.spin;
      if (p.y < -40) {
        p.y = window.innerHeight + 40;
        p.x = Math.random() * window.innerWidth;
      }
      if (p.x < -50) p.x = window.innerWidth + 50;
      if (p.x > window.innerWidth + 50) p.x = -50;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.font = `700 ${p.size}px "IBM Plex Sans", system-ui, sans-serif`;
      ctx.fillStyle = p.red ? `rgba(255, 0, 42, ${p.alpha})` : `rgba(220, 226, 224, ${p.alpha})`;
      ctx.shadowBlur = 0;
      ctx.fillText(p.symbol, 0, 0);
      ctx.restore();
    });
  };

  window.addEventListener('resize', () => { resize(); resetParticles(); }, { passive: true });
  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    pointer.x = -9999;
    pointer.y = -9999;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else frame = requestAnimationFrame(draw);
  });

  resize();
  resetParticles();
  draw();
};

const init = () => {
  document.body.setAttribute('data-theme', 'dark');
  document.body.classList.add('theme-dark');
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
