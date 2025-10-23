import { renderLogin, renderRegister } from "./forms.js";
// import { renderGame } from "./pongGame.js";

export function renderMainMenu(container: HTMLElement) {
  console.log("Rendering main menu");
  container.innerHTML = "";

  const menu = document.createElement("div");
  menu.className = "flex flex-col gap-4 bg-white p-6 rounded shadow-md w-80";

  const title = document.createElement("h1");
  title.textContent = "FT Transcendence";
  title.className = "text-2xl font-bold text-center";
  menu.appendChild(title);

  const loginBtn = document.createElement("button");
  loginBtn.textContent = "Login";
  loginBtn.className = "bg-blue-500 text-white p-2 rounded hover:bg-blue-600";
  loginBtn.addEventListener("click", () => {
    renderLogin(container);
  });
  menu.appendChild(loginBtn);

  const signupBtn = document.createElement("button");
  signupBtn.textContent = "Sign Up";
  signupBtn.className = "bg-green-500 text-white p-2 rounded hover:bg-green-600";
  signupBtn.addEventListener("click", () => {
    renderRegister(container);
  });
  menu.appendChild(signupBtn);

  container.appendChild(menu);
}


export function renderGameBoard(container: HTMLElement): void {
  container.innerHTML = "";
}
