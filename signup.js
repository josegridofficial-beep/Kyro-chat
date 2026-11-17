Kyro.bounceIfAuthed();

const panels = [...document.querySelectorAll(".panel")];
const dots = document.getElementById("stepDots");
const steps = ["details", "otp", "photo"];
steps.forEach(() => {
  const dot = document.createElement("span");
  dot.className = "step-dot";
  dots.appendChild(dot);
});

let step = "details";
let pending = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
  dateOfBirth: "",
  age: null,
  photo: ""
};

function show(name) {
  step = name;
  panels.forEach((panel) => panel.classList.toggle("is-on", panel.dataset.step === name));
  [...dots.children].forEach((dot, index) => dot.classList.toggle("is-on", steps[index] === name));
}

function setError(id, message) {
  const element = document.getElementById(id);
  if (element) element.textContent = message || "";
}

function setPending(data) {
  pending = {
    email: data.email,
    password: data.password,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    dateOfBirth: data.dateOfBirth,
    age: data.age,
    photo: pending.photo || ""
  };
}

show("details");

const dob = document.getElementById("dob");
const ageLine = document.getElementById("ageLine");
dob.addEventListener("input", () => {
  const age = Kyro.ageFromDob(dob.value);
  ageLine.textContent = age === null ? "Age will appear here" : age < 0 ? "Please pick a valid date" : `You are ${age} years old`;
});

document.getElementById("signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (step !== "details") return;
  setError("detailsError", "");

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const dateOfBirth = dob.value;
  const age = Kyro.ageFromDob(dateOfBirth);
  const legal = window.KYRO_LEGAL || {};

  if (!fullName || !email || !phone || !password || !dateOfBirth) {
    setError("detailsError", "Please fill in every field.");
    return;
  }
  if (password.length < 8) {
    setError("detailsError", "Password must be at least 8 characters.");
    return;
  }
  if (age === null || age < 0 || age > 120) {
    setError("detailsError", "Please enter a valid date of birth.");
    return;
  }
  if (age < (legal.minAge || 13)) {
    setError("detailsError", `You must be at least ${legal.minAge || 13} years old to use Kyro Chat.`);
    return;
  }
  if (!document.getElementById("agree")?.checked) {
    setError("detailsError", "Please agree to the Terms of Service and Privacy Policy to continue.");
    return;
  }

  const { firstName, lastName } = Kyro.splitName(fullName);
  const signupData = { email, password, firstName, lastName, phone, dateOfBirth, age };
  setPending(signupData);
  const button = document.querySelector('#signupForm button[type="submit"]');
  button.disabled = true;

  try {
    // The backend stores these fields in Turso before creating the OTP:
    // firstName, lastName, email, phone, passwordHash, dateOfBirth, age,
    // username, isVerified=false, otpHash, otpExpires, and otpPurpose=verify.
    const data = await Kyro.api.register({
      firstName,
      lastName,
      fullName,
      name: fullName,
      email,
      phone,
      phoneNumber: phone,
      password,
      dateOfBirth,
      dob: dateOfBirth,
      age,
      flow: "signup"
    });

    if (!data.otpRequired && !data.needsVerification) {
      setError("detailsError", data.message || "Could not create the account.");
      return;
    }
    document.getElementById("otpEmail").textContent = email;
    setError("otpError", data._ok ? "Enter the six-digit code sent to your email." : (data.message || "The verification email could not be sent. Fix the email settings and tap Resend OTP."));
    if (data.otp) {
      document.getElementById("otp").value = data.otp;
      setError("otpError", "Development OTP: " + data.otp);
    }
    show("otp");
  } catch (error) {
    setError("detailsError", error.message || "Network error. Try again.");
  } finally {
    button.disabled = false;
  }
});

document.getElementById("verifyBtn").addEventListener("click", async () => {
  setError("otpError", "");
  const otp = document.getElementById("otp").value.trim();
  if (!/^\d{6}$/.test(otp)) {
    setError("otpError", "Enter the six-digit code we sent you.");
    return;
  }
  const button = document.getElementById("verifyBtn");
  button.disabled = true;
  try {
    const data = await Kyro.api.verifyOtp(pending.email, otp);
    const token = Kyro.extractToken(data);
    if (!data._ok || !token) {
      setError("otpError", data.message || "That code is invalid or expired. Request a new code.");
      return;
    }
    Kyro.setSession(token, {
      firstName: pending.firstName,
      lastName: pending.lastName,
      fullName: `${pending.firstName} ${pending.lastName}`.trim(),
      email: pending.email,
      phone: pending.phone,
      dateOfBirth: pending.dateOfBirth,
      age: pending.age
    });
    show("photo");
  } catch (error) {
    setError("otpError", error.message || "Could not verify the code.");
  } finally {
    button.disabled = false;
  }
});

document.getElementById("resendBtn").addEventListener("click", async () => {
  setError("otpError", "");
  try {
    const data = await Kyro.api.resendOtp(pending.email);
    setError("otpError", data.otp ? "Development OTP: " + data.otp : (data.message || "A new code has been sent."));
    if (data.otp) document.getElementById("otp").value = data.otp;
  } catch (error) {
    setError("otpError", error.message || "Could not resend the code.");
  }
});

document.getElementById("photo").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    pending.photo = await Kyro.fileToDataUrl(file);
    const preview = document.getElementById("avatarPreview");
    preview.style.backgroundImage = `url(${pending.photo})`;
    preview.textContent = "";
  } catch (_) {
    setError("photoError", "Could not read that image.");
  }
});

async function finishSignup(skipPhoto) {
  setError("photoError", "");
  const token = Kyro.getToken();
  if (!token) {
    setError("photoError", "Please verify the OTP before continuing.");
    show("otp");
    return;
  }
  if (!skipPhoto && pending.photo) {
    try {
      await Kyro.api.updateProfile({ avatar: pending.photo, profilePicture: pending.photo, photo: pending.photo });
    } catch (error) {
      setError("photoError", error.message || "The profile photo could not be saved, but your account is ready.");
    }
  }
  location.replace("app.html");
}

document.getElementById("finishBtn").addEventListener("click", () => finishSignup(false));
document.getElementById("skipPhotoBtn").addEventListener("click", () => finishSignup(true));
