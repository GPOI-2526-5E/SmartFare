import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-builder-chat',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chat-container">
      <div class="chat-header">
        <span>AI Assistant</span>
      </div>
      <div class="chat-body">
        <div class="placeholder-wrap">
          <i class="bi bi-stars"></i>
          <p>Sezione in arrivo</p>
          <small>La chat verrà integrata nel prossimo step.</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      border-radius: inherit;
      background:
        linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(240, 253, 250, 0.95));
      color: #0f172a;
    }

    .chat-header {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.1);
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(15, 23, 42, 0.7);
    }

    .chat-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .placeholder-wrap {
      width: 100%;
      border: 1px dashed rgba(15, 23, 42, 0.22);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.8);
      text-align: center;
      padding: 24px 14px;
    }

    .placeholder-wrap i {
      font-size: 1.8rem;
      color: #0d9488;
    }

    .placeholder-wrap p {
      margin: 8px 0 3px;
      font-weight: 800;
      color: #0f172a;
    }

    .placeholder-wrap small {
      color: rgba(15, 23, 42, 0.62);
      font-size: 0.78rem;
    }
  `]
})
export class BuilderChatComponent { }
