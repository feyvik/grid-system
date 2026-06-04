import { Component, ElementRef, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../services/editor.service';

@Component({
  selector: 'app-header-editor',
  standalone: true,
  imports: [FormsModule, NgStyle],
  templateUrl: './header-editor.component.html',
  styleUrl: './header-editor.component.css',
})
export class HeaderEditorComponent {
  @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('bgInput') bgInput!: ElementRef<HTMLInputElement>;

  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  previewStyle() {
    const bg = this.es.activeHeader().background;
    return bg.type === 'image' && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bg.value || '#2c3e7a' };
  }

  onLogoFile(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.es.updateHeader({ logoSrc: reader.result as string });
    reader.readAsDataURL(file);
  }

  removeLogo(): void { this.es.updateHeader({ logoSrc: undefined }); }

  onBgFile(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.es.updateHeader({ background: { type: 'image', value: reader.result as string } });
    reader.readAsDataURL(file);
  }

  setBgColor(value: string): void {
    this.es.updateHeader({ background: { type: 'color', value } });
  }

  toggleEnabled(): void {
    this.es.updateHeader({ enabled: !this.es.activeHeader().enabled });
  }
}
