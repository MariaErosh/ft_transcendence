export function renderMatchMenu() {
	const main = document.getElementById("main")!;
	const wrapper = document.createElement('div');
	wrapper.id = 'match-menu';
	wrapper.className = "fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm";
	main.appendChild(wrapper);
	return (wrapper);
}

export function renderBlackBox() {
	const blackBox = document.createElement("div");
	blackBox.id = "black-box";
	blackBox.className = `
        	bg-gray-200
        	w-2/3 h-2/3
        	border-8 border-black
        	shadow-[16px_16px_0_0_#000000]
        	flex flex-col items-center justify-center
        	z-40 font-mono relative
    	`;
	return blackBox;
}
