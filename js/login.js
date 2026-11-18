Kyro.bounceIfAuthed();

const credsPanel = document.querySelector('[data-step="creds"]');
const otpPanel = document.querySelector('[data-step="otp"]');
const loginError = document.getElementById("loginError");
const otpError = document.getElementById("otpError");
let pending = { email: "", password: "" };

function showOtp(message = "") {
  credsPanel.classList.remove("is-on");
  otpPanel.classList.add("is-on");
  document.getElementById("otpEmail").textContent = pending.email;
  otpError.textContent = message || "";
  document.getElementById("otp").focus();
}

function enterApp(data) {
  const token = Kyro.extractToken(data);
  if (!token) {
    otpError.textContent = "Login was not completed. Enter the OTP sent to your email.";
    return;
  }
  Kyro.setSession(token, Kyro.extractUser(data));
  location.replace("app.html");
}

function isOtpResponse(data) {
  return Boolean(data && (data.otpRequired || data.needsVerification || data.otpPurpose));
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  pending.email = document.getElementById("email").value.trim().toLowerCase();
  pending.password = document.getElementById("password").value;
  if (!pending.email || !pending.password) {
    loginError.textContent = "Enter your email and password.";
    return;
  }

  const button = event.submitter || document.querySelector('#loginForm button[type="submit"]');
  button.disabled = true;
  try {
    // The first request checks the password and sends a fresh OTP. It must
    // never create a session by itself.
    const data = await Kyro.api.login({ email: pending.email, password: pending.password });
    if (isOtpResponse(data)) {
      showOtp(data.mailSent === false ? (data.message || "The OTP could not be sent. Check your email settings and try Resend OTP.") : "Enter the one-time code sent to your email.");
      return;
    }
    loginError.textContent = data.message || "Login requires a one-time code. Please try again.";
  } catch (err) {
    loginError.textContent = err.message || "Network error. Try again.";
  } finally {
    button.disabled = false;
  }
});

document.getElementById("verifyBtn").addEventListener("click", async () => {
  otpError.textContent = "";
  const otp = document.getElementById("otp").value.trim();
  if (!/^\d{6}$/.test(otp)) {
    otpError.textContent = "Enter the six-digit OTP sent to your email.";
    return;
  }

  const button = document.getElementById("verifyBtn");
  button.disabled = true;
  try {
    // Login verification always includes both the password and the OTP.
    const data = await Kyro.api.login({
      email: pending.email,
      password: pending.password,
      otp,
      code: otp
    });
    if (data._ok && Kyro.extractToken(data)) {
      enterApp(data);
      return;
    }
    otpError.textContent = data.message || "That OTP is invalid or expired. Request a new code.";
  } catch (err) {
    otpError.textContent = err.message || "Could not verify the OTP.";
  } finally {
    button.disabled = false;
  }
});

document.getElementById("resendBtn").addEventListener("click", async () => {
  otpError.textContent = "";
  try {
    const data = await Kyro.api.resendOtp(pending.email);
    otpError.textContent = data.message || (data._ok ? "A new OTP has been sent." : "Could not resend the OTP.");
    if (data.otp) {
      document.getElementById("otp").value = data.otp;
      otpError.textContent = "Development OTP: " + data.otp;
    }
  } catch (err) {
    otpError.textContent = err.message || "Could not resend the OTP.";
  }
});
