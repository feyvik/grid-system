import { Component, ElementRef, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorService } from '../../services/editor.service';

@Component({
  selector: 'app-footer-editor',
  standalone: true,
  imports: [FormsModule, NgStyle],
  templateUrl: './footer-editor.component.html',
  styleUrl: './footer-editor.component.css',
})
export class FooterEditorComponent {
  @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('bgInput') bgInput!: ElementRef<HTMLInputElement>;

  protected es = inject(EditorService);
  private platformId = inject(PLATFORM_ID);

  previewStyle() {
    const bg = this.es.activeFooter().background;
    return bg.type === 'image' && bg.value
      ? { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundColor: bg.value || '#313136' };
  }

  onLogoFile(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.es.updateFooter({ logoSrc: reader.result as string });
    reader.readAsDataURL(file);
  }

  removeLogo(): void { this.es.updateFooter({ logoSrc: undefined }); }

  onBgFile(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.es.updateFooter({ background: { type: 'image', value: reader.result as string } });
    reader.readAsDataURL(file);
  }

  setBgColor(value: string): void {
    this.es.updateFooter({ background: { type: 'color', value } });
  }

  toggleEnabled(): void {
    this.es.updateFooter({ enabled: !this.es.activeFooter().enabled });
  }
}
