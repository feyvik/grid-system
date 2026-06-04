import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElementsPanelComponent } from './elements-panel.component';

describe('ElementsPanelComponent', () => {
  let component: ElementsPanelComponent;
  let fixture: ComponentFixture<ElementsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElementsPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElementsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
