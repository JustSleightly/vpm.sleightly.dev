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

const deriveReleaseAssetUrls = (packageInfo) => {
  const zipUrl = safeHttpUrl(packageInfo.zipUrl || packageInfo.url);
  if (!zipUrl) return { zipUrl: '', unityPackageUrl: '', packageJsonUrl: '' };

  const url = new URL(zipUrl);
  const pathParts = url.pathname.split('/');
  const assetName = pathParts.pop() || '';
  const releasePath = pathParts.join('/');
  const unityAssetName = assetName.replace(/\.zip$/i, '.unitypackage');

  return {
    zipUrl,
    unityPackageUrl: unityAssetName && unityAssetName !== assetName ? `${url.origin}${releasePath}/${unityAssetName}` : '',
    packageJsonUrl: `${url.origin}${releasePath}/package.json`,
  };
};

const setDownloadLink = (selector, href, label, packageInfo) => {
  const link = $(selector);
  if (!link) return;
  const safeHref = safeHttpUrl(href);
  link.classList.toggle('hidden', !safeHref);
  link.href = safeHref || '#';
  link.setAttribute('aria-label', `Download ${(packageInfo.displayName || packageInfo.name)} ${label}`);
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

  const releaseAssetUrls = deriveReleaseAssetUrls(packageInfo);
  setDownloadLink('#packageInfoDownloadZip', releaseAssetUrls.zipUrl, 'package ZIP', packageInfo);
  setDownloadLink('#packageInfoDownloadUnityPackage', releaseAssetUrls.unityPackageUrl, 'Unity Package', packageInfo);
  setDownloadLink('#packageInfoDownloadPackageJson', releaseAssetUrls.packageJsonUrl, 'package.json', packageInfo);

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
  const signalPulses = [];
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

  const particleTarget = () => Math.min(128, Math.max(56, Math.floor(window.innerWidth / 18)));

  const createParticle = (seed = Math.random()) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: 10 + Math.random() * 13,
    speed: 0.07 + Math.random() * 0.15,
    drift: -0.095 + Math.random() * 0.19,
    rotation: Math.random() * Math.PI * 2,
    spin: -0.0032 + Math.random() * 0.0064,
    symbol: symbols[Math.floor(seed * symbols.length) % symbols.length],
    red: Math.random() > 0.54,
    alpha: 0.1 + Math.random() * 0.13,
    pulse: 0,
    pulseOffsetX: 0,
    pulseOffsetY: 0,
  });

  const resetParticles = () => {
    particles.length = 0;
    const count = particleTarget();
    for (let i = 0; i < count; i += 1) particles.push(createParticle(i / count));
  };

  const addSignalPulse = (x, y) => {
    signalPulses.push({
      x,
      y,
      life: 0,
      maxLife: window.innerWidth < 700 ? 46 : 54,
      radius: Math.min(340, Math.max(180, window.innerWidth * 0.22)),
      seed: Math.random() * Math.PI * 2,
    });
    if (signalPulses.length > 18) signalPulses.splice(0, signalPulses.length - 18);
  };

  const drawSignalPulse = (pulse) => {
    const progress = pulse.life / pulse.maxLife;
    const energy = Math.sin(Math.PI * progress);
    const radius = 26 + pulse.radius * progress;
    const gradient = ctx.createRadialGradient(pulse.x, pulse.y, 0, pulse.x, pulse.y, radius);
    gradient.addColorStop(0, `rgba(255, 0, 42, ${0.13 * energy})`);
    gradient.addColorStop(0.42, `rgba(255, 0, 42, ${0.045 * energy})`);
    gradient.addColorStop(1, 'rgba(255, 0, 42, 0)');

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.fillRect(pulse.x - radius, pulse.y - radius, radius * 2, radius * 2);

    const blipCount = 5;
    for (let i = 0; i < blipCount; i += 1) {
      const angle = pulse.seed + (Math.PI * 2 * i) / blipCount + progress * 0.9;
      const distance = radius * (0.28 + 0.34 * ((i % 2) + 1));
      const blipX = pulse.x + Math.cos(angle) * distance;
      const blipY = pulse.y + Math.sin(angle) * distance;
      const size = 2.5 + energy * 5 + (i % 2) * 1.5;
      ctx.save();
      ctx.translate(blipX, blipY);
      ctx.rotate(Math.PI / 4 + angle * 0.25);
      ctx.fillStyle = i % 2 === 0 ? `rgba(255, 0, 42, ${0.42 * energy})` : `rgba(230, 236, 232, ${0.32 * energy})`;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }
    ctx.restore();
  };

  const drawSuit = (particle, alphaScale = 1, sizeScale = 1) => {
    ctx.save();
    ctx.translate(particle.x + particle.pulseOffsetX, particle.y + particle.pulseOffsetY);
    ctx.rotate(particle.rotation);
    ctx.font = `700 ${particle.size * sizeScale}px "IBM Plex Sans", system-ui, sans-serif`;
    ctx.fillStyle = particle.red ? `rgba(255, 0, 42, ${particle.alpha * alphaScale})` : `rgba(220, 226, 224, ${particle.alpha * alphaScale})`;
    ctx.shadowBlur = 0;
    ctx.fillText(particle.symbol, 0, 0);
    ctx.restore();
  };

  const draw = () => {
    frame = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = signalPulses.length - 1; i >= 0; i -= 1) {
      const pulse = signalPulses[i];
      pulse.life += 1;
      if (pulse.life >= pulse.maxLife) {
        signalPulses.splice(i, 1);
      } else {
        drawSignalPulse(pulse);
      }
    }

    particles.forEach((p) => {
      p.y -= p.speed;
      p.x += p.drift;
      p.rotation += p.spin;
      p.pulseOffsetX *= 0.82;
      p.pulseOffsetY *= 0.82;

      const hoverDistance = Math.hypot(p.x - pointer.x, p.y - pointer.y);
      if (hoverDistance < 150) p.pulse = Math.max(p.pulse, (1 - hoverDistance / 150) * 0.28);

      signalPulses.forEach((pulse) => {
        const progress = pulse.life / pulse.maxLife;
        const energy = Math.sin(Math.PI * progress);
        const dx = p.x - pulse.x;
        const dy = p.y - pulse.y;
        const distance = Math.hypot(dx, dy);
        if (distance < pulse.radius) {
          const falloff = 1 - distance / pulse.radius;
          const wave = 0.5 + 0.5 * Math.sin(falloff * Math.PI * 4 - progress * Math.PI * 3 + pulse.seed);
          const strength = falloff * energy * (0.45 + wave * 0.55);
          p.rotation += strength * 0.012;
          p.pulse = Math.max(p.pulse, strength * 0.68);
          p.pulseOffsetX += Math.cos(pulse.seed + distance * 0.035) * strength * 0.45;
          p.pulseOffsetY += Math.sin(pulse.seed + distance * 0.035) * strength * 0.45;
        }
      });

      p.pulse *= 0.91;
      if (p.y < -40) {
        p.y = window.innerHeight + 40;
        p.x = Math.random() * window.innerWidth;
      }
      if (p.x < -50) p.x = window.innerWidth + 50;
      if (p.x > window.innerWidth + 50) p.x = -50;

      drawSuit(p, 1 + p.pulse * 1.55, 1 + p.pulse * 0.12);
    });
  };

  window.addEventListener('resize', () => { resize(); resetParticles(); signalPulses.length = 0; }, { passive: true });
  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { passive: true });
  window.addEventListener('pointerdown', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    addSignalPulse(event.clientX, event.clientY);
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
