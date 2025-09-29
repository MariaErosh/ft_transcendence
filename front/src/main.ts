import { renderMainMenu } from "./ui.js";

const app = document.getElementById("app");
if (app) {
	console.log("Rendering main menu");
	renderMainMenu(app);
}