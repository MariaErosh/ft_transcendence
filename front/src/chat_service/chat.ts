// Chat WebSocket client for ft_transcendence

const GATEWAY_WS_URL = "ws://localhost:3000/ws/chat";

interface ChatMessage {
  type: "message" | "system" | "error";
  username?: string;
  content: string;
  created_at?: number;
  timestamp?: number;
}

let chatSocket: WebSocket | null = null;
let chatContainer: HTMLElement | null = null;
let messagesContainer: HTMLElement | null = null;
let isConnected = false;

/**
 * Initialize and render the chat UI
 */
export function renderChat() {
  chatContainer = document.getElementById("chat");
  if (!chatContainer) return;

  chatContainer.classList.remove('w-16', 'h-16', 'sm:w-20', 'sm:h-20', 'rounded-full', 'bg-pink-500', 'shadow-[6px_6px_0_0_#000000]');
chatContainer.classList.add('w-80', 'h-96', 'bg-transparent', 'shadow-none', 'p-0', 'flex-none'); // Apply the size of the window and remove styling
  chatContainer.innerHTML = `
    <div class="
        bg-gray-200
        border-4 border-black
        w-80 h-96 flex flex-col
        shadow-[8px_8px_0_0_#000000]
        transition-all duration-150
    ">
      <div class="
        bg-purple-600
        text-white
        px-4 py-3
        border-b-4 border-black
        flex justify-between items-center
      ">
        <h3 class="font-bold uppercase tracking-wider text-lg">
          🤖 CHAT INTERFACE v1.2
        </h3>
        <button id="chat-toggle" class="
          text-xl font-extrabold
          hover:text-pink-400
          leading-none
        ">
          _
        </button>
      </div>

      <div id="chat-messages" class="
        flex-1
        overflow-y-auto
        p-4
        space-y-3
        bg-black/90
        font-mono
        text-sm
      ">
        <div class="text-center text-green-400">
          > ESTABLISHING CONNECTION...
        </div>
      </div>

      <div class="
        border-t-4 border-black
        p-3
        bg-gray-300
      ">
        <div class="flex gap-2">
          <input
            id="chat-input"
            type="text"
            placeholder="ENTER COMMAND..."
            class="
              flex-1
              px-3 py-2
              border-2 border-black
              bg-white
              focus:outline-none
              focus:border-purple-600
              font-mono
            "
            disabled
          />
          <button
            id="chat-send"
            class="
              px-4 py-2
              bg-pink-500
              text-black
              uppercase font-bold
              border-2 border-black
              shadow-[2px_2px_0_0_#000000]
              hover:bg-pink-400
              active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
              disabled:bg-gray-400
            "
            disabled
          >
            SEND
          </button>
        </div>
        <div id="chat-status" class="
          text-xs
          text-red-500
          mt-1
          font-mono
          font-bold
        ">
          // DISCONNECTED
        </div>
      </div>
    </div>
  `;

  messagesContainer = document.getElementById("chat-messages");

  // Setup event listeners
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
  const toggleBtn = document.getElementById("chat-toggle") as HTMLButtonElement;

  sendBtn.addEventListener("click", () => sendMessage(input.value));
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage(input.value);
  });

  toggleBtn.addEventListener("click", toggleChat);

  // Connect to chat WebSocket
  connectChat();
}

/**
 * Connect to the chat WebSocket
 */
function connectChat() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    updateStatus("Not logged in", "error");
    return;
  }

  try {
    chatSocket = new WebSocket(`${GATEWAY_WS_URL}?token=${token}`);

    chatSocket.onopen = () => {
      console.log("Chat WebSocket connected");
      isConnected = true;
      updateStatus("Connected", "success");
      enableInput(true);
      clearMessages();
    };

    chatSocket.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        displayMessage(message);
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    chatSocket.onclose = () => {
      console.log("Chat WebSocket disconnected");
      isConnected = false;
      updateStatus("Disconnected", "error");
      enableInput(false);

      // Auto-reconnect after 3 seconds
      setTimeout(connectChat, 3000);
    };

    chatSocket.onerror = (error) => {
      console.error("Chat WebSocket error:", error);
      updateStatus("Connection error", "error");
    };

  } catch (err) {
    console.error("Failed to connect to chat:", err);
    updateStatus("Connection failed", "error");
  }
}

/**
 * Send a chat message
 */
function sendMessage(content: string) {
  const input = document.getElementById("chat-input") as HTMLInputElement;

  if (!content.trim() || !chatSocket || !isConnected) return;

  try {
    chatSocket.send(JSON.stringify({ content: content.trim() }));
    input.value = "";
  } catch (err) {
    console.error("Failed to send message:", err);
    updateStatus("Failed to send", "error");
  }
}

/**
 * Display a message in the chat
 */
function displayMessage(message: ChatMessage) {
  if (!messagesContainer) return;

  const messageEl = document.createElement("div");
  const time = new Date(message.created_at || message.timestamp || Date.now())
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (message.type === "system") {
    messageEl.className = "text-center text-gray-500 text-xs italic";
    messageEl.textContent = message.content;
  } else if (message.type === "error") {
    messageEl.className = "text-center text-red-500 text-xs";
    messageEl.textContent = `Error: ${message.content}`;
  } else {
    messageEl.className = "bg-white p-2 rounded-lg shadow-sm";
    messageEl.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div class="flex-1">
          <span class="font-semibold text-sm text-blue-600">${message.username || "Unknown"}</span>
          <p class="text-gray-800 text-sm mt-1">${escapeHtml(message.content)}</p>
        </div>
        <span class="text-xs text-gray-400">${time}</span>
      </div>
    `;
  }

  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Update connection status
 */
function updateStatus(text: string, type: "success" | "error" | "info") {
  const statusEl = document.getElementById("chat-status");
  if (!statusEl) return;

  statusEl.textContent = text;
  statusEl.className = `text-xs mt-1 ${
    type === "success" ? "text-green-600" :
    type === "error" ? "text-red-600" :
    "text-gray-500"
  }`;
}

/**
 * Enable/disable input controls
 */
function enableInput(enabled: boolean) {
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;

  if (input) input.disabled = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
}

/**
 * Clear all messages
 */
function clearMessages() {
  if (!messagesContainer) return;
  messagesContainer.innerHTML = "";
}

/**
 * Toggle chat visibility (minimize/maximize)
 */
function toggleChat() {
  const messagesEl = document.getElementById("chat-messages");
  const inputArea = messagesEl?.parentElement?.querySelector(".border-t");
  const toggleBtn = document.getElementById("chat-toggle");

  if (messagesEl && inputArea && toggleBtn) {
    const isHidden = messagesEl.style.display === "none";
    messagesEl.style.display = isHidden ? "block" : "none";
    (inputArea as HTMLElement).style.display = isHidden ? "block" : "none";
    toggleBtn.textContent = isHidden ? "_" : "□";
  }
}

/**
 * Disconnect from chat
 */
export function disconnectChat() {
  if (chatSocket) {
    chatSocket.close();
    chatSocket = null;
  }
  isConnected = false;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
