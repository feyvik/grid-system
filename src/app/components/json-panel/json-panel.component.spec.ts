import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JsonPanelComponent } from './json-panel.component';

describe('JsonPanelComponent', () => {
  let component: JsonPanelComponent;
  let fixture: ComponentFixture<JsonPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JsonPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
