import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-builder-chat',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chat-container">
      <div class="chat-glow chat-glow--top" aria-hidden="true"></div>
      <div class="chat-glow chat-glow--bottom" aria-hidden="true"></div>

      <div class="chat-header">
        <div class="chat-header__eyebrow">
          <i class="bi bi-stars"></i>
          <span>AI Assistant</span>
        </div>
        <button class="chat-header__status" type="button">
          <span></span>
          Beta panel
        </button>
      </div>

      <div class="chat-body">
        <div class="placeholder-wrap">
          <div class="placeholder-icon">
            <i class="bi bi-magic"></i>
          </div>

          <div class="placeholder-copy">
            <span class="placeholder-kicker">Dark assistant space</span>
            <p>Il pannello AI ora segue il tema scuro del builder.</p>
            <small>Nel prossimo step possiamo collegare prompt, suggerimenti di viaggio e azioni rapide.</small>
          </div>

          <div class="placeholder-suggestions">
            <button type="button">Ottimizza il giorno 2</button>
            <button type="button">Suggerisci attivita serali</button>
            <button type="button">Bilancia hotel e tappe</button>
          </div>
        </div>

        <div class="composer-shell">
          <div class="composer-shell__hint">
            <i class="bi bi-lightning-charge-fill"></i>
            Prompt rapido presto disponibile
          </div>
          <div class="composer-shell__input">
            <span>Scrivi una richiesta per l'assistente...</span>
            <button type="button" aria-label="Invia prompt">
              <i class="bi bi-arrow-up"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      --chat-surface: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.88));
      --chat-panel: rgba(2, 6, 23, 0.42);
      --chat-panel-strong: rgba(15, 23, 42, 0.72);
      --chat-border: rgba(148, 163, 184, 0.16);
      --chat-copy: rgba(226, 232, 240, 0.76);
      --chat-copy-strong: #f8fafc;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      border-radius: inherit;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 30%),
        radial-gradient(circle at 100% 100%, rgba(249, 115, 22, 0.14), transparent 34%),
        var(--chat-surface);
      color: var(--chat-copy-strong);
    }

    .chat-glow {
      position: absolute;
      border-radius: 999px;
      filter: blur(60px);
      opacity: 0.55;
      pointer-events: none;
    }

    .chat-glow--top {
      width: 180px;
      height: 180px;
      top: -70px;
      right: -40px;
      background: rgba(14, 165, 233, 0.24);
    }

    .chat-glow--bottom {
      width: 220px;
      height: 220px;
      bottom: -100px;
      left: -60px;
      background: rgba(249, 115, 22, 0.16);
    }

    .chat-header {
      position: relative;
      z-index: 1;
      padding: 16px;
      border-bottom: 1px solid var(--chat-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.34), rgba(15, 23, 42, 0.08));
    }

    .chat-header__eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(14, 165, 233, 0.12);
      color: #7dd3fc;
      font-size: 0.74rem;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .chat-header__status {
      border: 1px solid var(--chat-border);
      background: rgba(15, 23, 42, 0.55);
      color: var(--chat-copy);
      border-radius: 999px;
      padding: 8px 12px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.74rem;
      font-weight: 800;
    }

    .chat-header__status span {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #34d399;
      box-shadow: 0 0 0 6px rgba(52, 211, 153, 0.12);
    }

    .chat-body {
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      padding: 16px;
    }

    .placeholder-wrap {
      width: 100%;
      border: 1px solid var(--chat-border);
      border-radius: 22px;
      background:
        linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(2, 6, 23, 0.5)),
        rgba(15, 23, 42, 0.24);
      text-align: left;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    .placeholder-icon {
      width: 56px;
      height: 56px;
      display: grid;
      place-items: center;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(249, 115, 22, 0.16));
      border: 1px solid rgba(125, 211, 252, 0.16);
    }

    .placeholder-wrap i {
      font-size: 1.8rem;
      color: #7dd3fc;
    }

    .placeholder-copy {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .placeholder-kicker {
      color: #99f6e4;
      font-size: 0.72rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }

    .placeholder-wrap p {
      margin: 0;
      font-weight: 800;
      color: var(--chat-copy-strong);
      font-size: 1.08rem;
      line-height: 1.35;
    }

    .placeholder-wrap small {
      color: var(--chat-copy);
      font-size: 0.82rem;
      line-height: 1.55;
    }

    .placeholder-suggestions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .placeholder-suggestions button,
    .composer-shell__input button,
    .chat-header__status {
      transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
    }

    .placeholder-suggestions button {
      width: 100%;
      text-align: left;
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid var(--chat-border);
      background: var(--chat-panel);
      color: var(--chat-copy-strong);
      font-size: 0.83rem;
      font-weight: 700;
    }

    .placeholder-suggestions button:hover,
    .chat-header__status:hover {
      border-color: rgba(45, 212, 191, 0.28);
      background: rgba(15, 23, 42, 0.86);
      transform: translateY(-1px);
    }

    .composer-shell {
      width: 100%;
      border-radius: 22px;
      border: 1px solid var(--chat-border);
      background: var(--chat-panel-strong);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .composer-shell__hint {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #93c5fd;
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .composer-shell__input {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 12px 12px 14px;
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      background: rgba(2, 6, 23, 0.48);
      color: var(--chat-copy);
      font-size: 0.84rem;
    }

    .composer-shell__input button {
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #14b8a6, #3b82f6);
      color: white;
      flex-shrink: 0;
    }

    .composer-shell__input button:hover {
      transform: translateY(-1px);
    }

    @media (max-width: 640px) {
      .chat-header,
      .chat-body {
        padding: 14px;
      }

      .chat-header {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class BuilderChatComponent { }
