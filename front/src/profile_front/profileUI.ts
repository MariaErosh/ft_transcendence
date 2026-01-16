// Profile UI rendering

import type { UserProfile } from './types.js';
import { getProfile, getOwnProfile, updateProfile } from './profileApi.js';
import { escapeHtml } from '../chat_service/utils.js';

let profileContainer: HTMLElement | null = null;
let currentProfile: UserProfile | null = null;
let isEditMode = false;

/**
 * Initialize profile UI
 */
export function initializeProfileUI() {
  profileContainer = document.getElementById("profile-window");
  if (!profileContainer) {
    console.error("Profile container not found");
    return;
  }
}

/**
 * Show profile window for a specific user
 */
export async function showProfile(userId: number) {
  if (!profileContainer) return;

  const profile = await getProfile(userId);
  if (!profile) {
    showError("Failed to load profile");
    return;
  }

  currentProfile = profile;
  isEditMode = false;
  renderProfile();
  profileContainer.classList.remove('hidden');
}

/**
 * Show own profile (with edit capability)
 */
export async function showOwnProfile() {
  if (!profileContainer) return;

  const profile = await getOwnProfile();
  if (!profile) {
    showError("Failed to load profile");
    return;
  }

  currentProfile = profile;
  isEditMode = false;
  renderProfile(true); // true = can edit
  profileContainer.classList.remove('hidden');
}

/**
 * Close profile window
 */
export function closeProfile() {
  if (!profileContainer) return;
  profileContainer.classList.add('hidden');
  currentProfile = null;
  isEditMode = false;
}

/**
 * Render profile view
 */
function renderProfile(canEdit: boolean = false) {
  if (!profileContainer || !currentProfile) return;

  const winRate = currentProfile.games_played > 0
    ? Math.round((currentProfile.games_won / currentProfile.games_played) * 100)
    : 0;

  profileContainer.innerHTML = `
    <div class="
      fixed inset-0 z-50
      bg-black/50
      flex items-center justify-center
      p-4
    ">
      <div class="
        bg-gray-800
        border-4 border-black
        shadow-[8px_8px_0_0_#000000]
        max-w-md w-full
        max-h-[90vh]
        overflow-y-auto
      ">
        <!-- Header -->
        <div class="
          bg-purple-600
          text-white
          px-4 py-3
          border-b-4 border-black
          flex justify-between items-center
        ">
          <h2 class="font-bold tracking-wider text-lg">
            ${isEditMode ? '✏️ EDIT PROFILE' : '👤 PROFILE'}
          </h2>
          <button id="profile-close" class="
            text-xl font-extrabold
            hover:text-pink-400
            leading-none
          ">
            ✕
          </button>
        </div>

        <!-- Profile Content -->
        <div class="p-6 space-y-6">
          <!-- Avatar Section -->
          <div class="flex flex-col items-center">
            <div class="
              w-32 h-32
              rounded-full
              border-4 border-purple-600
              bg-gray-700
              flex items-center justify-center
              text-5xl
              mb-4
            ">
              ${currentProfile.avatar_url
                ? `<img src="${currentProfile.avatar_url}" class="w-full h-full rounded-full object-cover" />`
                : '👤'
              }
            </div>
            <h3 class="text-2xl font-bold text-white mb-1">
              ${escapeHtml(currentProfile.username)}
            </h3>
            <p class="text-gray-400 text-sm">
              ${escapeHtml(currentProfile.email)}
            </p>
          </div>

          <!-- Bio Section -->
          <div class="
            bg-gray-700
            border-2 border-black
            p-4
          ">
            <h4 class="text-purple-400 font-bold text-sm mb-2 uppercase">
              📝 Bio
            </h4>
            ${isEditMode ? `
              <textarea
                id="bio-input"
                class="
                  w-full px-3 py-2
                  bg-gray-800 text-white
                  border-2 border-gray-600
                  focus:border-purple-600
                  focus:outline-none
                  font-mono text-sm
                  min-h-[80px]
                "
                placeholder="Tell us about yourself..."
              >${currentProfile.bio || ''}</textarea>
            ` : `
              <p class="text-gray-200 text-sm font-mono">
                ${currentProfile.bio || 'No bio yet'}
              </p>
            `}
          </div>

          <!-- Stats Section -->
          <div class="
            bg-gray-700
            border-2 border-black
            p-4
          ">
            <h4 class="text-purple-400 font-bold text-sm mb-3 uppercase">
              🎮 Game Stats
            </h4>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold text-white">
                  ${currentProfile.games_played ?? 0}
                </div>
                <div class="text-xs text-gray-400 uppercase">
                  Played
                </div>
              </div>
              <div>
                <div class="text-2xl font-bold text-green-400">
                  ${currentProfile.games_won ?? 0}
                </div>
                <div class="text-xs text-gray-400 uppercase">
                  Won
                </div>
              </div>
              <div>
                <div class="text-2xl font-bold text-yellow-400">
                  ${winRate}%
                </div>
                <div class="text-xs text-gray-400 uppercase">
                  Win Rate
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          ${canEdit ? `
            <div class="flex gap-2">
              ${isEditMode ? `
                <button id="profile-save" class="
                  flex-1 px-4 py-2
                  bg-green-500 hover:bg-green-600
                  text-black font-bold
                  border-2 border-black
                  transition-colors
                ">
                  💾 Save Changes
                </button>
                <button id="profile-cancel" class="
                  flex-1 px-4 py-2
                  bg-gray-500 hover:bg-gray-600
                  text-white font-bold
                  border-2 border-black
                  transition-colors
                ">
                  ✕ Cancel
                </button>
              ` : `
                <button id="profile-edit" class="
                  w-full px-4 py-2
                  bg-purple-600 hover:bg-purple-700
                  text-white font-bold
                  border-2 border-black
                  transition-colors
                ">
                  ✏️ Edit Profile
                </button>
              `}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  setupEventListeners(canEdit);
}

/**
 * Setup event listeners
 */
function setupEventListeners(canEdit: boolean) {
  const closeBtn = document.getElementById('profile-close');
  closeBtn?.addEventListener('click', closeProfile);

  if (canEdit) {
    const editBtn = document.getElementById('profile-edit');
    const saveBtn = document.getElementById('profile-save');
    const cancelBtn = document.getElementById('profile-cancel');

    editBtn?.addEventListener('click', () => {
      isEditMode = true;
      renderProfile(true);
    });

    saveBtn?.addEventListener('click', async () => {
      const bioInput = document.getElementById('bio-input') as HTMLTextAreaElement;
      const bio = bioInput?.value || '';

      const success = await updateProfile({ bio });
      if (success) {
        showSuccess("Profile updated successfully!");
        // Reload profile
        await showOwnProfile();
      } else {
        showError("Failed to update profile");
      }
    });

    cancelBtn?.addEventListener('click', () => {
      isEditMode = false;
      renderProfile(true);
    });
  }
}

/**
 * Show success message
 */
function showSuccess(message: string) {
  // TODO: Implement toast notification
  console.log('✅', message);
}

/**
 * Show error message
 */
function showError(message: string) {
  // TODO: Implement toast notification
  console.error('❌', message);
}
