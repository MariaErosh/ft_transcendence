import { renderLogin, renderRegister } from "./forms.js";

export function renderMainMenu(container: HTMLElement) {
  console.log("Rendering main menu");
//   container.innerHTML = "";

// Create a fixed top-left menu wrapper so forms/menu don't clear the whole app
	let menuWrapper = document.getElementById("app-menu") as HTMLElement | null;
	if (!menuWrapper) {
		menuWrapper = document.createElement("div");
		menuWrapper.id = "app-menu";
		menuWrapper.className = "fixed top-4 right-4 z-50";
		container.appendChild(menuWrapper);
	}

	menuWrapper.innerHTML = "";

  const menu = document.createElement("div");
  menu.className = "flex flex-row gap-2 items-center bg-white p-2 rounded shadow-md";

//   const title = document.createElement("h1");
//   title.textContent = "FT Transcendence";
//   title.className = "text-2xl font-bold text-center";
//   menu.appendChild(title);

  const loginBtn = document.createElement("button");
  loginBtn.textContent = "Login";
  loginBtn.className = "bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 w-28 text-center";
  loginBtn.addEventListener("click", () => {
    renderLogin(container);
  });
  menu.appendChild(loginBtn);

  const signupBtn = document.createElement("button");
  signupBtn.textContent = "Sign Up";
  signupBtn.className = "bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 w-28 text-center";
  signupBtn.addEventListener("click", () => {
    renderRegister(container);
  });
  menu.appendChild(signupBtn);

  //container.appendChild(menu);
    menuWrapper.appendChild(menu);

}
