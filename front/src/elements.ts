export function renderMatchMenu() {
	const main = document.getElementById("main")!;
	const wrapper = document.createElement('div');
	wrapper.id = 'match-menu';
	wrapper.className = "relative min-h-screen w-full flex flex-col items-center justify-start bg-black/20 backdrop-blur-sm py-20";
	main.appendChild(wrapper);
	return (wrapper);
}

export function renderBlackBox() {
	const blackBox = document.createElement("div");
	blackBox.id = "black-box";
	blackBox.className = `
        	bg-gray-200
            w-[90%] max-w-4xl min-h-[500px]
            border-8 border-black
            shadow-[16px_16px_0_0_#000000]
            flex flex-col items-center justify-center
            font-mono relative p-12 my-10
    	`;
	return blackBox;
}
