import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
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
  private editorService = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  isOpen = signal(true);
  pageJSON = computed(() => this.editorService.getPageJSON());

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  copyToClipboard(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    navigator.clipboard.writeText(this.pageJSON()).catch(console.error);
  }
}
