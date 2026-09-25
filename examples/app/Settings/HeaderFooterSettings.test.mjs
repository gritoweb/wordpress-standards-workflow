import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { appRoot, callKitPhp } from '../../../theme/app/test-support.mjs';
import { examplesApp } from '../../test-support.mjs';

const REQUIRES = [
  resolve(appRoot, 'Settings/SiteSettings.php'),
  resolve(examplesApp, 'Settings/HeaderFooterSettings.php'),
];

const call = (method, args = [], acf = null) =>
  callKitPhp(`App\\Settings\\HeaderFooterSettings::${method}`, args, { requires: REQUIRES, acf });

test('headerButton falls back to null with no ACF', () => {
  assert.equal(call('headerButton'), null);
});

test('headerScroll falls back to normal with no ACF', () => {
  assert.equal(call('headerScroll'), 'normal');
});

test('footerLegalName falls back to the site title with no ACF', () => {
  assert.equal(call('footerLegalName'), 'Test Site');
});

test('socials falls back to an empty list with no ACF', () => {
  assert.deepEqual(call('socials'), []);
});

test('headerButton returns null when the toggle is off even with a link saved', () => {
  const result = call('headerButton', [], {
    header_cta_enabled: false,
    header_cta_link: { url: 'https://example.com', title: 'Contact', target: '' },
  });

  assert.equal(result, null);
});

test('headerButton returns null when the link has no URL', () => {
  const result = call('headerButton', [], {
    header_cta_enabled: true,
    header_cta_link: { url: '', title: 'Contact', target: '' },
  });

  assert.equal(result, null);
});

test('headerButton drops a javascript: scheme and keeps a real one', () => {
  const dangerous = call('headerButton', [], {
    header_cta_enabled: true,
    header_cta_link: { url: 'javascript:alert(1)', title: 'Contact', target: '' },
  });
  assert.equal(dangerous, null);

  const safe = call('headerButton', [], {
    header_cta_enabled: true,
    header_cta_link: { url: 'https://example.com/contact', title: '', target: '_blank' },
  });

  assert.deepEqual(safe, { title: 'Contact', url: 'https://example.com/contact', target: '_blank' });
});

test('headerScroll accepts only sticky and scroll-up', () => {
  assert.equal(call('headerScroll', [], { header_scroll: 'sticky' }), 'sticky');
  assert.equal(call('headerScroll', [], { header_scroll: 'scroll-up' }), 'scroll-up');
  assert.equal(call('headerScroll', [], { header_scroll: 'sideways' }), 'normal');
});

test('footerLegalName trims and falls back to the site title when blank', () => {
  assert.equal(call('footerLegalName', [], { footer_legal_name: '  Acme Inc  ' }), 'Acme Inc');
  assert.equal(call('footerLegalName', [], { footer_legal_name: '   ' }), 'Test Site');
});

// H6: get_bloginfo('name', 'display') already HTML-encodes; footerLegalName
// must decode its fallback so a Blade {{ }} print doesn't encode "&" twice.
test('footerLegalName decodes the site title fallback (double-encoding regression)', () => {
  const result = callKitPhp('App\\Settings\\HeaderFooterSettings::footerLegalName', [], {
    requires: REQUIRES,
    acf: null,
    blogName: 'Smith &#038; Co',
  });

  assert.equal(result, 'Smith & Co');
});

test('socials keeps only the networks with a URL, in SOCIAL_NETWORKS order', () => {
  const result = call('socials', [], {
    social_facebook: 'https://facebook.com/acme',
    social_linkedin: 'https://linkedin.com/company/acme',
    social_other: 'https://example.com/newsletter',
    social_other_label: 'Our newsletter',
  });

  assert.deepEqual(result, [
    { icon: 'linkedin', name: 'LinkedIn', url: 'https://linkedin.com/company/acme' },
    { icon: 'facebook', name: 'Facebook', url: 'https://facebook.com/acme' },
    { icon: 'other', name: 'Our newsletter', url: 'https://example.com/newsletter' },
  ]);
});

test('socials falls back to a generic label when social_other has no label', () => {
  const result = call('socials', [], { social_other: 'https://example.com' });

  assert.deepEqual(result, [{ icon: 'other', name: 'Link', url: 'https://example.com' }]);
});

// L1: headerButton() already drops a link esc_url_raw rejects; socials()
// used to check the raw (unescaped) field, so a javascript: URL survived
// esc_url_raw as '' and still rendered a link (href="", the current page)
// with an icon, instead of being dropped like headerButton()'s would be.
test('socials drops a network whose URL esc_url_raw rejects, instead of keeping it as href=""', () => {
  const result = call('socials', [], { social_facebook: 'javascript:alert(1)' });

  assert.deepEqual(result, []);
});
