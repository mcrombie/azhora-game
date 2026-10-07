/** Cognito user-pool tokens stay in this window's session storage; no AWS keys or passwords are saved. */
export function createPressAuth({ config, storage = sessionStorage, fetcher = fetch, now = () => Date.now() }) {
  const key = 'azhora-press-session-v1', endpoint = `https://cognito-idp.${config.region}.amazonaws.com/`;
  async function call(action, body) {
    const r = await fetcher(endpoint, { method: 'POST', headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'AWSCognitoIdentityProviderService.' + action }, body: JSON.stringify({ ClientId: config.clientId, ...body }), signal: AbortSignal.timeout(20000) });
    const data = await r.json(); if (!r.ok) throw new Error(data.message ?? 'Sign-in failed.'); return data;
  }
  function keep(data) {
    const r = data.AuthenticationResult; if (!r?.AccessToken) return data;
    const previous = JSON.parse(storage.getItem(key) ?? '{}');
    storage.setItem(key, JSON.stringify({ access: r.AccessToken, refresh: r.RefreshToken ?? previous.refresh, expires: now() + r.ExpiresIn * 1000 }));
    return { signedIn: true };
  }
  return {
    async signIn(username, password) { return keep(await call('InitiateAuth', { AuthFlow: 'USER_PASSWORD_AUTH', AuthParameters: { USERNAME: username, PASSWORD: password } })); },
    async newPassword(username, password, session) { return keep(await call('RespondToAuthChallenge', { ChallengeName: 'NEW_PASSWORD_REQUIRED', Session: session, ChallengeResponses: { USERNAME: username, NEW_PASSWORD: password } })); },
    async token() {
      let saved; try { saved = JSON.parse(storage.getItem(key) ?? '{}'); } catch { return ''; }
      if (saved.expires > now() + 30000) return saved.access;
      if (!saved.refresh) return '';
      try { keep(await call('InitiateAuth', { AuthFlow: 'REFRESH_TOKEN_AUTH', AuthParameters: { REFRESH_TOKEN: saved.refresh } })); return JSON.parse(storage.getItem(key)).access; }
      catch { storage.removeItem(key); return ''; }
    },
    signOut() { storage.removeItem(key); },
  };
}
export function createPressDialog({ config, auth, onClose = () => {} }) {
  const dialog = document.createElement('dialog'); dialog.className = 'annals-signin';
  const title = document.createElement('h2'); title.textContent = 'The collaborators’ press';
  const intro = document.createElement('p'); intro.textContent = 'Sign in to commission fresh accounts and woodcuts. Unfinished pages remain safely in your chronicle.';
  const form = document.createElement('form'), username = document.createElement('input'), password = document.createElement('input');
  username.autocomplete = 'username'; username.required = true; username.setAttribute('aria-label', 'Collaborator name'); username.placeholder = 'Collaborator name';
  password.type = 'password'; password.autocomplete = 'current-password'; password.required = true; password.setAttribute('aria-label', 'Password'); password.placeholder = 'Password';
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const submit = document.createElement('button'); submit.textContent = 'Sign in'; submit.type = 'submit';
  const close = document.createElement('button'); close.textContent = 'Close'; close.type = 'button'; close.onclick = () => dialog.close();
  const logout = document.createElement('button'); logout.textContent = 'Sign out'; logout.type = 'button'; logout.onclick = () => { auth?.signOut(); status.textContent = 'Signed out. Your histories are preserved.'; };
  let challenge;
  form.append(username, password, submit); dialog.append(title, intro, form, status, logout, close); document.body.append(dialog);
  form.onsubmit = async e => {
    e.preventDefault(); submit.disabled = true;
    try {
      const result = challenge ? await auth.newPassword(username.value, password.value, challenge) : await auth.signIn(username.value, password.value);
      password.value = '';
      if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') { challenge = result.Session; password.autocomplete = 'new-password'; status.textContent = 'Choose a new password for this invited account.'; submit.textContent = 'Save password'; }
      else if (result.signedIn) { challenge = null; status.textContent = 'Signed in. Pending pages will be sent to the press.'; }
      else status.textContent = 'This account requires an administrator-supported sign-in challenge.';
    } catch (error) { status.textContent = error.message; } finally { submit.disabled = false; }
  };
  if (!config?.apiUrl || !config?.clientId) { form.hidden = true; logout.hidden = true; status.textContent = 'The collaborators’ press has not been connected yet. Your community can keep playing and recording events.'; }
  dialog.onclose = () => { password.value = ''; onClose(); };
  return { open() { dialog.showModal(); } };
}
