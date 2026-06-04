import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EditorService } from '../../services/editor.service';

@Component({
  selector: 'app-json-panel',
  standalone: true,
  imports: [],
  templateUrl: './json-panel.component.html',
  styleUrl: './json-panel.component.css',
})
export class JsonPanelComponent {
  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  isOpen = signal(false);
  copied = signal(false);

  toggle(): void { this.isOpen.update(v => !v); }

  copy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    navigator.clipboard.writeText(this.es.getPageJSON()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
