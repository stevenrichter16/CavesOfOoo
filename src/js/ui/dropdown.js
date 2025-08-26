// ui/dropdown.js - Context menu/dropdown system for cursor interactions

let activeDropdown = null;
let activeOptions = null;
let selectedIndex = 0;

export function createDropdown(x, y, options, gameState) {
  // Close any existing dropdown
  closeDropdown();
  
  // Filter out disabled options for keyboard navigation
  activeOptions = options.filter(opt => !opt.disabled);
  selectedIndex = 0;
  
  // Create dropdown container
  const dropdown = document.createElement('div');
  dropdown.className = 'cursor-dropdown';
  dropdown.style.position = 'absolute';
  
  // Calculate pixel position based on tile coordinates
  const canvas = document.getElementById('game-canvas');
  const canvasRect = canvas.getBoundingClientRect();
  const tileSize = 16; // From CANVAS_CONFIG
  
  // Position at the tile location
  const pixelX = canvasRect.left + (x * tileSize) + tileSize;
  const pixelY = canvasRect.top + (y * tileSize);
  
  dropdown.style.left = `${pixelX}px`;
  dropdown.style.top = `${pixelY}px`;
  dropdown.style.zIndex = '1000';
  
  // Create menu items
  options.forEach((option, index) => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.setAttribute('data-index', index);
    item.innerHTML = `<span class="dropdown-icon">${option.icon || ''}</span><span>${option.label}</span>`;
    
    if (option.disabled) {
      item.classList.add('disabled');
    } else {
      // Set first non-disabled item as selected
      if (activeOptions[0] === option) {
        item.classList.add('selected');
      }
      
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        option.action();
        closeDropdown();
      });
      
      item.addEventListener('mouseenter', () => {
        // Update selection when hovering
        const enabledItems = dropdown.querySelectorAll('.dropdown-item:not(.disabled)');
        enabledItems.forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        // Update selected index
        selectedIndex = activeOptions.indexOf(option);
      });
    }
    
    dropdown.appendChild(item);
  });
  
  // Add to document
  document.body.appendChild(dropdown);
  activeDropdown = dropdown;
  
  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', closeDropdownHandler);
    document.addEventListener('keydown', dropdownKeyHandler);
  }, 0);
}

function closeDropdownHandler(e) {
  if (activeDropdown && !activeDropdown.contains(e.target)) {
    closeDropdown();
  }
}

function dropdownKeyHandler(e) {
  if (!activeDropdown || !activeOptions || activeOptions.length === 0) return;
  
  const k = e.key;
  
  // Navigation keys
  if (k === 'ArrowUp' || k === 'w' || k === 'W') {
    e.preventDefault();
    e.stopPropagation();
    navigateDropdown(-1);
  } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
    e.preventDefault();
    e.stopPropagation();
    navigateDropdown(1);
  } else if (k === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    // Execute selected option
    if (activeOptions[selectedIndex]) {
      activeOptions[selectedIndex].action();
      closeDropdown();
    }
  } else if (k === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closeDropdown();
  }
  // Also handle left/right for consistency
  else if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
    e.preventDefault();
    e.stopPropagation();
    navigateDropdown(-1);
  } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
    e.preventDefault();
    e.stopPropagation();
    navigateDropdown(1);
  }
}

function navigateDropdown(direction) {
  if (!activeDropdown || !activeOptions || activeOptions.length === 0) return;
  
  // Update selected index
  selectedIndex = selectedIndex + direction;
  if (selectedIndex < 0) selectedIndex = activeOptions.length - 1;
  if (selectedIndex >= activeOptions.length) selectedIndex = 0;
  
  // Update visual selection
  const items = activeDropdown.querySelectorAll('.dropdown-item:not(.disabled)');
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

export function closeDropdown() {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
    activeOptions = null;
    selectedIndex = 0;
    document.removeEventListener('click', closeDropdownHandler);
    document.removeEventListener('keydown', dropdownKeyHandler);
  }
}

// Check if dropdown is currently open
export function isDropdownOpen() {
  return activeDropdown !== null;
}