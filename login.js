/*
  ASHDRIP ADMIN LOGIN
  ───────────────────
  Uses Supabase Auth (email + password). Accounts are created manually
  in the Supabase dashboard — see AUTH-SETUP.md — there's no public
  sign-up form on purpose.
*/

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");

  errorEl.textContent = "";

  if (!email || !password) {
    errorEl.textContent = "Enter your email and password.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Logging in…";

  const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = "Incorrect email or password.";
    btn.disabled = false;
    btn.textContent = "Log In";
    return;
  }

  window.location.href = "admin.html";
}

document.addEventListener("DOMContentLoaded", () => {
  // already-logged-in users skip straight past the login screen
  window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.href = "admin.html";
  });

  document.getElementById("password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
  document.getElementById("email").addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
});
