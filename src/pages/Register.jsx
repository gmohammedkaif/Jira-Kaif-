import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Imgage from "../assets/jira-kaif.jpg";
import { FcGoogle } from "react-icons/fc";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";

function Spinner({ color = "#fff" }) {
  return (
    <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ size = 14, color = "#00875A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M4 10l4.5 4.5L16 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthMeta = [
  { label: "Too short", color: "#FF5630" },
  { label: "Weak", color: "#FF5630" },
  { label: "Fair", color: "#FF991F" },
  { label: "Good", color: "#36B37E" },
  { label: "Strong", color: "#00875A" },
];

function InputField({ id, type, label, value, onChange, onKeyDown, hint, showToggle }) {
  const [show, setShow] = useState(false);
  const actualType = showToggle ? (show ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-[6px]">
      <label htmlFor={id} className="text-xs font-bold text-[#6B778C] tracking-[0.04em] uppercase">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={actualType}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          autoComplete={type === "password" ? "new-password" : type === "email" ? "email" : "name"}
          className={`w-full py-[10px] text-sm text-[#172B4D] bg-[#FAFBFC] border-2 border-[#DFE1E6] rounded outline-none box-border transition-all duration-150 leading-[1.5] font-[inherit] focus:bg-white focus:border-[#4C9AFF] focus:shadow-[0_0_0_2px_rgba(76,154,255,0.2)] ${
            showToggle ? "pl-3 pr-11" : "px-3"
          }`}
        />

        {showToggle && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-[10px] top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer p-1 text-[#6B778C] flex items-center"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        )}
      </div>

      {hint && <p className="text-xs text-[#5E6C84] m-0 leading-[1.5]">{hint}</p>}
    </div>
  );
}

function StrengthBar({ password }) {
  if (!password) return null;

  const score = getStrength(password);
  const meta = strengthMeta[score];

  return (
    <div className="mt-[-4px]">
      <div className="flex gap-1 mb-[6px]">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-sm transition-colors duration-300"
            style={{ backgroundColor: i <= score ? meta.color : "#DFE1E6" }}
          />
        ))}
      </div>

      <p className="text-xs m-0 font-semibold" style={{ color: meta.color }}>
        {meta.label}
      </p>
    </div>
  );
}

function Requirement({ met, text }) {
  return (
    <div className="flex items-center gap-[6px]">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 border ${
          met ? "bg-[#E3FCEF] border-[#00875A]" : "bg-[#F4F5F7] border-[#DFE1E6]"
        }`}
      >
        {met && <CheckIcon size={10} color="#00875A" />}
      </div>

      <span className={`text-xs transition-colors duration-200 ${met ? "text-[#00875A]" : "text-[#5E6C84]"}`}>
        {text}
      </span>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const getFirebaseError = (code) =>
    ({
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/popup-closed-by-user": "Google sign-up was cancelled.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
    })[code] || "Something went wrong. Please try again.";

  const validate = () => {
    if (!fullName.trim()) return "Please enter your full name.";
    if (!email) return "Please enter your email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!agreed) return "You must agree to the Terms of Service to continue.";
    return null;
  };

  const handleRegister = async () => {
    setError("");
    const err = validate();

    if (err) {
      setError(err);
      return;
    }

    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName.trim() });
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/dashboard");
    } catch (err) {
      setError(getFirebaseError(err.code));
    } finally {
      setGoogleLoading(false);
    }
  };

  const pwChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: password.length > 0 && password === confirmPassword,
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center font-['Segoe_UI',-apple-system,sans-serif]">
        <div className="text-center p-8">
          <div className="w-[72px] h-[72px] rounded-full bg-[#E3FCEF] border-[3px] border-[#00875A] flex items-center justify-center mx-auto mb-5 animate-[pop-in_0.4s_ease]">
            <CheckIcon size={32} color="#00875A" />
          </div>

          <h2 className="text-[22px] font-semibold text-[#172B4D] m-0 mb-2">
            Account created!
          </h2>

          <p className="text-sm text-[#5E6C84] m-0">
            Redirecting you to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center px-4 py-8 font-['Segoe_UI',-apple-system,BlinkMacSystemFont,'Helvetica_Neue',Arial,sans-serif]">
      <div className="w-full max-w-[420px] animate-[fade-up_0.35s_ease_both]">
        <div className="flex items-center justify-center gap-[10px] mb-7">
           <img className="w-[34px] h-[34px]" src={Imgage} alt="" />

          <span className="text-[22px] font-bold text-[#0052CC] tracking-[0.1em]">
            JIRA
          </span>
        </div>

        <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(9,30,66,0.1),0_0_1px_rgba(9,30,66,0.12),0_8px_24px_rgba(9,30,66,0.08)] p-[clamp(24px,6vw,40px)]">
          <h1 className="text-[22px] font-semibold text-[#172B4D] text-center m-0 mb-[6px] tracking-[-0.01em] leading-[1.3]">
            Create your account
          </h1>

          <p className="text-sm text-[#5E6C84] text-center m-0 mb-6 leading-[1.5]">
            Sign up and start managing your work
          </p>

          {error && (
            <div role="alert" className="bg-[#FFEBE6] border border-[#FF5630] rounded px-[14px] py-[10px] mb-5 text-[13px] text-[#BF2600] leading-[1.5] flex items-start gap-4">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="shrink-0 mt-px">
                <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z" fill="#BF2600" />
              </svg>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full px-4 py-[10px] bg-white hover:bg-[#F4F5F7] text-[#172B4D] text-sm font-medium border border-[#DFE1E6] rounded cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-[10px] transition-colors duration-150 font-[inherit] shadow-[0_1px_2px_rgba(9,30,66,0.06)] mb-5 leading-[1.5]"
          >
            {googleLoading ? (
              <>
                {/* <Spinner color="#172B4D" /> */ "Signing up... "}
              </>
            ) : (
              <>
                <FcGoogle /> Sign up with Google
              </>
            )}
          </button>

          <div className="flex items-center gap-[10px] mb-5">
            <div className="flex-1 h-px bg-[#DFE1E6]" />
            <span className="text-xs text-[#97A0AF] font-semibold tracking-[0.04em]">
              OR SIGN UP WITH EMAIL
            </span>
            <div className="flex-1 h-px bg-[#DFE1E6]" />
          </div>

          <div className="flex flex-col gap-4">
            <InputField id="fullName" type="text" label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />

            <InputField id="email" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

            <InputField id="password" type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} showToggle />

            {password && <StrengthBar password={password} />}

            {password && (
              <div className="flex flex-col gap-[6px] px-[14px] py-3 bg-[#F8F9FA] rounded border border-[#DFE1E6]">
                <Requirement met={pwChecks.length} text="At least 8 characters" />
                <Requirement met={pwChecks.upper} text="One uppercase letter" />
                <Requirement met={pwChecks.number} text="One number" />
              </div>
            )}

            <InputField
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              showToggle
            />

            {confirmPassword && (
              <div className="flex items-center gap-[6px] mt-[-8px]">
                <div
                  className={`w-[14px] h-[14px] rounded-full flex items-center justify-center shrink-0 border ${
                    pwChecks.match
                      ? "bg-[#E3FCEF] border-[#00875A]"
                      : "bg-[#FFEBE6] border-[#FF5630]"
                  }`}
                >
                  {pwChecks.match && <CheckIcon size={9} color="#00875A" />}
                </div>

                <span className={`text-xs ${pwChecks.match ? "text-[#00875A]" : "text-[#BF2600]"}`}>
                  {pwChecks.match ? "Passwords match" : "Passwords do not match"}
                </span>
              </div>
            )}

            <label className="flex items-start gap-[10px] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-[#0052CC] w-[15px] h-[15px] shrink-0 cursor-pointer"
              />

              <span className="text-[13px] text-[#5E6C84] leading-[1.5]">
                I agree to the{" "}
                <a  className="text-[#0052CC] no-underline font-medium hover:underline">
                  Terms of Service
                </a>
                {" "}and{" "}
                <a  className="text-[#0052CC] no-underline font-medium hover:underline">
                  Privacy Policy
                </a>
              </span>
            </label>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full px-4 py-[10px] bg-[#0052CC] hover:bg-[#0065FF] active:bg-[#0747A6] disabled:bg-[#0747A6] text-white text-sm font-semibold border-none rounded cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors duration-150 font-[inherit] tracking-[0.01em] leading-[1.5]"
            >
              {loading ? (
                <>
                  {/* <Spinner />  */"Creating account..." }
                </>
              ) : (
                "Create account"
              )}
            </button>
          </div>

          <p className="text-center text-[13px] text-[#5E6C84] mt-6 mb-0 leading-[1.5]">
            Already have an account?{" "}
            <a href="/" className="text-[#0052CC] no-underline font-semibold hover:underline">
              Log in    
            </a>
          </p>
        </div>

        <p className="text-center text-[11px] text-[#97A0AF] mt-5 leading-[1.7]">
          <a href="/terms" className="text-[11px] text-[#97A0AF] no-underline font-medium hover:underline">
            Privacy Policy
          </a>
          {" · "}
          <a href="/privacy" className="text-[11px] text-[#97A0AF] no-underline font-medium hover:underline">
            Terms of Use
          </a>
        </p>
      </div>
    </div>
  );
}