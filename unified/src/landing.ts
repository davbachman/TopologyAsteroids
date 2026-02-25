import type { TopologyType } from './topology/topology';

export interface LandingPageOptions {
  onSelect: (topology: TopologyType) => void;
}

export function createLandingPage(root: HTMLElement, options: LandingPageOptions): { destroy: () => void } {
  const container = document.createElement('div');
  container.className = 'landing';
  container.innerHTML = `
    <div class="landing-content">
      <h1 class="landing-title">TOPOLOGY<br>ASTEROIDS</h1>
      <p class="landing-subtitle">Choose your universe</p>
      <div class="landing-options">
        <button class="landing-option" data-topology="rectangle">
          <span class="option-number">1</span>
          <span class="option-text">Toroidal universe on a rectangle<br><span class="option-detail">(standard view), with 3D torus visualization</span></span>
        </button>
        <button class="landing-option" data-topology="annulus">
          <span class="option-number">2</span>
          <span class="option-text">Toroidal universe on an<br><span class="option-detail">annular ring</span></span>
        </button>
        <button class="landing-option" data-topology="octagon">
          <span class="option-number">3</span>
          <span class="option-text">Genus two universe on an<br><span class="option-detail">octagon</span></span>
        </button>
        <button class="landing-option" data-topology="sphere">
          <span class="option-number">4</span>
          <span class="option-text">Spherical universe on two<br><span class="option-detail">glued disks</span></span>
        </button>
        <button class="landing-option" data-topology="handle">
          <span class="option-number">5</span>
          <span class="option-text">Genus two on a rectangle<br><span class="option-detail">with a reflected handle seam</span></span>
        </button>
      </div>
      <div class="landing-controls">
        <p>ARROWS / WASD to move &nbsp; SPACE to fire &nbsp; SHIFT hyperspace</p>
        <p>P pause &nbsp; F fullscreen &nbsp; M mute &nbsp; ESC menu</p>
        <p>By David Bachman with GPT 5.3 codex</p>
      </div>
    </div>
  `;

  root.appendChild(container);

  function handleClick(e: Event): void {
    const target = (e.target as HTMLElement).closest('[data-topology]') as HTMLElement | null;
    if (!target) return;
    const topology = target.dataset.topology as TopologyType;
    options.onSelect(topology);
  }

  function handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case '1':
        options.onSelect('rectangle');
        break;
      case '2':
        options.onSelect('annulus');
        break;
      case '3':
        options.onSelect('octagon');
        break;
      case '4':
        options.onSelect('sphere');
        break;
      case '5':
        options.onSelect('handle');
        break;
    }
  }

  container.addEventListener('click', handleClick);
  window.addEventListener('keydown', handleKeydown);

  return {
    destroy() {
      container.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeydown);
      container.remove();
    },
  };
}
