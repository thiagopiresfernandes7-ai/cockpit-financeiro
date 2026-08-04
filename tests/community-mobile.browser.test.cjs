const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
  const relative = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'tests/community-mobile-harness.html';
  const file = path.resolve(root, relative);
  if (!file.toLowerCase().startsWith(root.toLowerCase() + path.sep)) {
    res.writeHead(403); return res.end();
  }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const width of [320, 360, 375, 390, 414, 430]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(`http://127.0.0.1:${server.address().port}/tests/community-mobile-harness.html`, { waitUntil: 'networkidle' });
      await page.locator('.mobile-nav [data-view="community"]').evaluate(button => button.click());
      await page.waitForTimeout(600);
      const metrics = await page.evaluate(() => ({
        active: document.querySelector('.section.active')?.id,
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        tabs: [...document.querySelectorAll('.community-primary-tabs button')].map(x => x.textContent.trim()),
        compact: Boolean(document.querySelector('.community-compact-composer')?.offsetHeight),
        postCount: document.querySelectorAll('.community-post').length,
        navHeight: document.querySelector('.mobile-nav')?.getBoundingClientRect().height || 0,
        bottomPadding: parseFloat(getComputedStyle(document.querySelector('.content')).paddingBottom),
        nativeFileHidden: Boolean(document.querySelector('#communityImage')?.closest('.community-legacy-shell')),
        imageHeight: document.querySelector('.community-image')?.getBoundingClientRect().height || 0,
        postActionMinHeight: Math.min(...[...document.querySelectorAll('.community-actions button')].map(x => x.getBoundingClientRect().height))
      }));
      assert.equal(metrics.active, 'community');
      assert.equal(metrics.scrollWidth, metrics.width, `overflow horizontal em ${width}px`);
      assert.deepEqual(metrics.tabs, ['Para você', 'Seguindo', 'Conquistas']);
      assert.equal(metrics.compact, true);
      assert.ok(metrics.bottomPadding >= metrics.navHeight, `conteúdo encoberto em ${width}px`);
      assert.equal(metrics.nativeFileHidden, true);
      assert.ok(metrics.imageHeight <= Math.min(520, 844 * .62) + 3, `imagem com ${metrics.imageHeight}px em ${width}px`);
      assert.ok(metrics.postActionMinHeight >= 44);

      if (width === 390) {
        await page.locator('.community-compact-composer').click();
        await page.locator('#communityMobileText').fill('Minha primeira publicação mobile.');
        await page.locator('#communityMobileCategory').click();
        await page.locator('#communityMobileCategoryOptions button').filter({ hasText: 'Organização financeira' }).click();
        await page.locator('#communityImage').setInputFiles(path.join(root, 'icon-192.png'));
        assert.equal(await page.locator('#communityMobileImagePreview img').isVisible(), true);
        assert.equal(await page.locator('#communityMobilePublish').isDisabled(), true);
        await page.locator('#communityMobileImageAlt').fill('Símbolo verde do Norteia apontando para o norte.');
        assert.equal(await page.locator('#communityMobilePublish').isEnabled(), true);
        await page.locator('#communityMobilePublish').click();
        await page.waitForTimeout(800);
        assert.equal(await page.locator('#communityComposerScreen').evaluate(x => x.classList.contains('hidden')), true);
        assert.match(await page.locator('#communityMobileToast').textContent(), /concluída/i);

        await page.locator('[data-community-mobile="search"]').click();
        assert.equal(await page.locator('#communitySearchScreen').evaluate(x => !x.classList.contains('hidden')), true);
        await page.locator('[data-community-mobile="close-search"]').click();

        await page.locator('#globalAddBtn').click();
        assert.equal(await page.locator('#communityComposerScreen').evaluate(x => !x.classList.contains('hidden')), true);
        await page.locator('[data-community-mobile="cancel-compose"]').click();
        assert.equal(await page.locator('[data-community-share]').count(), 1);
        assert.equal(await page.locator('[data-community-delete]').count(), 1);
        page.once('dialog', dialog => dialog.accept());
        await page.locator('[data-community-delete]').click();
        await page.waitForTimeout(250);
        assert.equal(await page.locator('.community-post').count(), 0);
        assert.match(await page.locator('#communityMobileToast').textContent(), /excluída/i);

        const light = await page.evaluate(() => {
          const style = getComputedStyle(document.querySelector('.community-mobile-layer'));
          return { background: style.backgroundColor, color: style.color };
        });
        await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
        const dark = await page.evaluate(() => {
          const style = getComputedStyle(document.querySelector('.community-mobile-layer'));
          return { background: style.backgroundColor, color: style.color };
        });
        assert.notDeepEqual(dark, light);

        await page.locator('.community-compact-composer').click();
        await page.setViewportSize({ width: 390, height: 500 });
        assert.equal(await page.locator('#communityComposerScreen > header').isVisible(), true);
        assert.ok(await page.locator('#communityComposerScreen main').evaluate(x => x.scrollHeight >= x.clientHeight));
      }
      assert.deepEqual(errors, []);
      results.push({ width, ...metrics, errors: errors.length });
      await page.close();
    }
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await desktop.goto(`http://127.0.0.1:${server.address().port}/tests/community-mobile-harness.html`, { waitUntil: 'networkidle' });
    await desktop.locator('.desktop-nav [data-view="community"]').evaluate(button => button.click());
    await desktop.waitForTimeout(500);
    assert.equal(await desktop.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), true);
    assert.equal(await desktop.locator('[data-community-share] .community-action-label').isVisible(), true);
    assert.equal(await desktop.locator('[data-community-delete] .community-action-label').isVisible(), true);
    await desktop.locator('.community-compact-composer').click();
    const composerBox = await desktop.locator('#communityComposerScreen').boundingBox();
    assert.ok(composerBox.width <= 680 && composerBox.height <= 780);
    await desktop.close();
    const desktopStrava = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const desktopErrors = [];
    desktopStrava.on('pageerror', error => desktopErrors.push(error.message));
    await desktopStrava.goto(`http://127.0.0.1:${server.address().port}/tests/community-mobile-harness.html`, { waitUntil: 'networkidle' });
    await desktopStrava.locator('.desktop-nav [data-view="community"]').evaluate(button => button.click());
    await desktopStrava.waitForTimeout(500);
    assert.equal(await desktopStrava.locator('.community-strava-layout').isVisible(), true);
    assert.equal(await desktopStrava.locator('.community-profile-rail').isVisible(), true);
    assert.equal(await desktopStrava.locator('.community-progress-rail').isVisible(), true);
    assert.equal(await desktopStrava.locator('.community-activity-summary').count(), 1);
    assert.equal(await desktopStrava.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), true);
    assert.deepEqual(desktopErrors, []);
    await desktopStrava.close();

    const game = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const gameErrors = [];
    game.on('pageerror', error => gameErrors.push(error.message));
    await game.goto(`http://127.0.0.1:${server.address().port}/tests/community-mobile-harness.html`, { waitUntil: 'networkidle' });
    await game.waitForTimeout(600);
    await game.evaluate(() => window.setView('achievements'));
    assert.equal(await game.locator('.achievement-card').count(), 9);
    assert.equal(await game.locator('.achievement-card.unlocked').count(), 3);
    assert.equal(await game.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth), true);
    const gameLight = await game.locator('.achievement-card.unlocked').first().evaluate(x => getComputedStyle(x).backgroundColor);
    await game.evaluate(() => document.documentElement.dataset.theme = 'dark');
    const gameDark = await game.locator('.achievement-card.unlocked').first().evaluate(x => getComputedStyle(x).backgroundColor);
    assert.notEqual(gameDark, gameLight);
    const shareAchievement = game.locator('.achievement-card [data-achievement-share="first_step"]');
    assert.equal(await shareAchievement.count(), 1);
    await shareAchievement.click();
    await game.locator('#achievementSharePreview img').waitFor({ state: 'visible' });
    assert.match(await game.locator('#achievementShareMessage').inputValue(), /Primeiro passo/);
    await game.locator('[data-share-channel="community"]').click();
    await game.waitForTimeout(350);
    assert.equal(await game.locator('#communityComposerScreen').evaluate(x => !x.classList.contains('hidden')), true);
    assert.equal(await game.locator('#communityCategory').inputValue(), 'Conquista');
    assert.equal(await game.locator('#communityMobileImagePreview img').isVisible(), true);
    assert.equal(await game.locator('#communityMobilePublish').isEnabled(), true);
    assert.deepEqual(gameErrors, []);
    await game.close();
    console.log(JSON.stringify({ ok: true, results }, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error.stack || error);
  server.close();
  process.exitCode = 1;
});
