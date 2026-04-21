import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-builder-chat',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chat-container">
      <div class="chat-header">
          <i class="bi bi-robot"></i>
          AI Travel Assistant
      </div>
      <div class="chat-messages">
          <div class="placeholder-text">Chat AI</div>
      </div>
      <div class="chat-input">
          <div class="input-mock">Scrivi un messaggio...</div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(15px);
      color: #fff;
    }
    .chat-header {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;
      font-size: 0.95rem;
      background: rgba(255, 255, 255, 0.03);
    }
    .chat-header i { color: #8b5cf6; }
    .chat-messages {
      flex-grow: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .placeholder-text {
      color: rgba(255, 255, 255, 0.3);
      font-weight: 600;
      font-size: 1.1rem;
    }
    .chat-input {
      padding: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .input-mock {
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.9rem;
    }
  `]
})
export class BuilderChatComponent {}
