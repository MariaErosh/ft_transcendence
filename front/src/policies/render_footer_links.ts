export function renderFooterLinks() {
	const app = document.getElementById("app")!;
	
	let footer = document.getElementById("footer-links") as HTMLElement | null;
	if (footer) {
		return; 
	}
	
	footer = document.createElement("div");
	footer.id = "footer-links";
	footer.className = `
		fixed bottom-4 left-4
		flex gap-3
		z-40 font-mono
	`;
	
	const privacyLink = document.createElement("a");
	privacyLink.href = "/privacy";
	privacyLink.textContent = "PRIVACY";
	privacyLink.className = `
		bg-gray-200 text-black
		px-3 py-1
		border-2 border-black
		shadow-[2px_2px_0_0_#000000]
		hover:bg-gray-300
		active:shadow-none active:translate-x-[1px] active:translate-y-[1px]
		transition-all
		font-bold uppercase text-xs
		no-underline
	`;
	privacyLink.addEventListener("click", (e) => {
		e.preventDefault();
		renderPrivacyPolicy();
		history.pushState({ view: "privacy" }, "", "/privacy");
	});
	
	// Terms of Service link
	const termsLink = document.createElement("a");
	termsLink.href = "/terms";
	termsLink.textContent = "TERMS";
	termsLink.className = `
		bg-gray-200 text-black
		px-3 py-1
		border-2 border-black
		shadow-[2px_2px_0_0_#000000]
		hover:bg-gray-300
		active:shadow-none active:translate-x-[1px] active:translate-y-[1px]
		transition-all
		font-bold uppercase text-xs
		no-underline
	`;
	termsLink.addEventListener("click", (e) => {
		e.preventDefault();
		renderTermsOfService();
		history.pushState({ view: "terms" }, "", "/terms");
	});
	
	footer.appendChild(privacyLink);
	footer.appendChild(termsLink);
	app.appendChild(footer);
}

export function renderPrivacyPolicy() {
	const main = document.getElementById("main")!;
	main.innerHTML = "";
	
	const wrapper = document.createElement('div');
	wrapper.className = "fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm p-8";
	
	const content = document.createElement("div");
	content.className = `
		bg-gray-200
		w-full max-w-3xl h-5/6
		border-8 border-black
		shadow-[16px_16px_0_0_#000000]
		flex flex-col
		font-mono
		overflow-hidden
	`;
	
	// Header
	const header = document.createElement("div");
	header.className = "bg-black text-white p-4 border-b-4 border-black flex justify-between items-center";
	header.innerHTML = `
		<h1 class="text-2xl font-black uppercase tracking-tighter">Privacy Policy</h1>
		<button id="close-privacy" class="text-xl font-black hover:text-pink-500 transition-colors">✕</button>
	`;
	
	// Content area
	const scrollContent = document.createElement("div");
	scrollContent.className = "flex-1 overflow-y-auto p-6 text-sm leading-relaxed";
	scrollContent.innerHTML = `
		<div class="space-y-4">
			<p class="font-bold text-base uppercase border-b-2 border-black pb-1">Last Updated: ${new Date().toLocaleDateString()}</p>
			
			<section>
				<h2 class="font-black text-lg uppercase mb-2">1. INFORMATION WE COLLECT</h2>
				<p>We collect information you provide directly, including username, email, and game statistics.</p>
			</section>
			
			<section>
				<h2 class="font-black text-lg uppercase mb-2">2. HOW WE USE YOUR DATA</h2>
				<p>Your data is used to provide game services, maintain leaderboards, and improve user experience.</p>
			</section>
			
			<section>
				<h2 class="font-black text-lg uppercase mb-2">3. DATA STORAGE</h2>
				<p>All data is stored securely using industry-standard encryption methods.</p>
			</section>
			
			<section>
				<h2 class="font-black text-lg uppercase mb-2">4. YOUR RIGHTS</h2>
				<p>You have the right to access, modify, or delete your personal data at any time.</p>
			</section>
			
			<section>
				<h2 class="font-black text-lg uppercase mb-2">5. CONTACT</h2>
				<p>For privacy concerns, contact us at privacy@pong.game</p>
			</section>
		</div>
	`;
	
	content.appendChild(header);
	content.appendChild(scrollContent);
	wrapper.appendChild(content);
	main.appendChild(wrapper);
	
	// Close button handler
	document.getElementById("close-privacy")!.addEventListener("click", () => {
		wrapper.innerHTML = "";
		history.back();
	});
}

export function renderTermsOfService() {
	const main = document.getElementById("main")!;
	main.innerHTML = "";
	
	const wrapper = document.createElement('div');
	wrapper.className = "fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm p-8";
	
	const content = document.createElement("div");
	content.className = `
		bg-gray-200
		w-full max-w-3xl h-5/6
		border-8 border-black
		shadow-[16px_16px_0_0_#000000]
		flex flex-col
		font-mono
		overflow-hidden
	`;
	
	// Header
	const header = document.createElement("div");
	header.className = "bg-black text-white p-4 border-b-4 border-black flex justify-between items-center";
	header.innerHTML = `
		<h1 class="text-2xl font-black uppercase tracking-tighter">Terms of Service</h1>
		<button id="close-terms" class="text-xl font-black hover:text-pink-500 transition-colors">✕</button>
	`;
	
	// Content area
	const scrollContent = document.createElement("div");
	scrollContent.className = "flex-1 overflow-y-auto p-6 text-sm leading-relaxed";
	scrollContent.innerHTML = `
		<div class="space-y-4">
			<p class="font-bold text-base uppercase border-b-2 border-black pb-1">Last Updated: ${new Date().toLocaleDateString()}</p>
			
			<section>
				<h2 class="font-black text-lg uppercase mb-2">1. ACCEPTANCE OF TERMS</h2>
				<p>By accessing this service, you agree to be bound by these terms of service.</p>
			</section>
			
			<section>
				<h2 class="font-black text-lg uppercase mb-2">2. USER CONDUCT</h2>
				<p>Users must not engage in cheating, harassment, or any behavior that disrupts the game experience.</p>
			</section>
			
			<section>
				<h2 class="font-black text-lg uppercase mb-2">3. ACCOUNT RESPONSIBILITY</h2>
				<p>You are responsible for maintaining the security of your account credentials.</p>
			</section>
			
			<section>
				<h2 class="font-black text-lg uppercase mb-2">4. SERVICE AVAILABILITY</h2>
				<p>We strive for 99% uptime but do not guarantee uninterrupted service.</p>
			</section>
			
			<section>
				<h2 class="font-black text-lg uppercase mb-2">5. TERMINATION</h2>
				<p>We reserve the right to terminate accounts that violate these terms.</p>
			</section>
			
			<section>
				<h2 class="font-black text-lg uppercase mb-2">6. LIABILITY</h2>
				<p>This service is provided "as is" without warranties of any kind.</p>
			</section>
		</div>
	`;
	
	content.appendChild(header);
	content.appendChild(scrollContent);
	wrapper.appendChild(content);
	main.appendChild(wrapper);
	
	// Close button handler
	document.getElementById("close-terms")!.addEventListener("click", () => {
		wrapper.innerHTML = "";
		history.back();
	});
}