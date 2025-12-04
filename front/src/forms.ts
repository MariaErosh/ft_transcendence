import { login, verify2FA, register } from "./api.js";
import { renderUserMenu } from "./ui.js";
import { renderCreateTournamentForm } from "./match_service/start_page.js"
import { session } from "./ui.js"

export function renderLogin() {
	const main = document.getElementById("main")!;
	main.innerHTML = "";

	history.pushState({ view:"login"}, "", "login");
	const form = document.createElement("form");
	form.className = "bg-white p-6 rounded shadow-md w-80 flex flex-col gap-4";

	const title = document.createElement("h1");
	title.textContent = "Login";
	title.className = "text-2xl font-bold text-center";
	form.appendChild(title);

	const username = document.createElement("input");
	username.placeholder = "Username";
	username.className = "border p-2 rounded";
	form.appendChild(username);

	const password = document.createElement("input");
	password.placeholder = "Password";
	password.type = "password";
	password.className = "border p-2 rounded";
	form.appendChild(password);

	const btn = document.createElement("button");
	btn.textContent = "Login";
	btn.type = "submit";
	btn.className = "bg-blue-500 text-white p-2 rounded hover:bg-blue-600";
	form.appendChild(btn);

	const msg = document.createElement("div");
	msg.className = "text-red-500 text-sm";
	form.appendChild(msg);

	const signupLink = document.createElement("p");
	signupLink.className = "text-sm text-blue-600 underline cursor-pointer text-center";
	signupLink.textContent = "Don't have an account yet? Sign up here.";
	signupLink.addEventListener("click", () => {
		renderRegister();
	});
	form.appendChild(signupLink);

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const response = await login(username.value, password.value);

		if (response.twoFactorRequired) {
		render2FA(response.userId);
		} else if (response.accessToken) {
			msg.textContent = "Login successful!";
			console.log(response);
			//container.innerHTML = '';
			session.username = username.value;
			session.refreshToken = response.refreshToken;
			//localStorage.setItem("username", username.value);
			//localStorage.setItem("refreshToken", response.refreshToken);
			history.pushState({ view: "main"}, "", "/");
			renderUserMenu();
			renderCreateTournamentForm();
		} else {
			msg.textContent = response.error || "Login failed";
		}
	});
	main.appendChild(form);
}

export function renderRegister() {
	const main = document.getElementById("main")!;
	main.innerHTML = "";
	history.pushState({ view:"signup"}, "", "signup");

	const form = document.createElement("form");
	form.className = "bg-white p-6 rounded shadow-md w-80 flex flex-col gap-4";

	const title = document.createElement("h1");
	title.textContent = "Sign Up";
	title.className = "text-2xl font-bold text-center";
	form.appendChild(title);

	const username = document.createElement("input");
	username.placeholder = "Username";
	username.className = "border p-2 rounded";
	form.appendChild(username);

	const password = document.createElement("input");
	password.type = "password";
	password.placeholder = "Password";
	password.className = "border p-2 rounded";
	form.appendChild(password);

	const btn = document.createElement("button");
	btn.type = "submit";
	btn.textContent = "Register";
	btn.className = "bg-green-500 text-white p-2 rounded hover:bg-green-600";
	form.appendChild(btn);

	const msg = document.createElement("div");
	msg.className = "text-red-500 text-sm";
	form.appendChild(msg);

	const loginLink = document.createElement("p");
	loginLink.className = "text-sm text-blue-600 underline cursor-pointer text-center";
	loginLink.textContent = "Already have an account? Login here.";
	loginLink.addEventListener("click", () => {
		renderLogin();
	});
	form.appendChild(loginLink);

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const response = await register(username.value, password.value);

		if (response.auth_user?.id) {
			msg.textContent = "Account created! You can now login.";
		} else {
			msg.textContent = response.error || "Registration failed";
		}
	});

	main.appendChild(form);
}

export function render2FA(userId: number) {
	const main = document.getElementById("main")!;
	main.innerHTML = "";

	const form = document.createElement("form");
	form.className = "bg-white p-6 rounded shadow-md w-80 flex flex-col gap-4";

	const title = document.createElement("h1");
	title.textContent = "Enter 2FA Code";
	title.className = "text-2xl font-bold text-center";
	form.appendChild(title);

	const tokenInput = document.createElement("input");
	tokenInput.placeholder = "123456";
	tokenInput.className = "border p-2 rounded";
	form.appendChild(tokenInput);

	const btn = document.createElement("button");
	btn.textContent = "Verify";
	btn.type = "submit";
	btn.className = "bg-green-500 text-white p-2 rounded hover:bg-green-600";
	form.appendChild(btn);

	const msg = document.createElement("div");
	msg.className = "text-red-500 text-sm";
	form.appendChild(msg);

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const response = await verify2FA(userId, tokenInput.value);
		if (response.accessToken) {
		msg.textContent = "2FA verified! Logged in.";
		console.log(response);
		} else {
		msg.textContent = response.error || "Invalid 2FA code";
		}
	});

	main.appendChild(form);
}

