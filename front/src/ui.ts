import { renderLogin, renderRegister } from "./forms.js";
import { renderCreateTournamentForm } from "./match_service/start_page.js";

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
  menu.className = "flex flex-row gap-2 items-center bg-white p-2 rounded shadow-md";

  const username = localStorage.getItem("username");

  if (!username) {

    const loginBtn = document.createElement("button");
    loginBtn.textContent = "Login";
    loginBtn.className = "bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 w-28 text-center";
    loginBtn.addEventListener("click", () => {
      history.pushState({ view:"login"}, "", "login");
      renderLogin();
    });
    menu.appendChild(loginBtn);
  } else {
    const avatar = document.createElement("div");
    avatar.textContent = username;
    avatar.className = "bg-gray-700 text-white w-10 h-10 flex items-center justify-center rounded-full font-bold";
    menu.appendChild(avatar);

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Logout";
    logoutBtn.className = "bg-blue-500 text-white px-3 py-1 rounded hover:bg-red-600 w-28 text-center";
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("username");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        renderUserMenu();
        renderCreateTournamentForm();
      });
      menu.appendChild(logoutBtn);
  }

  const signupBtn = document.createElement("button");
  signupBtn.textContent = "Sign Up";
  signupBtn.className = "bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 w-28 text-center";
  signupBtn.addEventListener("click", () => {
    history.pushState({ view:"signup"}, "", "signup");
    renderRegister();
  });
  menu.appendChild(signupBtn);

  container.appendChild(menu);
  //menuWrapper.appendChild(menu);

}
