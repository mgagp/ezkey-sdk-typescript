import { apiBase, fetchDemoStatus, postLoginStart, postLoginWait } from './api.js';
import { parseProblemDetailsJson } from './problem-details.js';
import type { CreateAttemptResult, DemoIntegrationStatus, DemoLoginOutcome } from './types.js';

const ACME_LOGO = `<svg class="demo-brand-mark" width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="72" height="72" fill="#3076df"/>
  <path fill="#ffffff" d="M36 14 L54 58 H44 L40 46 H32 L28 58 H18 Z M36 26 L33 38 H39 Z"/>
</svg>`;

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function buildSdkErrorHtml(message: string, detail: string | undefined): string {
  if (detail) {
    const parsed = parseProblemDetailsJson(detail);
    if (parsed) {
      const meta = parsed.status != null ? `<p class="demo-alert-meta">HTTP ${parsed.status}</p>` : '';
      const technical = `<details class="demo-technical"><summary>Technical details</summary><pre class="demo-pre">${esc(truncate(detail, 8000))}</pre></details>`;
      return `<div class="demo-alert demo-alert-error" role="alert">
  <p class="demo-alert-title">${esc(parsed.title)}</p>
  <p class="demo-alert-detail">${esc(parsed.detail)}</p>
  ${meta}
</div>${technical}`;
    }
  }
  const body = `<div class="demo-alert demo-alert-error" role="alert">
  <p class="demo-alert-detail">${esc(message)}</p>
</div>`;
  const technical = detail
    ? `<details class="demo-technical"><summary>Technical details</summary><pre class="demo-pre">${esc(truncate(detail, 8000))}</pre></details>`
    : '';
  return `${body}${technical}`;
}

function renderDeveloperPanel(status: DemoIntegrationStatus): string {
  const readinessLabel = status.clientReady ? 'Ready' : 'Not ready';
  const missingVariables =
    status.missingVariables.length > 0
      ? `<li><strong>Missing:</strong> ${esc(status.missingVariables.join(', '))}</li>`
      : '';
  const ik = status.integrationKeyPreview ? esc(status.integrationKeyPreview) : 'Not set';

  return `<details class="demo-dev">
  <summary>Developer / SDK</summary>
  <ul>
    <li>Demo API: <code>${esc(apiBase())}</code></li>
    <li>Integration API: <code>${esc(status.baseUrl)}</code></li>
    <li>API key preview: <code>${ik}</code></li>
    <li>Ezkey client: <strong>${esc(readinessLabel)}</strong></li>
    ${missingVariables}
  </ul>
  <p style="font-size:0.75rem;margin:8px 0 0;color:var(--demo-fg-muted);">${esc(status.statusMessage)}</p>
</details>`;
}

function buildHomeHtml(status: DemoIntegrationStatus, loadError: string | null): string {
  const loginBlock = status.clientReady
    ? `<form id="demo-login-form" class="demo-login-form">
      <label class="demo-label" for="userIdentifier">User identifier</label>
      <input class="demo-input" id="userIdentifier" name="userIdentifier" type="text" autocomplete="username" required placeholder="Integrated-app user id (enrollment)" />
      <button type="submit" class="demo-btn">Sign in</button>
    </form>`
    : `<p style="color:var(--demo-error);font-weight:600;">Configure integration keys in the <strong>demo API</strong> <code>.env</code> before signing in.</p>`;

  const errBanner = loadError
    ? `<div class="demo-alert demo-alert-error" role="alert"><p class="demo-alert-detail">${esc(loadError)}</p></div>`
    : '';

  return `<div class="demo-page">
  <div class="demo-frame">
    <div class="demo-brand">
      ${ACME_LOGO}
      <p class="demo-brand-line">Acme Inc.</p>
      <h1 class="demo-brand-title">Sign in</h1>
      <p class="demo-tagline">Demo merchant portal — MFA via Ezkey (UI → demo API → Integration API)</p>
    </div>
    <div class="demo-card">
      ${errBanner}
      ${loginBlock}
    </div>
    ${renderDeveloperPanel(status)}
    <p class="demo-foot">Powered by Ezkey · Vite demo UI</p>
  </div>
</div>`;
}

function showStartError(root: HTMLElement, outcome: DemoLoginOutcome): void {
  let heroTitle = 'Sign in';
  const parsedProblem =
    outcome.kind === 'sdk_error' && outcome.detail ? parseProblemDetailsJson(outcome.detail) : null;
  if (parsedProblem) {
    heroTitle = parsedProblem.title;
  }

  let bodyHtml: string;
  if (
    outcome.kind === 'completed' ||
    outcome.kind === 'rejected' ||
    outcome.kind === 'attempt_closed'
  ) {
    bodyHtml = '<p>Unexpected state.</p>';
  } else if (outcome.kind === 'sdk_error') {
    bodyHtml = buildSdkErrorHtml(outcome.message, outcome.detail);
  } else {
    bodyHtml = `<p style="margin:0;font-weight:600;">${esc(outcome.message)}</p>`;
  }

  const docTitle = parsedProblem ? `Acme Inc. — ${heroTitle}` : 'Acme Inc. — Sign in error';
  document.title = docTitle;

  root.innerHTML = `<div class="demo-page">
  <div class="demo-frame">
    <div class="demo-brand">
      ${ACME_LOGO}
      <p class="demo-brand-line">Acme Inc.</p>
      <h1 class="demo-brand-title">${esc(heroTitle)}</h1>
      ${parsedProblem ? `<p class="demo-tagline">Check the message below and try again.</p>` : ''}
    </div>
    <div class="demo-card">
      ${bodyHtml}
      <a class="demo-back" href="#" id="demo-back-start">← Back</a>
    </div>
  </div>
</div>`;

  root.querySelector('#demo-back-start')?.addEventListener('click', (e) => {
    e.preventDefault();
    void showHome(root);
  });
}

export async function showHome(root: HTMLElement): Promise<void> {
  document.title = 'Acme Inc. — Sign in';
  let status: DemoIntegrationStatus;
  let loadError: string | null = null;
  try {
    status = await fetchDemoStatus();
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
    status = {
      configured: false,
      clientReady: false,
      baseUrl: '—',
      integrationKeyPreview: null,
      missingVariables: [],
      statusMessage: 'Could not reach the demo API. Is it running?',
    };
  }

  root.innerHTML = buildHomeHtml(status, loadError);

  const form = root.querySelector<HTMLFormElement>('#demo-login-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = root.querySelector<HTMLInputElement>('#userIdentifier');
    const uid = input?.value?.trim() ?? '';
    const result: CreateAttemptResult = await postLoginStart(uid);
    if (!result.ok) {
      showStartError(root, result.outcome);
      return;
    }
    showWaiting(root, result);
  });
}

function showWaiting(
  root: HTMLElement,
  start: Extract<CreateAttemptResult, { ok: true }>
): void {
  document.title = 'Acme Inc. — Approve sign-in';
  const props = {
    authAttemptId: start.authAttemptId,
    expiresAtIso: start.expiresAtIso,
    userIdentifier: start.userIdentifier,
  };

  root.innerHTML = `<div class="demo-page">
  <div class="demo-frame">
    <div class="demo-brand">
      ${ACME_LOGO}
      <p class="demo-brand-line">Acme Inc.</p>
      <h1 id="demo-header-title" class="demo-brand-title">Approve on your phone</h1>
      <p id="demo-header-tagline" class="demo-tagline">Open the Ezkey prompt and approve or deny</p>
    </div>
    <div class="demo-card demo-card-wide">
      <div id="demo-waiting">
        <p class="demo-muted" style="text-align:center;">Awaiting approval</p>
        <div class="demo-wait-row">
          <span class="demo-spinner" aria-hidden="true"></span>
          <span style="font-size:0.9rem;color:var(--demo-fg-muted);">Check your mobile device</span>
        </div>
        <p class="demo-muted" style="text-align:center;margin-top:22px;">Time remaining</p>
        <div id="demo-countdown" class="demo-countdown">00:00</div>
        <button type="button" class="demo-btn demo-btn-secondary" id="demo-cancel">Cancel</button>
      </div>
      <div id="demo-result" hidden></div>
    </div>
  </div>
</div>`;

  const deadline = new Date(props.expiresAtIso).getTime();
  const countdownEl = root.querySelector<HTMLElement>('#demo-countdown')!;
  const waitingEl = root.querySelector<HTMLElement>('#demo-waiting')!;
  const resultEl = root.querySelector<HTMLElement>('#demo-result')!;
  const headerTitleEl = root.querySelector<HTMLElement>('#demo-header-title');
  const headerTaglineEl = root.querySelector<HTMLElement>('#demo-header-tagline');
  const ctl = new AbortController();
  let settled = false;

  function updateHeader(title: string, tagline: string): void {
    if (headerTitleEl) headerTitleEl.textContent = title;
    if (headerTaglineEl) headerTaglineEl.textContent = tagline;
    document.title = `Acme Inc. — ${title}`;
  }

  function fmt(sec: number): string {
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${r < 10 ? '0' : ''}${r}`;
  }

  function setCountdownClass(sec: number): void {
    countdownEl.className = 'demo-countdown';
    if (sec <= 30) countdownEl.classList.add('crit');
    else if (sec <= 60) countdownEl.classList.add('warn');
  }

  function sdkErrorMarkup(o: DemoLoginOutcome & { kind: 'sdk_error' }): string {
    const detail = o.detail || '';
    const p = parseProblemDetailsJson(detail);
    if (p) {
      const meta = p.status != null ? `<p class="demo-alert-meta">HTTP ${p.status}</p>` : '';
      return (
        `<div class="demo-alert demo-alert-error" role="alert">` +
        `<p class="demo-alert-title">${esc(p.title)}</p>` +
        `<p class="demo-alert-detail">${esc(p.detail)}</p>` +
        meta +
        `</div>` +
        `<details class="demo-technical"><summary>Technical details</summary><pre class="demo-pre">${esc(detail.length > 8000 ? `${detail.slice(0, 8000)}…` : detail)}</pre></details>` +
        `<a class="demo-back" href="#" id="demo-back-res">← Back</a>`
      );
    }
    return (
      `<div class="demo-alert demo-alert-error" role="alert">` +
      `<p class="demo-alert-detail">${esc(o.message)}</p>` +
      `</div>` +
      (detail
        ? `<details class="demo-technical"><summary>Technical details</summary><pre class="demo-pre">${esc(detail.length > 8000 ? `${detail.slice(0, 8000)}…` : detail)}</pre></details>`
        : '') +
      `<a class="demo-back" href="#" id="demo-back-res">← Back</a>`
    );
  }

  function fillOutcome(o: DemoLoginOutcome): void {
    if (settled) return;
    settled = true;
    clearInterval(countdownTimer);
    waitingEl.hidden = true;
    resultEl.hidden = false;

    if (o.kind === 'completed') {
      updateHeader("You're signed in", 'MFA completed successfully.');
      resultEl.innerHTML =
        `<p class="demo-muted">User identifier</p>` +
        `<p style="font-weight:700;margin-top:4px">${esc(o.userIdentifier)}</p>` +
        `<div class="demo-result-grid">` +
        `<strong>Enrollment</strong>: ${esc(o.enrollmentId != null ? String(o.enrollmentId) : '—')}<br/>` +
        `<strong>Attempt status</strong>: ${esc(o.attemptStatus || '—')}<br/>` +
        `<strong>Wait</strong>: ${esc(o.waitStatus || '')}` +
        `</div>` +
        `<a class="demo-back" href="#" id="demo-back-res">← Done</a>`;
      wireBack(root);
      return;
    }
    if (o.kind === 'rejected') {
      updateHeader('Sign-in denied', 'You declined this request on your device.');
      resultEl.innerHTML =
        `<p class="demo-muted">User identifier</p>` +
        `<p style="font-weight:700;margin-top:4px">${esc(o.userIdentifier)}</p>` +
        `<div class="demo-result-grid">` +
        `<strong>Attempt status</strong>: ${esc(o.attemptStatus || 'REJECTED')}<br/>` +
        `<strong>Wait</strong>: ${esc(o.waitStatus || '')}` +
        `</div>` +
        `<a class="demo-back" href="#" id="demo-back-res">← Try again</a>`;
      wireBack(root);
      return;
    }
    if (o.kind === 'attempt_closed') {
      updateHeader('Sign-in unsuccessful', 'This attempt did not complete with an approval.');
      resultEl.innerHTML =
        `<p class="demo-result-grid"><strong>Status</strong>: ${esc(o.terminalStatus)}</p>` +
        `<p class="demo-muted" style="margin-top:12px;">User identifier</p>` +
        `<p style="font-weight:700;margin-top:4px">${esc(o.userIdentifier)}</p>` +
        `<div class="demo-result-grid">` +
        `<strong>Attempt status</strong>: ${esc(o.attemptStatus || '—')}<br/>` +
        `<strong>Wait</strong>: ${esc(o.waitStatus || '')}` +
        `</div>` +
        `<a class="demo-back" href="#" id="demo-back-res">← Try again</a>`;
      wireBack(root);
      return;
    }
    if (o.kind === 'expired') {
      updateHeader('Timed out', 'The approval window has closed.');
      resultEl.innerHTML =
        `<p class="demo-result-grid">${esc(o.message)}</p>` +
        `<a class="demo-back" href="#" id="demo-back-res">← Try again</a>`;
      wireBack(root);
      return;
    }
    if (o.kind === 'sdk_error') {
      const parsedErr = o.detail ? parseProblemDetailsJson(o.detail) : null;
      if (parsedErr) {
        updateHeader(
          parsedErr.title,
          parsedErr.detail.length > 100 ? `${parsedErr.detail.slice(0, 97)}…` : parsedErr.detail
        );
      } else {
        updateHeader('Could not complete', 'The Integration API returned an error.');
      }
      resultEl.innerHTML = sdkErrorMarkup(o);
      wireBack(root);
      return;
    }
    updateHeader('Could not complete', 'Review the details below or try again.');
    resultEl.innerHTML =
      `<p class="demo-result-grid">${esc(o.message)}</p>` +
      `<a class="demo-back" href="#" id="demo-back-res">← Back</a>`;
    wireBack(root);
  }

  function wireBack(elRoot: HTMLElement): void {
    elRoot.querySelector('#demo-back-res')?.addEventListener('click', (e) => {
      e.preventDefault();
      void showHome(elRoot);
    });
  }

  function showLocalExpired(): void {
    if (settled) return;
    settled = true;
    clearInterval(countdownTimer);
    ctl.abort();
    updateHeader('Timed out', 'No response before the attempt expired.');
    waitingEl.hidden = true;
    resultEl.hidden = false;
    resultEl.innerHTML =
      `<p class="demo-result-grid">No response before the attempt expired.</p>` +
      `<a class="demo-back" href="#" id="demo-back-res">← Try again</a>`;
    wireBack(root);
  }

  function tick(): void {
    const sec = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
    countdownEl.textContent = fmt(sec);
    setCountdownClass(sec);
    if (sec <= 0) {
      clearInterval(countdownTimer);
      showLocalExpired();
    }
  }

  const countdownTimer = setInterval(tick, 1000);
  tick();

  root.querySelector('#demo-cancel')?.addEventListener('click', () => {
    ctl.abort();
    void showHome(root);
  });

  void postLoginWait({
    authAttemptId: props.authAttemptId,
    userIdentifier: props.userIdentifier,
    expiresAtIso: props.expiresAtIso,
    signal: ctl.signal,
  })
    .then((data) => {
      fillOutcome(data.outcome);
    })
    .catch((e: unknown) => {
      if (e instanceof Error && e.name === 'AbortError') return;
      if (settled) return;
      settled = true;
      clearInterval(countdownTimer);
      updateHeader('Connection error', 'Could not reach the demo API.');
      waitingEl.hidden = true;
      resultEl.hidden = false;
      resultEl.innerHTML =
        `<div class="demo-alert demo-alert-error" role="alert">` +
        `<p class="demo-alert-detail">${esc(e instanceof Error ? e.message : String(e))}</p>` +
        `</div>` +
        `<a class="demo-back" href="#" id="demo-back-res">← Back</a>`;
      wireBack(root);
    });
}

export function mountApp(root: HTMLElement): void {
  void showHome(root);
}
