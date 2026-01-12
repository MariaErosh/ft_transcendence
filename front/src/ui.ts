import { logout, renderLogin, renderRegister } from "./forms.js";
import { disconnectChat } from "./chat_service/chat.js";
import { renderStartView } from "./match_service/start_page.js";

export function renderUserMenu() {
	console.log("Rendering user menu");
	const container = document.getElementById("menu")!;
	container.innerHTML = "";

	// // Create a fixed top-left menu wrapper so forms/menu don't clear the whole app
	// 	let menuWrapper = document.getElementById("app-menu") as HTMLElement | null;
	// 	if (!menuWrapper) {
	// 		menuWrapper = document.createElement("div");
	// 		menuWrapper.id = "app-menu";
	// 		menuWrapper.className = "fixed top-4 right-4 z-50";
	// 		container.appendChild(menuWrapper);
	// 	}
	// 	menuWrapper.innerHTML = "";

	const menu = document.createElement("div");
	menu.className = `flex flex-row gap-4 items-center
        bg-gray-200
        p-3
        border-4 border-black
        shadow-[6px_6px_0_0_#000000]
        font-mono`;

	const username = localStorage.getItem("username");

	if (!username || localStorage.getItem("temp") === "temp"){

		const loginBtn = document.createElement("button");
		loginBtn.textContent = "LOGIN";
		loginBtn.className = `
			bg-purple-600 text-white
            px-4 py-1
            border-2 border-black
            shadow-[2px_2px_0_0_#000000]
            hover:bg-purple-500
            active:shadow-none active:translate-x-[1px] active:translate-y-[1px]
            transition-all font-bold uppercase text-sm
			`;
		loginBtn.addEventListener("click", () => {
			renderLogin();
		});
		menu.appendChild(loginBtn);
		const signupBtn = document.createElement("button");
		signupBtn.textContent = "SIGN UP";
		signupBtn.className = `bg-purple-600 text-white
            px-4 py-1
            border-2 border-black
            shadow-[2px_2px_0_0_#000000]
            hover:bg-purple-500
            active:shadow-none active:translate-x-[1px] active:translate-y-[1px]
            transition-all font-bold uppercase text-sm
			`;
		signupBtn.addEventListener("click", () => {
			renderRegister();
		});
		menu.appendChild(signupBtn);

	} else {
		const avatarWrapper = document.createElement("div");
		avatarWrapper.className = "flex items-center gap-2";

		const avatar = document.createElement("div");
		avatar.textContent = username.charAt(0).toUpperCase();
		avatar.className = `
			bg-black text-white
            w-10 h-10
            flex items-center justify-center
            border-2 border-black
            font-bold text-lg`;
		const nameLabel = document.createElement("span");
        nameLabel.textContent = username.toUpperCase();
        nameLabel.className = "font-bold text-sm tracking-tighter";

        avatarWrapper.appendChild(avatar);
        avatarWrapper.appendChild(nameLabel);
        menu.appendChild(avatarWrapper);

		const logoutBtn = document.createElement("button");
		logoutBtn.textContent = "LOGOUT";
		logoutBtn.className = `
			bg-pink-500 text-black
            px-4 py-1
            border-2 border-black
            shadow-[2px_2px_0_0_#000000]
            hover:bg-red-500 hover:text-white
            active:shadow-none active:translate-x-[1px] active:translate-y-[1px]
            transition-all font-bold uppercase text-sm
			`;
		logoutBtn.addEventListener("click", async () => {
			await logout();
			renderUserMenu();
			renderStartView();
			//console.log("User logged out, called to disconnect chat");
			disconnectChat();
		});
		menu.appendChild(logoutBtn);
	}
	container.appendChild(menu);
	//menuWrapper.appendChild(menu);
}
