import { login, verify2FA, register, logoutRequest, enable2FA, set2FAenabled  } from "./api.js";
import { renderUserMenu } from "./ui.js";
import { renderCreateTournamentForm } from "./match_service/start_page.js"
import { disconnectGameWS } from "./match_service/gameSocket.js";
import { disconnectWS } from "./match_service/lobbySocket.js";
import { reconnectChat } from "./chat_service/chat.js";

// Common style classes to keep code DRY
const FORM_CONTAINER_CLASS = "bg-gray-200 p-8 border-4 border-black shadow-[8px_8px_0_0_#000000] w-96 flex flex-col gap-5 font-mono";
const INPUT_CLASS = "border-2 border-black p-2 focus:outline-none focus:border-purple-600 bg-white placeholder-gray-500 text-black";
const PRIMARY_BTN_CLASS = "bg-purple-600 text-white p-2 border-2 border-black font-bold uppercase shadow-[3px_3px_0_0_#000000] hover:bg-purple-500 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all";
const SECONDARY_BTN_CLASS = "bg-pink-500 text-black p-2 border-2 border-black font-bold uppercase shadow-[3px_3px_0_0_#000000] hover:bg-pink-400 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all";

export function renderLogin() {
    const main = document.getElementById("main")!;
    main.innerHTML = "";

    history.pushState({ view:"login"}, "", "login");
    const form = document.createElement("form");
    form.className = FORM_CONTAINER_CLASS;

    const title = document.createElement("h1");
    title.textContent = ">> LOGIN";
    title.className = "text-xl font-black uppercase tracking-tighter border-b-4 border-black pb-2 mb-2";
    form.appendChild(title);

    const username = document.createElement("input");
    username.placeholder = "USERNAME OE EMAIL";
    username.className = INPUT_CLASS;
    form.appendChild(username);

    const password = document.createElement("input");
    password.placeholder = "PASSWORD";
    password.type = "password";
    password.className = INPUT_CLASS;
    form.appendChild(password);

    const btn = document.createElement("button");
    btn.textContent = "ACCESS SYSTEM";
    btn.type = "submit";
    btn.className = PRIMARY_BTN_CLASS;
    form.appendChild(btn);

    const msg = document.createElement("div");
    msg.className = "text-red-600 text-xs font-bold uppercase";
    form.appendChild(msg);

    const signupLink = document.createElement("p");
    signupLink.className = "text-xs font-bold uppercase cursor-pointer hover:text-purple-600 text-center mt-2 decoration-2 underline underline-offset-4";
    signupLink.textContent = "New user? Create account";
    signupLink.addEventListener("click", () => renderRegister());
    form.appendChild(signupLink);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const response = await login(username.value, password.value);

       // if (response.twoFactorRequired) {
       //     render2FA(response.userId);
       // } else if (response.accessToken) {
       //     localStorage.setItem("username", username.value);
       //     localStorage.setItem("refreshToken", response.refreshToken);
	   console.log("Response to login call: ", response);
	   if (response.accessToken) {
            localStorage.removeItem("temp");
            history.pushState({ view: "main"}, "", "/");
            renderUserMenu();
            renderCreateTournamentForm();
			reconnectChat();
        } else {
            msg.textContent = `!! ${response.error || "Login failed"}`;
        }
    });
    main.appendChild(form);
}

export function renderRegister() {
    const main = document.getElementById("main")!;
    main.innerHTML = "";
    history.pushState({ view:"signup"}, "", "signup");

    const form = document.createElement("form");
    form.className = FORM_CONTAINER_CLASS;

    const title = document.createElement("h1");
    title.textContent = ">> REGISTER";
    title.className = "text-xl font-black uppercase tracking-tighter border-b-4 border-black pb-2 mb-2";
    form.appendChild(title);

    const username = document.createElement("input");
    username.placeholder = "USERNAME";
    username.className = INPUT_CLASS;
    form.appendChild(username);

	const email = document.createElement("input");
    email.type = "test";
    email.placeholder = "EMAIL";
    email.className = INPUT_CLASS;
    form.appendChild(email);

    const password = document.createElement("input");
    password.type = "password";
    password.placeholder = "PASSWORD";
    password.className = INPUT_CLASS;
    form.appendChild(password);

	// --- 2FA Checkbox Section ---
    const tfaContainer = document.createElement("div");
    tfaContainer.className = "flex items-center gap-3 cursor-pointer group";

    const tfaCheckbox = document.createElement("input");
    tfaCheckbox.type = "checkbox";
    tfaCheckbox.id = "enable-2fa";
    tfaCheckbox.className = "w-5 h-5 border-2 border-black accent-purple-600 cursor-pointer";

    const tfaLabel = document.createElement("label");
    tfaLabel.htmlFor = "enable-2fa";
    tfaLabel.textContent = "ENABLE 2FA AUTH";
    tfaLabel.className = "text-xs font-black uppercase cursor-pointer group-hover:text-purple-600 transition-colors";

    tfaContainer.appendChild(tfaCheckbox);
    tfaContainer.appendChild(tfaLabel);
    form.appendChild(tfaContainer);
    // ----------------------------

    const btn = document.createElement("button");
    btn.type = "submit";
    btn.textContent = "CREATE IDENTITY";
    btn.className = SECONDARY_BTN_CLASS;
    form.appendChild(btn);

    const msg = document.createElement("div");
    msg.className = "text-red-600 text-xs font-bold uppercase";
    form.appendChild(msg);

    const loginLink = document.createElement("p");
    loginLink.className = "text-xs font-bold uppercase cursor-pointer hover:text-pink-600 text-center mt-2 decoration-2 underline underline-offset-4";
    loginLink.textContent = "Already registered? Login";
    loginLink.addEventListener("click", () => renderLogin());
    form.appendChild(loginLink);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!username.value.trim()) {
			msg.textContent = "Username cannot be empty";
			return;
		}
		if (!email.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value)) {
			msg.textContent = "Enter a valid email";
			return;
		}
		if (!password.value || password.value.length < 6) {
			msg.textContent = "Password must be at least 6 characters";
			return;
		}
		const response = await register(username.value,  email.value, password.value, tfaCheckbox.checked);

        if (response.auth_user?.id) {
			msg.className = "text-green-600 text-xs font-bold uppercase";
			msg.textContent = "Account created! Proceed to login.";
        } else {
            msg.textContent = `!! ${response.error || "Registration failed"}`;
        }
    });

    main.appendChild(form);
}

export async function render2FASetup(userId: number, username: string) {
    const main = document.getElementById("main")!;
    main.innerHTML = "";

    const { qrCodeDataURL, secret } = await enable2FA(userId, username);

    const form = document.createElement("div");
    form.className = FORM_CONTAINER_CLASS;

    const title = document.createElement("h1");
    title.textContent = ">> SECURE ACCOUNT";
    title.className = "text-xl font-black uppercase border-b-4 border-black pb-2 mb-2";
    form.appendChild(title);

    const instruction = document.createElement("p");
    instruction.className = "text-xs font-bold uppercase mb-4";
    instruction.textContent = "Scan this QR with Google Authenticator:";
    form.appendChild(instruction);

    // QR Image Container
    const qrImg = document.createElement("img");
    qrImg.src = qrCodeDataURL;
    qrImg.className = "border-4 border-black mb-4 w-48 h-48 self-center bg-white p-2";
    form.appendChild(qrImg);

    const tokenInput = document.createElement("input");
    tokenInput.placeholder = "000000";
    tokenInput.className = INPUT_CLASS;
    form.appendChild(tokenInput);

    const verifyBtn = document.createElement("button");
    verifyBtn.textContent = "VERIFY & ACTIVATE";
    verifyBtn.className = PRIMARY_BTN_CLASS;
    form.appendChild(verifyBtn);

    const msg = document.createElement("div");
    msg.className = "text-red-600 text-xs font-bold uppercase mt-2";
    form.appendChild(msg);

    verifyBtn.addEventListener("click", async () => {
        const verified = await verify2FA(userId, tokenInput.value);
        if (verified.success) {
			set2FAenabled(userId, username);
            msg.className = "text-green-600 text-xs font-bold uppercase";
            msg.textContent = "2FA ACTIVE. Redirecting to login...";
            setTimeout(() => renderLogin(), 2000);
        } else {
            msg.textContent = "!! INVALID CODE. TRY AGAIN !!";
        }
    });

    main.appendChild(form);
}

export function render2FA(userId: number) {
    const main = document.getElementById("main")!;
    main.innerHTML = "";

    const form = document.createElement("form");
    form.className = FORM_CONTAINER_CLASS;

    const title = document.createElement("h1");
    title.textContent = ">> 2FA VERIFY";
    title.className = "text-xl font-black uppercase tracking-tighter border-b-4 border-black pb-2 mb-2";
    form.appendChild(title);

    const tokenInput = document.createElement("input");
    tokenInput.placeholder = "000000";
    tokenInput.className = INPUT_CLASS;
    form.appendChild(tokenInput);

    const btn = document.createElement("button");
    btn.textContent = "VALIDATE CODE";
    btn.type = "submit";
    btn.className = SECONDARY_BTN_CLASS;
    form.appendChild(btn);

    const msg = document.createElement("div");
    msg.className = "text-red-600 text-xs font-bold uppercase";
    form.appendChild(msg);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const response = await verify2FA(userId, tokenInput.value);
        if (response.success) {
            msg.className = "text-green-600 text-xs font-bold uppercase";
            msg.textContent = "Verified. Logging in...";
			localStorage.removeItem("temp");
			localStorage.setItem("accessToken", response.data.accessToken);
			localStorage.setItem("refreshToken", response.data.refreshToken);
			localStorage.setItem("refreshExpiresAt", response.data.refreshExpiresAt);
			localStorage.setItem("username", response.data.userName);

			history.pushState({ view: "main"}, "", "/");
			renderUserMenu();
			renderCreateTournamentForm();
			reconnectChat();
        } else {
            msg.textContent = `!! ${response.data.error || "Invalid code"}`;
        }
    });

    main.appendChild(form);
}

export async function logout() {
	try {
		await logoutRequest();
	} catch {}

	//TODO: remove temp login info
    localStorage.removeItem("username");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("temp");
    localStorage.removeItem("userid");
    disconnectGameWS();
    disconnectWS();

    renderUserMenu();
    renderCreateTournamentForm();
}
