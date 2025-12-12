import { authorisedRequest } from "./api.js";
import { renderLogin, renderRegister } from "./forms.js";
import { disconnectGameWS } from "./match_service/gameSocket.js";
import { disconnectWS } from "./match_service/lobbySocket.js";
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
        logout();
      });
      menu.appendChild(logoutBtn);
  }

  const signupBtn = document.createElement("button");
  signupBtn.textContent = "Sign Up";
  signupBtn.className = "bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 w-28 text-center";
  signupBtn.addEventListener("click", () => {
    renderRegister();
  });
  menu.appendChild(signupBtn);

  container.appendChild(menu);
  //menuWrapper.appendChild(menu);

}

export async function logout(){
  //TODO: remove temp user
  // if (localStorage.getItem("temp") === "temp"){
  //   try {
  //     await authorisedRequest(`/users/${localStorage.getItem("userid")}`, {method: "DELETE"});
  //     console.log("Temp user deleted");
  //   }
  //   catch (err){
  //     console.log("Failed to delete user: ", err);
  //   }
  // }
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
