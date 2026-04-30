import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";
import Imgage from "../assets/jira-kaif.jpg";

// function Spinner({ color = "#fff" }) {
//   return (
//     <svg
//       className="animate-spin w-4 h-4 shrink-0"
//       viewBox="0 0 24 24"
//       fill="none"
//     >
//       <circle
//         cx="12"
//         cy="12"
//         r="10"
//         stroke={color}
//         strokeWidth="3"
//         strokeOpacity="0.25"
//       />
//       <path
//         d="M12 2a10 10 0 0 1 10 10"
//         stroke={color}
//         strokeWidth="3"
//         strokeLinecap="round"
//       />
//     </svg>
//   );
// }

function GoogleIcon() {
  return (
    <svg
      className="shrink-0"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.251 17.64 11.943 17.64 9.2z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.167.282-1.707V4.961H.957A9 9 0 0 0 0 9c0 1.452.348 2.825.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function InputField({ id, type, label, value, onChange, onKeyDown }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label
        htmlFor={id}
        className="text-xs font-bold text-[#6B778C] tracking-[0.04em] uppercase"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        autoComplete={type === "password" ? "current-password" : "email"}
        className="w-full px-3 py-[10px] text-sm text-[#172B4D] bg-[#FAFBFC] border-2 border-[#DFE1E6] rounded outline-none box-border transition-all duration-150 leading-[1.5] font-[inherit] focus:bg-white focus:border-[#4C9AFF] focus:shadow-[0_0_0_2px_rgba(76,154,255,0.2)]"
      />
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const getFirebaseError = (code) =>
    ({
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password. Please try again.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/popup-closed-by-user": "Google sign-in was cancelled.",
      "auth/invalid-credential":
        "Invalid credentials. Please check and try again.",
    })[code] || "Something went wrong. Please try again.";

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center px-4 py-8 font-['Segoe_UI',-apple-system,BlinkMacSystemFont,'Helvetica_Neue',Arial,sans-serif]">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-[14px] mb-7 ">
          <img className="w-[34px] h-[34px]" src={Imgage} alt="" />

          <span className="text-[22px] font-bold text-[#0052CC] tracking-[0.1em]">
            JIRA
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-[0_1px_2px_rgba(9,30,66,0.1),0_0_1px_rgba(9,30,66,0.12),0_8px_24px_rgba(9,30,66,0.08)] p-[clamp(24px,6vw,40px)]">
          <h1 className="text-[22px] font-semibold text-[#172B4D] text-center m-0 mb-[6px] tracking-[-0.01em] leading-[1.3] ">
            Log in to your account
          </h1>

          <p className="text-sm text-[#5E6C84] text-center m-0 mb-6 leading-[1.5]">
            Enter your email and password to continue
          </p>

          {error && (
            <div
              role="alert"
              className="bg-[#FFEBE6] border border-[#FF5630] rounded px-[14px] py-[10px] mb-5 text-[13px] text-[#BF2600] leading-[1.5] flex items-start gap-2"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                className="shrink-0 mt-px"
              >
                <path
                  d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z"
                  fill="#BF2600"
                />
              </svg>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <InputField
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
            />

            <InputField
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
            />

            <div className="text-right mt-[-6px]">
              <a
                href=""
                className="text-[13px] text-[#0052CC] no-underline font-medium hover:underline"
              >
                Can't log in?
              </a>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full px-4 py-[10px] bg-[#0052CC] hover:bg-[#0065FF] active:bg-[#0747A6] disabled:bg-[#0747A6] text-white text-sm font-semibold border-none rounded cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors duration-150 font-[inherit] tracking-[0.01em] mt-1 leading-[1.5]"
            >
              {loading ? <>{/* <Spinner /> Logging in... */}</> : "Log in"}
            </button>

            <div className="flex items-center gap-[10px] my-[2px]">
              <div className="flex-1 h-px bg-[#DFE1E6]" />
              <span className="text-xs text-[#97A0AF] font-semibold tracking-[0.04em]">
                OR
              </span>
              <div className="flex-1 h-px bg-[#DFE1E6]" />
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full px-4 py-[10px] bg-white hover:bg-[#F4F5F7] text-[#172B4D] text-sm font-medium border border-[#DFE1E6] rounded cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-[10px] transition-colors duration-150 font-[inherit] shadow-[0_1px_2px_rgba(9,30,66,0.06)] leading-[1.5]"
            >
              {googleLoading ? (
                <>
                  <Spinner color="#172B4D" /> Signing in...
                </>
              ) : (
                <>
                  <GoogleIcon /> Continue with Google
                </>
              )}
            </button>
          </div>

          <p className="text-center text-[13px] text-[#5E6C84] mt-6 mb-0 leading-[1.5]">
            Don't have an account?{" "}
            <a
              href="/register"
              className="text-[#0052CC] no-underline font-medium hover:underline"
            >
              Sign up for free
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#97A0AF] mt-5 leading-[1.7]">
          <a
            href="/terms"
            className="text-[11px] text-[#97A0AF] no-underline font-medium hover:underline"
          >
            Privacy Policy
          </a>
          {" · "}
          <a
            href="/privacy"
            className="text-[11px] text-[#97A0AF] no-underline font-medium hover:underline"
          >
            Terms of Use
          </a>
        </p>
      </div>
    </div>
  );
}
