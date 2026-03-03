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
      <div class="landing-columns">
        <section class="landing-column">
          <h2 class="landing-column-title">Orientable Universes</h2>
          <div class="landing-options">
            <button class="landing-option" data-topology="sphere">
              <span class="option-number">1</span>
              <span class="option-text">Spherical Universe w/3D view</span>
            </button>
            <button class="landing-option" data-topology="rectangle">
              <span class="option-number">2</span>
              <span class="option-text">Toroidal Universe w/ 3D view</span>
            </button>
            <button class="landing-option" data-topology="annulus">
              <span class="option-number">3</span>
              <span class="option-text">Toroidal Universe on an annulus</span>
            </button>
            <button class="landing-option" data-topology="octagon">
              <span class="option-number">4</span>
              <span class="option-text">Genus two Universe on an octagon</span>
            </button>
            <button class="landing-option" data-topology="handle">
              <span class="option-number">5</span>
              <span class="option-text">Genus two Universe on a rectangle with handle.</span>
            </button>
          </div>
        </section>
        <section class="landing-column">
          <h2 class="landing-column-title">Non-orientable Universes</h2>
          <div class="landing-options">
            <button class="landing-option" data-topology="projective">
              <span class="option-number">6</span>
              <span class="option-text">Projective Plane Universe</span>
            </button>
            <button class="landing-option" data-topology="klein">
              <span class="option-number">7</span>
              <span class="option-text">Klein Bottle Universe</span>
            </button>
          </div>
        </section>
      </div>
      <div class="landing-controls">
        <p>ARROWS / WASD to move &nbsp; SPACE to fire &nbsp; SHIFT hyperspace</p>
        <p>P pause &nbsp; F fullscreen &nbsp; M mute &nbsp; ESC menu</p>
      </div>
      <p class="landing-tagline">By David Bachman and GPT 5.3 Codex</p>
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
        options.onSelect('sphere');
        break;
      case '2':
        options.onSelect('rectangle');
        break;
      case '3':
        options.onSelect('annulus');
        break;
      case '4':
        options.onSelect('octagon');
        break;
      case '5':
        options.onSelect('handle');
        break;
      case '6':
        options.onSelect('projective');
        break;
      case '7':
        options.onSelect('klein');
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
